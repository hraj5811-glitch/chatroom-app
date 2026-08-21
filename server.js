const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("./passport-config");

const User = require("./models/User");
const Message = require("./models/Message");
const { generateUniqueUsername } = require("./generateUsername");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ---- Database ----
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---- Middleware ----
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Share session data with Socket.IO
io.engine.use(sessionMiddleware);

// ---- Auth routes ----
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/app.html" }),
  (req, res) => {
    res.redirect("/app.html");
  }
);

app.get("/auth/logout", (req, res) => {
  req.session.guestUsername = null;
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/app.html");
    });
  });
});

// Returns the current logged-in user (Google) or guest identity, if any
app.get("/api/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      username: req.user.username,
      email: req.user.email,
      isGuest: false,
    });
  }
  if (req.session.guestUsername) {
    return res.json({
      username: req.session.guestUsername,
      isGuest: true,
    });
  }
  return res.status(401).json({ error: "Not logged in" });
});

// Creates a temporary guest identity for this session
app.post("/api/guest", async (req, res) => {
  const username = `Guest${Math.floor(1000 + Math.random() * 9000)}`;
  req.session.guestUsername = username;
  res.json({ username, isGuest: true });
});

// ---- Socket.IO ----
const activeUsers = {}; // socketId -> { username, room }

function getUsersInRoom(room) {
  return Object.values(activeUsers)
    .filter((u) => u.room === room)
    .map((u) => u.username);
}

io.on("connection", (socket) => {
  socket.on("join_room", async ({ username, room }) => {
    const safeUsername = String(username || "Guest").slice(0, 24);
    const safeRoom = String(room || "general").slice(0, 24);

    socket.join(safeRoom);
    activeUsers[socket.id] = { username: safeUsername, room: safeRoom };

    // Load persistent history from MongoDB
    try {
      const history = await Message.find({ room: safeRoom })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      socket.emit("room_history", history.reverse());
    } catch (err) {
      console.error("Failed to load history:", err);
      socket.emit("room_history", []);
    }

    io.to(safeRoom).emit("system_message", `${safeUsername} joined the room.`);
    io.to(safeRoom).emit("user_list", getUsersInRoom(safeRoom));
  });

  socket.on("send_message", async (text) => {
    const user = activeUsers[socket.id];
    if (!user || !text) return;

    const cleanText = String(text).slice(0, 1000);

    try {
      const saved = await Message.create({
        room: user.room,
        username: user.username,
        text: cleanText,
      });

      io.to(user.room).emit("receive_message", {
        id: socket.id,
        user: saved.username,
        text: saved.text,
        time: saved.createdAt,
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  });

  socket.on("typing", () => {
    const user = activeUsers[socket.id];
    if (!user) return;
    socket.to(user.room).emit("display_typing", user.username);
  });

  socket.on("disconnect", () => {
    const user = activeUsers[socket.id];
    if (user) {
      io.to(user.room).emit("system_message", `${user.username} left the room.`);
      delete activeUsers[socket.id];
      io.to(user.room).emit("user_list", getUsersInRoom(user.room));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chatroom server running on port ${PORT}`);
});
