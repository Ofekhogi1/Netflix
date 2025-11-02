const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ProfileSchema = new Schema({
  name: String,
  user: { type: Schema.Types.ObjectId, ref:'User' },
  createdAt:{ type:Date, default:Date.now }
});
module.exports = mongoose.model('Profile', ProfileSchema);
