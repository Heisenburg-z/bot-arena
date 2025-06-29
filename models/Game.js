const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', 'Expert'],
    required: true
  },
  icon: {
    type: String,
    default: '🎮'
  },
  color: {
    type: String,
    default: 'blue'
  },
  
  // Game configuration
  maxPlayers: {
    type: Number,
    default: 2,
    min: 1,
    max: 8
  },
  minPlayers: {
    type: Number,
    default: 2,
    min: 1
  },
  timeLimit: {
    type: Number, // in minutes
    default: 10
  },
  
  // Game rules and API
  rules: {
    type: String,
    required: true,
    maxlength: 2000
  },
  apiEndpoint: {
    type: String,
    required: true
  },
  
  // Statistics
  stats: {
    totalMatches: { type: Number, default: 0 },
    activeBots: { type: Number, default: 0 },
    avgMatchDuration: { type: Number, default: 0 }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
gameSchema.index({ name: 1 });
gameSchema.index({ difficulty: 1 });
gameSchema.index({ isActive: 1 });
gameSchema.index({ 'stats.activeBots': -1 });

// Virtuals
gameSchema.virtual('difficultyColor').get(function() {
  const colors = {
    'Easy': 'green',
    'Medium': 'yellow',
    'Hard': 'orange',
    'Expert': 'red'
  };
  return colors[this.difficulty] || 'blue';
});

gameSchema.virtual('playerCount').get(function() {
  return this.stats.activeBots;
});

// Instance methods
gameSchema.methods.addBot = function() {
  this.stats.activeBots += 1;
  return this.save();
};

gameSchema.methods.removeBot = function() {
  this.stats.activeBots = Math.max(0, this.stats.activeBots - 1);
  return this.save();
};

gameSchema.methods.recordMatch = function(duration) {
  this.stats.totalMatches += 1;
  
  // Update average match duration
  const totalDuration = this.stats.avgMatchDuration * (this.stats.totalMatches - 1);
  this.stats.avgMatchDuration = Math.round((totalDuration + duration) / this.stats.totalMatches);
  
  return this.save();
};

// Static methods
gameSchema.statics.getPopularGames = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'stats.activeBots': -1, 'stats.totalMatches': -1 })
    .limit(limit);
};

gameSchema.statics.getByDifficulty = function(difficulty) {
  return this.find({ difficulty, isActive: true })
    .sort({ 'stats.activeBots': -1 });
};

module.exports = mongoose.model('Game', gameSchema);