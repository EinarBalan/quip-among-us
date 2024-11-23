import express from "express";
import { initializeQuiplashHandler } from "./handlers/QuiplashHandler";
import { initializePunchGameHandler } from "./handlers/PunchGameHandler";
import { initializeShakeGameHandler } from "./handlers/ShakeGameHandler";
import { createRoom } from "./state/PlayersInRooms";

require('dotenv').config();

const app = express();
app.use(express.json());
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const PORT = process.env.PORT || 3001;
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");

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

app.get("/api/reports", function (req, res) {
  const output = fs.createWriteStream(path.join(__dirname, "reports.zip"));
  const archive = archiver("zip", {
    zlib: { level: 9 }
  });

  output.on("close", function () {
    res.download(path.join(__dirname, "reports.zip"));
  });

  archive.on("error", function (err) {
    throw err;
  });

  archive.pipe(output);
  archive.directory(path.join(__dirname, "reports"), false);
  archive.finalize();
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
