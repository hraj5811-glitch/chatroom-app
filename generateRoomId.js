const Room = require("./models/Room");

// Avoids confusing characters like 0/O and 1/I so IDs are easy to read and share out loud
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

async function generateUniqueRoomId() {
  let roomId;
  let exists = true;

  while (exists) {
    roomId = randomCode(6);
    exists = await Room.findOne({ roomId });
  }

  return roomId;
}

module.exports = { generateUniqueRoomId };
