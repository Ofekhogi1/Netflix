const Content = require('../models/Content');
const { fetchMovieRatings } = require('../utils/ratingsHelper');
const multer = require('multer');
const path = require('path');

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, base + '-' + uniqueSuffix + ext);
  }
});

exports.upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
    files: 100 // max 100 files
  }
});

// GET admin add content page
exports.getAddContent = (req, res) => {
  res.render('admin_add', { 
    error: null
  });
};

// POST add new content
exports.postAddContent = async (req, res) => {
  try {
    const { title, type, year, genres, director, actors, description } = req.body;
    
    const videoUrl = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : null;
    const imageUrl = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;

    const genresArray = genres ? genres.split(',').map(g => g.trim()) : [];
    const actorsArray = actors ? actors.split(',').map(a => a.trim()) : [];

    const content = new Content({
      title,
      type,
      year: year ? parseInt(year) : null,
      genres: genresArray,
      director,
      actors: actorsArray,
      description,
      videoUrl,
      imageUrl
    });

    await content.save();

    // Fetch ratings asynchronously
    if (title) {
      fetchMovieRatings(title).then(ratings => {
        if (ratings) {
          Content.findByIdAndUpdate(content._id, {
            imdbRating: ratings.imdbRating,
            rottenTomatoesRating: ratings.rottenTomatoesRating
          }).catch(err => console.error('Error updating ratings:', err));
        }
      }).catch(err => console.error('Error fetching ratings:', err));
    }

    res.redirect('/');
  } catch (error) {
    console.error('Add content error:', error);
    res.status(500).send('Error adding content');
  }
};

// GET edit content page
exports.getEditContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).send('Content not found');
    
    res.render('admin_edit', { content });
  } catch (error) {
    console.error('Get edit content error:', error);
    res.status(500).send('Error loading content');
  }
};

// PUT update content
exports.updateContent = async (req, res) => {
  try {
    const { title, type, year, genres, director, actors, description } = req.body;
    
    const updateData = {
      title,
      type,
      year: year ? parseInt(year) : null,
      genres: genres ? genres.split(',').map(g => g.trim()) : [],
      director,
      actors: actors ? actors.split(',').map(a => a.trim()) : [],
      description
    };

    // Update files if provided
    if (req.files && req.files['video']) {
      updateData.videoUrl = `/uploads/${req.files['video'][0].filename}`;
    }
    if (req.files && req.files['image']) {
      updateData.imageUrl = `/uploads/${req.files['image'][0].filename}`;
    }

    await Content.findByIdAndUpdate(req.params.id, updateData);
    res.redirect(`/content/${req.params.id}`);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).send('Error updating content');
  }
};

// DELETE content
exports.deleteContent = async (req, res) => {
  try {
    await Content.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ ok: false });
  }
};

// GET manage episodes page
exports.getManageEpisodes = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).send('Series not found');
    
    res.render('admin_episodes', { 
      content,
      error: null,
      success: null
    });
  } catch (err) {
    console.error('Get episodes error:', err);
    res.status(500).send('Error loading episodes');
  }
};

// POST add episode
exports.addEpisode = async (req, res) => {
  try {
    const { season, episodeNumber, title, description, duration, airDate } = req.body;
    const videoUrl = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : null;
    const imageUrl = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;

    const episode = {
      season: parseInt(season) || 1,
      episodeNumber: parseInt(episodeNumber),
      title,
      description,
      duration,
      airDate: airDate ? new Date(airDate) : null,
      videoUrl,
      imageUrl
    };

    const series = await Content.findById(req.params.id);
    if (!series) return res.status(404).send('Series not found');
    
    series.episodes.push(episode);
    series.totalEpisodes = series.episodes.length;
    await series.save();

    res.redirect(`/admin/series/${req.params.id}/episodes`);
  } catch (err) {
    console.error('Add episode error:', err);
    res.status(500).send('Error adding episode');
  }
};

// POST delete episode
exports.deleteEpisode = async (req, res) => {
  try {
    const series = await Content.findById(req.params.id);
    if (!series) return res.status(404).send('Series not found');
    
    series.episodes = series.episodes.filter(ep => String(ep._id) !== req.params.episodeId);
    series.totalEpisodes = series.episodes.length;
    await series.save();

    res.redirect(`/admin/series/${req.params.id}/episodes`);
  } catch (err) {
    console.error('Delete episode error:', err);
    res.status(500).send('Error deleting episode');
  }
};
