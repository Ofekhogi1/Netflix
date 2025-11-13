const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EpisodeSchema = new Schema({
  season: { type: Number, default: 1 },
  episodeNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: String,
  duration: String, // e.g., "45 min"
  videoUrl: String,
  imageUrl: String,
  airDate: Date
});

const ContentSchema = new Schema({
  title: String,
  type: { type: String, enum: ['movie', 'series'], default: 'movie' },
  year: Number,
  genres: [String],
  director: String,
  actors: [String],
  description: String,
  videoUrl: String, // For movies or series trailer
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  imdbRating: { type: String, default: null },
  rottenTomatoesRating: { type: String, default: null },
  
  // Series-specific fields
  seasons: { type: Number, default: 1 },
  episodes: [EpisodeSchema],
  totalEpisodes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Content', ContentSchema);
