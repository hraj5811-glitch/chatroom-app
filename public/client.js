const socket = io();

// Screens
const authScreen = document.getElementById("login-screen") || document.getElementById("auth-screen");
const roomChoiceScreen = document.getElementById("room-choice-screen");
const roomCreatedScreen = document.getElementById("room-created-screen");
const profileScreen = document.getElementById("profile-screen");
const chatScreen = document.getElementById("chat-screen");

// Auth screen
const guestBtn = document.getElementById("guest-btn");

// Room choice & Hub elements
const signedInAs = document.getElementById("signed-in-as");
const headerAvatarWrap = document.getElementById("header-avatar-wrap");
const headerUserAvatar = document.getElementById("header-user-avatar");
const profileLink = document.getElementById("profile-link");

// Hub Tabs
const tabDiscoverBtn = document.getElementById("tab-discover-btn");
const tabDmsBtn = document.getElementById("tab-dms-btn");
const tabFriendsBtn = document.getElementById("tab-friends-btn");
const tabCreateBtn = document.getElementById("tab-create-btn");
const tabJoinBtn = document.getElementById("tab-join-btn");

const dmTabUnread = document.getElementById("dm-tab-unread");
const friendsTabBadge = document.getElementById("friends-tab-badge");

const hubDiscoverPane = document.getElementById("hub-discover-pane");
const hubDmsPane = document.getElementById("hub-dms-pane");
const hubFriendsPane = document.getElementById("hub-friends-pane");
const hubCreatePane = document.getElementById("hub-create-pane");
const hubJoinPane = document.getElementById("hub-join-pane");

// Mobile Bottom Navigation items
const navDiscover = document.getElementById("nav-discover");
const navDms = document.getElementById("nav-dms");
const navFriends = document.getElementById("nav-friends");
const navCreate = document.getElementById("nav-create");
const navJoin = document.getElementById("nav-join");
const navProfile = document.getElementById("nav-profile");

// Discover elements
const discoverSearchInput = document.getElementById("discover-search-input");
const discoverRoomsGrid = document.getElementById("discover-rooms-grid");
const categoryChips = document.querySelectorAll(".category-chip");

// Create room form elements
const createRoomForm = document.getElementById("create-room-form");
const createRoomName = document.getElementById("create-room-name");
const createRoomDesc = document.getElementById("create-room-desc");
const createRoomCat = document.getElementById("create-room-cat");
const createRoomPrivacy = document.getElementById("create-room-privacy");
const createRoomPassToggle = document.getElementById("create-room-pass-toggle");
const createRoomPassWrap = document.getElementById("create-room-pass-wrap");
const createRoomPassInput = document.getElementById("create-room-pass-input");
const createError = document.getElementById("create-error");

// Join room form elements
const joinForm = document.getElementById("join-form");
const roomInput = document.getElementById("room-input");
const joinError = document.getElementById("join-error");

// Password Prompt Modal
const roomPasswordModal = document.getElementById("room-password-modal");
const closePasswordModal = document.getElementById("close-password-modal");
const roomPasswordForm = document.getElementById("room-password-form");
const roomPasswordInput = document.getElementById("room-password-input");
const roomPasswordError = document.getElementById("room-password-error");
let targetProtectedRoomId = null;

// User Profile Popup Modal
const userProfileModal = document.getElementById("user-profile-modal");
const closeUserProfileModal = document.getElementById("close-user-profile-modal");
const profileModalAvatar = document.getElementById("profile-modal-avatar");
const profileModalUsername = document.getElementById("profile-modal-username");
const profileModalStatusText = document.getElementById("profile-modal-status-text");
const profileModalBio = document.getElementById("profile-modal-bio");
const profileModalDmBtn = document.getElementById("profile-modal-dm-btn");
const profileModalFriendBtn = document.getElementById("profile-modal-friend-btn");
let activeInspectedUser = null;

// Direct Messaging (DMs) Elements
const dmConversationsList = document.getElementById("dm-conversations-list");
const newDmBtn = document.getElementById("new-dm-btn");
const dmChatWindow = document.getElementById("dm-chat-window");
const dmPlaceholder = document.getElementById("dm-placeholder");
const dmActiveChat = document.getElementById("dm-active-chat");
const dmBackBtn = document.getElementById("dm-back-btn");
const dmPartnerAvatar = document.getElementById("dm-partner-avatar");
const dmPartnerName = document.getElementById("dm-partner-name");
const dmPartnerStatus = document.getElementById("dm-partner-status");
const closeDmChatBtn = document.getElementById("close-dm-chat-btn");
const dmMessages = document.getElementById("dm-messages");
const dmTyping = document.getElementById("dm-typing");
const dmMessageForm = document.getElementById("dm-message-form");
const dmInput = document.getElementById("dm-input");
const dmAttachBtn = document.getElementById("dm-attach-btn");
const dmFileInput = document.getElementById("dm-file-input");

// Friends Elements
const addFriendInput = document.getElementById("add-friend-input");
const addFriendBtn = document.getElementById("add-friend-btn");
const friendRequestMsg = document.getElementById("friend-request-msg");
const pendingRequestsSection = document.getElementById("pending-requests-section");
const pendingRequestsCount = document.getElementById("pending-requests-count");
const pendingRequestsList = document.getElementById("pending-requests-list");
const friendsCount = document.getElementById("friends-count");
const friendsList = document.getElementById("friends-list");

// Room created screen elements
const newRoomIdEl = document.getElementById("new-room-id");
const createdRoomTitleDisplay = document.getElementById("created-room-title-display");
const createdRoomSubtitle = document.getElementById("created-room-subtitle");
const copyRoomIdBtn = document.getElementById("copy-room-id");
const copyRoomLinkBtn = document.getElementById("copy-room-link");
const enterRoomBtn = document.getElementById("enter-room-btn");

// Profile screen elements
const profileCurrentAvatar = document.getElementById("profile-current-avatar");
const changeAvatarBtn = document.getElementById("change-avatar-btn");
const avatarFileInput = document.getElementById("avatar-file-input");
const usernameInput = document.getElementById("username-input");
const saveUsernameBtn = document.getElementById("save-username-btn");
const usernameMsg = document.getElementById("username-msg");
const bioInput = document.getElementById("bio-input");
const saveBioBtn = document.getElementById("save-bio-btn");
const bioMsg = document.getElementById("bio-msg");
const roomsList = document.getElementById("rooms-list");
const roomMessagesPreview = document.getElementById("room-messages-preview");
const backToRoomsBtn = document.getElementById("back-to-rooms-btn");
const profileTopBackBtn = document.getElementById("profile-top-back-btn");
const createdScreenBackBtn = document.getElementById("created-screen-back-btn");

// Chat screen elements
const chatSidebar = document.getElementById("chat-sidebar");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");
const desktopLeaveRoomBtn = document.getElementById("desktop-leave-room-btn");
const mobileBackLobbyBtn = document.getElementById("mobile-back-lobby-btn");
const mobileRoomName = document.getElementById("mobile-room-name");
const mobileOnlineTag = document.getElementById("mobile-online-tag");
const mobileShareBtn = document.getElementById("mobile-share-btn");
const sidebarCopyLinkBtn = document.getElementById("sidebar-copy-link-btn");
const statusSelect = document.getElementById("status-select");
const soundToggleBtn = document.getElementById("sound-toggle");

const roomTitle = document.getElementById("room-title");
const roomCatPill = document.getElementById("room-cat-pill");
const roomCodeBadge = document.getElementById("room-code-badge");
const onlineCountEl = document.getElementById("online-count");
const userList = document.getElementById("user-list");
const messagesEl = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const themeToggle = document.getElementById("theme-toggle");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");
const backToChoiceLink = document.getElementById("back-to-choice-link");

