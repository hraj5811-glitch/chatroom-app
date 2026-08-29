const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require("dotenv").config();

const fs = require("fs");
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const passport = require("./passport-config");

const User = require("./models/User");
const Message = require("./models/Message");
const Room = require("./models/Room");
const DirectMessage = require("./models/DirectMessage");
const { generateUniqueUsername } = require("./generateUsername");
const { generateUniqueRoomId } = require("./generateRoomId");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Ensure uploads and avatars folders exist
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const avatarDir = path.join(__dirname, "public", "avatars");
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Multer Storage Configuration for chat images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "img-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
  },
});

// Multer Storage Configuration for profile avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + ext);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error("Only image files (JPEG, PNG, WebP) are allowed"));
  },
});

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
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  },
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

function requireUserOrGuest(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  if (req.session && req.session.guestUsername) return next();
  return res.status(401).json({ error: "Not logged in" });
}

// ---- Auth routes ----
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/app.html" }),
  (req, res) => {
    req.session.save((err) => {
      if (err) console.error("Google callback session save error:", err);
      res.redirect("/app.html");
    });
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
app.get("/api/me", async (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    try {
      const user = (await User.findById(req.user._id).lean()) || req.user;
      return res.json({
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || "",
        college: user.college || "",
        interests: user.interests || [],
        isPublicProfile: user.isPublicProfile ?? true,
        isOnboarded: Boolean(user.isOnboarded),
        status: user.status || "Online",
        isGuest: false,
      });
    } catch (err) {
      return res.status(500).json({ error: "Server error fetching user" });
    }
  }
  if (req.session && req.session.guestUsername) {
    return res.json({
      username: req.session.guestUsername,
      avatarUrl: req.session.guestAvatarUrl || null,
      bio: req.session.guestBio || "",
      college: req.session.guestCollege || "",
      interests: req.session.guestInterests || [],
      isPublicProfile: req.session.guestIsPublicProfile ?? true,
      isOnboarded: Boolean(req.session.guestIsOnboarded),
      status: "Online",
      isGuest: true,
    });
  }
  return res.status(401).json({ error: "Not logged in" });
});

// Creates a temporary guest identity for this session
app.post("/api/guest", async (req, res) => {
  const username = `Guest${Math.floor(1000 + Math.random() * 9000)}`;
  req.session.guestUsername = username;
  req.session.save((err) => {
    if (err) {
      console.error("Failed to save guest session:", err);
      return res.status(500).json({ error: "Could not create guest session" });
    }
    res.json({ username, isGuest: true });
  });
});

// Image Upload Endpoint (Multer)
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided or invalid format" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// ---- Room routes ----

// Discover public rooms (with Trending and Category sorting)
app.get("/api/rooms/discover", async (req, res) => {
  try {
    const filter = { isPublic: true };
    if (req.query.category && req.query.category !== "All") {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      const s = String(req.query.search).trim();
      filter.$or = [
        { name: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
        { roomId: { $regex: s, $options: "i" } },
      ];
    }

    const rooms = await Room.find(filter)
      .populate("createdBy", "username displayName")
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const roomIds = rooms.map((r) => r.roomId);
    const messageCounts = await Message.aggregate([
      { $match: { room: { $in: roomIds } } },
      { $group: { _id: "$room", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    messageCounts.forEach((mc) => {
      countMap[mc._id] = mc.count;
    });

    const enriched = rooms.map((r) => {
      const onlineCount = Object.values(activeUsers).filter((u) => u.room === r.roomId).length;
      return {
        roomId: r.roomId,
        name: r.name || `Room #${r.roomId}`,
        description: r.description || "",
        category: r.category || "General",
        isPasswordProtected: Boolean(r.isPasswordProtected),
        createdBy: r.createdBy?.username || r.creatorUsername || "Guest",
        createdAt: r.createdAt,
        onlineCount,
        messageCount: countMap[r.roomId] || 0,
      };
    });

    // Trending rooms = Top rooms with highest onlineCount & message activity
    const trending = [...enriched]
      .sort((a, b) => (b.onlineCount * 3 + b.messageCount) - (a.onlineCount * 3 + a.messageCount))
      .slice(0, 6);

    res.json({ rooms: enriched, trending });
  } catch (err) {
    console.error("Discover rooms failed:", err);
    res.status(500).json({ error: "Could not fetch public rooms" });
  }
});

function validateRoomPassword(password) {
  if (!password || typeof password !== "string") return "Passcode is required.";
  const clean = password.trim();
  if (clean.length < 6) return "Passcode must be at least 6 characters long.";
  if (!/[A-Z]/.test(clean)) return "Passcode must contain at least one uppercase letter (A-Z).";
  if (!/[0-9]/.test(clean)) return "Passcode must contain at least one number (0-9).";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(clean)) {
    return "Passcode must contain at least one special character (!@#$%^&*...).";
  }
  return null;
}

// Create a brand new room with metadata & optional password protection
app.post("/api/rooms/create", async (req, res) => {
  try {
    const roomId = await generateUniqueRoomId();
    const isLoggedIn = req.isAuthenticated && req.isAuthenticated();
    const creatorUsername = isLoggedIn ? req.user.username : (req.session.guestUsername || "Guest");
    const rawName = String(req.body.name || "").trim().slice(0, 50);
    const name = rawName || `Room #${roomId}`;
    const description = String(req.body.description || "").trim().slice(0, 200);
    const validCategories = ["General", "Tech", "Gaming", "Study", "Music", "Movies", "Casual"];
    const category = validCategories.includes(req.body.category) ? req.body.category : "General";
    const isPublic = req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : true;

    // Room password protection & validation
    const isPasswordProtected = Boolean(req.body.isPasswordProtected);
    let passwordHash = null;
    if (isPasswordProtected) {
      const rawPassword = String(req.body.password || "").trim();
      const validationError = validateRoomPassword(rawPassword);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      passwordHash = await bcrypt.hash(rawPassword, 10);
    }

    const room = await Room.create({
      roomId,
      name,
      description,
      category,
      isPublic,
      isPasswordProtected,
      passwordHash,
      createdBy: isLoggedIn ? req.user._id : null,
      creatorUsername,
      moderators: [],
    });

    if (isLoggedIn) {
      req.user.joinedRooms.push({ roomId });
      await req.user.save();
    }

    res.json({
      roomId: room.roomId,
      name: room.name,
      description: room.description,
      category: room.category,
      isPublic: room.isPublic,
      isPasswordProtected: room.isPasswordProtected,
      creatorUsername: room.creatorUsername,
      moderators: room.moderators || [],
      pinnedMessage: room.pinnedMessage || null,
    });
  } catch (err) {
    console.error("Room creation failed:", err);
    res.status(500).json({ error: "Could not create room" });
  }
});

// Join an existing room by ID (validates existence and password if required)
app.post("/api/rooms/join", async (req, res) => {
  try {
    const roomId = String(req.body.roomId || "").toUpperCase().trim();
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: "Room ID not found. Double-check the code." });
    }

    const isLoggedIn = req.isAuthenticated && req.isAuthenticated();
    const currentUsername = isLoggedIn ? req.user.username : (req.session.guestUsername || "");
    const isHost = room.creatorUsername === currentUsername;

    // Check room password if protected and caller is not the room creator
    if (room.isPasswordProtected && !isHost) {
      const inputPass = String(req.body.password || "").trim();
      if (!inputPass) {
        return res.status(403).json({ error: "This room is password-protected. Please enter passcode.", isPasswordRequired: true });
      }
      const match = await bcrypt.compare(inputPass, room.passwordHash);
      if (!match) {
        return res.status(403).json({ error: "Incorrect room passcode.", isPasswordRequired: true });
      }
    }

    if (isLoggedIn) {
      const alreadyJoined = req.user.joinedRooms.some((r) => r.roomId === roomId);
      if (!alreadyJoined) {
        req.user.joinedRooms.push({ roomId });
        await req.user.save();
      }
    }

    res.json({
      roomId: room.roomId,
      name: room.name || `Room #${room.roomId}`,
      description: room.description || "",
      category: room.category || "General",
      isPublic: room.isPublic,
      isPasswordProtected: room.isPasswordProtected,
      creatorUsername: room.creatorUsername || "",
      moderators: room.moderators || [],
      pinnedMessage: room.pinnedMessage || null,
    });
  } catch (err) {
    console.error("Room join failed:", err);
    res.status(500).json({ error: "Could not join room" });
  }
});

// ---- Profile & Social Routes (logged-in users & guest sessions) ----

app.get("/api/profile", requireUserOrGuest, async (req, res) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = (await User.findById(req.user._id).lean()) || req.user;
      const rooms = [...(user.joinedRooms || [])].sort((a, b) => b.joinedAt - a.joinedAt);
      return res.json({
        username: user.username,
        email: user.email || "",
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || "",
        college: user.college || "",
        interests: user.interests || [],
        isPublicProfile: user.isPublicProfile ?? true,
        isOnboarded: Boolean(user.isOnboarded),
        joinedRooms: rooms,
      });
    }
    if (req.session && req.session.guestUsername) {
      return res.json({
        username: req.session.guestUsername,
        email: "",
        avatarUrl: req.session.guestAvatarUrl || null,
        bio: req.session.guestBio || "",
        college: req.session.guestCollege || "",
        interests: req.session.guestInterests || [],
        isPublicProfile: req.session.guestIsPublicProfile ?? true,
        isOnboarded: Boolean(req.session.guestIsOnboarded),
        joinedRooms: [],
      });
    }
  } catch (err) {
    console.error("Fetch profile failed:", err);
    res.status(500).json({ error: "Could not fetch profile" });
  }
});

