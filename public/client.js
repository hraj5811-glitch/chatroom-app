const socket = io();

// Screens
const authScreen = document.getElementById("auth-screen");
const roomChoiceScreen = document.getElementById("room-choice-screen");
const roomCreatedScreen = document.getElementById("room-created-screen");
const profileScreen = document.getElementById("profile-screen");
const chatScreen = document.getElementById("chat-screen");

// Auth screen
const guestBtn = document.getElementById("guest-btn");

// Room choice screen
const signedInAs = document.getElementById("signed-in-as");
const joinForm = document.getElementById("join-form");
const roomInput = document.getElementById("room-input");
const joinError = document.getElementById("join-error");
const createRoomBtn = document.getElementById("create-room-btn");
const profileLink = document.getElementById("profile-link");

// Room created screen
const newRoomIdEl = document.getElementById("new-room-id");
const copyRoomIdBtn = document.getElementById("copy-room-id");
const enterRoomBtn = document.getElementById("enter-room-btn");

// Profile screen
const usernameInput = document.getElementById("username-input");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameMsg = document.getElementById("username-msg");
const roomsList = document.getElementById("rooms-list");
const roomMessagesPreview = document.getElementById("room-messages-preview");
const backToRoomsBtn = document.getElementById("back-to-rooms-btn");

// Chat screen
const roomTitle = document.getElementById("room-title");
const userList = document.getElementById("user-list");
const messagesEl = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const themeToggle = document.getElementById("theme-toggle");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");
const backToChoiceLink = document.getElementById("back-to-choice-link");

let myUsername = "";
let myIsGuest = true;
let pendingRoomId = "";
let typingTimeout = null;

function showScreen(screen) {
  [authScreen, roomChoiceScreen, roomCreatedScreen, profileScreen, chatScreen].forEach((s) =>
    s.classList.add("hidden")
  );
  screen.classList.remove("hidden");
}

// ---- Check auth status on page load ----
async function checkAuth() {
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      myUsername = data.username;
      myIsGuest = data.isGuest;
      showRoomChoiceScreen();
    } else {
      showScreen(authScreen);
    }
  } catch (err) {
    showScreen(authScreen);
  }
}

function showRoomChoiceScreen() {
  showScreen(roomChoiceScreen);
  signedInAs.textContent = `Signed in as ${myUsername}`;
  profileLink.classList.toggle("hidden", myIsGuest);
  roomInput.value = "";
  joinError.classList.add("hidden");
  roomInput.focus();
}

guestBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/guest", { method: "POST" });
    const data = await res.json();
    myUsername = data.username;
    myIsGuest = true;
    showRoomChoiceScreen();
  } catch (err) {
    alert("Could not start guest session. Please try again.");
  }
});

checkAuth();

// ---- Theme toggle (default = light aurora theme, toggle switches to dark) ----
const savedTheme = localStorage.getItem("chat-theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark-theme");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("chat-theme", isDark ? "dark" : "light");
});

// ---- Emoji picker ----
const EMOJIS = ["😀", "😂", "😍", "😎", "🤔", "😢", "😡", "👍", "👎", "🙏", "🔥", "🎉", "❤️", "💯", "😱", "🤝", "👀", "✅"];

EMOJIS.forEach((emoji) => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.addEventListener("click", () => {
    messageInput.value += emoji;
    messageInput.focus();
  });
  emojiPanel.appendChild(span);
});

emojiBtn.addEventListener("click", () => {
  emojiPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.classList.add("hidden");
  }
});

// ---- Join an existing room by ID ----
joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const roomId = roomInput.value.trim().toUpperCase();
  joinError.classList.add("hidden");

  if (!roomId) {
    joinError.textContent = "Enter a room ID first, or create a new room.";
    joinError.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    const data = await res.json();

    if (!res.ok) {
      joinError.textContent = data.error || "Could not join that room.";
      joinError.classList.remove("hidden");
      return;
    }

    enterChat(data.roomId);
  } catch (err) {
    joinError.textContent = "Something went wrong. Try again.";
    joinError.classList.remove("hidden");
  }
});

// ---- Create a new room ----
createRoomBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/rooms/create", { method: "POST" });
    const data = await res.json();
    pendingRoomId = data.roomId;
    newRoomIdEl.textContent = data.roomId;
    showScreen(roomCreatedScreen);
  } catch (err) {
    alert("Could not create a room. Please try again.");
  }
});

copyRoomIdBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(pendingRoomId).then(() => {
    copyRoomIdBtn.textContent = "✅";
    setTimeout(() => (copyRoomIdBtn.textContent = "📋"), 1500);
  });
});

enterRoomBtn.addEventListener("click", () => {
  enterChat(pendingRoomId);
});