// Reply elements
const replyingBanner = document.getElementById("replying-banner");
const replyingUser = document.getElementById("replying-user");
const replyingSnippet = document.getElementById("replying-snippet");
const cancelReplyBtn = document.getElementById("cancel-reply-btn");

// Poll elements
const pollBtn = document.getElementById("poll-btn");
const pollModal = document.getElementById("poll-modal");
const closePollModal = document.getElementById("close-poll-modal");
const pollForm = document.getElementById("poll-form");
const pollQuestionInput = document.getElementById("poll-question-input");

// Image attachment & Lightbox
const attachBtn = document.getElementById("attach-btn");
const imageFileInput = document.getElementById("image-file-input");
const lightboxModal = document.getElementById("lightbox-modal");
const lightboxImg = document.getElementById("lightbox-img");
const closeLightboxBtn = document.getElementById("close-lightbox");

// Pinned announcement elements
const pinnedAnnouncement = document.getElementById("pinned-announcement");
const pinnedAuthor = document.getElementById("pinned-author");
const pinnedText = document.getElementById("pinned-text");
const jumpToPinBtn = document.getElementById("jump-to-pin-btn");
const unpinBtn = document.getElementById("unpin-btn");

// State
let myUsername = "";
let myAvatarUrl = null;
let myBio = "";
let myStatus = "Online";
let myIsGuest = true;

let currentRoomId = "";
let pendingRoomData = null;
let currentCategory = "All";
let currentRoomHost = "";
let currentRoomMods = [];
let currentPinnedMessage = null;
let discoverSearchDebounce = null;
let typingTimeout = null;
let dmTypingTimeout = null;
let replyingTo = null; // { messageId, username, text }
let soundEnabled = localStorage.getItem("chat-sound") !== "false";
let audioCtx = null;

// DM State
let activeDMPartner = null;
let dmConversations = [];
let activeDMData = null;

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "🚀"];

function showScreen(screen) {
  [authScreen, roomChoiceScreen, roomCreatedScreen, profileScreen, chatScreen].forEach((s) => {
    if (s) s.classList.add("hidden");
  });
  if (screen) screen.classList.remove("hidden");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAvatarImg(url, name, sizeClass = "small") {
  if (url) {
    return `<img class="user-avatar ${sizeClass}" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" />`;
  }
  const initial = (name || "U")[0].toUpperCase();
  return `<span class="user-avatar ${sizeClass} avatar-placeholder">${initial}</span>`;
}

// Web Audio synthesizer for message chime
function playMessageChime() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {
    // Handled gracefully
  }
}

// Sound toggle
if (soundToggleBtn) {
  soundToggleBtn.textContent = soundEnabled ? "🔔" : "🔕";
  soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("chat-sound", soundEnabled ? "true" : "false");
    soundToggleBtn.textContent = soundEnabled ? "🔔" : "🔕";
  });
}

// ---- Check auth status on page load ----
async function checkAuth() {
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      myUsername = data.username;
      myIsGuest = data.isGuest;
      myAvatarUrl = data.avatarUrl || null;
      myBio = data.bio || "";
      myStatus = data.status || "Online";

      // Join DM channel on socket
      socket.emit("join_dm_channel");

      showRoomChoiceScreen();
    } else {
      showScreen(authScreen);
    }
  } catch (err) {
    showScreen(authScreen);
  }
}

function updateHeaderAvatar() {
  if (myAvatarUrl) {
    headerUserAvatar.src = myAvatarUrl;
    headerAvatarWrap.classList.remove("hidden");
  } else {
    headerAvatarWrap.classList.add("hidden");
  }
}

function showRoomChoiceScreen() {
  showScreen(roomChoiceScreen);
  signedInAs.textContent = myUsername;
  updateHeaderAvatar();
  profileLink.classList.toggle("hidden", myIsGuest);
  if (navProfile) navProfile.classList.toggle("hidden", myIsGuest);
  roomInput.value = "";
  joinError.classList.add("hidden");
  createError.classList.add("hidden");

  switchHubTab("discover");
  fetchDiscoverRooms();
  if (!myIsGuest) {
    fetchDMConversations();
    fetchFriends();
  }
}

guestBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/guest", { method: "POST" });
    const data = await res.json();
    myUsername = data.username;
    myIsGuest = true;
    myAvatarUrl = null;
    myBio = "";
    if (socket.connected) {
      socket.disconnect().connect();
    } else {
      socket.connect();
    }
    showRoomChoiceScreen();
  } catch (err) {
    alert("Could not start guest session. Please try again.");
  }
});

// ---- Theme toggle ----
const savedTheme = localStorage.getItem("chat-theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark-theme");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-theme");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("chat-theme", isDark ? "dark" : "light");
});

// ---- Mobile Drawer Toggle ----
function openSidebar() {
  chatSidebar.classList.add("open");
  sidebarBackdrop.classList.remove("hidden");
}
function closeSidebar() {
  chatSidebar.classList.remove("open");
  sidebarBackdrop.classList.add("hidden");
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeSidebar);

// ---- Hub Tab Switching ----
function switchHubTab(tabName) {
  tabDiscoverBtn.classList.toggle("active", tabName === "discover");
  tabDmsBtn.classList.toggle("active", tabName === "dms");
  tabFriendsBtn.classList.toggle("active", tabName === "friends");
  tabCreateBtn.classList.toggle("active", tabName === "create");
  tabJoinBtn.classList.toggle("active", tabName === "join");

  hubDiscoverPane.classList.toggle("hidden", tabName !== "discover");
  hubDmsPane.classList.toggle("hidden", tabName !== "dms");
  hubFriendsPane.classList.toggle("hidden", tabName !== "friends");
  hubCreatePane.classList.toggle("hidden", tabName !== "create");
  hubJoinPane.classList.toggle("hidden", tabName !== "join");

  if (navDiscover) navDiscover.classList.toggle("active", tabName === "discover");
  if (navDms) navDms.classList.toggle("active", tabName === "dms");
  if (navFriends) navFriends.classList.toggle("active", tabName === "friends");
  if (navCreate) navCreate.classList.toggle("active", tabName === "create");
  if (navJoin) navJoin.classList.toggle("active", tabName === "join");

  if (tabName === "discover") {
    fetchDiscoverRooms();
  } else if (tabName === "dms") {
    if (myIsGuest) {
      alert("Please sign in with Google to use Direct Messages.");
      switchHubTab("discover");
      return;
    }
    fetchDMConversations();
  } else if (tabName === "friends") {
    if (myIsGuest) {
      alert("Please sign in with Google to use the Friends list.");
      switchHubTab("discover");
      return;
    }
    fetchFriends();
  }
}

tabDiscoverBtn.addEventListener("click", () => switchHubTab("discover"));
tabDmsBtn.addEventListener("click", () => switchHubTab("dms"));
tabFriendsBtn.addEventListener("click", () => switchHubTab("friends"));
tabCreateBtn.addEventListener("click", () => switchHubTab("create"));
tabJoinBtn.addEventListener("click", () => switchHubTab("join"));

if (navDiscover) navDiscover.addEventListener("click", () => switchHubTab("discover"));
if (navDms) navDms.addEventListener("click", () => switchHubTab("dms"));
if (navFriends) navFriends.addEventListener("click", () => switchHubTab("friends"));
if (navCreate) navCreate.addEventListener("click", () => switchHubTab("create"));
if (navJoin) navJoin.addEventListener("click", () => switchHubTab("join"));
if (navProfile) navProfile.addEventListener("click", () => profileLink.click());