app.put("/api/profile/username", requireUserOrGuest, async (req, res) => {
  try {
    const newUsername = String(req.body.username || "").trim().slice(0, 24);
    if (!newUsername || !/^[a-zA-Z0-9_]{3,24}$/.test(newUsername)) {
      return res.status(400).json({ error: "Username must be 3-24 characters using letters, numbers, and underscores." });
    }
    if (/^Guest/i.test(newUsername)) {
      return res.status(400).json({ error: "Usernames starting with 'Guest' are reserved." });
    }
    const taken = await User.findOne({
      username: { $regex: new RegExp(`^${newUsername}$`, "i") },
    });

    if (req.isAuthenticated && req.isAuthenticated()) {
      if (taken && String(taken._id) !== String(req.user._id)) {
        return res.status(409).json({ error: "That username is already taken by another user." });
      }
      const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: { username: newUsername } }, { new: true });
      req.user = updatedUser;
      return res.json({ username: updatedUser.username });
    }

    if (req.session && req.session.guestUsername) {
      if (taken) {
        return res.status(409).json({ error: "That username is already taken by another user." });
      }
      req.session.guestUsername = newUsername;
      await new Promise((resolve) => req.session.save(resolve));
      return res.json({ username: newUsername });
    }
  } catch (err) {
    console.error("Username update failed:", err);
    res.status(500).json({ error: "Could not update username" });
  }
});

app.post("/api/profile/avatar", requireUserOrGuest, uploadAvatar.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No avatar image provided or invalid format" });
  }
  const avatarUrl = `/avatars/${req.file.filename}`;
  let updatedUsername = "";

  if (req.isAuthenticated && req.isAuthenticated()) {
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: { avatarUrl } }, { new: true });
    req.user = updatedUser;
    updatedUsername = updatedUser.username;
  } else if (req.session && req.session.guestUsername) {
    req.session.guestAvatarUrl = avatarUrl;
    updatedUsername = req.session.guestUsername;
    await new Promise((resolve) => req.session.save(resolve));
  }

  if (updatedUsername) {
    io.emit("user_avatar_updated", {
      username: updatedUsername,
      avatarUrl,
    });
    // Broadcast user_list update to all rooms where the user is active
    for (const socketId of Object.keys(activeUsers)) {
      const u = activeUsers[socketId];
      if (u && u.username === updatedUsername && u.room) {
        getUsersInRoom(u.room)
          .then((occupants) => {
            io.to(u.room).emit("user_list", occupants);
          })
          .catch(() => {});
      }
    }
  }

  return res.json({ avatarUrl });
});

app.put("/api/profile/bio", requireUserOrGuest, async (req, res) => {
  const bio = String(req.body.bio || "").trim().slice(0, 160);
  if (req.isAuthenticated && req.isAuthenticated()) {
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: { bio } }, { new: true });
    req.user = updatedUser;
    return res.json({ bio: updatedUser.bio });
  }
  if (req.session && req.session.guestUsername) {
    req.session.guestBio = bio;
    await new Promise((resolve) => req.session.save(resolve));
    return res.json({ bio });
  }
});

// Save initial Onboarding preferences
app.put("/api/profile/onboarding", requireUserOrGuest, async (req, res) => {
  try {
    const { interests, college, isPublicProfile } = req.body;
    const cleanInterests = Array.isArray(interests)
      ? interests.map((i) => String(i).trim().slice(0, 30)).filter(Boolean).slice(0, 10)
      : [];
    const cleanCollege = typeof college === "string" ? college.trim().slice(0, 100) : "";
    const cleanPrivacy = typeof isPublicProfile === "boolean" ? isPublicProfile : true;

    if (req.isAuthenticated && req.isAuthenticated()) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            interests: cleanInterests,
            college: cleanCollege,
            isPublicProfile: cleanPrivacy,
            isOnboarded: true,
          },
        },
        { new: true }
      );
      req.user = updatedUser;
      return res.json({
        success: true,
        interests: updatedUser.interests,
        college: updatedUser.college,
        isPublicProfile: updatedUser.isPublicProfile,
        isOnboarded: true,
      });
    }

    if (req.session && req.session.guestUsername) {
      req.session.guestInterests = cleanInterests;
      req.session.guestCollege = cleanCollege;
      req.session.guestIsPublicProfile = cleanPrivacy;
      req.session.guestIsOnboarded = true;
      await new Promise((resolve) => req.session.save(resolve));
      return res.json({
        success: true,
        interests: cleanInterests,
        college: cleanCollege,
        isPublicProfile: cleanPrivacy,
        isOnboarded: true,
      });
    }
  } catch (err) {
    console.error("Onboarding failed:", err);
    res.status(500).json({ error: "Could not save onboarding preferences" });
  }
});