// ---- Profile screen ----
profileLink.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const data = await res.json();

    usernameInput.value = data.username;
    usernameMsg.classList.add("hidden");
    roomMessagesPreview.classList.add("hidden");
    roomMessagesPreview.innerHTML = "";

    roomsList.innerHTML = "";
    if (!data.joinedRooms.length) {
      roomsList.innerHTML = `<p class="sub">No rooms yet — join or create one!</p>`;
    } else {
      data.joinedRooms.forEach((r) => {
        const row = document.createElement("div");
        row.className = "room-list-item";
        const date = new Date(r.joinedAt).toLocaleDateString();
        row.innerHTML = `
          <span class="room-list-id">${r.roomId}</span>
          <span class="room-list-date">${date}</span>
          <button class="room-view-btn" data-room="${r.roomId}">View chat</button>
          <button class="room-rejoin-btn" data-room="${r.roomId}">Rejoin</button>
        `;
        roomsList.appendChild(row);
      });
    }

    showScreen(profileScreen);
  } catch (err) {
    alert("Could not load your profile.");
  }
});

roomsList.addEventListener("click", async (e) => {
  const roomId = e.target.dataset.room;
  if (!roomId) return;

  if (e.target.classList.contains("room-rejoin-btn")) {
    enterChat(roomId);
    return;
  }

  if (e.target.classList.contains("room-view-btn")) {
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`);
      const data = await res.json();
      roomMessagesPreview.innerHTML = `<h4>Messages in ${roomId}</h4>`;
      if (!data.messages.length) {
        roomMessagesPreview.innerHTML += `<p class="sub">No saved messages in this room yet.</p>`;
      } else {
        data.messages.forEach((m) => {
          const line = document.createElement("p");
          line.className = "preview-line";
          const time = new Date(m.createdAt).toLocaleString();
          
          const strong = document.createElement("strong");
          strong.textContent = m.username;
          const timeSpan = document.createElement("span");
          timeSpan.className = "sub";
          timeSpan.textContent = ` (${time}): `;
          const textNode = document.createTextNode(m.text);

          line.appendChild(strong);
          line.appendChild(timeSpan);
          line.appendChild(textNode);
          roomMessagesPreview.appendChild(line);
        });
      }
      roomMessagesPreview.classList.remove("hidden");
    } catch (err) {
      alert("Could not load messages for this room.");
    }
  }
});

saveUsernameBtn.addEventListener("click", async () => {
  const newUsername = usernameInput.value.trim();
  usernameMsg.classList.add("hidden");

  try {
    const res = await fetch("/api/profile/username", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername }),
    });
    const data = await res.json();

    if (!res.ok) {
      usernameMsg.textContent = data.error || "Could not update username.";
      usernameMsg.classList.remove("hidden");
      return;
    }

    myUsername = data.username;
    usernameMsg.textContent = "Saved!";
    usernameMsg.style.color = "var(--primary)";
    usernameMsg.classList.remove("hidden");
  } catch (err) {
    usernameMsg.textContent = "Something went wrong.";
    usernameMsg.classList.remove("hidden");
  }
});

backToRoomsBtn.addEventListener("click", () => {
  showRoomChoiceScreen();
});

// ---- Enter the live chat room ----
function enterChat(roomId) {
  socket.emit("join_room", { room: roomId });
  showScreen(chatScreen);
  roomTitle.textContent = `# ${roomId}`;
  messagesEl.innerHTML = "";
  messageInput.focus();
}

backToChoiceLink.addEventListener("click", (e) => {
  e.preventDefault();
  socket.emit("leave_room");
  showRoomChoiceScreen();
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit("send_message", text);
  messageInput.value = "";
});

messageInput.addEventListener("input", () => {
  socket.emit("typing");
});

socket.on("room_history", (history) => {
  messagesEl.innerHTML = "";
  history.forEach((m) =>
    renderMessage({ user: m.username, text: m.text, time: m.createdAt })
  );
  scrollToBottom();
});

socket.on("receive_message", (message) => {
  renderMessage(message);
  scrollToBottom();
});

socket.on("system_message", (text) => {
  const div = document.createElement("div");
  div.className = "system-message";
  div.textContent = text;
  messagesEl.appendChild(div);
  scrollToBottom();
});

socket.on("user_list", (users) => {
  userList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    userList.appendChild(li);
  });
});

socket.on("display_typing", (username) => {
  typingIndicator.textContent = `${username} is typing...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = "";
  }, 1500);
});

socket.on("auth_error", () => {
  alert("Your session expired. Please sign in again.");
  window.location.href = "/app.html";
});

function renderMessage(message) {
  const div = document.createElement("div");
  const isOwn = message.user === myUsername;
  div.className = "message" + (isOwn ? " own" : "");

  const meta = document.createElement("div");
  meta.className = "meta";
  const time = new Date(message.time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  meta.textContent = `${message.user} • ${time}`;

  const text = document.createElement("div");
  text.textContent = message.text;

  div.appendChild(meta);
  div.appendChild(text);
  messagesEl.appendChild(div);
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