// Password toggle in create room
if (createRoomPassToggle) {
  createRoomPassToggle.addEventListener("change", () => {
    createRoomPassWrap.classList.toggle("hidden", !createRoomPassToggle.checked);
    if (createRoomPassToggle.checked) {
      createRoomPassInput.focus();
      checkPassComplexity(createRoomPassInput.value);
    }
  });
}

function checkPassComplexity(password) {
  const p = String(password || "").trim();
  const hasLen = p.length >= 6;
  const hasCap = /[A-Z]/.test(p);
  const hasNum = /[0-9]/.test(p);
  const hasSpec = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(p);

  const ruleLen = document.getElementById("rule-len");
  const ruleCap = document.getElementById("rule-cap");
  const ruleNum = document.getElementById("rule-num");
  const ruleSpec = document.getElementById("rule-spec");

  if (ruleLen) ruleLen.classList.toggle("valid", hasLen);
  if (ruleCap) ruleCap.classList.toggle("valid", hasCap);
  if (ruleNum) ruleNum.classList.toggle("valid", hasNum);
  if (ruleSpec) ruleSpec.classList.toggle("valid", hasSpec);

  return hasLen && hasCap && hasNum && hasSpec;
}

if (createRoomPassInput) {
  createRoomPassInput.addEventListener("input", () => {
    checkPassComplexity(createRoomPassInput.value);
  });
}

// ---- Discover Public Rooms API ----
async function fetchDiscoverRooms() {
  try {
    const q = encodeURIComponent(discoverSearchInput.value.trim());
    const cat = encodeURIComponent(currentCategory);
    const res = await fetch(`/api/rooms/discover?category=${cat}&search=${q}`);
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    renderDiscoverRooms(data.rooms || []);
  } catch (err) {
    discoverRoomsGrid.innerHTML = `<p class="sub" style="grid-column:1/-1; text-align:center;">Could not load public rooms. Please try again.</p>`;
  }
}

function renderDiscoverRooms(rooms) {
  discoverRoomsGrid.innerHTML = "";
  if (!rooms.length) {
    discoverRoomsGrid.innerHTML = `
      <div class="empty-discover-state">
        <p style="font-size:2rem; margin-bottom:0.5rem;">🏖️</p>
        <h4>No public rooms found</h4>
        <p class="sub">Be the first to create one in this category!</p>
      </div>
    `;
    return;
  }

  rooms.forEach((r) => {
    const card = document.createElement("div");
    card.className = "room-card";
    const userCount = r.onlineCount || 0;
    const cat = r.category || "General";
    const lockBadge = r.isPasswordProtected ? `<span class="lock-pill">🔒 Passcode</span>` : "";

    card.innerHTML = `
      <div class="room-card-head">
        <span class="room-card-title">${escapeHtml(r.name || "Room #" + r.roomId)}</span>
        <div style="display:flex; gap:0.35rem; align-items:center;">
          ${lockBadge}
          <span class="room-card-badge">${cat}</span>
        </div>
      </div>
      <p class="room-card-desc">${escapeHtml(r.description || "Join the conversation in this room.")}</p>
      <div class="room-card-foot">
        <span class="room-card-online">🟢 ${userCount} online</span>
        <button class="btn btn-sm btn-primary join-room-card-btn" data-room="${r.roomId}" data-protected="${Boolean(r.isPasswordProtected)}">Join Room →</button>
      </div>
    `;

    card.querySelector(".join-room-card-btn").addEventListener("click", () => {
      if (r.isPasswordProtected) {
        promptRoomPassword(r.roomId);
      } else {
        joinRoom(r.roomId);
      }
    });

    discoverRoomsGrid.appendChild(card);
  });
}

// Category filter chips
categoryChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    categoryChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentCategory = chip.dataset.cat;
    fetchDiscoverRooms();
  });
});

// Search input debounce
discoverSearchInput.addEventListener("input", () => {
  clearTimeout(discoverSearchDebounce);
  discoverSearchDebounce = setTimeout(fetchDiscoverRooms, 300);
});

// ---- Password Prompt Modal Handlers ----
function promptRoomPassword(roomId) {
  targetProtectedRoomId = roomId;
  roomPasswordInput.value = "";
  roomPasswordError.classList.add("hidden");
  roomPasswordModal.classList.remove("hidden");
  setTimeout(() => roomPasswordInput.focus(), 100);
}

if (closePasswordModal) {
  closePasswordModal.addEventListener("click", () => {
    roomPasswordModal.classList.add("hidden");
    targetProtectedRoomId = null;
  });
}

if (roomPasswordForm) {
  roomPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const passcode = roomPasswordInput.value.trim();
    if (!passcode) return;

    roomPasswordError.classList.add("hidden");
    await joinRoom(targetProtectedRoomId, passcode);
  });
}

// ---- Create Room Form Submission ----
createRoomForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  createError.classList.add("hidden");

  const name = createRoomName.value.trim();
  const description = createRoomDesc.value.trim();
  const category = createRoomCat.value;
  const isPublic = createRoomPrivacy.value === "public";
  const isPasswordProtected = Boolean(createRoomPassToggle && createRoomPassToggle.checked);
  const password = isPasswordProtected ? createRoomPassInput.value.trim() : null;

  if (isPasswordProtected) {
    if (!checkPassComplexity(password)) {
      createError.textContent = "Passcode must have min 6 chars, 1 uppercase (A-Z), 1 number (0-9) & 1 special character (!@#$).";
      createError.classList.remove("hidden");
      return;
    }
  }

  try {
    const res = await fetch("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, category, isPublic, isPasswordProtected, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      createError.textContent = data.error || "Could not create room.";
      createError.classList.remove("hidden");
      return;
    }

    pendingRoomData = data;
    showRoomCreatedScreen(data);
  } catch (err) {
    createError.textContent = "Network error. Please try again.";
    createError.classList.remove("hidden");
  }
});

function showRoomCreatedScreen(room) {
  showScreen(roomCreatedScreen);
  newRoomIdEl.textContent = room.roomId;
  createdRoomTitleDisplay.textContent = `${room.name || "Room #" + room.roomId} is ready!`;
  createdRoomSubtitle.textContent = `Category: ${room.category} • ${room.isPublic ? "🌐 Public" : "🔒 Private"}${room.isPasswordProtected ? " • 🔑 Protected" : ""}`;
}

copyRoomIdBtn.addEventListener("click", () => {
  if (!pendingRoomData) return;
  navigator.clipboard.writeText(pendingRoomData.roomId).then(() => {
    copyRoomIdBtn.textContent = "✓";
    setTimeout(() => (copyRoomIdBtn.textContent = "📋"), 1500);
  });
});

copyRoomLinkBtn.addEventListener("click", () => {
  if (!pendingRoomData) return;
  const url = `${window.location.origin}/app.html?room=${pendingRoomData.roomId}`;
  navigator.clipboard.writeText(url).then(() => {
    copyRoomLinkBtn.textContent = "✓";
    setTimeout(() => (copyRoomLinkBtn.textContent = "🔗"), 1500);
  });
});

enterRoomBtn.addEventListener("click", () => {
  if (!pendingRoomData) return;
  enterChat(pendingRoomData.roomId, pendingRoomData);
});

// ---- Join by Code Form Submission ----
joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  joinError.classList.add("hidden");

  const raw = roomInput.value.trim().toUpperCase();
  if (raw.length !== 6) {
    joinError.textContent = "Please enter a valid 6-character room code.";
    joinError.classList.remove("hidden");
    return;
  }

  joinRoom(raw);
});

