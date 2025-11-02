const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ContentSchema = new Schema({
  title: String,
  year: Number,
  genres: [String],
  director: String,
  actors: [String],
  description: String,
  videoUrl: String,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  views: { type:Number, default:0 },
  rating: { type:Number, default:0 }
});
module.exports = mongoose.model('Content', ContentSchema);
