const socket = io();

const authScreen = document.getElementById("auth-screen");
const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const guestBtn = document.getElementById("guest-btn");
const signedInAs = document.getElementById("signed-in-as");
const roomInput = document.getElementById("room-input");
const joinBtn = document.getElementById("join-btn");

const roomTitle = document.getElementById("room-title");
const userList = document.getElementById("user-list");
const messagesEl = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const themeToggle = document.getElementById("theme-toggle");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");

let myUsername = "";
let typingTimeout = null;

// ---- Check auth status on page load ----
async function checkAuth() {
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      myUsername = data.username;
      showJoinScreen();
    } else {
      showAuthScreen();
    }
  } catch (err) {
    showAuthScreen();
  }
}

function showAuthScreen() {
  authScreen.classList.remove("hidden");
  joinScreen.classList.add("hidden");
  chatScreen.classList.add("hidden");
}

function showJoinScreen() {
  authScreen.classList.add("hidden");
  joinScreen.classList.remove("hidden");
  chatScreen.classList.add("hidden");
  signedInAs.textContent = `Signed in as ${myUsername}`;
  roomInput.focus();
}

guestBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/guest", { method: "POST" });
    const data = await res.json();
    myUsername = data.username;
    showJoinScreen();
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

// ---- Join room ----
const joinForm = document.getElementById("join-form");
joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  joinRoom();
});

function joinRoom() {
  const room = roomInput.value.trim() || "general";

  socket.emit("join_room", { username: myUsername, room });

  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  roomTitle.textContent = `# ${room}`;
  messageInput.focus();
}

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