async function joinRoom(roomId, password = null) {
  try {
    const payload = { roomId };
    if (password) payload.password = password;

    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.isPasswordRequired) {
        promptRoomPassword(roomId);
        if (password) {
          roomPasswordError.textContent = data.error || "Incorrect passcode.";
          roomPasswordError.classList.remove("hidden");
        }
        return;
      }
      joinError.textContent = data.error || "Could not join room.";
      joinError.classList.remove("hidden");
      return;
    }

    roomPasswordModal.classList.add("hidden");
    enterChat(roomId, data);
  } catch (err) {
    joinError.textContent = "Network error. Please check your connection.";
    joinError.classList.remove("hidden");
  }
}

// ---- Enter Chat Screen ----
function enterChat(roomId, roomInfo) {
  currentRoomId = roomId;
  currentRoomHost = roomInfo?.creatorUsername || "";
  currentRoomMods = roomInfo?.moderators || [];
  currentPinnedMessage = roomInfo?.pinnedMessage || null;

  showScreen(chatScreen);

  roomTitle.textContent = roomInfo?.name || `Room #${roomId}`;
  mobileRoomName.textContent = roomInfo?.name || `Room #${roomId}`;
  roomCatPill.textContent = roomInfo?.category || "General";
  roomCodeBadge.textContent = `#${roomId}`;

  messagesEl.innerHTML = "";
  typingIndicator.textContent = "";
  replyingTo = null;
  replyingBanner.classList.add("hidden");

  renderPinnedAnnouncement(currentPinnedMessage);

  if (!socket.connected) {
    socket.connect();
  }
  socket.emit("join_room", { room: roomId });
  messageInput.focus();
}

// ---- Direct Messaging (1-on-1 DMs) Client Logic ----

async function fetchDMConversations() {
  if (myIsGuest) return;
  try {
    const res = await fetch("/api/dm/conversations");
    if (!res.ok) return;
    const data = await res.json();
    dmConversations = data.conversations || [];
    renderDMConversations();
  } catch (err) {
    console.error("Failed to load DMs:", err);
  }
}

function renderDMConversations() {
  let unreadTotal = 0;
  dmConversationsList.innerHTML = "";

  if (!dmConversations.length) {
    dmConversationsList.innerHTML = `<p class="sub" style="text-align:center; padding:2rem 1rem;">No direct messages yet.<br>Click "New Chat" or click any user to chat 1-on-1!</p>`;
    dmTabUnread.classList.add("hidden");
    return;
  }

  dmConversations.forEach((c) => {
    unreadTotal += c.unreadCount || 0;
    const item = document.createElement("div");
    item.className = `dm-conv-item ${c.unreadCount > 0 ? "unread" : ""} ${activeDMPartner === c.partner ? "active" : ""}`;

    const dateStr = c.lastTime ? new Date(c.lastTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const avatarHtml = renderAvatarImg(c.avatarUrl, c.partner, "small");

    item.innerHTML = `
      ${avatarHtml}
      <div class="dm-conv-info">
        <div class="dm-conv-top">
          <span class="dm-conv-name">${escapeHtml(c.partner)}</span>
          <span class="dm-conv-time">${dateStr}</span>
        </div>
        <span class="dm-conv-snippet">${escapeHtml(c.lastMessage || "Started chat")}</span>
      </div>
      ${c.unreadCount > 0 ? `<span class="badge-count">${c.unreadCount}</span>` : ""}
    `;

    item.addEventListener("click", () => {
      openDMChat(c.partner, c.avatarUrl, c.userStatus);
    });

    dmConversationsList.appendChild(item);
  });

  if (unreadTotal > 0) {
    dmTabUnread.textContent = unreadTotal;
    dmTabUnread.classList.remove("hidden");
  } else {
    dmTabUnread.classList.add("hidden");
  }
}

async function openDMChat(partnerUsername, avatarUrl = null, userStatus = "Online") {
  if (myIsGuest) {
    alert("Please sign in with Google to send direct messages.");
    return;
  }

  activeDMPartner = partnerUsername;
  dmPlaceholder.classList.add("hidden");
  dmActiveChat.classList.remove("hidden");
  dmChatWindow.classList.remove("empty");

  // Mobile layout switch
  document.querySelector(".dm-sidebar").classList.add("hidden-mobile");
  dmChatWindow.classList.remove("hidden-mobile");

  dmPartnerName.textContent = partnerUsername;
  dmPartnerStatus.textContent = `🟢 ${userStatus || "Online"}`;
  if (avatarUrl) {
    dmPartnerAvatar.src = avatarUrl;
    dmPartnerAvatar.style.display = "inline-block";
  } else {
    dmPartnerAvatar.src = "";
    dmPartnerAvatar.style.display = "none";
  }

  dmMessages.innerHTML = `<p class="sub" style="text-align:center; padding:1rem;">Loading messages...</p>`;

  // Emit read
  socket.emit("dm_read", { partner: partnerUsername });

  try {
    const res = await fetch(`/api/dm/${partnerUsername}/messages`);
    if (!res.ok) throw new Error("Failed to load messages");
    const data = await res.json();
    renderDMMessages(data.messages || []);
  } catch (err) {
    dmMessages.innerHTML = `<p class="sub" style="text-align:center; color:var(--danger);">Could not load messages.</p>`;
  }

  fetchDMConversations();
  setTimeout(() => dmInput.focus(), 100);
}

function renderDMMessages(messages) {
  dmMessages.innerHTML = "";
  if (!messages.length) {
    dmMessages.innerHTML = `<p class="sub" style="text-align:center; padding:2rem 1rem;">This is the start of your direct message history with <strong>${escapeHtml(activeDMPartner)}</strong>.</p>`;
    return;
  }

  messages.forEach((m) => appendDMBubble(m));
  dmMessages.scrollTop = dmMessages.scrollHeight;
}

function appendDMBubble(m) {
  const isSent = m.sender === myUsername;
  const wrap = document.createElement("div");
  wrap.className = `dm-bubble-wrap ${isSent ? "sent" : "received"}`;

  const timeStr = new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  let imgHtml = "";
  if (m.imageUrl) {
    imgHtml = `<img src="${escapeHtml(m.imageUrl)}" alt="Media" class="chat-img" />`;
  }

  wrap.innerHTML = `
    <div class="dm-bubble">
      ${m.text ? `<div>${escapeHtml(m.text)}</div>` : ""}
      ${imgHtml}
    </div>
    <span class="dm-time">${timeStr}</span>
  `;

  if (m.imageUrl) {
    const imgEl = wrap.querySelector("img");
    imgEl.addEventListener("click", () => openLightbox(m.imageUrl));
  }

  dmMessages.appendChild(wrap);
  dmMessages.scrollTop = dmMessages.scrollHeight;
}

// DM Back button on mobile
if (dmBackBtn) {
  dmBackBtn.addEventListener("click", () => {
    document.querySelector(".dm-sidebar").classList.remove("hidden-mobile");
    dmChatWindow.classList.add("hidden-mobile");
  });
}

if (closeDmChatBtn) {
  closeDmChatBtn.addEventListener("click", () => {
    activeDMPartner = null;
    dmActiveChat.classList.add("hidden");
    dmPlaceholder.classList.remove("hidden");
    dmChatWindow.classList.add("empty");
    document.querySelector(".dm-sidebar").classList.remove("hidden-mobile");
    dmChatWindow.classList.remove("hidden-mobile");
  });
}

// DM message send
if (dmMessageForm) {
  dmMessageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = dmInput.value.trim();
    if (!text || !activeDMPartner) return;

    socket.emit("send_dm", {
      recipient: activeDMPartner,
      text,
      imageUrl: null,
    });

    dmInput.value = "";
  });
}

