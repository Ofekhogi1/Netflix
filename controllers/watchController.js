const Watch = require('../models/WatchHistory');

// POST save watch progress
exports.saveProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { progress, timestamp, episodeNumber, season } = req.body;
    const profile = req.session.activeProfile ? (req.session.activeProfile._id ? req.session.activeProfile._id : req.session.activeProfile) : null;
    if (!profile) return res.status(400).json({ ok: false, message: 'No active profile' });

    const data = {
      user: profile,
      content: contentId,
      episodeNumber: episodeNumber ? Number(episodeNumber) : null,
      season: season ? Number(season) : null,
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      timestamp: Number(timestamp) || 0,
      lastWatched: new Date()
    };

    const query = { 
      user: profile, 
      content: contentId,
      episodeNumber: data.episodeNumber,
      season: data.season
    };
    
    const existing = await Watch.findOne(query);
    if (existing) {
      existing.progress = data.progress;
      existing.timestamp = data.timestamp;
      existing.lastWatched = data.lastWatched;
      await existing.save();
      return res.json({ ok: true, watch: existing });
    }

    const wh = new Watch(data);
    await wh.save();
    res.json({ ok: true, watch: wh });
  } catch (err) {
    console.error('Save watch error:', err);
    res.status(500).json({ ok: false });
  }
};

// GET watch progress
exports.getProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const episodeNumber = req.query.episode ? Number(req.query.episode) : null;
    const season = req.query.season ? Number(req.query.season) : null;
    const profile = req.session.activeProfile ? (req.session.activeProfile._id ? req.session.activeProfile._id : req.session.activeProfile) : null;
    if (!profile) return res.json({ ok: true, watch: null });
    
    const query = {
      user: profile,
      content: contentId
    };
    
    // Only filter by episode/season if both are provided
    if (episodeNumber !== null && season !== null) {
      query.episodeNumber = episodeNumber;
      query.season = season;
    } else if (episodeNumber === null && season === null) {
      query.episodeNumber = null;
    }
    
    const existing = await Watch.findOne(query);
    res.json({ ok: true, watch: existing });
  } catch (err) {
    console.error('Get watch error:', err);
    res.status(500).json({ ok: false });
  }
};

// GET all episodes progress
exports.getEpisodesProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const profile = req.session.activeProfile ? (req.session.activeProfile._id ? req.session.activeProfile._id : req.session.activeProfile) : null;
    if (!profile) return res.json({ ok: true, episodes: [] });
    
    const allEpisodes = await Watch.find({
      user: profile,
      content: contentId,
      episodeNumber: { $ne: null }
    });
    
    res.json({ ok: true, episodes: allEpisodes });
  } catch (err) {
    console.error('Get episodes watch error:', err);
    res.status(500).json({ ok: false, episodes: [] });
  }
};

// DELETE watch progress
exports.deleteProgress = async (req, res) => {
  try {
    const { contentId } = req.params;
    const profile = req.session.activeProfile ? (req.session.activeProfile._id ? req.session.activeProfile._id : req.session.activeProfile) : null;
    if (!profile) return res.json({ ok: false });
    
    await Watch.findOneAndDelete({ user: profile, content: contentId });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete watch error:', err);
    res.status(500).json({ ok: false });
  }
};

// GET profile watched content
exports.getProfileWatched = async (req, res) => {
  try {
    const profileId = req.session.activeProfile?._id || req.session.activeProfile;
    if (!profileId) return res.json({ ok: true, watched: [] });

    const watchHistory = await Watch.find({ user: profileId })
      .populate('content')
      .lean();

    const watched = watchHistory
      .filter(w => w.content)
      .map(w => ({
        contentId: w.content._id,
        progress: w.progress,
        episodeNumber: w.episodeNumber
      }));

    res.json({ ok: true, watched });
  } catch (err) {
    console.error('Get profile watched error:', err);
    res.status(500).json({ ok: false, watched: [] });
  }
};
