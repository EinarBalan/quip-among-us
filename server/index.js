import express from "express";
import { initializeQuiplashHandler } from "./handlers/QuiplashHandler";
import { initializePunchGameHandler } from "./handlers/PunchGameHandler";
import { initializeShakeGameHandler } from "./handlers/ShakeGameHandler";
import { createRoom } from "./state/PlayersInRooms";

const app = express();
app.use(express.json());
const server = require("http").createServer(app);
const io = require("socket.io")(server);

require('dotenv').config();

const PORT = process.env.PORT || 3001;
const path = require("path");

app.use(function (request, response, next) {
  // Heroku terminates SSL connections at the load balancer level, so req.secure will never be true
  if (process.env.NODE_ENV === "production" && request.headers["x-forwarded-proto"] !== "https") {
    return response.redirect("https://" + request.headers.host + request.url);
  }

  next();
});

app.use(express.static(path.join(__dirname, "..", "build")));
app.use(express.json());
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});
app.get("/create", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});
app.get("/game/*", function (req, res) {
  res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});

app.post("/create-new-game", function (req, res, next) {
  const roomCode = createRoom(req.body);
  res.send(roomCode);
});

initializeQuiplashHandler(io);
initializePunchGameHandler(io);
initializeShakeGameHandler(io);

// start the app
server.listen(PORT, (error) => {
  if (error) {
    return console.log("something bad happened", error);
  }
  console.log("listening on http://localhost:" + PORT + "...");
});
