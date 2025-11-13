const Profile = require('../models/Profile');
const User = require('../models/User');

// GET profile selection page
exports.getProfileSelect = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('profiles');
    res.render('profile_select', { user, profiles: user.profiles });
  } catch (err) {
    console.error('Profile select error:', err);
    res.redirect('/');
  }
};

// POST set active profile
exports.setActiveProfile = async (req, res) => {
  try {
    const { profileId } = req.body;
    const prof = await Profile.findById(profileId);
    if (!prof) return res.redirect('/profiles/select');
    req.session.activeProfile = prof;
    res.redirect('/');
  } catch (err) {
    console.error('Set active profile error:', err);
    res.redirect('/profiles/select');
  }
};

// POST create profile
exports.createProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const prof = new Profile({ name, user: req.session.userId });
    await prof.save();
    const user = await User.findById(req.session.userId);
    user.profiles.push(prof._id);
    await user.save();
    res.redirect('/settings');
  } catch (err) {
    console.error('Create profile error:', err);
    res.redirect('/settings');
  }
};

// DELETE profile
exports.deleteProfile = async (req, res) => {
  try {
    await Profile.findByIdAndDelete(req.params.id);
    const user = await User.findById(req.session.userId);
    user.profiles = user.profiles.filter(p => String(p) !== req.params.id);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete profile error:', err);
    res.status(500).json({ ok: false });
  }
};

// PUT update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    await Profile.findByIdAndUpdate(req.params.id, { name });
    res.json({ ok: true });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ ok: false });
  }
};