// Update rich profile details (Bio, College, Interests, Privacy)
app.put("/api/profile/details", requireUserOrGuest, async (req, res) => {
  try {
    const { bio, college, interests, isPublicProfile } = req.body;
    const update = {};
    if (typeof bio === "string") update.bio = bio.trim().slice(0, 160);
    if (typeof college === "string") update.college = college.trim().slice(0, 100);
    if (Array.isArray(interests)) {
      update.interests = interests.map((i) => String(i).trim().slice(0, 30)).filter(Boolean).slice(0, 10);
    }
    if (typeof isPublicProfile === "boolean") update.isPublicProfile = isPublicProfile;

    if (req.isAuthenticated && req.isAuthenticated()) {
      const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
      req.user = updatedUser;
      return res.json({
        success: true,
        bio: updatedUser.bio,
        college: updatedUser.college,
        interests: updatedUser.interests,
        isPublicProfile: updatedUser.isPublicProfile,
      });
    }

    if (req.session && req.session.guestUsername) {
      if (update.bio !== undefined) req.session.guestBio = update.bio;
      if (update.college !== undefined) req.session.guestCollege = update.college;
      if (update.interests !== undefined) req.session.guestInterests = update.interests;
      if (update.isPublicProfile !== undefined) req.session.guestIsPublicProfile = update.isPublicProfile;
      await new Promise((resolve) => req.session.save(resolve));
      return res.json({
        success: true,
        bio: req.session.guestBio || "",
        college: req.session.guestCollege || "",
        interests: req.session.guestInterests || [],
        isPublicProfile: req.session.guestIsPublicProfile ?? true,
      });
    }
  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ error: "Could not update profile details" });
  }
});

// Lookup any user's profile card (respects privacy toggle & calculates shared interests)
app.get("/api/users/:username", async (req, res) => {
  try {
    const target = await User.findOne({ username: req.params.username })
      .select("username displayName avatarUrl bio college interests isPublicProfile status createdAt")
      .lean();
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }
    const isOnline = Object.values(activeUsers).some((u) => u.username === target.username);

    const currentUsername = req.isAuthenticated && req.isAuthenticated() ? req.user.username : (req.session.guestUsername || "");
    const isSelf = currentUsername === target.username;
    const isPublic = target.isPublicProfile !== false || isSelf;

    let sharedInterests = [];
    if (req.user && Array.isArray(req.user.interests) && Array.isArray(target.interests)) {
      sharedInterests = target.interests.filter((i) => req.user.interests.includes(i));
    }

    if (!isPublic) {
      return res.json({
        username: target.username,
        displayName: target.displayName,
        avatarUrl: target.avatarUrl,
        status: target.status,
        isOnline,
        isPublicProfile: false,
        bio: "",
        college: "",
        interests: [],
        sharedInterests: [],
        createdAt: target.createdAt,
      });
    }

    res.json({
      username: target.username,
      displayName: target.displayName,
      avatarUrl: target.avatarUrl,
      bio: target.bio || "",
      college: target.college || "",
      interests: target.interests || [],
      status: target.status,
      isOnline,
      isPublicProfile: true,
      sharedInterests,
      createdAt: target.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch user profile" });
  }
});

// Suggested Friends algorithm based on shared interests / college
app.get("/api/friends/suggested", requireLogin, async (req, res) => {
  try {
    const myUser = req.user;
    const existingFriendUsernames = (myUser.friends || []).map((f) => f.username);
    existingFriendUsernames.push(myUser.username);

    const candidates = await User.find({
      username: { $nin: existingFriendUsernames },
      isPublicProfile: { $ne: false },
    })
      .select("username avatarUrl bio college interests status")
      .limit(30)
      .lean();

    const myInterests = myUser.interests || [];
    const myCollege = (myUser.college || "").toLowerCase().trim();

    const scored = candidates.map((cand) => {
      const candInterests = cand.interests || [];
      const sharedInterests = candInterests.filter((i) => myInterests.includes(i));
      const candCollege = (cand.college || "").toLowerCase().trim();
      const sameCollege = myCollege && candCollege && myCollege === candCollege;
      const isOnline = Object.values(activeUsers).some((u) => u.username === cand.username);

      let score = sharedInterests.length * 2;
      if (sameCollege) score += 3;
      if (isOnline) score += 1;

      return {
        username: cand.username,
        avatarUrl: cand.avatarUrl,
        bio: cand.bio,
        college: cand.college,
        interests: cand.interests,
        sharedInterests,
        sameCollege: Boolean(sameCollege),
        isOnline,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    res.json({ suggested: scored.slice(0, 10) });
  } catch (err) {
    console.error("Suggested friends failed:", err);
    res.status(500).json({ error: "Could not fetch suggestions" });
  }
});

// In-Room Members List (Host, Moderators, Online Users)
app.get("/api/rooms/:roomId/members", async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "").toUpperCase().trim();
    const room = await Room.findOne({ roomId }).lean();
    if (!room) return res.status(404).json({ error: "Room not found" });

    const host = room.creatorUsername;
    const moderators = room.moderators || [];

    const onlineInRoom = Object.values(activeUsers)
      .filter((u) => u.room === roomId)
      .map((u) => u.username);

    const uniqueUsernames = Array.from(new Set([host, ...moderators, ...onlineInRoom].filter(Boolean)));
    const userDocs = await User.find({ username: { $in: uniqueUsernames } })
      .select("username avatarUrl status college")
      .lean();

    const userDocMap = {};
    userDocs.forEach((d) => { userDocMap[d.username] = d; });

    const members = uniqueUsernames.map((uname) => {
      const isHost = uname === host;
      const isMod = moderators.includes(uname);
      const isOnline = onlineInRoom.includes(uname);
      const doc = userDocMap[uname];

      let role = "Member";
      if (isHost) role = "Host";
      else if (isMod) role = "Moderator";

      return {
        username: uname,
        role,
        isHost,
        isModerator: isMod,
        isOnline,
        avatarUrl: doc?.avatarUrl || null,
        college: doc?.college || "",
      };
    });

    res.json({
      host,
      moderators,
      members,
    });
  } catch (err) {
    console.error("Room members fetch failed:", err);
    res.status(500).json({ error: "Could not fetch room members" });
  }
});

// Room Host Moderator Delegation (Promote/Demote)
app.post("/api/rooms/:roomId/moderators", async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "").toUpperCase().trim();
    const { targetUsername, action } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const currentUsername = req.isAuthenticated && req.isAuthenticated() ? req.user.username : (req.session.guestUsername || "");
    if (room.creatorUsername !== currentUsername) {
      return res.status(403).json({ error: "Only the Room Host can manage moderators." });
    }

    if (action === "promote") {
      if (!room.moderators.includes(targetUsername)) {
        room.moderators.push(targetUsername);
      }
    } else if (action === "demote") {
      room.moderators = room.moderators.filter((m) => m !== targetUsername);
    }

    await room.save();

    io.to(roomId).emit("moderators_updated", {
      roomId,
      moderators: room.moderators,
      targetUsername,
      action,
    });

    res.json({ success: true, moderators: room.moderators });
  } catch (err) {
    console.error("Moderator update failed:", err);
    res.status(500).json({ error: "Could not update moderators" });
  }
});

