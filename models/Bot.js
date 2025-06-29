const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  
  // Bot ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Game association
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  
  // Bot code/file
  codeFile: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  },
  
  // Bot configuration
  language: {
    type: String,
    enum: ['javascript', 'python', 'java', 'cpp', 'rust', 'go'],
    required: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  
  // Statistics
  stats: {
    matches: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    score: { type: Number, default: 1000 },
    rank: { type: Number, default: null },
    winRate: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 } // in milliseconds
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'error', 'banned'],
    default: 'pending'
  },
  
  // Validation results
  lastValidation: {
    timestamp: Date,
    passed: Boolean,
    errors: [String],
    warnings: [String]
  },
  
  // Performance metrics
  performance: {
    memoryUsage: Number, // in MB
    executionTime: Number, // in milliseconds
    lastRun: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
botSchema.index({ owner: 1 });
botSchema.index({ game: 1 });
botSchema.index({ 'stats.score': -1 });
botSchema.index({ status: 1 });
botSchema.index({ owner: 1, game: 1 }, { unique: true }); // One bot per user per game

// Virtuals
botSchema.virtual('winRate').get(function() {
  if (this.stats.matches === 0) return 0;
  return Math.round((this.stats.wins / this.stats.matches) * 100);
});

botSchema.virtual('isEligible').get(function() {
  return this.status === 'active' && this.isActive;
});

// Pre-save middleware to update win rate
botSchema.pre('save', function(next) {
  if (this.stats.matches > 0) {
    this.stats.winRate = Math.round((this.stats.wins / this.stats.matches) * 100);
  }
  next();
});

// Instance methods
botSchema.methods.updateStats = function(result, responseTime = 0) {
  this.stats.matches += 1;
  this.performance.lastRun = new Date();
  
  // Update response time average
  if (responseTime > 0) {
    const totalTime = this.stats.avgResponseTime * (this.stats.matches - 1);
    this.stats.avgResponseTime = Math.round((totalTime + responseTime) / this.stats.matches);
  }
  
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

botSchema.methods.validate = async function(validationErrors = [], validationWarnings = []) {
  this.lastValidation = {
    timestamp: new Date(),
    passed: validationErrors.length === 0,
    errors: validationErrors,
    warnings: validationWarnings
  };
  
  if (validationErrors.length === 0) {
    this.status = 'active';
  } else {
    this.status = 'error';
  }
  
  return this.save();
};

botSchema.methods.toPublic = function() {
  const bot = this.toObject();
  delete bot.codeFile;
  return bot;
};

// Static methods
botSchema.statics.getLeaderboard = function(gameId, limit = 50) {
  const query = gameId ? { game: gameId, status: 'active' } : { status: 'active' };
  
  return this.find(query)
    .populate('owner', 'username displayName avatar')
    .populate('game', 'name icon')
    .sort({ 'stats.score': -1, 'stats.wins': -1 })
    .limit(limit);
};

botSchema.statics.getByUser = function(userId) {
  return this.find({ owner: userId })
    .populate('game', 'name icon difficulty')
    .sort({ updatedAt: -1 });
};

botSchema.statics.getActiveBotsForGame = function(gameId) {
  return this.find({ 
    game: gameId, 
    status: 'active',
    isActive: true 
  })
  .populate('owner', 'username displayName avatar')
  .sort({ 'stats.score': -1 });
};

module.exports = mongoose.model('Bot', botSchema);