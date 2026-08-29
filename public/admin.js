const socket = io();

// Screens & Elements
const loginScreen = document.getElementById("admin-login-screen");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("login-form");
const adminPassInput = document.getElementById("admin-pass-input");
const togglePassBtn = document.getElementById("toggle-pass-btn");
const loginError = document.getElementById("login-error");
const adminLogoutBtn = document.getElementById("admin-logout-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const refreshAllBtn = document.getElementById("refresh-all-btn");

// Stat Elements
const statOnlineUsers = document.getElementById("stat-online-users");
const statActiveRooms = document.getElementById("stat-active-rooms");
const statTotalMessages = document.getElementById("stat-total-messages");
const statTotalRooms = document.getElementById("stat-total-rooms");
const statTotalUsers = document.getElementById("stat-total-users");

// Tabs
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

// Messages Explorer
const searchMsgInput = document.getElementById("search-msg-input");
const filterRoomInput = document.getElementById("filter-room-input");
const filterUserInput = document.getElementById("filter-user-input");
const clearMsgFiltersBtn = document.getElementById("clear-msg-filters-btn");
const messagesTableBody = document.getElementById("messages-table-body");
const msgPaginationInfo = document.getElementById("msg-pagination-info");
const msgPrevBtn = document.getElementById("msg-prev-btn");
const msgNextBtn = document.getElementById("msg-next-btn");
const msgPageNum = document.getElementById("msg-page-num");

// Rooms Directory
const roomsTableBody = document.getElementById("rooms-table-body");
const searchRoomTable = document.getElementById("search-room-table");

// Users Explorer
const usersTableBody = document.getElementById("users-table-body");
const searchUserTable = document.getElementById("search-user-table");

// Live Stream
const liveStreamList = document.getElementById("live-stream-list");
const clearLiveFeedBtn = document.getElementById("clear-live-feed-btn");
const liveBadgeCount = document.getElementById("live-badge-count");
const toastEl = document.getElementById("toast");

// Ghost Inspector Modal Elements
const inspectorModal = document.getElementById("inspector-modal");
const inspectorRoomTitle = document.getElementById("inspector-room-title");
const inspectorStatusBadge = document.getElementById("inspector-status-badge");
const inspectorRoomMeta = document.getElementById("inspector-room-meta");
const inspectorSearchInput = document.getElementById("inspector-search-input");
const closeInspectorBtn = document.getElementById("close-inspector-btn");
const inspectorOccupantsBar = document.getElementById("inspector-occupants-bar");
const inspectorOccupantsList = document.getElementById("inspector-occupants-list");
const inspectorMessages = document.getElementById("inspector-messages");
const inspectorTyping = document.getElementById("inspector-typing");
const inspectorFooterInfo = document.getElementById("inspector-footer-info");
const inspectorScrollBottomBtn = document.getElementById("inspector-scroll-bottom-btn");
const inspectorPinnedBanner = document.getElementById("inspector-pinned-banner");
const inspectorPinnedAuthor = document.getElementById("inspector-pinned-author");
const inspectorPinnedText = document.getElementById("inspector-pinned-text");

// Admin Lightbox Modal
const adminLightboxModal = document.getElementById("admin-lightbox-modal");
const adminLightboxImg = document.getElementById("admin-lightbox-img");
const closeAdminLightboxBtn = document.getElementById("close-admin-lightbox");

// State
let currentPage = 1;
let totalPages = 1;
let searchDebounce = null;
let allRoomsData = [];
let allUsersData = [];
let liveEventsCount = 0;
let activeInspectorRoom = null;
let inspectorMessagesData = [];
let inspectorTypingTimeout = null;

// ---- Authentication Check ----
async function checkAdminAuth() {
  try {
    const res = await fetch("/api/admin/me");
    if (res.ok) {
      const data = await res.json();
      if (data.isAdmin) {
        showDashboard();
        return;
      }
    }
    showLogin();
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  dashboard.classList.add("hidden");
  adminPassInput.value = "";
  loginError.classList.add("hidden");
  adminPassInput.focus();
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  socket.emit("admin_join");
  loadAllAdminData();
}

socket.on("connect", () => {
  socket.emit("admin_join");
  if (activeInspectorRoom) {
    socket.emit("admin_spectate_room", { room: activeInspectorRoom });
  }
});

// Password toggle
togglePassBtn.addEventListener("click", () => {
  const isPass = adminPassInput.type === "password";
  adminPassInput.type = isPass ? "text" : "password";
  togglePassBtn.textContent = isPass ? "🙈" : "👁️";
});

// Login submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = adminPassInput.value.trim();
  loginError.classList.add("hidden");

  if (!password) {
    loginError.textContent = "Please enter the admin password.";
    loginError.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || "Invalid passcode.";
      loginError.classList.remove("hidden");
      return;
    }

    showToast("Logged in as Admin!");
    showDashboard();
  } catch (err) {
    loginError.textContent = "Login request failed. Server error.";
    loginError.classList.remove("hidden");
  }
});

