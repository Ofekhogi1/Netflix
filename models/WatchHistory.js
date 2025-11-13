// models/WatchHistory.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WatchHistorySchema = new Schema({
  user: { 
  type: Schema.Types.ObjectId, 
  ref: 'Profile', 
  required: true 
  },
  content: { 
    type: Schema.Types.ObjectId, 
    ref: 'Content', 
    required: true 
  },
  episodeNumber: {
    type: Number,
    default: null // null for movies, episode number for series
  },
  season: {
    type: Number,
    default: null // null for movies, season number for series
  },
  progress: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
  timestamp: { 
    type: Number, 
    default: 0 
  },
  lastWatched: { 
    type: Date, 
    default: Date.now 
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create compound index for profile + content + episode + season
WatchHistorySchema.index({ user: 1, content: 1, episodeNumber: 1, season: 1 }, { unique: true });

// Create index for lastWatched for sorting
WatchHistorySchema.index({ lastWatched: -1 });

// Middleware to mark as completed when progress >= 95%
WatchHistorySchema.pre('save', function(next) {
  if (this.progress >= 95) {
    this.completed = true;
  }
  next();
});

module.exports = mongoose.model('WatchHistory', WatchHistorySchema);