// DM image upload
if (dmAttachBtn && dmFileInput) {
  dmAttachBtn.addEventListener("click", () => dmFileInput.click());
  dmFileInput.addEventListener("change", async () => {
    const file = dmFileInput.files[0];
    if (!file || !activeDMPartner) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        socket.emit("send_dm", {
          recipient: activeDMPartner,
          text: "",
          imageUrl: data.imageUrl,
        });
      }
    } catch (err) {
      alert("Failed to upload image.");
    }
    dmFileInput.value = "";
  });
}

// DM typing emit
if (dmInput) {
  dmInput.addEventListener("input", () => {
    if (!activeDMPartner) return;
    socket.emit("dm_typing", { recipient: activeDMPartner });
  });
}

// New DM button
if (newDmBtn) {
  newDmBtn.addEventListener("click", () => {
    const target = prompt("Enter the username of the user you want to message:");
    if (target && target.trim()) {
      openDMChat(target.trim());
    }
  });
}

// ---- Friends System Client Logic ----

async function fetchFriends() {
  if (myIsGuest) return;
  try {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const data = await res.json();
    renderFriends(data.friends || []);
  } catch (err) {
    console.error("Failed to load friends:", err);
  }
}

function renderFriends(friends) {
  const pending = friends.filter((f) => f.status === "pending");
  const accepted = friends.filter((f) => f.status === "accepted");

  if (pending.length > 0) {
    friendsTabBadge.textContent = pending.length;
    friendsTabBadge.classList.remove("hidden");
    pendingRequestsSection.classList.remove("hidden");
    pendingRequestsCount.textContent = pending.length;

    pendingRequestsList.innerHTML = "";
    pending.forEach((p) => {
      const card = document.createElement("div");
      card.className = "pending-card";
      const avatarHtml = renderAvatarImg(p.avatarUrl, p.username, "small");

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.65rem;">
          ${avatarHtml}
          <strong>${escapeHtml(p.username)}</strong>
        </div>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn-chat-tiny accept-friend-btn">Accept</button>
          <button class="btn-remove-tiny decline-friend-btn">Decline</button>
        </div>
      `;

      card.querySelector(".accept-friend-btn").addEventListener("click", async () => {
        await fetch("/api/friends/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: p.username }),
        });
        fetchFriends();
      });

      card.querySelector(".decline-friend-btn").addEventListener("click", async () => {
        await fetch(`/api/friends/${p.username}`, { method: "DELETE" });
        fetchFriends();
      });

      pendingRequestsList.appendChild(card);
    });
  } else {
    friendsTabBadge.classList.add("hidden");
    pendingRequestsSection.classList.add("hidden");
  }

  friendsCount.textContent = accepted.length;
  friendsList.innerHTML = "";

  if (!accepted.length) {
    friendsList.innerHTML = `<p class="sub" style="grid-column:1/-1; text-align:center; padding:2rem 0;">No friends added yet. Enter a username above to connect!</p>`;
    return;
  }

  accepted.forEach((f) => {
    const card = document.createElement("div");
    card.className = "friend-card";
    const avatarHtml = renderAvatarImg(f.avatarUrl, f.username, "medium");

    card.innerHTML = `
      ${avatarHtml}
      <div class="friend-info">
        <span class="friend-name">${escapeHtml(f.username)}</span>
        <span class="friend-status-text">${f.isOnline ? "🟢 Online" : "⚪ Offline"}</span>
      </div>
      <div class="friend-actions">
        <button class="btn-chat-tiny chat-friend-btn">💬 Chat</button>
        <button class="btn-remove-tiny remove-friend-btn" title="Remove friend">✕</button>
      </div>
    `;

    card.querySelector(".chat-friend-btn").addEventListener("click", () => {
      switchHubTab("dms");
      openDMChat(f.username, f.avatarUrl, f.userStatus);
    });

    card.querySelector(".remove-friend-btn").addEventListener("click", async () => {
      if (confirm(`Remove ${f.username} from friends?`)) {
        await fetch(`/api/friends/${f.username}`, { method: "DELETE" });
        fetchFriends();
      }
    });

    friendsList.appendChild(card);
  });
}

if (addFriendBtn && addFriendInput) {
  addFriendBtn.addEventListener("click", async () => {
    const username = addFriendInput.value.trim();
    if (!username) return;

    friendRequestMsg.classList.add("hidden");
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Friend request sent!");
        addFriendInput.value = "";
        fetchFriends();
      } else {
        friendRequestMsg.textContent = data.error || "Could not send friend request.";
        friendRequestMsg.classList.remove("hidden");
      }
    } catch (err) {
      friendRequestMsg.textContent = "Network error. Try again.";
      friendRequestMsg.classList.remove("hidden");
    }
  });
}

// ---- User Profile Popup Modal ----

async function openUserProfileModal(username) {
  activeInspectedUser = username;
  try {
    const res = await fetch(`/api/users/${username}`);
    if (!res.ok) return;
    const data = await res.json();

    profileModalUsername.textContent = data.displayName || data.username;
    profileModalStatusText.textContent = data.isOnline ? "🟢 Online" : "⚪ Offline";
    profileModalBio.textContent = data.bio || "No bio written yet.";

    if (data.avatarUrl) {
      profileModalAvatar.src = data.avatarUrl;
      profileModalAvatar.style.display = "inline-block";
    } else {
      profileModalAvatar.src = "";
      profileModalAvatar.style.display = "none";
    }

    // Configure actions
    profileModalDmBtn.onclick = () => {
      userProfileModal.classList.add("hidden");
      if (currentRoomId) {
        // Leave chat or switch
        showRoomChoiceScreen();
      }
      switchHubTab("dms");
      openDMChat(data.username, data.avatarUrl, data.status);
    };

    profileModalFriendBtn.onclick = async () => {
      try {
        const fRes = await fetch("/api/friends/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: data.username }),
        });
        if (fRes.ok) {
          alert(`Friend request sent to ${data.username}!`);
          profileModalFriendBtn.textContent = "✓ Sent";
        } else {
          const errData = await fRes.json();
          alert(errData.error || "Could not send friend request.");
        }
      } catch (err) {
        alert("Network error.");
      }
    };

    userProfileModal.classList.remove("hidden");
  } catch (err) {
    console.error("User profile load failed:", err);
  }
}

if (closeUserProfileModal) {
  closeUserProfileModal.addEventListener("click", () => {
    userProfileModal.classList.add("hidden");
    activeInspectedUser = null;
  });
}

// ---- Profile Screen Management ----

profileLink.addEventListener("click", (e) => {
  e.preventDefault();
  loadProfile();
  showScreen(profileScreen);
});

backToRoomsBtn.addEventListener("click", () => {
  showRoomChoiceScreen();
});

async function loadProfile() {
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const data = await res.json();
    usernameInput.value = data.username;
    bioInput.value = data.bio || "";
    myAvatarUrl = data.avatarUrl || null;

    if (myAvatarUrl) {
      profileCurrentAvatar.src = myAvatarUrl;
      profileCurrentAvatar.style.display = "inline-block";
    } else {
      profileCurrentAvatar.src = "";
      profileCurrentAvatar.style.display = "none";
    }

    renderJoinedRooms(data.joinedRooms || []);
  } catch (err) {
    console.error("Failed to load profile:", err);
  }
}

// Avatar upload trigger
if (changeAvatarBtn && avatarFileInput) {
  changeAvatarBtn.addEventListener("click", () => avatarFileInput.click());
  avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.avatarUrl) {
        myAvatarUrl = data.avatarUrl;
        profileCurrentAvatar.src = data.avatarUrl;
        profileCurrentAvatar.style.display = "inline-block";
        updateHeaderAvatar();
        alert("Profile photo updated!");
      } else {
        alert(data.error || "Could not update avatar");
      }
    } catch (err) {
      alert("Error uploading avatar.");
    }
  });
}

// Save Username
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
    if (res.ok) {
      myUsername = data.username;
      usernameMsg.textContent = "Username saved!";
      usernameMsg.classList.remove("hidden");
      usernameMsg.style.color = "var(--success)";
      signedInAs.textContent = myUsername;
    } else {
      usernameMsg.textContent = data.error || "Could not update username.";
      usernameMsg.classList.remove("hidden");
      usernameMsg.style.color = "var(--danger)";
    }
  } catch (err) {
    usernameMsg.textContent = "Network error. Please try again.";
    usernameMsg.classList.remove("hidden");
  }
});

// Save Bio
if (saveBioBtn) {
  saveBioBtn.addEventListener("click", async () => {
    const bio = bioInput.value.trim();
    bioMsg.classList.add("hidden");
    try {
      const res = await fetch("/api/profile/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      const data = await res.json();
      if (res.ok) {
        myBio = data.bio;
        bioMsg.textContent = "Bio saved!";
        bioMsg.classList.remove("hidden");
        bioMsg.style.color = "var(--success)";
      } else {
        bioMsg.textContent = data.error || "Could not save bio.";
        bioMsg.classList.remove("hidden");
        bioMsg.style.color = "var(--danger)";
      }
    } catch (err) {
      bioMsg.textContent = "Network error.";
      bioMsg.classList.remove("hidden");
    }
  });
}

function renderJoinedRooms(rooms) {
  roomsList.innerHTML = "";
  if (!rooms.length) {
    roomsList.innerHTML = `<p class="sub" style="text-align:center; padding:1.5rem 0;">No joined rooms yet — explore public rooms in the lobby!</p>`;
    return;
  }

  rooms.forEach((r) => {
    const item = document.createElement("div");
    item.className = "joined-room-card";
    const dateStr = new Date(r.joinedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

    item.innerHTML = `
      <div class="joined-room-info">
        <span class="code-badge">#${r.roomId}</span>
        <span class="joined-date-tag">Joined ${dateStr}</span>
      </div>
      <div class="joined-room-actions">
        <button class="btn btn-sm btn-primary rejoin-btn" title="Enter room">🚀 Re-join Room</button>
        <button class="btn btn-sm btn-outline history-btn" title="Inspect message history">📖 History</button>
      </div>
    `;

    item.querySelector(".rejoin-btn").addEventListener("click", () => {
      joinRoom(r.roomId);
    });

    item.querySelector(".history-btn").addEventListener("click", () => {
      loadRoomMessagePreview(r.roomId);
    });

    roomsList.appendChild(item);
  });
}

async function loadRoomMessagePreview(roomId) {
  roomMessagesPreview.classList.remove("hidden");
  roomMessagesPreview.innerHTML = `
    <div class="preview-head">
      <h4>📖 Chat History: #${roomId}</h4>
      <div style="display:flex; gap:0.4rem;">
        <button id="preview-join-now-btn" class="btn btn-sm btn-primary">🚀 Enter Room Now</button>
        <button id="preview-close-btn" class="btn-icon-tiny">✕</button>
      </div>
    </div>
    <div id="preview-msg-list" class="preview-msg-list"><p class="sub" style="padding:1rem;">Loading messages...</p></div>
  `;

  document.getElementById("preview-join-now-btn").addEventListener("click", () => {
    joinRoom(roomId);
  });

  document.getElementById("preview-close-btn").addEventListener("click", () => {
    roomMessagesPreview.classList.add("hidden");
  });

  try {
    const res = await fetch(`/api/rooms/${roomId}/messages`);
    const data = await res.json();
    const msgListEl = document.getElementById("preview-msg-list");

    if (!data.messages || !data.messages.length) {
      msgListEl.innerHTML = `<p class="sub" style="padding:1rem;">No saved messages in this room yet.</p>`;
      return;
    }

    msgListEl.innerHTML = "";
    data.messages.forEach((m) => {
      const p = document.createElement("div");
      p.className = "preview-msg-item";
      const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      p.innerHTML = `<span class="time">${time}</span> <strong>${escapeHtml(m.username)}:</strong> <span>${escapeHtml(m.text || (m.imageUrl ? "[📷 Image]" : "[Attachment]"))}</span>`;
      msgListEl.appendChild(p);
    });
    msgListEl.scrollTop = msgListEl.scrollHeight;
  } catch (err) {
    const msgListEl = document.getElementById("preview-msg-list");
    if (msgListEl) msgListEl.innerHTML = `<p class="sub" style="color:var(--danger); padding:1rem;">Could not load room history.</p>`;
  }
}

// ---- Chatroom Core Logic ----

sidebarCopyLinkBtn.addEventListener("click", () => {
  if (!currentRoomId) return;
  const url = `${window.location.origin}/app.html?room=${currentRoomId}`;
  navigator.clipboard.writeText(url).then(() => {
    sidebarCopyLinkBtn.textContent = "✓";
    setTimeout(() => (sidebarCopyLinkBtn.textContent = "🔗"), 1500);
  });
});

if (mobileShareBtn) {
  mobileShareBtn.addEventListener("click", () => {
    if (!currentRoomId) return;
    const url = `${window.location.origin}/app.html?room=${currentRoomId}`;
    navigator.clipboard.writeText(url).then(() => {
      mobileShareBtn.textContent = "✓";
      setTimeout(() => (mobileShareBtn.textContent = "🔗"), 1500);
    });
  });
}

function returnToLobby() {
  if (currentRoomId) {
    socket.emit("leave_room");
    currentRoomId = "";
  }
  closeSidebar();
  showRoomChoiceScreen();
}

if (profileTopBackBtn) profileTopBackBtn.addEventListener("click", returnToLobby);
if (backToRoomsBtn) backToRoomsBtn.addEventListener("click", returnToLobby);
if (createdScreenBackBtn) createdScreenBackBtn.addEventListener("click", returnToLobby);
if (desktopLeaveRoomBtn) desktopLeaveRoomBtn.addEventListener("click", returnToLobby);
if (mobileBackLobbyBtn) mobileBackLobbyBtn.addEventListener("click", returnToLobby);
if (backToChoiceLink) {
  backToChoiceLink.addEventListener("click", (e) => {
    e.preventDefault();
    returnToLobby();
  });
}

// Status change
statusSelect.addEventListener("change", () => {
  const status = statusSelect.value;
  socket.emit("set_status", { status });
});

// Emoji Picker
const EMOJIS = ["😀", "😂", "🔥", "🚀", "❤️", "👍", "🎉", "✨", "🙌", "💯", "😎", "🤔", "💡", "🎮", "☕", "🍕", "🥳", "👋"];
EMOJIS.forEach((em) => {
  const span = document.createElement("span");
  span.className = "emoji-option";
  span.textContent = em;
  span.addEventListener("click", () => {
    messageInput.value += em;
    emojiPanel.classList.add("hidden");
    messageInput.focus();
  });
  emojiPanel.appendChild(span);
});

emojiBtn.addEventListener("click", () => {
  emojiPanel.classList.toggle("hidden");
});

// Image Upload in Chatroom
if (attachBtn && imageFileInput) {
  attachBtn.addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", async () => {
    const file = imageFileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        socket.emit("send_message", {
          text: messageInput.value.trim(),
          imageUrl: data.imageUrl,
          replyTo: replyingTo,
        });
        messageInput.value = "";
        clearReply();
      } else {
        alert(data.error || "Could not upload image");
      }
    } catch (err) {
      alert("Image upload failed.");
    }
    imageFileInput.value = "";
  });
}

// Lightbox modal handlers
function openLightbox(url) {
  lightboxImg.src = url;
  lightboxModal.classList.remove("hidden");
}
if (closeLightboxBtn) {
  closeLightboxBtn.addEventListener("click", () => lightboxModal.classList.add("hidden"));
}

// Pinned Announcement Banner
function renderPinnedAnnouncement(pin) {
  currentPinnedMessage = pin;
  if (!pin || !pin.text) {
    pinnedAnnouncement.classList.add("hidden");
    return;
  }

  pinnedAuthor.textContent = `Pinned by ${pin.username || "Host"}`;
  pinnedText.textContent = pin.text;
  pinnedAnnouncement.classList.remove("hidden");

  const isHostOrMod = myUsername === currentRoomHost || currentRoomMods.includes(myUsername);
  unpinBtn.classList.toggle("hidden", !isHostOrMod);
}

if (jumpToPinBtn) {
  jumpToPinBtn.addEventListener("click", () => {
    if (!currentPinnedMessage?.messageId) return;
    const el = document.getElementById(`msg-${currentPinnedMessage.messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-flash");
      setTimeout(() => el.classList.remove("highlight-flash"), 1600);
    }
  });
}

if (unpinBtn) {
  unpinBtn.addEventListener("click", () => {
    socket.emit("unpin_message");
  });
}

// Reply banner helpers
function setReply(messageId, username, text) {
  replyingTo = { messageId, username, text };
  replyingUser.textContent = username;
  replyingSnippet.textContent = text || "[Media Attachment]";
  replyingBanner.classList.remove("hidden");
  messageInput.focus();
}

function clearReply() {
  replyingTo = null;
  replyingBanner.classList.add("hidden");
}

cancelReplyBtn.addEventListener("click", clearReply);

// Poll Creator Modal
if (pollBtn) {
  pollBtn.addEventListener("click", () => {
    pollModal.classList.remove("hidden");
    pollQuestionInput.focus();
  });
}
if (closePollModal) {
  closePollModal.addEventListener("click", () => pollModal.classList.add("hidden"));
}
if (pollForm) {
  pollForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const question = pollQuestionInput.value.trim();
    const optInputs = document.querySelectorAll(".poll-opt-input");
    const options = Array.from(optInputs).map((i) => i.value.trim()).filter(Boolean);

    if (question && options.length >= 2) {
      socket.emit("create_poll", { question, options });
      pollModal.classList.add("hidden");
      pollForm.reset();
    }
  });
}

