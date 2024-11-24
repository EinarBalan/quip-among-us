import { getRandomPG13Prompt } from "./generated-data/Prompts.pg13";
import { getRandomPicturePrompt } from "./generated-data/Prompts.pics";
import { generateAIAnswer, models } from "./llms";

const POINTS_PER_VOTE = 100;
const promptsForRoom = {};

// Keep track of how many answers are submitted.  Wait until all answers are in before starting game.
const numberOfAnswersForRoom = {};
// Keep track of prompts that haven't been displayed and voted on yet.
const unusedPromptsForRoom = {};
// Keep track of winning answers for the score screen
const winningAnswersForRoom = {};

export function deleteSavedPromptsForRoom(roomCode) {
  delete numberOfAnswersForRoom[roomCode];
  delete promptsForRoom[roomCode];
  delete unusedPromptsForRoom[roomCode];
  delete winningAnswersForRoom[roomCode];
}

export function getReport(roomCode) { //TODO: format report
  return promptsForRoom[roomCode];
}

export async function getOnePromptAndAnswersForRoom(roomCode) { 
  const prompt = unusedPromptsForRoom[roomCode].pop();

  // add AI generated answer
  const model = Math.floor(Math.random() * 3); // randomly select AI model
  const aiAnswer = await generateAIAnswer(prompt, model);
  console.log("aiAnswer (${models[model]})", aiAnswer);
  storeAnswerForPrompt({ prompt, playerName: `AI (${models[model]})`, answer: aiAnswer, roomCode });

  const submitters = [];
  Object.values(promptsForRoom[roomCode][prompt]).forEach((answerProps) => {
    submitters.push(answerProps.submitter);
  });

  //shuffle answers
  const answers = Object.keys(promptsForRoom[roomCode][prompt]);
  answers.sort(() => Math.random() - 0.5);

  return {
    answers,
    prompt,
    submitters,
  };
}

export function getNumberOfAnswersForRoom(roomCode) {
  return numberOfAnswersForRoom[roomCode];
}

export function getPopularAnswers(roomCode) {
  const winningAnswers = Object.values(winningAnswersForRoom[roomCode]);
  winningAnswers.sort((a, b) => (a.points > b.points ? -1 : 1));
  return winningAnswers;
}

export function getVotes(prompt, roomCode, numberOfPlayers) { 
  const votes = [];
  Object.entries(promptsForRoom[roomCode][prompt]).forEach(([answer, properties]) => {
    console.log("answer ", answer); 
    console.log("properties ", properties); 
    const totalVotesForAnswer = properties.votes ? properties.votes : [];
    votes.push({
      answer,
      points: totalVotesForAnswer.length * POINTS_PER_VOTE,
      submitter: properties.submitter,
      votes: totalVotesForAnswer,
      numFunniestVotes: properties.votes ? properties.votes.length : 0,
      numAIVotes: properties.aiVotes ? properties.aiVotes.length : 0,
    });
  });


  // workaround in case both answers are the same
  if (!votes[1]) {
    votes[1] = { answer: "N/A", submitter: "Generated", votes: [] };
  }

  const answer1Votes = votes[0].votes.length;
  const answer2Votes = votes[1].votes.length;

  promptsForRoom[roomCode][prompt].winningAnswer = votes.reduce((prev, current) => (prev.points > current.points ? prev : current)).answer;
  promptsForRoom[roomCode][prompt].mostLikelyAiAnswer = votes.reduce((prev, current) => (prev.numAIVotes > current.numAIVotes ? prev : current)).answer;

  if (answer1Votes > answer2Votes) {
    votes[0].points += POINTS_PER_VOTE;
    if (answer1Votes > 1 && answer1Votes === numberOfPlayers - 2) {
      votes[0].quiplash = true;
      votes[0].points *= 2;
    }
    votes[0].state = "WINNER";
    votes[1].state = "LOSER";

    if (
      winningAnswersForRoom[roomCode][votes[0].answer] &&
      winningAnswersForRoom[roomCode][votes[0].answer].points < votes[0].points
    ) {
      winningAnswersForRoom[roomCode][votes[0].answer] = votes[0];
    } else {
      winningAnswersForRoom[roomCode][votes[0].answer] = votes[0];
    }
  } else if (answer2Votes > answer1Votes) {
    votes[1].points += POINTS_PER_VOTE;
    if (answer2Votes > 1 && answer2Votes === numberOfPlayers - 2) {
      votes[1].quiplash = true;
      votes[1].points *= 2;
    }
    votes[0].state = "LOSER";
    votes[1].state = "WINNER";

    if (
      winningAnswersForRoom[roomCode][votes[1].answer] &&
      winningAnswersForRoom[roomCode][votes[1].answer].points < votes[1].points
    ) {
      winningAnswersForRoom[roomCode][votes[1].answer] = votes[1];
    } else {
      winningAnswersForRoom[roomCode][votes[1].answer] = votes[1];
    }
  } else {
    votes[0].state = "TIE";
    votes[1].state = "TIE";
  }


  return votes;
}

