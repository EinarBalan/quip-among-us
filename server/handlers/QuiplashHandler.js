import {
  addHostToRoom,
  addPlayerToRoom,
  addPoints,
  doesPlayerNameAlreadyExist,
  deleteRoom,
  getHostSocketIdForRoom,
  getPlayersOfRoom,
  getPointsSortedHighestFirst,
  getRoomOptions,
  storeStartGame,
} from "../state/PlayersInRooms";
import {
  assignPromptsForPlayers,
  deleteSavedPromptsForRoom,
  getOnePromptAndAnswersForRoom,
  getNumberOfAnswersForRoom,
  getPopularAnswers,
  getVotes,
  hasMorePromptsForRoom,
  storeAnswerForPrompt,
  storeVoteForPrompt,
} from "../state/PromptsAnswersVotes";
import WS_EVENT from "./WebsocketEvents";
import { getReport } from "../state/PromptsAnswersVotes";

const fs = require("fs");
const path = require("path");

/**
 * Handles all player/server interactions
 */

export function initializeQuiplashHandler(io) {
  io.on(WS_EVENT.DEFAULT_CONNECTION, (socket) => {
    socket.on(WS_EVENT.INCOMING.HOST_JOINED_ROOM, (roomCode) => {
      if (roomCode) {
        console.log("Host has created room ", roomCode);
        socket.join(roomCode);
        socket.nickname = `Host ${roomCode}`;
        socket.roomCode = roomCode;
        addHostToRoom(roomCode, socket.id);
      }
    });
    socket.on(WS_EVENT.INCOMING.HOST_STARTING_GAME, () => {
      startNewGame(socket, io);
    });
    socket.on(WS_EVENT.INCOMING.HOST_START_ROUND, () => {
      if (hasMorePromptsForRoom(socket.roomCode)) {
        startNewRound(socket, io);
      } else {
        // console.log("Game is over for room ", socket.roomCode);
        // console.log("Popular answers: ", getPopularAnswers(socket.roomCode));
        io.in(socket.roomCode).emit(
          WS_EVENT.OUTGOING.SHOW_PLAYER_POINTS,
          getPointsSortedHighestFirst(socket.roomCode),
          getPopularAnswers(socket.roomCode),
        );

        // get report 
        const report = getReport(socket.roomCode);
        const reportJSON = JSON.stringify(report, null, 2);

        // if file already exists, add a number to the end of the filename
        let reportPath = path.join(__dirname, "../reports", `${socket.roomCode}.json`);
        let i = 1;
        while (fs.existsSync(reportPath)) {
          reportPath = path.join(__dirname, "../reports", `${socket.roomCode}-${i}.json`);
          i++;
        }

        fs.writeFile(reportPath, reportJSON, (err) => {
          if (err) {
            console.error("Error writing report to file:", err);
          } else {
            console.log("Report successfully written to", reportPath);
          }
        });

        console.log("------------------" + "REPORT: " + socket.roomCode + "------------------");
        console.log(reportJSON);
      }
    });
    socket.on(WS_EVENT.INCOMING.PLAYER_JOIN, (player) => {
      let newPlayerName = player.playerName;
      while (doesPlayerNameAlreadyExist(player.roomCode.toUpperCase(), newPlayerName)) {
        newPlayerName += " ditto";
      }
      if (
        addPlayerToRoom(player.roomCode.toUpperCase(), {
          id: socket.id,
          name: newPlayerName,
        })
      ) {
        socket.nickname = newPlayerName;
        socket.roomCode = player.roomCode;
        socket.join(player.roomCode);
        console.log(`Added ${newPlayerName} to room ${player.roomCode}`);
        socket.emit(WS_EVENT.OUTGOING.SUCCESSFULLY_JOINED_ROOM);
        socket.to(socket.roomCode).emit(WS_EVENT.OUTGOING.LOBBY_PLAYERS_UPDATED, getPlayersOfRoom(player.roomCode));
      } else {
        socket.emit(WS_EVENT.OUTGOING.FAILED_TO_JOIN_ROOM);
      }
    });
    socket.on(WS_EVENT.INCOMING.SUBMIT_ANSWER, ({ prompt, answer }) => {
      if (answer.startsWith("data:")) {
        console.log("Got picture from ", socket.nickname);
      } else {
        console.log("Got answer from ", socket.nickname, ": ", answer);
      }
      storeAnswerForPrompt({ prompt, playerName: socket.nickname, answer, roomCode: socket.roomCode }); //! important
      // CHECK IF ALL PLAYERS HAVE SUBMITTED, then go to next phase (voting)
      const expectedNumberOfAnswers = getPlayersOfRoom(socket.roomCode).length * 2;
      const receivedNumberOfAnswers = getNumberOfAnswersForRoom(socket.roomCode);
      if (receivedNumberOfAnswers >= expectedNumberOfAnswers) {
        startNewRound(socket, io);
      } else {
        // Notify host of progress
        socket
          .to(getHostSocketIdForRoom(socket.roomCode))
          .emit(WS_EVENT.OUTGOING.PLAYER_ANSWER_RECEIVED, expectedNumberOfAnswers, receivedNumberOfAnswers);
      }
    });
    socket.on(WS_EVENT.INCOMING.SUBMIT_VOTE, ({ prompt, answerVotedFor }) => {
      if (answerVotedFor.funny.startsWith("data:")) {
        console.log("Got vote from ", socket.nickname, " for picture");
      } else {
        console.log("Got vote from ", socket.nickname, ": ", answerVotedFor.funny);
      }

      storeVoteForPrompt({ 
        prompt, 
        playerName: socket.nickname, 
        roomCode: socket.roomCode, 
        answerVotedFor: answerVotedFor.funny, 
        aiVote: answerVotedFor.ai 
      }); 

      // TALLY Votes and display all votes
      io.in(socket.roomCode).clients((error, clients) => {
        if (error) throw error;
        const allVotes = getVotes(prompt, socket.roomCode, getPlayersOfRoom(socket.roomCode).length);
        const totalVotes = allVotes.reduce(function (currentSum, votersPerAnswer) {
          return currentSum + votersPerAnswer.votes.length;
        }, 0);
        const expectedNumberOfVotes = getPlayersOfRoom(socket.roomCode).length - 2;
        if (totalVotes >= expectedNumberOfVotes) {
          // assign points
          addPoints(socket.roomCode, allVotes);
          // io.in Makes sure the original player gets this
          io.in(socket.roomCode).emit(
            WS_EVENT.OUTGOING.VOTING_RESULTS,
            allVotes,
            hasMorePromptsForRoom(socket.roomCode),
          );
        } else {
          // Notify host of progress
          socket
            .to(getHostSocketIdForRoom(socket.roomCode))
            .emit(WS_EVENT.OUTGOING.PLAYER_VOTE_RECEIVED, expectedNumberOfVotes, totalVotes);
        }
      });
    });
    socket.on(WS_EVENT.INCOMING.DISCONNECT, () => {
      console.log(`${socket.nickname} has disconnected from room ${socket.roomCode}`);
      io.in(socket.roomCode).emit(WS_EVENT.OUTGOING.PLAYER_DISCONNECTED, socket.nickname);
      deleteRoom(socket.roomCode);
      deleteSavedPromptsForRoom(socket.roomCode);
    });
  });
}

