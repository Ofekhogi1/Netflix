const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
const SALT_ROUNDS = 10;

const UserSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  hash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  profiles: [{ type: Schema.Types.ObjectId, ref: 'Profile' }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'Content' }]
}, {
  timestamps: true
});

UserSchema.methods.setPassword = async function(pw){
  this.hash = await bcrypt.hash(pw, SALT_ROUNDS);
};

UserSchema.methods.comparePassword = async function(pw){
  if(!this.hash) return false;
  return bcrypt.compare(pw, this.hash);
};

module.exports = mongoose.model('User', UserSchema);