export function hasMorePromptsForRoom(roomCode) {
  return unusedPromptsForRoom[roomCode].length > 0;
}

export function storeAnswerForPrompt({ prompt, playerName, answer, roomCode }) {
  numberOfAnswersForRoom[roomCode]++;
  if (promptsForRoom[roomCode] && promptsForRoom[roomCode][prompt]) {
    let realAnswer = answer;
    // Check for duplicate answer and add ditto to it
    if (promptsForRoom[roomCode][prompt][answer]) {
      realAnswer = answer + " ditto";
    }
    promptsForRoom[roomCode][prompt][realAnswer] = {};
    promptsForRoom[roomCode][prompt][realAnswer].submitter = playerName;
    promptsForRoom[roomCode][prompt][realAnswer].votes = [];

  }
}

export function storeVoteForPrompt({ prompt, playerName, roomCode, answerVotedFor, aiVote }) {
  // funny vote
  if (!promptsForRoom[roomCode][prompt][answerVotedFor].votes) {
    promptsForRoom[roomCode][prompt][answerVotedFor].votes = []; 
  }
  promptsForRoom[roomCode][prompt][answerVotedFor].votes.push(playerName);

  const funniestSubmitter = promptsForRoom[roomCode][prompt][answerVotedFor].submitter;
  if (funniestSubmitter.slice(0, 2) === "AI") {
    promptsForRoom[roomCode].numTimesAIVotedFunniest++;
  }

  // ai vote
  if (!promptsForRoom[roomCode][prompt][aiVote].aiVotes) {
    promptsForRoom[roomCode][prompt][aiVote].aiVotes = []; 
  }
  promptsForRoom[roomCode][prompt][aiVote].aiVotes.push(playerName);

  const aiSubmitter = promptsForRoom[roomCode][prompt][aiVote].submitter;
  if (aiSubmitter.slice(0, 2) === "AI") {
    promptsForRoom[roomCode].numTimesAIVotedAI++;
  }

  promptsForRoom[roomCode].numVotes++; 
}

function generatePairs(n) {
  if (n < 2) {
      throw new Error("n must be at least 2");
  }
  
  // Initialize empty array for pairs
  const pairs = [];
  
  // We'll use a rotating pattern to ensure we get n pairs
  // and each number is used roughly equally
  for (let i = 0; i < n; i++) {
      // For each position i, pair it with (i+1)%n + 1
      // This ensures we don't get the same number twice in a pair
      const first = i + 1;
      let second = ((i + 1) % n) + 1;
      
      // If we would get the same number, adjust the second number
      if (first === second) {
          second = ((i + 2) % n) + 1;
      }
      
      pairs.push([first, second]);
  }
  
  return pairs;
}

export function assignPromptsForPlayers({ players, roomCode, roomOptions }) {
  if (promptsForRoom[roomCode]) {
    deleteSavedPromptsForRoom(roomCode);
  }
  promptsForRoom[roomCode] = {
    numVotes: 0,
    numTimesAIVotedFunniest: 0,
    numTimesAIVotedAI: 0,
  };
  numberOfAnswersForRoom[roomCode] = 0;
  unusedPromptsForRoom[roomCode] = [];
  winningAnswersForRoom[roomCode] = [];
  const promptsForPlayers = [];

  // Total number of prompts is equal to the number of players
  const prompts = [];
  for (let i = 0; i < players.length; i++) {
    let prompt;
    do {
      prompt = roomOptions.allowPictureUploads ? getRandomPicturePrompt() : getRandomPG13Prompt();
    } while (prompts.includes(prompt));
    prompts.push(prompt);
    promptsForRoom[roomCode][prompt] = {};
    unusedPromptsForRoom[roomCode].push(prompt);
  }

  let promptAssignments = generatePairs(players.length);

  // shuffle prompt assignments
  promptAssignments.sort(() => Math.random() - 0.5);

  for (let i = 0; i < promptAssignments.length; i++) {
    const pair = promptAssignments[i];
    const promptsForPlayer = { player: players[i], prompts: [] };
    promptsForPlayer.prompts.push(prompts[pair[0] - 1]);
    promptsForPlayer.prompts.push(prompts[pair[1] - 1]);
    promptsForPlayers.push(promptsForPlayer);
  }

  return promptsForPlayers;
}