// Logout
adminLogoutBtn.addEventListener("click", async () => {
  try {
    if (activeInspectorRoom) {
      closeRoomInspector();
    }
    await fetch("/api/admin/logout", { method: "POST" });
    showToast("Logged out successfully");
    showLogin();
  } catch (err) {
    showLogin();
  }
});

// ---- Theme Toggle ----
const savedTheme = localStorage.getItem("admin-theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark-theme");
  themeToggleBtn.textContent = "☀️";
}

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("admin-theme", isDark ? "dark" : "light");
});

// Refresh button
refreshAllBtn.addEventListener("click", () => {
  loadAllAdminData();
  showToast("Refreshed all metrics & data");
});

// ---- Tabs Navigation ----
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabPanes.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    const targetId = btn.dataset.tab;
    const targetPane = document.getElementById(targetId);
    if (targetPane) targetPane.classList.add("active");

    if (targetId === "live-tab") {
      liveEventsCount = 0;
      liveBadgeCount.textContent = "0";
    }
  });
});

// ---- Master Data Loader ----
function loadAllAdminData() {
  fetchStats();
  fetchMessages(currentPage);
  fetchRooms();
  fetchUsers();
}

// ---- Stats ----
async function fetchStats() {
  try {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) return;
    const data = await res.json();

    statOnlineUsers.textContent = data.onlineUsersCount ?? 0;
    statActiveRooms.textContent = `${data.activeRoomsCount ?? 0} active rooms right now`;
    statTotalMessages.textContent = (data.totalMessages ?? 0).toLocaleString();
    statTotalRooms.textContent = (data.totalRooms ?? 0).toLocaleString();
    statTotalUsers.textContent = (data.totalUsers ?? 0).toLocaleString();
  } catch (err) {
    console.error("Failed to fetch stats", err);
  }
}

