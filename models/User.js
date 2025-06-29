const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic info
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },

  // Authentication
  provider: {
    type: String,
    enum: ['google', 'github', 'local'],
    required: true
  },
  providerId: {
    type: String,
    sparse: true // allows null values but maintains uniqueness when not null
  },
  password: {
    type: String,
    required: function() {
      return this.provider === 'local';
    }
  },

  // Profile URLs
  githubUrl: String,
  linkedinUrl: String,
  websiteUrl: String,

  // Gaming stats
  stats: {
    totalGames: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    score: { type: Number, default: 1000 }, // ELO-style rating
    rank: { type: Number, default: null },
    winRate: { type: Number, default: 0 },
    favoriteGame: { type: String, default: null }
  },

  // Activity
  lastActive: { type: Date, default: Date.now },
  joinedAt: { type: Date, default: Date.now },
  
  // Preferences
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    matchNotifications: { type: Boolean, default: true },
    publicProfile: { type: Boolean, default: true }
  },

  // Account status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  
  // Admin/moderation
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'stats.score': -1 });
userSchema.index({ provider: 1, providerId: 1 });

// Virtual for computed win rate
userSchema.virtual('computedWinRate').get(function() {
  if (this.stats.totalGames === 0) return 0;
  return Math.round((this.stats.wins / this.stats.totalGames) * 100);
});

// Virtual for rank badge
userSchema.virtual('rankBadge').get(function() {
  const score = this.stats.score;
  if (score >= 2000) return { tier: 'Master', color: 'purple', icon: '👑' };
  if (score >= 1800) return { tier: 'Diamond', color: 'blue', icon: '💎' };
  if (score >= 1600) return { tier: 'Gold', color: 'yellow', icon: '🥇' };
  if (score >= 1400) return { tier: 'Silver', color: 'gray', icon: '🥈' };
  if (score >= 1200) return { tier: 'Bronze', color: 'orange', icon: '🥉' };
  return { tier: 'Iron', color: 'slate', icon: '⚔️' };
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update win rate
userSchema.pre('save', function(next) {
  if (this.stats.totalGames > 0) {
    this.stats.winRate = Math.round((this.stats.wins / this.stats.totalGames) * 100);
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateStats = function(result) {
  this.stats.totalGames += 1;
  this.lastActive = new Date();
  
  switch (result) {
    case 'win':
      this.stats.wins += 1;
      this.stats.score += 25;
      break;
    case 'loss':
      this.stats.losses += 1;
      this.stats.score = Math.max(800, this.stats.score - 25);
      break;
    case 'draw':
      this.stats.draws += 1;
      this.stats.score += 5;
      break;
  }
  
  return this.save();
};

userSchema.methods.toPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  delete user.email;
  delete user.providerId;
  if (!user.preferences.publicProfile) {
    delete user.githubUrl;
    delete user.linkedinUrl;
    delete user.websiteUrl;
    delete user.bio;
  }
  return user;
};

// Static methods
userSchema.statics.findByProvider = function(provider, providerId) {
  return this.findOne({ provider, providerId });
};

userSchema.statics.getLeaderboard = function(limit = 50) {
  return this.find({ isActive: true })
    .sort({ 'stats.score': -1, 'stats.wins': -1 })
    .limit(limit)
    .select('-password -email -providerId');
};

module.exports = mongoose.model('User', userSchema);