function startNewGame(socket, io) {
  console.log("Host is starting game for room ", socket.roomCode);
  const players = getPlayersOfRoom(socket.roomCode);
  const roomOptions = getRoomOptions(socket.roomCode);
  if (roomOptions.playShakeGame) {
    io.in(socket.roomCode).emit(WS_EVENT.OUTGOING.SHOW_SHAKE_INSTRUCTIONS, getPlayersOfRoom(socket.roomCode));
  } else if (roomOptions.playPunchGame) {
    io.in(socket.roomCode).emit(WS_EVENT.OUTGOING.SHOW_PUNCH_INSTRUCTIONS, getPlayersOfRoom(socket.roomCode));
  } else {
    const promptsForPlayers = assignPromptsForPlayers({
      players,
      roomCode: socket.roomCode,
      roomOptions,
    });
    storeStartGame(socket.roomCode);
    promptsForPlayers.forEach((promptsForPlayer) => {
      socket.to(promptsForPlayer.player.id).emit(WS_EVENT.OUTGOING.START_GAME, promptsForPlayer.prompts, roomOptions);
    });
    const expectedNumberOfAnswers = getPlayersOfRoom(socket.roomCode).length * 2;
    socket.emit(WS_EVENT.OUTGOING.START_GAME, expectedNumberOfAnswers);
  }
}

async function startNewRound(socket, io) {
  console.log("Starting round for room ", socket.roomCode);
  const onePromptAndAnswers = await getOnePromptAndAnswersForRoom(socket.roomCode);
  const expectedNumberOfVotes = getPlayersOfRoom(socket.roomCode).length - 2;
  io.in(socket.roomCode).emit(
    WS_EVENT.OUTGOING.START_VOTING_PHASE,
    {
      prompt: onePromptAndAnswers.prompt,
      answers: onePromptAndAnswers.answers,
    },
    expectedNumberOfVotes,
  );
  // check if player answered prompt and instead send WAIT_FOR_VOTES_ON_YOUR_PROMPT
  const players = getPlayersOfRoom(socket.roomCode);
  for (let player of players) {
    if (onePromptAndAnswers.submitters.includes(player.name)) {
      if (player.id === socket.id) {
        socket.emit(WS_EVENT.OUTGOING.WAIT_FOR_VOTES_ON_YOUR_PROMPT);
      } else {
        socket.to(player.id).emit(WS_EVENT.OUTGOING.WAIT_FOR_VOTES_ON_YOUR_PROMPT);
      }
    }
  }
}