// ---- Lightbox Logic ----
function openAdminLightbox(url) {
  adminLightboxImg.src = url;
  adminLightboxModal.classList.remove("hidden");
}
if (closeAdminLightboxBtn) {
  closeAdminLightboxBtn.addEventListener("click", () => {
    adminLightboxModal.classList.add("hidden");
    adminLightboxImg.src = "";
  });
}
adminLightboxModal.addEventListener("click", (e) => {
  if (e.target === adminLightboxModal) {
    adminLightboxModal.classList.add("hidden");
    adminLightboxImg.src = "";
  }
});

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- Messages Explorer ----
async function fetchMessages(page = 1) {
  currentPage = page;
  messagesTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Loading messages...</td></tr>`;

  const queryParams = new URLSearchParams({
    page: currentPage,
    limit: 25,
  });

  const search = searchMsgInput.value.trim();
  const room = filterRoomInput.value.trim();
  const username = filterUserInput.value.trim();

  if (search) queryParams.set("search", search);
  if (room) queryParams.set("room", room);
  if (username) queryParams.set("username", username);

  try {
    const res = await fetch(`/api/admin/messages?${queryParams.toString()}`);
    if (!res.ok) {
      messagesTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Failed to load messages.</td></tr>`;
      return;
    }

    const data = await res.json();
    totalPages = data.totalPages;

    msgPaginationInfo.textContent = `Showing ${(data.messages || []).length} of ${data.total} total messages`;
    msgPageNum.textContent = `Page ${data.page} of ${data.totalPages}`;
    msgPrevBtn.disabled = data.page <= 1;
    msgNextBtn.disabled = data.page >= data.totalPages;

    renderMessagesTable(data.messages);
  } catch (err) {
    messagesTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Error connecting to server.</td></tr>`;
  }
}

function renderMessagesTable(messages) {
  if (!messages || !messages.length) {
    messagesTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">No messages found matching your filter.</td></tr>`;
    return;
  }

  messagesTableBody.innerHTML = "";
  messages.forEach((msg) => {
    const tr = document.createElement("tr");

    // Room cell
    const tdRoom = document.createElement("td");
    const roomSpan = document.createElement("span");
    roomSpan.className = "room-badge";
    roomSpan.textContent = msg.room;
    tdRoom.appendChild(roomSpan);

    // Sender cell
    const tdSender = document.createElement("td");
    const senderSpan = document.createElement("span");
    senderSpan.className = "user-tag";
    senderSpan.textContent = msg.username;
    tdSender.appendChild(senderSpan);

    // Message Content & Media cell
    const tdContent = document.createElement("td");
    tdContent.className = "msg-content";

    // Reply Preview
    if (msg.replyTo && msg.replyTo.username) {
      const replyDiv = document.createElement("div");
      replyDiv.className = "reply-quote";
      replyDiv.innerHTML = `<span class="reply-quote-user">↩ In reply to @${escapeHtml(msg.replyTo.username)}</span><span class="reply-quote-text">${escapeHtml(msg.replyTo.text || "Message")}</span>`;
      tdContent.appendChild(replyDiv);
    }

    // Text content
    if (msg.text) {
      const textSpan = document.createElement("div");
      textSpan.textContent = msg.text;
      tdContent.appendChild(textSpan);
    }

    // Image thumbnail
    if (msg.imageUrl) {
      const img = document.createElement("img");
      img.src = msg.imageUrl;
      img.className = "chat-img-thumb";
      img.alt = "Attachment";
      img.loading = "lazy";
      img.addEventListener("click", () => openAdminLightbox(msg.imageUrl));
      tdContent.appendChild(img);
    }

    // Poll overview
    if (msg.poll && msg.poll.question) {
      const pollBadge = document.createElement("div");
      pollBadge.style.marginTop = "0.3rem";
      pollBadge.style.fontSize = "0.75rem";
      pollBadge.style.color = "var(--primary)";
      pollBadge.style.fontWeight = "600";
      pollBadge.textContent = `📊 Live Poll: ${msg.poll.question} (${(msg.poll.options || []).length} options)`;
      tdContent.appendChild(pollBadge);
    }

    // Reactions Cell
    const tdReactions = document.createElement("td");
    if (msg.reactions && msg.reactions.length) {
      const wrap = document.createElement("div");
      wrap.className = "msg-reactions-wrap";
      msg.reactions.forEach((r) => {
        if (r.count > 0) {
          const pill = document.createElement("span");
          pill.className = "reaction-pill";
          pill.textContent = `${r.emoji} ${r.count}`;
          pill.title = r.users ? r.users.join(", ") : "";
          wrap.appendChild(pill);
        }
      });
      tdReactions.appendChild(wrap);
    } else {
      tdReactions.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem;">-</span>`;
    }

    // Time cell
    const tdTime = document.createElement("td");
    tdTime.className = "time-tag";
    tdTime.textContent = new Date(msg.createdAt).toLocaleString();

    // Action cell
    const tdAction = document.createElement("td");
    tdAction.style.textAlign = "right";

    const inspectBtn = document.createElement("button");
    inspectBtn.className = "btn btn-sm btn-outline";
    inspectBtn.style.marginRight = "0.4rem";
    inspectBtn.textContent = "👻 Inspect";
    inspectBtn.addEventListener("click", () => openRoomInspector(msg.room));

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-sm btn-danger";
    delBtn.textContent = "🗑️ Delete";
    delBtn.addEventListener("click", () => deleteMessage(msg._id, tr));
    
    tdAction.append(inspectBtn, delBtn);
    tr.append(tdRoom, tdSender, tdContent, tdReactions, tdTime, tdAction);
    messagesTableBody.appendChild(tr);
  });
}