// ---- Friends System Routes ----

app.get("/api/friends", requireUserOrGuest, async (req, res) => {
  try {
    let friendsList = [];
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = await User.findById(req.user._id).lean();
      friendsList = user?.friends || [];
    } else if (req.session && req.session.guestUsername) {
      friendsList = req.session.guestFriends || [];
    }

    const friendUsernames = friendsList.map((f) => f.username);
    const friendDocs = await User.find({ username: { $in: friendUsernames } })
      .select("username displayName avatarUrl status college interests")
      .lean();

    const userMap = {};
    friendDocs.forEach((u) => {
      userMap[u.username] = u;
    });

    const enriched = friendsList.map((f) => {
      const doc = userMap[f.username];
      const isOnline = Object.values(activeUsers).some((u) => u.username === f.username);
      return {
        username: f.username,
        status: f.status, // "incoming" | "outgoing" | "accepted"
        addedAt: f.addedAt,
        avatarUrl: doc?.avatarUrl || null,
        college: doc?.college || "",
        interests: doc?.interests || [],
        userStatus: doc?.status || "Online",
        isOnline,
      };
    });

    res.json({ friends: enriched });
  } catch (err) {
    console.error("Friends fetch failed:", err);
    res.status(500).json({ error: "Could not fetch friends list" });
  }
});

app.post("/api/friends/request", requireUserOrGuest, async (req, res) => {
  try {
    const currentUsername = req.isAuthenticated && req.isAuthenticated() ? req.user.username : (req.session?.guestUsername || "");
    const targetUsername = String(req.body.username || "").trim();

    if (!targetUsername || targetUsername === currentUsername) {
      return res.status(400).json({ error: "Invalid target user" });
    }

    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.isAuthenticated && req.isAuthenticated()) {
      const currentUser = await User.findById(req.user._id);
      const existing = currentUser.friends.find((f) => f.username === targetUsername);
      if (existing) {
        return res.status(400).json({ error: "Friend request already exists" });
      }

      // Sender gets outgoing/sent status
      currentUser.friends.push({ username: targetUsername, status: "outgoing", addedAt: new Date() });
      await currentUser.save();
    } else if (req.session && req.session.guestUsername) {
      if (!req.session.guestFriends) req.session.guestFriends = [];
      const existing = req.session.guestFriends.find((f) => f.username === targetUsername);
      if (existing) {
        return res.status(400).json({ error: "Friend request already exists" });
      }
      req.session.guestFriends.push({ username: targetUsername, status: "outgoing", addedAt: new Date() });
      await new Promise((resolve) => req.session.save(resolve));
    }

    // Target receiver gets incoming status
    const existingInTarget = targetUser.friends.find((f) => f.username === currentUsername);
    if (!existingInTarget) {
      targetUser.friends.push({ username: currentUsername, status: "incoming", addedAt: new Date() });
      await targetUser.save();
    }

    io.to(`dm::${targetUsername}`).emit("friend_request_received", {
      from: currentUsername,
      avatarUrl: req.user?.avatarUrl || null,
    });

    res.json({ success: true, message: "Friend request sent" });
  } catch (err) {
    console.error("Friend request failed:", err);
    res.status(500).json({ error: "Could not send friend request" });
  }
});

app.post("/api/friends/accept", requireUserOrGuest, async (req, res) => {
  try {
    const currentUsername = req.isAuthenticated && req.isAuthenticated() ? req.user.username : (req.session?.guestUsername || "");
    const senderUsername = String(req.body.username || "").trim();

    if (req.isAuthenticated && req.isAuthenticated()) {
      const currentUser = await User.findById(req.user._id);
      const fIdx = currentUser.friends.findIndex((f) => f.username === senderUsername);
      if (fIdx > -1) {
        currentUser.friends[fIdx].status = "accepted";
      } else {
        currentUser.friends.push({ username: senderUsername, status: "accepted", addedAt: new Date() });
      }
      await currentUser.save();
    } else if (req.session && req.session.guestUsername) {
      if (!req.session.guestFriends) req.session.guestFriends = [];
      const fIdx = req.session.guestFriends.findIndex((f) => f.username === senderUsername);
      if (fIdx > -1) {
        req.session.guestFriends[fIdx].status = "accepted";
      } else {
        req.session.guestFriends.push({ username: senderUsername, status: "accepted", addedAt: new Date() });
      }
      await new Promise((resolve) => req.session.save(resolve));
    }

    const senderUser = await User.findOne({ username: senderUsername });
    if (senderUser) {
      const tIdx = senderUser.friends.findIndex((f) => f.username === currentUsername);
      if (tIdx > -1) {
        senderUser.friends[tIdx].status = "accepted";
      } else {
        senderUser.friends.push({ username: currentUsername, status: "accepted", addedAt: new Date() });
      }
      await senderUser.save();
    }

    io.to(`dm::${senderUsername}`).emit("friend_request_accepted", {
      by: currentUsername,
    });

    res.json({ success: true, message: "Friend request accepted" });
  } catch (err) {
    console.error("Accept friend failed:", err);
    res.status(500).json({ error: "Could not accept friend request" });
  }
});

app.delete("/api/friends/:username", requireUserOrGuest, async (req, res) => {
  try {
    const currentUsername = req.isAuthenticated && req.isAuthenticated() ? req.user.username : (req.session?.guestUsername || "");
    const targetUsername = String(req.params.username || "").trim();

    if (req.isAuthenticated && req.isAuthenticated()) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { friends: { username: targetUsername } },
      });
    } else if (req.session && req.session.guestFriends) {
      req.session.guestFriends = req.session.guestFriends.filter((f) => f.username !== targetUsername);
      await new Promise((resolve) => req.session.save(resolve));
    }

    await User.updateOne(
      { username: targetUsername },
      { $pull: { friends: { username: currentUsername } } }
    );

    res.json({ success: true, message: "Friend relationship removed" });
  } catch (err) {
    console.error("Delete friend failed:", err);
    res.status(500).json({ error: "Could not remove friend" });
  }
});

// ---- Direct Messaging (1-on-1 DMs) Routes ----