// Message Form Submission
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("send_message", {
    text,
    imageUrl: null,
    replyTo: replyingTo,
  });

  messageInput.value = "";
  clearReply();
  emojiPanel.classList.add("hidden");
});

// Typing indicator emit
messageInput.addEventListener("input", () => {
  socket.emit("typing");
});

// ---- Socket.IO Listeners ----

socket.on("room_history", ({ messages, roomInfo }) => {
  currentRoomHost = roomInfo?.creatorUsername || "";
  currentRoomMods = roomInfo?.moderators || [];
  renderPinnedAnnouncement(roomInfo?.pinnedMessage || null);

  messagesEl.innerHTML = "";
  if (messages && messages.length) {
    messages.forEach((m) => renderMessage(m));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
});

socket.on("receive_message", (msg) => {
  renderMessage(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  if (msg.user !== myUsername) {
    playMessageChime();
  }
});

socket.on("receive_dm", (dm) => {
  playMessageChime();

  const partner = dm.sender === myUsername ? dm.recipient : dm.sender;
  if (activeDMPartner === partner) {
    appendDMBubble(dm);
    socket.emit("dm_read", { partner });
  }

  fetchDMConversations();
});

socket.on("dm_display_typing", ({ sender }) => {
  if (activeDMPartner === sender) {
    dmTyping.textContent = `${sender} is typing...`;
    clearTimeout(dmTypingTimeout);
    dmTypingTimeout = setTimeout(() => {
      dmTyping.textContent = "";
    }, 2000);
  }
});

socket.on("dm_messages_read", () => {
  // Read receipts updated
});

socket.on("friend_request_received", ({ from }) => {
  playMessageChime();
  fetchFriends();
});

socket.on("friend_request_accepted", () => {
  playMessageChime();
  fetchFriends();
});

socket.on("pinned_message_updated", (pin) => {
  renderPinnedAnnouncement(pin);
});

socket.on("message_deleted", ({ messageId }) => {
  const el = document.getElementById(`msg-${messageId}`);
  if (el) el.remove();
});

socket.on("kicked_from_room", ({ reason }) => {
  alert(reason || "You were removed from the room.");
  currentRoomId = "";
  closeSidebar();
  showRoomChoiceScreen();
});

socket.on("system_message", (text) => {
  const div = document.createElement("div");
  div.className = "system-message";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

socket.on("user_list", (occupants) => {
  onlineCountEl.textContent = occupants.length;
  mobileOnlineTag.textContent = `🟢 ${occupants.length} online`;

  userList.innerHTML = "";
  occupants.forEach((u) => {
    const li = document.createElement("li");
    const isMe = u.username === myUsername;

    let roleBadge = "";
    if (u.isHost) {
      roleBadge = `<span class="role-badge host">👑 Host</span>`;
    } else if (u.isMod) {
      roleBadge = `<span class="role-badge mod">🛡️ Mod</span>`;
    }

    const avatarHtml = renderAvatarImg(u.avatarUrl, u.username, "small");

    const statusIcons = {
      Online: "🟢",
      Studying: "📚",
      Gaming: "🎮",
      Chilling: "☕",
      Listening: "🎧",
      DND: "⛔",
    };
    const icon = statusIcons[u.status] || "🟢";

    const canModerate = (myUsername === currentRoomHost || currentRoomMods.includes(myUsername)) && !isMe;
    const kickBtnHtml = canModerate ? `<button class="user-kick-btn" title="Kick user">🚫</button>` : "";

    li.innerHTML = `
      <div class="user-item-clickable">
        ${avatarHtml}
        <span class="user-item-name">${escapeHtml(u.username)}${isMe ? " (you)" : ""} ${roleBadge}</span>
        <span class="occupant-status" title="${u.status || "Online"}">${icon}</span>
        ${kickBtnHtml}
      </div>
    `;

    li.querySelector(".user-item-clickable").addEventListener("click", (e) => {
      if (e.target.closest(".user-kick-btn")) return;
      if (!isMe) {
        openUserProfileModal(u.username);
      }
    });

    if (canModerate) {
      li.querySelector(".user-kick-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Kick ${u.username} from this room?`)) {
          socket.emit("kick_user", { username: u.username });
        }
      });
    }

    userList.appendChild(li);
  });
});

socket.on("display_typing", (username) => {
  typingIndicator.textContent = `${username} is typing...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = "";
  }, 2000);
});

socket.on("message_reaction_updated", ({ messageId, reactions }) => {
  const el = document.getElementById(`msg-${messageId}`);
  if (!el) return;
  const reactionsWrap = el.querySelector(".msg-reactions-wrap");
  if (reactionsWrap) {
    reactionsWrap.innerHTML = "";
    (reactions || []).forEach((r) => {
      const isReactedByMe = Array.isArray(r.users) && r.users.includes(myUsername);
      const pill = document.createElement("button");
      pill.className = `reaction-pill ${isReactedByMe ? "reacted" : ""}`;
      pill.innerHTML = `${r.emoji} <span>${r.count}</span>`;
      pill.addEventListener("click", () => {
        socket.emit("toggle_reaction", { messageId, emoji: r.emoji });
      });
      reactionsWrap.appendChild(pill);
    });
  }
});

socket.on("poll_updated", ({ messageId, poll }) => {
  const el = document.getElementById(`msg-${messageId}`);
  if (!el) return;
  const pollContainer = el.querySelector(".poll-card");
  if (pollContainer) {
    renderPollContent(pollContainer, messageId, poll);
  }
});

// ---- Message Bubble Renderer ----

function renderMessage(msg) {
  const isMe = (msg.user || msg.username) === myUsername;
  const msgId = msg.messageId || msg._id || String(Math.random());

  const wrap = document.createElement("div");
  wrap.id = `msg-${msgId}`;
  wrap.className = `message-wrapper ${isMe ? "mine" : "theirs"}`;

  const user = msg.user || msg.username || "Anonymous";
  const time = msg.time || msg.createdAt ? new Date(msg.time || msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const avatarHtml = renderAvatarImg(msg.avatarUrl, user, "small");

  let replyHtml = "";
  if (msg.replyTo && (msg.replyTo.username || msg.replyTo.text)) {
    replyHtml = `
      <div class="reply-quote" data-target-id="${msg.replyTo.messageId || ""}">
        <span class="reply-quote-user">${escapeHtml(msg.replyTo.username)}:</span>
        <span class="reply-quote-text">${escapeHtml(msg.replyTo.text || "[Media]")}</span>
      </div>
    `;
  }

  let imgHtml = "";
  if (msg.imageUrl) {
    imgHtml = `<img src="${escapeHtml(msg.imageUrl)}" alt="Attached media" class="chat-img" />`;
  }

  const hasPoll = Boolean(
    msg.poll &&
    msg.poll.question &&
    Array.isArray(msg.poll.options) &&
    msg.poll.options.length > 0
  );

  let pollHtml = "";
  if (hasPoll) {
    pollHtml = `<div class="poll-card" data-msg-id="${msgId}"></div>`;
  }

  const isHostOrMod = myUsername === currentRoomHost || currentRoomMods.includes(myUsername);
  const canDelete = isMe || isHostOrMod;
  const canPin = isHostOrMod;

  wrap.innerHTML = `
    <div class="message-bubble">
      ${replyHtml}
      <div class="message-meta">
        <div class="message-header-user" style="cursor:pointer;">
          ${avatarHtml}
          <strong>${escapeHtml(user)}</strong>
        </div>
        <span class="time">${time}</span>
      </div>
      ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ""}
      ${imgHtml}
      ${pollHtml}
      <div class="msg-reactions-wrap"></div>
      <div class="msg-quick-bar">
        <button class="msg-action-btn quick-reply-btn" title="Reply">↩️</button>
        ${QUICK_REACTION_EMOJIS.map((em) => `<button class="quick-react-btn" data-emoji="${em}">${em}</button>`).join("")}
        ${canPin ? `<button class="msg-action-btn pin-msg-btn" title="Pin announcement">📌</button>` : ""}
        ${canDelete ? `<button class="msg-action-btn delete-msg-btn" title="Delete message">🗑️</button>` : ""}
      </div>
    </div>
  `;

  // Toggle quick action bar on mobile tap
  wrap.querySelector(".message-bubble").addEventListener("click", (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest(".message-header-user") ||
      e.target.closest("img") ||
      e.target.closest(".reply-quote") ||
      e.target.closest(".poll-option")
    ) {
      return;
    }
    const isShown = wrap.classList.contains("show-actions");
    document.querySelectorAll(".message-wrapper.show-actions").forEach((w) => w.classList.remove("show-actions"));
    if (!isShown) {
      wrap.classList.add("show-actions");
    }
  });

  // Profile modal on avatar/username click
  wrap.querySelector(".message-header-user").addEventListener("click", (e) => {
    e.stopPropagation();
    if (user !== myUsername) {
      openUserProfileModal(user);
    }
  });

  // Image Lightbox
  if (msg.imageUrl) {
    wrap.querySelector("img.chat-img").addEventListener("click", () => openLightbox(msg.imageUrl));
  }

  // Poll rendering
  if (hasPoll) {
    const pollCard = wrap.querySelector(".poll-card");
    if (pollCard) {
      renderPollContent(pollCard, msgId, msg.poll);
    }
  }

  // Quoted reply jump
  if (msg.replyTo?.messageId) {
    const quoteEl = wrap.querySelector(".reply-quote");
    if (quoteEl) {
      quoteEl.addEventListener("click", () => {
        const target = document.getElementById(`msg-${msg.replyTo.messageId}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("highlight-flash");
          setTimeout(() => target.classList.remove("highlight-flash"), 1600);
        }
      });
    }
  }

  // Reactions rendering
  const reactionsWrap = wrap.querySelector(".msg-reactions-wrap");
  (msg.reactions || []).forEach((r) => {
    const isReactedByMe = Array.isArray(r.users) && r.users.includes(myUsername);
    const pill = document.createElement("button");
    pill.className = `reaction-pill ${isReactedByMe ? "reacted" : ""}`;
    pill.innerHTML = `${r.emoji} <span>${r.count}</span>`;
    pill.addEventListener("click", () => {
      socket.emit("toggle_reaction", { messageId: msgId, emoji: r.emoji });
    });
    reactionsWrap.appendChild(pill);
  });

  // Action bar buttons
  wrap.querySelector(".quick-reply-btn").addEventListener("click", () => {
    setReply(msgId, user, msg.text || (msg.imageUrl ? "[Media]" : "Poll"));
  });

  wrap.querySelectorAll(".quick-react-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      socket.emit("toggle_reaction", { messageId: msgId, emoji: btn.dataset.emoji });
    });
  });

  if (canPin) {
    const pinBtn = wrap.querySelector(".pin-msg-btn");
    if (pinBtn) {
      pinBtn.addEventListener("click", () => {
        socket.emit("pin_message", { messageId: msgId });
      });
    }
  }

  if (canDelete) {
    const delBtn = wrap.querySelector(".delete-msg-btn");
    if (delBtn) {
      delBtn.addEventListener("click", () => {
        if (confirm("Delete this message?")) {
          socket.emit("delete_message", { messageId: msgId });
        }
      });
    }
  }

  messagesEl.appendChild(wrap);
}

