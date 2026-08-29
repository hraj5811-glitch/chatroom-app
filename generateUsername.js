const User = require("./models/User");

async function generateUniqueUsername() {
  let username;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit number
    username = `User_${randomNum}`;
    exists = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
  }

  return username;
}

module.exports = { generateUniqueUsername };
