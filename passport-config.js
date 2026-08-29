const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const { generateUniqueUsername } = require("./generateUsername");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googlePhoto = profile.photos?.[0]?.value || null;
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          const username = await generateUniqueUsername();
          user = await User.create({
            googleId: profile.id,
            email: profile.emails?.[0]?.value || "",
            displayName: profile.displayName || "",
            username,
            avatarUrl: googlePhoto,
          });
        } else if (!user.avatarUrl && googlePhoto) {
          user.avatarUrl = googlePhoto;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