function renderPollContent(container, messageId, poll) {
  let totalVotes = 0;
  (poll.options || []).forEach((opt) => {
    totalVotes += Array.isArray(opt.votes) ? opt.votes.length : 0;
  });

  container.innerHTML = `
    <h4 class="poll-question">📊 ${escapeHtml(poll.question)}</h4>
    <div class="poll-options">
      ${(poll.options || [])
        .map((opt, idx) => {
          const count = Array.isArray(opt.votes) ? opt.votes.length : 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const hasVoted = Array.isArray(opt.votes) && opt.votes.includes(myUsername);

          return `
            <div class="poll-option ${hasVoted ? "voted" : ""}" data-idx="${idx}">
              <div class="poll-bar-fill" style="width:${percent}%"></div>
              <span class="poll-opt-text">${escapeHtml(opt.text)}</span>
              <span class="poll-opt-percent">${percent}% (${count})</span>
            </div>
          `;
        })
        .join("")}
    </div>
    <div class="poll-meta">Total Votes: ${totalVotes}</div>
  `;

  container.querySelectorAll(".poll-option").forEach((optEl) => {
    optEl.addEventListener("click", () => {
      const idx = parseInt(optEl.dataset.idx, 10);
      socket.emit("vote_poll", { messageId, optionIndex: idx });
    });
  });
}

// Auto join if ?room= query param is in URL
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get("room");
if (roomParam) {
  checkAuth().then(() => {
    joinRoom(roomParam.trim().toUpperCase());
  });
} else {
  checkAuth();
}
