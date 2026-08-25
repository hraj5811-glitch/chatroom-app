const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
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
const Room = require("./models/Room");
const { generateUniqueUsername } = require("./generateUsername");
const { generateUniqueRoomId } = require("./generateRoomId");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ---- Database ----
mongoose
  .connect("mongodb://2503031050398_db_user:rzDKLQSPmxeKWD1G@ac-oa5kvkc-shard-00-00.nhuf5qn.mongodb.net:27017,ac-oa5kvkc-shard-00-01.nhuf5qn.mongodb.net:27017,ac-oa5kvkc-shard-00-02.nhuf5qn.mongodb.net:27017/?ssl=true&replicaSet=atlas-sl139t-shard-0&authSource=admin&appName=Cluster0")
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

function requireLogin(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Not logged in" });
}

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

// ---- Room routes ----

// Create a brand new room with a random ID
app.post("/api/rooms/create", async (req, res) => {
  try {
    const roomId = await generateUniqueRoomId();
    const isLoggedIn = req.isAuthenticated && req.isAuthenticated();

    await Room.create({
      roomId,
      createdBy: isLoggedIn ? req.user._id : null,
    });

    if (isLoggedIn) {
      req.user.joinedRooms.push({ roomId });
      await req.user.save();
    }

    res.json({ roomId });
  } catch (err) {
    console.error("Room creation failed:", err);
    res.status(500).json({ error: "Could not create room" });
  }
});

// Join an existing room by ID (validates it exists first)
app.post("/api/rooms/join", async (req, res) => {
  try {
    const roomId = String(req.body.roomId || "").toUpperCase().trim();
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: "Room ID not found. Double-check the code." });
    }

    const isLoggedIn = req.isAuthenticated && req.isAuthenticated();
    if (isLoggedIn) {
      const alreadyJoined = req.user.joinedRooms.some((r) => r.roomId === roomId);
      if (!alreadyJoined) {
        req.user.joinedRooms.push({ roomId });
        await req.user.save();
      }
    }

    res.json({ roomId });
  } catch (err) {
    console.error("Room join failed:", err);
    res.status(500).json({ error: "Could not join room" });
  }
});

// ---- Profile routes (logged-in users only) ----

app.get("/api/profile", requireLogin, async (req, res) => {
  const rooms = [...req.user.joinedRooms].sort((a, b) => b.joinedAt - a.joinedAt);
  res.json({
    username: req.user.username,
    email: req.user.email,
    joinedRooms: rooms,
  });
});

app.put("/api/profile/username", requireLogin, async (req, res) => {
  try {
    const newUsername = String(req.body.username || "").trim().slice(0, 24);
    if (!newUsername || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return res.status(400).json({ error: "Use only letters, numbers, and underscores." });
    }
    const taken = await User.findOne({ username: newUsername });
    if (taken && String(taken._id) !== String(req.user._id)) {
      return res.status(409).json({ error: "That username is already taken." });
    }
    req.user.username = newUsername;
    await req.user.save();
    res.json({ username: req.user.username });
  } catch (err) {
    console.error("Username update failed:", err);
    res.status(500).json({ error: "Could not update username" });
  }
});

// Fetch saved message history for a specific room (used by the profile screen)
app.get("/api/rooms/:roomId/messages", requireLogin, async (req, res) => {
  const roomId = String(req.params.roomId || "").toUpperCase();
  const messages = await Message.find({ room: roomId }).sort({ createdAt: 1 }).lean();
  res.json({ messages });
});

// ---- Socket.IO ----
const activeUsers = {}; // socketId -> { username, room, isGuest }

function getUsersInRoom(room) {
  return Object.values(activeUsers)
    .filter((u) => u.room === room)
    .map((u) => u.username);
}

// Figures out who's really on the other end of this socket using the shared session,
// rather than trusting whatever the client claims to be.
async function resolveIdentity(socket) {
  const sess = socket.request.session;
  if (!sess) return null;

  if (sess.passport && sess.passport.user) {
    const dbUser = await User.findById(sess.passport.user);
    if (dbUser) return { username: dbUser.username, isGuest: false };
  }

  if (sess.guestUsername) {
    return { username: sess.guestUsername, isGuest: true };
  }

  return null;
}

io.on("connection", (socket) => {
  socket.on("join_room", async ({ room }) => {
    const identity = await resolveIdentity(socket);
    if (!identity) {
      socket.emit("auth_error", "Please sign in again.");
      return;
    }

    const safeRoom = String(room || "").toUpperCase().slice(0, 12);

    socket.join(safeRoom);
    activeUsers[socket.id] = {
      username: identity.username,
      room: safeRoom,
      isGuest: identity.isGuest,
    };

    // Load persistent history from MongoDB (guest messages were never saved, so
    // rooms with only guest chatter will simply show no prior history)
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

    io.to(safeRoom).emit("system_message", `${identity.username} joined the room.`);
    io.to(safeRoom).emit("user_list", getUsersInRoom(safeRoom));
  });

  socket.on("send_message", async (text) => {
    const user = activeUsers[socket.id];
    if (!user || !text) return;

    const cleanText = String(text).slice(0, 1000);

    // Guests chat live but their messages are never written to MongoDB —
    // only logged-in users get a permanent backup.
    if (user.isGuest) {
      io.to(user.room).emit("receive_message", {
        id: socket.id,
        user: user.username,
        text: cleanText,
        time: new Date(),
      });
      return;
    }

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
