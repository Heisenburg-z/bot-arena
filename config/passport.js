const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findByProvider('google', profile.id);
    
    if (user) {
      // Update last active time
      user.lastActive = new Date();
      await user.save();
      return done(null, user);
    }

    // Check if user exists with the same email
    const existingUser = await User.findOne({ email: profile.emails[0].value });
    if (existingUser) {
      // Link Google account to existing user
      existingUser.provider = 'google';
      existingUser.providerId = profile.id;
      existingUser.avatar = existingUser.avatar || profile.photos[0]?.value;
      await existingUser.save();
      return done(null, existingUser);
    }

    // Create new user
    const username = await generateUniqueUsername(profile.displayName || profile.emails[0].value.split('@')[0]);
    
    user = new User({
      username,
      email: profile.emails[0].value,
      displayName: profile.displayName,
      avatar: profile.photos[0]?.value,
      provider: 'google',
      providerId: profile.id,
      isVerified: true
    });

    await user.save();
    done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    done(error, null);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: '/api/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this GitHub ID
    let user = await User.findByProvider('github', profile.id);
    
    if (user) {
      // Update last active time and GitHub URL
      user.lastActive = new Date();
      user.githubUrl = profile.profileUrl;
      await user.save();
      return done(null, user);
    }

    // Check if user exists with the same email
    const email = profile.emails?.[0]?.value;
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // Link GitHub account to existing user
        existingUser.provider = 'github';
        existingUser.providerId = profile.id;
        existingUser.avatar = existingUser.avatar || profile.photos[0]?.value;
        existingUser.githubUrl = profile.profileUrl;
        await existingUser.save();
        return done(null, existingUser);
      }
    }

    // Create new user
    const username = await generateUniqueUsername(profile.username || profile.displayName);
    
    user = new User({
      username,
      email: email || `${profile.username}@github.local`,
      displayName: profile.displayName || profile.username,
      avatar: profile.photos[0]?.value,
      bio: profile._json.bio || '',
      githubUrl: profile.profileUrl,
      provider: 'github',
      providerId: profile.id,
      isVerified: true
    });

    await user.save();
    done(null, user);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    done(error, null);
  }
}));

// Helper function to generate unique username
async function generateUniqueUsername(baseUsername) {
  let username = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  if (username.length < 3) {
    username = 'user' + Math.floor(Math.random() * 1000);
  }
  
  let counter = 0;
  let uniqueUsername = username;
  
  while (await User.findOne({ username: uniqueUsername })) {
    counter++;
    uniqueUsername = `${username}${counter}`;
  }
  
  return uniqueUsername;
}

module.exports = passport;