async function deleteMessage(messageId, rowElement) {
  if (!confirm("Are you sure you want to delete this message permanently?")) return;

  try {
    const res = await fetch(`/api/admin/messages/${messageId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Message deleted");
      if (rowElement) rowElement.remove();
      fetchStats();
    } else {
      showToast("Failed to delete message", true);
    }
  } catch (err) {
    showToast("Error deleting message", true);
  }
}

// Search debounce for messages
function triggerMessageSearch() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    fetchMessages(1);
  }, 350);
}

searchMsgInput.addEventListener("input", triggerMessageSearch);
filterRoomInput.addEventListener("input", triggerMessageSearch);
filterUserInput.addEventListener("input", triggerMessageSearch);

clearMsgFiltersBtn.addEventListener("click", () => {
  searchMsgInput.value = "";
  filterRoomInput.value = "";
  filterUserInput.value = "";
  fetchMessages(1);
});

msgPrevBtn.addEventListener("click", () => {
  if (currentPage > 1) fetchMessages(currentPage - 1);
});

msgNextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) fetchMessages(currentPage + 1);
});

// ---- Rooms Directory ----
async function fetchRooms() {
  roomsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Loading rooms...</td></tr>`;
  try {
    const res = await fetch("/api/admin/rooms");
    if (!res.ok) {
      roomsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Failed to load rooms.</td></tr>`;
      return;
    }
    const data = await res.json();
    allRoomsData = data.rooms || [];
    renderRoomsTable(allRoomsData);
  } catch (err) {
    roomsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">Error fetching rooms.</td></tr>`;
  }
}

function renderRoomsTable(rooms) {
  if (!rooms.length) {
    roomsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty">No rooms created yet.</td></tr>`;
    return;
  }

  roomsTableBody.innerHTML = "";
  rooms.forEach((room) => {
    const tr = document.createElement("tr");

    // Room Code
    const tdRoom = document.createElement("td");
    const rSpan = document.createElement("span");
    rSpan.className = "room-badge";
    rSpan.textContent = room.roomId;
    tdRoom.appendChild(rSpan);

    // Name & Description
    const tdName = document.createElement("td");
    tdName.innerHTML = `
      <div style="font-weight:700; font-size:0.88rem;">${escapeHtml(room.name || "Room #" + room.roomId)}</div>
      <div style="font-size:0.75rem; color:var(--text-muted); max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(room.description || "No description")}</div>
    `;

    // Category
    const tdCat = document.createElement("td");
    tdCat.innerHTML = `<span class="cat-badge">${escapeHtml(room.category || "General")}</span>`;

    // Privacy
    const tdPrivacy = document.createElement("td");
    const isPub = room.isPublic !== false;
    let privacyHtml = isPub
      ? `<span class="privacy-badge public">🌐 Public</span>`
      : `<span class="privacy-badge private">🔒 Private</span>`;
    if (room.isPasswordProtected) {
      privacyHtml += ` <span class="privacy-badge" style="background:color-mix(in oklab, var(--danger) 15%, transparent); color:var(--danger); border-color:color-mix(in oklab, var(--danger) 30%, transparent); margin-left:0.25rem;">🔑 Passcode</span>`;
    }
    tdPrivacy.innerHTML = privacyHtml;

    // Creator / Host
    const tdCreator = document.createElement("td");
    const hostName = room.creatorUsername || (room.createdBy ? room.createdBy.username : "Guest");
    tdCreator.innerHTML = `
      <span class="user-tag">${escapeHtml(hostName)}</span>
      <span class="role-badge host">👑 Host</span>
    `;

    // Messages Count
    const tdMsgs = document.createElement("td");
    tdMsgs.textContent = `${room.messageCount} msgs`;

    // Online Now
    const tdOnline = document.createElement("td");
    tdOnline.innerHTML = room.onlineCount > 0
      ? `<span class="live-pill"><span class="pulse-dot"></span> ${room.onlineCount} online</span>`
      : `<span style="color:var(--text-muted)">0 online</span>`;

    // Actions
    const tdActions = document.createElement("td");
    tdActions.style.textAlign = "right";

    const spectateBtn = document.createElement("button");
    spectateBtn.className = room.onlineCount > 0 ? "btn btn-sm btn-primary" : "btn btn-sm btn-outline";
    spectateBtn.innerHTML = room.onlineCount > 0 ? "👻 Spectate Live" : "📖 Inspect Chat";
    spectateBtn.style.marginRight = "0.4rem";
    spectateBtn.title = room.onlineCount > 0 ? "Invisibly spectate live room (Ghost Mode)" : "View full past chat history";
    spectateBtn.addEventListener("click", () => openRoomInspector(room.roomId));

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-sm btn-danger";
    delBtn.textContent = "🗑️ Delete";
    delBtn.addEventListener("click", () => deleteRoom(room.roomId, tr));

    tdActions.append(spectateBtn, delBtn);
    tr.append(tdRoom, tdName, tdCat, tdPrivacy, tdCreator, tdMsgs, tdOnline, tdActions);
    roomsTableBody.appendChild(tr);
  });
}

async function deleteRoom(roomId, rowElement) {
  if (!confirm(`Are you sure you want to permanently delete Room ${roomId} and all its messages?`)) return;

  try {
    const res = await fetch(`/api/admin/rooms/${roomId}`, { method: "DELETE" });
    if (res.ok) {
      showToast(`Room ${roomId} deleted`);
      if (rowElement) rowElement.remove();
      fetchStats();
      if (activeInspectorRoom === roomId) {
        closeRoomInspector();
      }
    } else {
      showToast("Could not delete room", true);
    }
  } catch (err) {
    showToast("Error deleting room", true);
  }
}

searchRoomTable.addEventListener("input", () => {
  const q = searchRoomTable.value.trim().toLowerCase();
  const filtered = allRoomsData.filter(
    (r) =>
      r.roomId.toLowerCase().includes(q) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.creatorUsername && r.creatorUsername.toLowerCase().includes(q))
  );
  renderRoomsTable(filtered);
});

// ---- Users Explorer ----
async function fetchUsers() {
  usersTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">Loading users...</td></tr>`;
  try {
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      usersTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">Failed to load users.</td></tr>`;
      return;
    }
    const data = await res.json();
    allUsersData = data.users || [];
    renderUsersTable(allUsersData);
  } catch (err) {
    usersTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">Error fetching users.</td></tr>`;
  }
}

function renderUsersTable(users) {
  if (!users.length) {
    usersTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">No registered users found.</td></tr>`;
    return;
  }

  const statusIcons = {
    Online: "🟢",
    Studying: "📚",
    Gaming: "🎮",
    Chilling: "☕",
    Listening: "🎧",
    DND: "⛔",
  };

  usersTableBody.innerHTML = "";
  users.forEach((user) => {
    const tr = document.createElement("tr");

    // Username
    const tdUser = document.createElement("td");
    tdUser.className = "user-tag";
    tdUser.textContent = user.username;

    // Display name
    const tdName = document.createElement("td");
    tdName.textContent = user.displayName || "-";

    // Email
    const tdEmail = document.createElement("td");
    tdEmail.textContent = user.email || "-";

    // Status
    const tdStatus = document.createElement("td");
    const stat = user.status || "Online";
    const icon = statusIcons[stat] || "🟢";
    tdStatus.innerHTML = `<span style="font-size:0.75rem;">${icon} ${stat}</span>`;

    // Joined Rooms count
    const tdRooms = document.createElement("td");
    tdRooms.textContent = `${user.joinedRooms ? user.joinedRooms.length : 0} rooms`;

    // Created At
    const tdDate = document.createElement("td");
    tdDate.className = "time-tag";
    tdDate.textContent = new Date(user.createdAt).toLocaleDateString();

    // Actions
    const tdActions = document.createElement("td");
    tdActions.style.textAlign = "right";

    const viewChatsBtn = document.createElement("button");
    viewChatsBtn.className = "btn btn-sm btn-outline";
    viewChatsBtn.textContent = "💬 User Chats";
    viewChatsBtn.style.marginRight = "0.5rem";
    viewChatsBtn.addEventListener("click", () => {
      filterUserInput.value = user.username;
      document.querySelector('[data-tab="messages-tab"]').click();
      fetchMessages(1);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-sm btn-danger";
    delBtn.textContent = "🗑️ Delete";
    delBtn.addEventListener("click", () => deleteUser(user._id, user.username, tr));

    tdActions.append(viewChatsBtn, delBtn);
    tr.append(tdUser, tdName, tdEmail, tdStatus, tdRooms, tdDate, tdActions);
    usersTableBody.appendChild(tr);
  });
}

async function deleteUser(userId, username, rowElement) {
  if (!confirm(`Are you sure you want to delete user account "${username}"?`)) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      showToast(`User ${username} deleted`);
      if (rowElement) rowElement.remove();
      fetchStats();
    } else {
      showToast("Could not delete user", true);
    }
  } catch (err) {
    showToast("Error deleting user", true);
  }
}

searchUserTable.addEventListener("input", () => {
  const q = searchUserTable.value.trim().toLowerCase();
  const filtered = allUsersData.filter(
    (u) =>
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
  );
  renderUsersTable(filtered);
});

// ---- GHOST SPECTATOR / ROOM INSPECTOR MODAL ----
async function openRoomInspector(roomId) {
  activeInspectorRoom = roomId;
  inspectorSearchInput.value = "";
  inspectorTyping.textContent = "";
  inspectorMessages.innerHTML = `<p class="table-empty">Connecting to room #${roomId}...</p>`;
  inspectorPinnedBanner.classList.add("hidden");
  inspectorModal.classList.remove("hidden");
  inspectorRoomTitle.textContent = `Room #${roomId}`;

  try {
    const res = await fetch(`/api/admin/rooms/${roomId}/history`);
    if (!res.ok) {
      inspectorMessages.innerHTML = `<p class="table-empty">Could not load history for room #${roomId}.</p>`;
      return;
    }

    const data = await res.json();
    const isLive = data.isLive;
    const occupants = data.onlineUsers || [];
    inspectorMessagesData = data.messages || [];

    // Header info
    const hostName = data.room?.creatorUsername || data.room?.createdBy?.username || "Guest";
    const cat = data.room?.category || "General";
    const dateText = data.room ? new Date(data.room.createdAt).toLocaleDateString() : "-";
    inspectorRoomMeta.textContent = `Host: ${hostName} • Category: ${cat} • Created: ${dateText} • ${inspectorMessagesData.length} saved messages`;

    // Pinned Announcement check
    if (data.room?.pinnedMessage && data.room.pinnedMessage.text) {
      inspectorPinnedAuthor.textContent = `📌 Pinned Announcement by ${data.room.pinnedMessage.username || "Host"}`;
      inspectorPinnedText.textContent = data.room.pinnedMessage.text;
      inspectorPinnedBanner.classList.remove("hidden");
    } else {
      inspectorPinnedBanner.classList.add("hidden");
    }

    // Status Badge & Footer
    if (isLive) {
      inspectorStatusBadge.textContent = `🟢 LIVE (${occupants.length} Occupants) — GHOST SPECTATOR ACTIVE`;
      inspectorStatusBadge.className = "stealth-badge";
      inspectorFooterInfo.textContent = "🔒 Invisible Ghost Mode Active: Zero notifications sent. You are not in the room user list.";
      // Join socket in ghost mode
      socket.emit("admin_spectate_room", { room: roomId });
    } else {
      inspectorStatusBadge.textContent = "📁 PAST ROOM ARCHIVE (No live occupants)";
      inspectorStatusBadge.className = "stealth-badge archived";
      inspectorFooterInfo.textContent = "📁 Viewing archived conversation history. Real-time stream idle.";
    }

    renderOccupantsList(occupants);
    renderInspectorMessages(inspectorMessagesData);
    scrollToInspectorBottom();
  } catch (err) {
    inspectorMessages.innerHTML = `<p class="table-empty">Network error loading room inspector.</p>`;
  }
}

function renderOccupantsList(occupants) {
  inspectorOccupantsList.innerHTML = "";
  if (!occupants || !occupants.length) {
    inspectorOccupantsList.innerHTML = `<span class="occupant-tag" style="opacity:0.7">No active users in room</span>`;
    return;
  }

  const statusIcons = {
    Online: "🟢",
    Studying: "📚",
    Gaming: "🎮",
    Chilling: "☕",
    Listening: "🎧",
    DND: "⛔",
  };

  occupants.forEach((u) => {
    const username = typeof u === "object" ? u.username : u;
    const status = (typeof u === "object" ? u.status : "Online") || "Online";
    const isHost = typeof u === "object" && u.isHost;
    const isMod = typeof u === "object" && u.isMod;
    const icon = statusIcons[status] || "🟢";

    const badge = isHost ? `<span class="role-badge host">👑 Host</span>` : isMod ? `<span class="role-badge mod">🛡️ Mod</span>` : "";

    const span = document.createElement("span");
    span.className = "occupant-tag";
    span.innerHTML = `${icon} <span>${escapeHtml(username)}</span>${badge}`;
    inspectorOccupantsList.appendChild(span);
  });
}

function renderInspectorMessages(messages, highlightQuery = "") {
  inspectorMessages.innerHTML = "";
  if (!messages || !messages.length) {
    inspectorMessages.innerHTML = `<p class="table-empty">No messages found in this room.</p>`;
    return;
  }

  messages.forEach((m) => {
    appendInspectorMessage(m, highlightQuery);
  });
}

function appendInspectorMessage(m, highlightQuery = "") {
  const div = document.createElement("div");
  div.className = "ghost-msg";
  div.dataset.msgId = String(m._id || m.messageId || "");

  const fullText = (m.text || "") + " " + (m.poll ? m.poll.question : "");
  if (highlightQuery && fullText.toLowerCase().includes(highlightQuery.toLowerCase())) {
    div.classList.add("highlighted");
  }

  const meta = document.createElement("div");
  meta.className = "meta";

  const userStrong = document.createElement("strong");
  userStrong.textContent = m.username || m.user || "Unknown";

  const timeSpan = document.createElement("span");
  timeSpan.className = "time-tag";
  timeSpan.textContent = new Date(m.createdAt || m.time || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  meta.appendChild(userStrong);
  meta.appendChild(timeSpan);
  div.appendChild(meta);

  // Quoted reply
  if (m.replyTo && m.replyTo.username) {
    const replyDiv = document.createElement("div");
    replyDiv.className = "reply-quote";
    replyDiv.innerHTML = `<span class="reply-quote-user">↩ Replying to @${escapeHtml(m.replyTo.username)}</span><span class="reply-quote-text">${escapeHtml(m.replyTo.text || "Message")}</span>`;
    div.appendChild(replyDiv);
  }

  // Attached image
  if (m.imageUrl) {
    const img = document.createElement("img");
    img.src = m.imageUrl;
    img.className = "chat-img-thumb";
    img.alt = "Attachment";
    img.loading = "lazy";
    img.addEventListener("click", () => openAdminLightbox(m.imageUrl));
    div.appendChild(img);
  }

  // Poll card
  if (m.poll && m.poll.options) {
    const pollWrap = document.createElement("div");
    pollWrap.className = "poll-card";
    const totalVotes = m.poll.options.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0);

    let optsHtml = m.poll.options.map((opt) => {
      const count = opt.votes ? opt.votes.length : 0;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return `
        <div class="poll-opt-btn">
          <div class="poll-progress-bg" style="width:${pct}%;"></div>
          <span class="poll-opt-label">${escapeHtml(opt.text)}</span>
          <span class="poll-opt-stat">${count} (${pct}%)</span>
        </div>
      `;
    }).join("");

    pollWrap.innerHTML = `
      <div class="poll-head">📊 ${escapeHtml(m.poll.question)}</div>
      <div class="poll-options">${optsHtml}</div>
      <div class="poll-total-footer">${totalVotes} total votes</div>
    `;
    div.appendChild(pollWrap);
  } else if (m.text) {
    const textDiv = document.createElement("div");
    textDiv.className = "text";
    textDiv.textContent = m.text;
    div.appendChild(textDiv);
  }

  // Reactions
  if (m.reactions && m.reactions.length) {
    const rWrap = document.createElement("div");
    rWrap.className = "msg-reactions-wrap";
    m.reactions.forEach((r) => {
      if (r.count > 0) {
        const pill = document.createElement("span");
        pill.className = "reaction-pill";
        pill.textContent = `${r.emoji} ${r.count}`;
        rWrap.appendChild(pill);
      }
    });
    div.appendChild(rWrap);
  }

  inspectorMessages.appendChild(div);
}

function scrollToInspectorBottom() {
  inspectorMessages.scrollTop = inspectorMessages.scrollHeight;
}

function closeRoomInspector() {
  if (activeInspectorRoom) {
    socket.emit("admin_leave_spectate", { room: activeInspectorRoom });
  }
  activeInspectorRoom = null;
  inspectorModal.classList.add("hidden");
  inspectorTyping.textContent = "";
}

closeInspectorBtn.addEventListener("click", closeRoomInspector);
inspectorScrollBottomBtn.addEventListener("click", scrollToInspectorBottom);

// In-room message search
inspectorSearchInput.addEventListener("input", () => {
  const query = inspectorSearchInput.value.trim().toLowerCase();
  if (!query) {
    renderInspectorMessages(inspectorMessagesData);
  } else {
    const filtered = inspectorMessagesData.filter(
      (m) =>
        (m.text && m.text.toLowerCase().includes(query)) ||
        (m.username && m.username.toLowerCase().includes(query)) ||
        (m.poll && m.poll.question && m.poll.question.toLowerCase().includes(query))
    );
    renderInspectorMessages(filtered, query);
  }
});

// ---- Socket Events for Ghost Spectator ----
socket.on("spectate_history", ({ room, messages, occupants }) => {
  if (activeInspectorRoom === room) {
    renderOccupantsList(occupants);
    if (!inspectorMessagesData.length && messages.length) {
      inspectorMessagesData = messages;
      renderInspectorMessages(inspectorMessagesData);
      scrollToInspectorBottom();
    }
  }
});

// Incoming message received
socket.on("receive_message", (msg) => {
  if (activeInspectorRoom) {
    inspectorMessagesData.push(msg);
    const emptyP = inspectorMessages.querySelector(".table-empty");
    if (emptyP) emptyP.remove();

    appendInspectorMessage(msg);
    scrollToInspectorBottom();
  }
});

// Typing indicator for spectated room
socket.on("display_typing", (username) => {
  if (activeInspectorRoom) {
    inspectorTyping.textContent = `✍️ ${username} is typing...`;
    clearTimeout(inspectorTypingTimeout);
    inspectorTypingTimeout = setTimeout(() => {
      inspectorTyping.textContent = "";
    }, 1600);
  }
});

// Pinned message updated
socket.on("pinned_message_updated", (pinned) => {
  if (activeInspectorRoom) {
    if (pinned && pinned.text) {
      inspectorPinnedAuthor.textContent = `📌 Pinned Announcement by ${pinned.username || "Host"}`;
      inspectorPinnedText.textContent = pinned.text;
      inspectorPinnedBanner.classList.remove("hidden");
    } else {
      inspectorPinnedBanner.classList.add("hidden");
    }
  }
});

// Poll updated in inspector
socket.on("poll_updated", ({ messageId, poll }) => {
  if (activeInspectorRoom) {
    const targetMsg = inspectorMessagesData.find((m) => String(m._id || m.messageId) === String(messageId));
    if (targetMsg) {
      targetMsg.poll = poll;
      renderInspectorMessages(inspectorMessagesData);
    }
  }
});

// Reactions updated in inspector
socket.on("message_reaction_updated", ({ messageId, reactions }) => {
  if (activeInspectorRoom) {
    const targetMsg = inspectorMessagesData.find((m) => String(m._id || m.messageId) === String(messageId));
    if (targetMsg) {
      targetMsg.reactions = reactions;
      renderInspectorMessages(inspectorMessagesData);
    }
  }
});

// Message deleted in inspector
socket.on("message_deleted", ({ messageId }) => {
  if (activeInspectorRoom) {
    inspectorMessagesData = inspectorMessagesData.filter((m) => String(m._id || m.messageId) !== String(messageId));
    renderInspectorMessages(inspectorMessagesData);
  }
});

// ---- Real-time Live Stream & Sockets ----
clearLiveFeedBtn.addEventListener("click", () => {
  liveStreamList.innerHTML = `
    <div class="log-entry log-system">
      <span class="log-time">[System]</span>
      <span class="log-text">Log cleared. Listening for real-time events...</span>
    </div>
  `;
});

socket.on("admin_live_event", (event) => {
  const timeStr = new Date(event.time || Date.now()).toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = "log-entry";

  const timeSpan = document.createElement("span");
  timeSpan.className = "log-time";
  timeSpan.textContent = `[${timeStr}]`;
  entry.appendChild(timeSpan);

  const textSpan = document.createElement("span");

  if (event.type === "user_joined") {
    entry.classList.add("log-join");
    textSpan.textContent = `🟢 ${event.user} joined room #${event.room} (${event.isGuest ? "Guest" : "Registered"})`;
  } else if (event.type === "user_left" || event.type === "user_disconnect") {
    entry.classList.add("log-leave");
    textSpan.textContent = `🔴 ${event.user} left room #${event.room}`;
  } else if (event.type === "user_message" || event.type === "guest_message") {
    entry.classList.add("log-chat");
    textSpan.textContent = `💬 [#${event.room}] ${event.user}: ${event.text}`;
  } else if (event.type === "poll_created") {
    entry.classList.add("log-poll");
    textSpan.textContent = `📊 [#${event.room}] ${event.user} launched a Live Poll: "${event.question}"`;
  } else if (event.type === "message_pinned") {
    entry.classList.add("log-pin");
    textSpan.textContent = `📌 [#${event.room}] ${event.user} pinned announcement: "${event.text}"`;
  } else if (event.type === "message_unpinned") {
    entry.classList.add("log-pin");
    textSpan.textContent = `📌 [#${event.room}] ${event.user} unpinned announcement`;
  } else if (event.type === "user_kicked") {
    entry.classList.add("log-kick");
    textSpan.textContent = `🚫 [#${event.room}] ${event.user} was kicked by ${event.kickedBy}`;
  } else if (event.type === "reaction_updated") {
    entry.classList.add("log-reaction");
    textSpan.textContent = `${event.emoji} [#${event.room}] ${event.user} reacted with ${event.emoji}`;
  } else if (event.type === "message_deleted") {
    entry.classList.add("log-leave");
    textSpan.textContent = `🗑️ ${event.text}`;
  } else {
    entry.classList.add("log-system");
    textSpan.textContent = `⚙️ ${JSON.stringify(event)}`;
  }

  entry.appendChild(textSpan);
  liveStreamList.appendChild(entry);
  liveStreamList.scrollTop = liveStreamList.scrollHeight;

  // Increment badge count if not on live tab
  const activeTab = document.querySelector(".tab-btn.active");
  if (!activeTab || activeTab.dataset.tab !== "live-tab") {
    liveEventsCount++;
    liveBadgeCount.textContent = liveEventsCount;
  }

  // Refresh live counters in background
  fetchStats();
});

// Toast notification helper
let toastTimeout = null;
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.style.borderColor = isError ? "var(--danger)" : "var(--border-color)";
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2800);
}

// Initial check
checkAdminAuth();
