const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ProfileSchema = new Schema({
  name: String,
  user: { type: Schema.Types.ObjectId, ref:'User' },
  likes: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
  createdAt:{ type:Date, default:Date.now }
});
module.exports = mongoose.model('Profile', ProfileSchema);
