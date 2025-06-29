const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  // Match identification
  matchId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Game and participants
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  participants: [{
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      required: true
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    position: Number, // 1st, 2nd, 3rd, etc.
    score: Number,
    moves: Number,
    avgResponseTime: Number,
    errors: Number
  }],
  
  // Match results
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot',
    default: null
  },
  result: {
    type: String,
    enum: ['completed', 'draw', 'timeout', 'error', 'cancelled'],
    required: true
  },
  
  // Match details
  duration: {
    type: Number, // in seconds
    required: true
  },
  totalMoves: {
    type: Number,
    default: 0
  },
  
  // Game state and logs
  gameState: {
    initial: mongoose.Schema.Types.Mixed,
    final: mongoose.Schema.Types.Mixed,
    moves: [{
      player: String,
      move: mongoose.Schema.Types.Mixed,
      timestamp: Date,
      gameState: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Match metadata
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'error'],
    default: 'pending'
  },
  startedAt: Date,
  completedAt: Date,
  
  // Error handling
  error: {
    message: String,
    stack: String,
    timestamp: Date
  },
  
  // Match settings
  settings: {
    timePerMove: Number, // milliseconds
    maxMoves: Number,
    ranked: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
matchSchema.index({ matchId: 1 });
matchSchema.index({ game: 1 });
matchSchema.index({ 'participants.bot': 1 });
matchSchema.index({ 'participants.player': 1 });
matchSchema.index({ createdAt: -1 });
matchSchema.index({ status: 1 });

// Virtuals
matchSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

matchSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Generate unique match ID
matchSchema.pre('save', function(next) {
  if (!this.matchId) {
    this.matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Instance methods
matchSchema.methods.start = function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
  return this.save();
};

matchSchema.methods.complete = function(winnerId = null, result = 'completed') {
  this.status = 'completed';
  this.completedAt = new Date();
  this.result = result;
  this.winner = winnerId;
  this.duration = Math.round((this.completedAt - this.startedAt) / 1000);
  return this.save();
};

matchSchema.methods.addMove = function(playerId, move, newGameState) {
  this.gameState.moves.push({
    player: playerId,
    move: move,
    timestamp: new Date(),
    gameState: newGameState
  });
  this.totalMoves += 1;
  this.gameState.final = newGameState;
  return this.save();
};

matchSchema.methods.setError = function(errorMessage, errorStack = null) {
  this.status = 'error';
  this.result = 'error';
  this.error = {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date()
  };
  if (!this.completedAt) {
    this.completedAt = new Date();
    this.duration = this.startedAt ? 
      Math.round((this.completedAt - this.startedAt) / 1000) : 0;
  }
  return this.save();
};

matchSchema.methods.getPublicData = function() {
  const match = this.toObject();
  
  // Remove sensitive data
  delete match.error?.stack;
  
  // Simplify game state for public viewing
  if (match.gameState?.moves) {
    match.gameState.moves = match.gameState.moves.map(move => ({
      player: move.player,
      timestamp: move.timestamp,
      // Only include move data, not full game state
      move: move.move
    }));
  }
  
  return match;
};

// Static methods
matchSchema.statics.getRecentMatches = function(limit = 20, gameId = null) {
  const query = gameId ? { game: gameId, status: 'completed' } : { status: 'completed' };
  
  return this.find(query)
    .populate('game', 'name icon')
    .populate('participants.bot', 'name')
    .populate('participants.player', 'username displayName avatar')
    .populate('winner', 'name')
    .sort({ completedAt: -1 })
    .limit(limit);
};

matchSchema.statics.getMatchHistory = function(userId, limit = 50) {
  return this.find({ 
    'participants.player': userId,
    status: 'completed'
  })
  .populate('game', 'name icon')
  .populate('participants.bot', 'name')
  .populate('winner', 'name')
  .sort({ completedAt: -1 })
  .limit(limit);
};

matchSchema.statics.getBotMatchHistory = function(botId, limit = 50) {
  return this.find({ 
    'participants.bot': botId,
    status: 'completed'
  })
  .populate('game', 'name icon')
  .populate('participants.player', 'username displayName')
  .populate('winner', 'name')
  .sort({ completedAt: -1 })
  .limit(limit);
};

matchSchema.statics.getMatchStatistics = function(gameId = null) {
  const matchQuery = gameId ? { game: gameId } : {};
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalMatches: { $sum: 1 },
        completedMatches: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        avgDuration: { $avg: '$duration' },
        totalMoves: { $sum: '$totalMoves' }
      }
    }
  ]);
};

module.exports = mongoose.model('Match', matchSchema);