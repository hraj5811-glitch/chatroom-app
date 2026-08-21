const socket = io();

const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
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

// ---- Theme toggle ----
const savedTheme = localStorage.getItem("chat-theme");
if (savedTheme === "light") {
  document.body.classList.add("light-theme");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  const isLight = document.body.classList.contains("light-theme");
  themeToggle.textContent = isLight ? "☀️" : "🌙";
  localStorage.setItem("chat-theme", isLight ? "light" : "dark");
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

joinBtn.addEventListener("click", joinRoom);
usernameInput.addEventListener("keydown", (e) => e.key === "Enter" && joinRoom());
roomInput.addEventListener("keydown", (e) => e.key === "Enter" && joinRoom());

function joinRoom() {
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim() || "general";
  if (!username) {
    usernameInput.focus();
    return;
  }
  myUsername = username;

  socket.emit("join_room", { username, room });

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
  history.forEach(renderMessage);
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