app.get("/api/dm/conversations", requireLogin, async (req, res) => {
  try {
    const myName = req.user.username;
    const messages = await DirectMessage.find({
      $or: [{ sender: myName }, { recipient: myName }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const convMap = {};
    messages.forEach((m) => {
      const partner = m.sender === myName ? m.recipient : m.sender;
      if (!convMap[partner]) {
        convMap[partner] = {
          partner,
          lastMessage: m.text || (m.imageUrl ? "📷 Photo" : ""),
          lastTime: m.createdAt,
          unreadCount: 0,
        };
      }
      if (m.recipient === myName && !m.read) {
        convMap[partner].unreadCount++;
      }
    });

    const partners = Object.keys(convMap);
    const partnerDocs = await User.find({ username: { $in: partners } })
      .select("username displayName avatarUrl status")
      .lean();

    const partnerMap = {};
    partnerDocs.forEach((p) => {
      partnerMap[p.username] = p;
    });

    const enriched = Object.values(convMap).map((c) => {
      const doc = partnerMap[c.partner];
      const isOnline = Object.values(activeUsers).some((u) => u.username === c.partner);
      return {
        ...c,
        avatarUrl: doc?.avatarUrl || null,
        userStatus: doc?.status || "Online",
        isOnline,
      };
    });

    res.json({ conversations: enriched });
  } catch (err) {
    console.error("DM conversations failed:", err);
    res.status(500).json({ error: "Could not load conversations" });
  }
});

app.get("/api/dm/:targetUsername/messages", requireLogin, async (req, res) => {
  try {
    const myName = req.user.username;
    const partner = String(req.params.targetUsername).trim();
    const conversationId = [myName, partner].sort().join("::");

    const messages = await DirectMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    await DirectMessage.updateMany(
      { conversationId, recipient: myName, read: false },
      { $set: { read: true } }
    );

    res.json({ messages });
  } catch (err) {
    console.error("DM messages failed:", err);
    res.status(500).json({ error: "Could not load messages" });
  }
});

// Fetch saved message history for a specific room (used by the profile screen)
app.get("/api/rooms/:roomId/messages", requireLogin, async (req, res) => {
  const roomId = String(req.params.roomId || "").toUpperCase();
  const messages = await Message.find({ room: roomId }).sort({ createdAt: 1 }).lean();
  res.json({ messages });
});

// ---- Admin middleware & routes ----
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Admin access required" });
}

app.get("/admin", (req, res) => {
  res.redirect("/admin.html");
});

app.post("/api/admin/login", (req, res) => {
  const inputPassword = String(req.body.password || "").trim();
  const configuredPassword = String(process.env.ADMIN_PASSWORD || "admin123")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (inputPassword && inputPassword === configuredPassword) {
    req.session.isAdmin = true;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Session save failed" });
      }
      return res.json({ success: true, message: "Logged in as admin" });
    });
    return;
  }
  return res.status(401).json({ error: "Invalid admin password" });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.isAdmin = false;
  req.session.save(() => {
    res.json({ success: true, message: "Logged out from admin" });
  });
});

app.get("/api/admin/me", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ isAdmin: true });
  }
  return res.status(401).json({ isAdmin: false });
});

// Admin Stats
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await Room.countDocuments();
    const totalMessages = await Message.countDocuments();

    const onlineSockets = Object.values(activeUsers);
    const activeRoomsSet = new Set(onlineSockets.map((u) => u.room).filter(Boolean));

    res.json({
      totalUsers,
      totalRooms,
      totalMessages,
      onlineUsersCount: onlineSockets.length,
      activeRoomsCount: activeRoomsSet.size,
      onlineUsers: onlineSockets.map((u) => ({
        username: u.username,
        room: u.room,
        isGuest: u.isGuest,
      })),
    });
  } catch (err) {
    console.error("Admin stats failed:", err);
    res.status(500).json({ error: "Could not fetch admin stats" });
  }
});

// Admin Messages (Search & Filter & Paginate)
app.get("/api/admin/messages", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.room) {
      filter.room = String(req.query.room).trim().toUpperCase();
    }
    if (req.query.username) {
      filter.username = { $regex: String(req.query.username).trim(), $options: "i" };
    }
    if (req.query.search) {
      filter.text = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const [messages, total] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments(filter),
    ]);

    res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error("Admin messages failed:", err);
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

app.delete("/api/admin/messages/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Message not found" });
    }
    io.to("admin_channel").emit("admin_live_event", {
      type: "message_deleted",
      messageId: req.params.id,
      text: "A message was deleted by admin.",
      time: new Date(),
    });
    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("Delete message failed:", err);
    res.status(500).json({ error: "Could not delete message" });
  }
});

// Admin Rooms List & Delete
app.get("/api/admin/rooms", requireAdmin, async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate("createdBy", "username email displayName")
      .sort({ createdAt: -1 })
      .lean();

    const roomIds = rooms.map((r) => r.roomId);
    const messageCounts = await Message.aggregate([
      { $match: { room: { $in: roomIds } } },
      { $group: { _id: "$room", count: { $sum: 1 }, lastMessageAt: { $max: "$createdAt" } } },
    ]);

    const countMap = {};
    messageCounts.forEach((mc) => {
      countMap[mc._id] = { count: mc.count, lastMessageAt: mc.lastMessageAt };
    });

    const enrichedRooms = rooms.map((room) => {
      const onlineCount = Object.values(activeUsers).filter((u) => u.room === room.roomId).length;
      return {
        ...room,
        messageCount: countMap[room.roomId]?.count || 0,
        lastMessageAt: countMap[room.roomId]?.lastMessageAt || null,
        onlineCount,
      };
    });

    res.json({ rooms: enrichedRooms });
  } catch (err) {
    console.error("Admin rooms failed:", err);
    res.status(500).json({ error: "Could not fetch rooms" });
  }
});

app.delete("/api/admin/rooms/:roomId", requireAdmin, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "").toUpperCase();
    await Room.deleteOne({ roomId });
    await Message.deleteMany({ room: roomId });
    res.json({ success: true, message: `Room ${roomId} and its messages deleted` });
  } catch (err) {
    console.error("Delete room failed:", err);
    res.status(500).json({ error: "Could not delete room" });
  }
});

// Fetch full history of any room (active or past) for the admin inspector
app.get("/api/admin/rooms/:roomId/history", requireAdmin, async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "").toUpperCase();
    const room = await Room.findOne({ roomId }).populate("createdBy", "username email displayName").lean();
    const messages = await Message.find({ room: roomId, isDeleted: { $ne: true } }).sort({ createdAt: 1 }).lean();
    const onlineUsersInRoom = await getUsersInRoom(roomId);

    res.json({
      roomId,
      room,
      messages,
      totalMessages: messages.length,
      onlineUsers: onlineUsersInRoom,
      isLive: onlineUsersInRoom.length > 0,
    });
  } catch (err) {
    console.error("Room history inspection failed:", err);
    res.status(500).json({ error: "Could not fetch room history" });
  }
});

// Admin Users List & Delete
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (err) {
    console.error("Admin users failed:", err);
    res.status(500).json({ error: "Could not fetch users" });
  }
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Delete user failed:", err);
    res.status(500).json({ error: "Could not delete user" });
  }
});

// ---- Socket.IO ----
const activeUsers = {}; // socketId -> { username, room, isGuest, status }
const spectators = new Set(); // socketId set of invisible admin spectators

async function getUsersInRoom(room) {
  const roomDoc = await Room.findOne({ roomId: room }).lean();
  const host = roomDoc?.creatorUsername || "";
  const mods = Array.isArray(roomDoc?.moderators) ? roomDoc.moderators : [];
  const usersInRoom = Object.values(activeUsers).filter((u) => u.room === room);

  const usernames = usersInRoom.map((u) => u.username);
  const userDocs = await User.find({ username: { $in: usernames } })
    .select("username avatarUrl bio")
    .lean();
  const avatarMap = {};
  const bioMap = {};
  userDocs.forEach((d) => {
    avatarMap[d.username] = d.avatarUrl || null;
    bioMap[d.username] = d.bio || "";
  });

  return usersInRoom.map((u) => ({
    username: u.username,
    status: u.status || "Online",
    avatarUrl: avatarMap[u.username] || null,
    bio: bioMap[u.username] || "",
    isHost: u.username === host,
    isMod: mods.includes(u.username),
  }));
}

