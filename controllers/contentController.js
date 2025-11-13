const Content = require('../models/Content');
const Watch = require('../models/WatchHistory');
const Profile = require('../models/Profile');
const User = require('../models/User');

// GET content detail page
exports.getContentDetail = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).send('Content not found');

    const profileId = req.session.activeProfile?._id || req.session.activeProfile;
    let liked = false;

    if (profileId) {
      try {
        const profile = await Profile.findById(profileId);
        if (profile && profile.likes) {
          liked = profile.likes.some(l => String(l) === String(content._id));
        }
      } catch (err) {
        console.error('Error checking likes:', err);
      }
    }

    // Fetch all genres for navbar
    const allGenres = await Content.distinct('genres');

    // Fetch similar content based on genres
    let similarContent = [];
    if (content.genres && content.genres.length > 0) {
      similarContent = await Content.find({
        _id: { $ne: content._id },
        genres: { $in: content.genres }
      }).limit(6);
    }

    // Check if series is completed (all episodes watched with >95% progress)
    let seriesCompleted = false;
    if (content.type === 'series' && content.episodes && content.episodes.length > 0) {
      if (profileId) {
        try {
          const watchedEpisodes = await Watch.find({
            user: profileId,
            content: content._id,
            progress: { $gte: 95 }
          });

          // If all episodes are watched with 95%+ progress, series is completed
          if (watchedEpisodes.length >= content.episodes.length) {
            seriesCompleted = true;
          }
        } catch (err) {
          console.error('Error checking series completion:', err);
        }
      }
    }

    res.render('content', {
      content,
      liked,
      seriesCompleted,
      similarContent,
      allGenres
    });
  } catch (error) {
    console.error('Content detail error:', error);
    res.status(404).send('Content not found');
  }
};

// GET player page
exports.getPlayer = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).send('Content not found');

    // Increment view count
    await Content.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    // Get episode number and season from query string if provided
    const episodeNumber = req.query.episode ? Number(req.query.episode) : null;
    const season = req.query.season ? Number(req.query.season) : null;

    res.render('player', { content, episodeNumber, season });
  } catch (error) {
    console.error('Player error:', error);
    res.status(404).send('Content not found');
  }
};

// POST like/unlike content
exports.toggleLike = async (req, res) => {
  try {
    const id = req.params.id;
    // Prefer per-profile likes when an active profile exists
    if (req.session.activeProfile) {
      const profileId = req.session.activeProfile._id ? req.session.activeProfile._id : req.session.activeProfile;
      const profile = await Profile.findById(profileId);
      if (!profile) return res.status(404).json({ ok: false });
      const idx = profile.likes.findIndex(l => String(l) === String(id));
      if (idx >= 0) {
        profile.likes.splice(idx, 1);
      } else {
        profile.likes.push(id);
      }
      await profile.save();
      return res.json({ ok: true, likes: profile.likes });
    }

    // Fallback to user-level likes for older sessions
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ ok: false });
    const idx = user.likes.indexOf(id);
    if (idx >= 0) {
      user.likes.splice(idx, 1);
    } else {
      user.likes.push(id);
    }
    await user.save();
    res.json({ ok: true, likes: user.likes });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ ok: false });
  }
};

// GET search page
exports.getSearch = async (req, res) => {
  try {
    const q = req.query.q || '';
    const allGenres = await Content.distinct('genres');
    
    let results = [];
    if (q) {
      results = await Content.find({ 
        title: new RegExp(q, 'i') 
      }).limit(50);
    }
    
    res.render('search', { 
      allGenres,
      results,
      q
    });
  } catch (error) {
    console.error('Search error:', error);
    res.render('search', { 
      allGenres: [],
      results: [], 
      q: req.query.q || '' 
    });
  }
};

// GET genre page
exports.getGenrePage = async (req, res) => {
  try {
    const allGenres = await Content.distinct('genres');
    res.render('genre', { 
      genre: req.params.genre, 
      allGenres,
      contents: []
    });
  } catch (error) {
    console.error('Genre page error:', error);
    res.render('genre', { 
      genre: req.params.genre, 
      allGenres: [],
      contents: []
    });
  }
};

// GET genre API (for AJAX)
exports.getGenreAPI = async (req, res) => {
  try {
    const { genre } = req.params;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 12;
    const sort = req.query.sort || 'newest';
    
    let sortOptions = {};
    switch(sort) {
      case 'rating':
        sortOptions = { imdbRating: -1, rating: -1 };
        break;
      case 'popular':
        sortOptions = { views: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }
    
    const items = await Content.find({ genres: genre })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json({ ok: true, items });
  } catch (err) {
    console.error('Genre API error:', err);
    res.status(500).json({ ok: false, items: [] });
  }
};

// GET liked content page
exports.getLiked = async (req, res) => {
  try {
    const profileId = req.session.activeProfile?._id || req.session.activeProfile;
    if (!profileId) {
      return res.redirect('/profiles/select');
    }

    const profile = await Profile.findById(profileId).populate('likes');
    const allGenres = await Content.distinct('genres');
    
    res.render('liked', { 
      likedContent: profile.likes || [],
      allGenres
    });
  } catch (err) {
    console.error('Liked page error:', err);
    res.send('Error loading liked content');
  }
};