function getSocketSession(socket) {
  return new Promise((resolve) => {
    if (socket.request.session && typeof socket.request.session.reload === "function") {
      socket.request.session.reload((err) => {
        if (!err && socket.request.session) {
          return resolve(socket.request.session);
        }
        sessionMiddleware(socket.request, {}, () => {
          resolve(socket.request.session || {});
        });
      });
    } else {
      sessionMiddleware(socket.request, {}, () => {
        resolve(socket.request.session || {});
      });
    }
  });
}

// Figures out who's really on the other end of this socket using the shared session,
// rather than trusting whatever the client claims to be.
async function resolveIdentity(socket) {
  const sess = await getSocketSession(socket);
  if (!sess) return null;

  if (sess.passport && sess.passport.user) {
    const dbUser = await User.findById(sess.passport.user);
    if (dbUser) return { username: dbUser.username, isGuest: false, status: dbUser.status || "Online", avatarUrl: dbUser.avatarUrl || null };
  }

  if (sess.guestUsername) {
    return { username: sess.guestUsername, isGuest: true, status: "Online", avatarUrl: null };
  }

  return null;
}

io.on("connection", (socket) => {
  // Allow client to subscribe to personal DM channel
  socket.on("join_dm_channel", async () => {
    const identity = await resolveIdentity(socket);
    if (identity) {
      socket.join(`dm::${identity.username}`);
    }
  });

  // Allow admin client to subscribe to live real-time server feed
  socket.on("admin_join", async () => {
    const sess = await getSocketSession(socket);
    if (sess && sess.isAdmin) {
      socket.join("admin_channel");
    }
  });

  // Ghost Spectator Mode: Join room invisibly without alerts or appearing in user list
  socket.on("admin_spectate_room", async ({ room }) => {
    const sess = await getSocketSession(socket);
    if (!sess || !sess.isAdmin) {
      socket.emit("auth_error", "Admin access required.");
      return;
    }

    const safeRoom = String(room || "").toUpperCase().slice(0, 12);
    socket.join(safeRoom);
    spectators.add(socket.id);

    try {
      const history = await Message.find({ room: safeRoom, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      
      const currentOccupants = await getUsersInRoom(safeRoom);

      socket.emit("spectate_history", {
        room: safeRoom,
        messages: history.reverse(),
        occupants: currentOccupants,
      });
    } catch (err) {
      console.error("Failed to load spectate history:", err);
      socket.emit("spectate_history", { room: safeRoom, messages: [], occupants: [] });
    }
  });

  // Exit Ghost Spectator Mode cleanly
  socket.on("admin_leave_spectate", async ({ room }) => {
    const sess = await getSocketSession(socket);
    if (!sess || !sess.isAdmin) return;

    if (room) {
      const safeRoom = String(room || "").toUpperCase().slice(0, 12);
      socket.leave(safeRoom);
    }
    spectators.delete(socket.id);
  });

  socket.on("join_room", async ({ room }) => {
    let identity = await resolveIdentity(socket);
    if (!identity) {
      // Small grace delay for session cookie propagation if just logged in
      await new Promise((r) => setTimeout(r, 200));
      identity = await resolveIdentity(socket);
    }

    if (!identity) {
      socket.emit("auth_error", "Please sign in again.");
      return;
    }

    const safeRoom = String(room || "").toUpperCase().slice(0, 12);

    socket.join(safeRoom);
    socket.join(`dm::${identity.username}`);

    activeUsers[socket.id] = {
      username: identity.username,
      room: safeRoom,
      isGuest: identity.isGuest,
      status: identity.status || "Online",
    };

    // Load persistent history from MongoDB
    try {
      const history = await Message.find({ room: safeRoom, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const authors = [...new Set(history.map((m) => m.username))];
      const authorDocs = await User.find({ username: { $in: authors } }).select("username avatarUrl").lean();
      const authorAvatarMap = {};
      authorDocs.forEach((a) => {
        authorAvatarMap[a.username] = a.avatarUrl || null;
      });

      const enrichedHistory = history.reverse().map((m) => ({
        ...m,
        messageId: String(m._id),
        user: m.username,
        avatarUrl: authorAvatarMap[m.username] || null,
        time: m.createdAt,
      }));

      const roomDoc = await Room.findOne({ roomId: safeRoom }).lean();
      socket.emit("room_history", {
        messages: enrichedHistory,
        roomInfo: {
          roomId: safeRoom,
          name: roomDoc?.name || `Room #${safeRoom}`,
          description: roomDoc?.description || "",
          category: roomDoc?.category || "General",
          isPublic: roomDoc?.isPublic ?? true,
          isPasswordProtected: Boolean(roomDoc?.isPasswordProtected),
          creatorUsername: roomDoc?.creatorUsername || "",
          moderators: roomDoc?.moderators || [],
          pinnedMessage: roomDoc?.pinnedMessage || null,
        },
      });
    } catch (err) {
      console.error("Failed to load history:", err);
      socket.emit("room_history", { messages: [], roomInfo: { roomId: safeRoom, name: `Room #${safeRoom}` } });
    }

    io.to(safeRoom).emit("system_message", `${identity.username} joined the room.`);
    const occupants = await getUsersInRoom(safeRoom);
    io.to(safeRoom).emit("user_list", occupants);

    // Notify admin channel
    io.to("admin_channel").emit("admin_live_event", {
      type: "user_joined",
      user: identity.username,
      room: safeRoom,
      isGuest: identity.isGuest,
      time: new Date(),
    });
  });

  socket.on("leave_room", async () => {
    const user = activeUsers[socket.id];
    if (user) {
      socket.leave(user.room);
      io.to(user.room).emit("system_message", `${user.username} left the room.`);
      io.to("admin_channel").emit("admin_live_event", {
        type: "user_left",
        user: user.username,
        room: user.room,
        time: new Date(),
      });
      delete activeUsers[socket.id];
      const occupants = await getUsersInRoom(user.room);
      io.to(user.room).emit("user_list", occupants);
    }
  });

  socket.on("set_status", async ({ status }) => {
    const user = activeUsers[socket.id];
    if (!user) return;

    const validStatuses = ["Online", "Studying", "Gaming", "Chilling", "Listening", "DND"];
    const cleanStatus = validStatuses.includes(status) ? status : "Online";

    user.status = cleanStatus;

    // If registered user, update in MongoDB
    const sess = await getSocketSession(socket);
    if (sess?.passport?.user) {
      await User.findByIdAndUpdate(sess.passport.user, { status: cleanStatus }).catch(() => {});
    }

    const occupants = await getUsersInRoom(user.room);
    io.to(user.room).emit("user_list", occupants);
  });

  // ---- 1-on-1 Direct Messaging Sockets ----

  socket.on("send_dm", async ({ recipient, text, imageUrl }) => {
    const identity = await resolveIdentity(socket);
    if (!identity || identity.isGuest) {
      socket.emit("auth_error", "Please sign in with Google to send direct messages.");
      return;
    }

    const cleanRecipient = String(recipient || "").trim();
    const cleanText = String(text || "").trim().slice(0, 1000);
    const cleanImg = imageUrl ? String(imageUrl).slice(0, 500) : null;

    if (!cleanRecipient || cleanRecipient === identity.username || (!cleanText && !cleanImg)) {
      return;
    }

    const conversationId = [identity.username, cleanRecipient].sort().join("::");

    try {
      const saved = await DirectMessage.create({
        conversationId,
        sender: identity.username,
        recipient: cleanRecipient,
        text: cleanText,
        imageUrl: cleanImg,
        read: false,
      });

      const dmPayload = {
        _id: String(saved._id),
        conversationId: saved.conversationId,
        sender: saved.sender,
        recipient: saved.recipient,
        text: saved.text,
        imageUrl: saved.imageUrl,
        createdAt: saved.createdAt,
      };

      io.to(`dm::${cleanRecipient}`).emit("receive_dm", dmPayload);
      io.to(`dm::${identity.username}`).emit("receive_dm", dmPayload);

      // Broadcast to admin channel
      io.to("admin_channel").emit("admin_live_event", {
        type: "direct_message",
        sender: identity.username,
        recipient: cleanRecipient,
        text: saved.text || (saved.imageUrl ? "[Photo]" : ""),
        time: saved.createdAt,
      });
    } catch (err) {
      console.error("Failed to save direct message:", err);
    }
  });

  socket.on("dm_typing", async ({ recipient }) => {
    const identity = await resolveIdentity(socket);
    if (identity && recipient) {
      io.to(`dm::${recipient}`).emit("dm_display_typing", { sender: identity.username });
    }
  });

  socket.on("dm_read", async ({ partner }) => {
    const identity = await resolveIdentity(socket);
    if (identity && partner) {
      const conversationId = [identity.username, partner].sort().join("::");
      await DirectMessage.updateMany(
        { conversationId, recipient: identity.username, read: false },
        { $set: { read: true } }
      );
      io.to(`dm::${partner}`).emit("dm_messages_read", { reader: identity.username });
    }
  });

  // ---- Chatroom Sockets ----

  socket.on("send_message", async (payload) => {
    const user = activeUsers[socket.id];
    if (!user || !payload) return;

    const rawText = typeof payload === "object" ? payload.text : payload;
    const cleanText = String(rawText || "").trim().slice(0, 1000);
    const imageUrl = typeof payload === "object" && payload.imageUrl ? String(payload.imageUrl).slice(0, 500) : null;

    if (!cleanText && !imageUrl) return;

    const replyTo = typeof payload === "object" && payload.replyTo ? {
      messageId: payload.replyTo.messageId ? String(payload.replyTo.messageId) : null,
      username: String(payload.replyTo.username || "").slice(0, 50),
      text: String(payload.replyTo.text || "").slice(0, 150),
    } : null;

    try {
      const saved = await Message.create({
        room: user.room,
        username: user.username,
        text: cleanText,
        imageUrl,
        replyTo,
        reactions: [],
      });

      // Get user avatar
      const userDoc = await User.findOne({ username: user.username }).select("avatarUrl").lean();

      const messagePayload = {
        id: socket.id,
        messageId: String(saved._id),
        user: saved.username,
        avatarUrl: userDoc?.avatarUrl || null,
        text: saved.text,
        imageUrl: saved.imageUrl,
        replyTo: saved.replyTo,
        time: saved.createdAt,
        reactions: [],
      };

      io.to(user.room).emit("receive_message", messagePayload);

      // Broadcast to admin live stream
      io.to("admin_channel").emit("admin_live_event", {
        type: user.isGuest ? "guest_message" : "user_message",
        messageId: String(saved._id),
        user: saved.username,
        room: user.room,
        text: saved.text || (saved.imageUrl ? "[Image Attachment]" : ""),
        time: saved.createdAt,
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  });

  socket.on("create_poll", async ({ question, options }) => {
    const user = activeUsers[socket.id];
    if (!user || !question || !Array.isArray(options) || options.length < 2) return;

    const cleanQuestion = String(question).trim().slice(0, 200);
    const cleanOptions = options
      .map((opt) => String(opt || "").trim().slice(0, 100))
      .filter((opt) => opt.length > 0)
      .slice(0, 6)
      .map((text) => ({ text, votes: [] }));

    if (!cleanQuestion || cleanOptions.length < 2) return;

    try {
      const saved = await Message.create({
        room: user.room,
        username: user.username,
        text: `📊 Poll: ${cleanQuestion}`,
        poll: {
          question: cleanQuestion,
          options: cleanOptions,
          closed: false,
        },
        reactions: [],
      });

      const messagePayload = {
        id: socket.id,
        messageId: String(saved._id),
        user: saved.username,
        text: saved.text,
        poll: saved.poll,
        time: saved.createdAt,
        reactions: [],
      };

      io.to(user.room).emit("receive_message", messagePayload);

      // Broadcast to admin live stream
      io.to("admin_channel").emit("admin_live_event", {
        type: "poll_created",
        room: user.room,
        user: user.username,
        question: cleanQuestion,
        time: new Date(),
      });
    } catch (err) {
      console.error("Failed to create poll:", err);
    }
  });

  socket.on("vote_poll", async ({ messageId, optionIndex }) => {
    let user = activeUsers[socket.id];
    const cleanId = String(messageId || "").trim();
    if (!cleanId || typeof optionIndex !== "number") return;

    try {
      const message = await Message.findById(cleanId);
      if (!message || !message.poll || !message.poll.options) return;

      if (!user) {
        const identity = await resolveIdentity(socket);
        if (identity) {
          user = { username: identity.username, room: message.room, isGuest: identity.isGuest, status: identity.status || "Online" };
          activeUsers[socket.id] = user;
          socket.join(message.room);
        }
      }
      if (!user) return;

      // Toggle or change option vote
      const options = message.poll.options.map((opt, idx) => {
        let votes = Array.isArray(opt.votes) ? [...opt.votes] : [];
        const userIdx = votes.indexOf(user.username);

        if (idx === optionIndex) {
          if (userIdx === -1) {
            votes.push(user.username);
          } else {
            votes.splice(userIdx, 1);
          }
        } else {
          if (userIdx !== -1) {
            votes.splice(userIdx, 1);
          }
        }
        return { text: opt.text, votes };
      });

      message.poll.options = options;
      message.markModified("poll");
      await message.save();

      io.to(message.room).emit("poll_updated", {
        messageId: String(message._id),
        poll: message.poll,
      });
    } catch (err) {
      console.error("Failed to vote in poll:", err);
    }
  });

  socket.on("pin_message", async ({ messageId }) => {
    const user = activeUsers[socket.id];
    const cleanId = String(messageId || "").trim();
    if (!user || !cleanId) return;

    try {
      const roomDoc = await Room.findOne({ roomId: user.room });
      if (!roomDoc) return;

      const isHost = roomDoc.creatorUsername === user.username;
      const isMod = Array.isArray(roomDoc.moderators) && roomDoc.moderators.includes(user.username);
      if (!isHost && !isMod) return;

      const message = await Message.findById(cleanId);
      if (!message) return;

      roomDoc.pinnedMessage = {
        messageId: message._id,
        text: message.text || (message.imageUrl ? "📷 Image Attachment" : "Pinned Message"),
        username: message.username,
        pinnedAt: new Date(),
      };
      await roomDoc.save();

      io.to(user.room).emit("pinned_message_updated", roomDoc.pinnedMessage);
      io.to(user.room).emit("system_message", `📌 ${user.username} pinned a message.`);

      io.to("admin_channel").emit("admin_live_event", {
        type: "message_pinned",
        room: user.room,
        user: user.username,
        text: roomDoc.pinnedMessage.text,
        time: new Date(),
      });
    } catch (err) {
      console.error("Failed to pin message:", err);
    }
  });

  socket.on("unpin_message", async () => {
    const user = activeUsers[socket.id];
    if (!user) return;

    try {
      const roomDoc = await Room.findOne({ roomId: user.room });
      if (!roomDoc) return;

      const isHost = roomDoc.creatorUsername === user.username;
      const isMod = Array.isArray(roomDoc.moderators) && roomDoc.moderators.includes(user.username);
      if (!isHost && !isMod) return;

      roomDoc.pinnedMessage = null;
      await roomDoc.save();

      io.to(user.room).emit("pinned_message_updated", null);
      io.to(user.room).emit("system_message", `📌 ${user.username} unpinned the announcement.`);

      io.to("admin_channel").emit("admin_live_event", {
        type: "message_unpinned",
        room: user.room,
        user: user.username,
        time: new Date(),
      });
    } catch (err) {
      console.error("Failed to unpin message:", err);
    }
  });

  socket.on("delete_message", async ({ messageId }) => {
    const user = activeUsers[socket.id];
    const cleanId = String(messageId || "").trim();
    if (!user || !cleanId) return;

    try {
      const message = await Message.findById(cleanId);
      if (!message) return;

      const roomDoc = await Room.findOne({ roomId: user.room }).lean();
      const isHost = roomDoc?.creatorUsername === user.username;
      const isMod = Array.isArray(roomDoc?.moderators) && roomDoc.moderators.includes(user.username);
      const isAuthor = message.username === user.username;

      if (!isAuthor && !isHost && !isMod) return;

      await Message.findByIdAndDelete(cleanId);

      // If deleted message was pinned, clear pin
      if (roomDoc?.pinnedMessage?.messageId && String(roomDoc.pinnedMessage.messageId) === String(cleanId)) {
        await Room.updateOne({ roomId: user.room }, { $set: { pinnedMessage: null } });
        io.to(user.room).emit("pinned_message_updated", null);
      }

      io.to(user.room).emit("message_deleted", { messageId: String(message._id) });

      io.to("admin_channel").emit("admin_live_event", {
        type: "message_deleted",
        room: user.room,
        user: user.username,
        messageId: cleanId,
        text: `Message #${cleanId} in #${user.room} was deleted by ${user.username}.`,
        time: new Date(),
      });
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  });

  socket.on("kick_user", async ({ username }) => {
    const user = activeUsers[socket.id];
    const targetUser = String(username || "").trim();
    if (!user || !targetUser || targetUser === user.username) return;

    try {
      const roomDoc = await Room.findOne({ roomId: user.room }).lean();
      const isHost = roomDoc?.creatorUsername === user.username;
      const isMod = Array.isArray(roomDoc?.moderators) && roomDoc.moderators.includes(user.username);
      if (!isHost && !isMod) return;

      const targetEntry = Object.entries(activeUsers).find(
        ([sid, u]) => u.room === user.room && u.username === targetUser
      );

      if (targetEntry) {
        const [targetSocketId] = targetEntry;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(user.room);
          targetSocket.emit("kicked_from_room", { reason: `You were removed from #${user.room} by ${user.username}.` });
        }
        delete activeUsers[targetSocketId];

        io.to(user.room).emit("system_message", `🚫 ${targetUser} was removed from the room by ${user.username}.`);
        const occupants = await getUsersInRoom(user.room);
        io.to(user.room).emit("user_list", occupants);

        io.to("admin_channel").emit("admin_live_event", {
          type: "user_kicked",
          room: user.room,
          user: targetUser,
          kickedBy: user.username,
          time: new Date(),
        });
      }
    } catch (err) {
      console.error("Failed to kick user:", err);
    }
  });

  socket.on("toggle_reaction", async ({ messageId, emoji }) => {
    const cleanId = String(messageId || "").trim();
    const cleanEmoji = String(emoji || "").trim();
    if (!cleanId || !cleanEmoji) return;

    const allowedEmojis = ["👍", "❤️", "😂", "🔥", "🎉", "🚀"];
    if (!allowedEmojis.includes(cleanEmoji)) return;

    try {
      const message = await Message.findById(cleanId);
      if (!message) return;

      let user = activeUsers[socket.id];
      if (!user) {
        const identity = await resolveIdentity(socket);
        if (identity) {
          user = { username: identity.username, room: message.room, isGuest: identity.isGuest };
          activeUsers[socket.id] = user;
          socket.join(message.room);
        }
      }

      // Convert to clean plain JS array first
      let reactions = message.reactions && message.reactions.length
        ? message.reactions.map((r) => ({
            emoji: r.emoji,
            count: r.count || 0,
            users: Array.isArray(r.users) ? [...r.users] : [],
          }))
        : [];

      let reactionIndex = reactions.findIndex((r) => r.emoji === cleanEmoji);
      if (reactionIndex === -1) {
        // Add new reaction with user
        reactions.push({
          emoji: cleanEmoji,
          count: 1,
          users: [user.username],
        });
      } else {
        const entry = reactions[reactionIndex];
        const userIndex = entry.users.indexOf(user.username);
        if (userIndex > -1) {
          // Toggle off
          entry.users.splice(userIndex, 1);
          entry.count = entry.users.length;
        } else {
          // Add user
          entry.users.push(user.username);
          entry.count = entry.users.length;
        }
      }

      // Filter out empty reactions
      const cleanedReactions = reactions.filter((r) => r.count > 0);

      message.reactions = cleanedReactions;
      message.markModified("reactions");
      await message.save();

      // Broadcast to room
      io.to(message.room).emit("message_reaction_updated", {
        messageId: String(message._id),
        reactions: cleanedReactions,
      });

      // Broadcast to admin channel
      io.to("admin_channel").emit("admin_live_event", {
        type: "reaction_updated",
        room: message.room,
        user: user.username,
        emoji: cleanEmoji,
        messageId: String(message._id),
        time: new Date(),
      });
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  });

  socket.on("typing", () => {
    const user = activeUsers[socket.id];
    if (!user) return;
    socket.to(user.room).emit("display_typing", user.username);
  });

  socket.on("disconnect", async () => {
    spectators.delete(socket.id);
    const user = activeUsers[socket.id];
    if (user) {
      io.to(user.room).emit("system_message", `${user.username} left the room.`);
      io.to("admin_channel").emit("admin_live_event", {
        type: "user_disconnect",
        user: user.username,
        room: user.room,
        time: new Date(),
      });
      delete activeUsers[socket.id];
      const occupants = await getUsersInRoom(user.room);
      io.to(user.room).emit("user_list", occupants);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chatroom server running on port ${PORT}`);
});
