require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const PAGE_SIZE = parseInt(process.env.PAGE_SIZE || '12');
const INFINITE_BATCH = parseInt(process.env.INFINITE_SCROLL_BATCH || '8');

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv')) {
  mongoOptions.ssl = true;
  mongoOptions.retryWrites = true;
  mongoOptions.w = 'majority';
}

mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix_course',
  mongoOptions
)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('\n💡 Possible solutions:');
  console.log('1. Check if MongoDB is running locally');
  console.log('2. Verify MONGODB_URI in .env file');
  console.log('3. Check Atlas IP whitelist (if using Atlas)');
  console.log('4. Verify username/password are correct\n');
});

const User = require('./models/User');
const Content = require('./models/Content');
const Profile = require('./models/Profile');
const Watch = require('./models/WatchHistory');

// Function to fetch ratings from OMDb API
async function fetchMovieRatings(title) {
  try {
    const apiKey = process.env.OMDB_API_KEY || 'trilogy'; // Get free key from http://www.omdbapi.com/apikey.aspx
    
    // Hebrew to English translation map
    const hebrewToEnglish = {
      'אביר האופל': 'The Dark Knight',
      'אביר האפלה': 'The Dark Knight',
      'התחלה': 'Inception',
      'המטריקס': 'The Matrix',
      'הסנדק': 'The Godfather',
      'רשימת שינדלר': 'Schindler\'s List',
      'פורסט גאמפ': 'Forrest Gump',
      'טיטניק': 'Titanic',
      'אוואטר': 'Avatar',
      'שובר שורות': 'The Shawshank Redemption',
      'הטייסן': 'Top Gun',
      'הטייסן: מאבריק': 'Top Gun Maverick',
      'מלחמת הכוכבים': 'Star Wars',
      'שר הטבעות': 'The Lord of the Rings',
      'הארי פוטר': 'Harry Potter',
      'איירון מן': 'Iron Man',
      'נוקמי האוונג\'רס': 'The Avengers',
      'ספיידרמן': 'Spider-Man',
      'באטמן': 'Batman',
      'ג\'וקר': 'Joker',
      'פרזיטים': 'Parasite',
      'מלך האריות': 'The Lion King',
      'שומרי הגלקסיה': 'Guardians of the Galaxy',
      'גלדיאטור': 'Gladiator',
      'אינטרסטלר': 'Interstellar',
      'משחקי הרעב': 'The Hunger Games',
      'דיון': 'Dune',
      'בלאק פנתר': 'Black Panther'
    };
    
    // Translate Hebrew to English if needed
    let searchTitle = title;
    if (hebrewToEnglish[title]) {
      searchTitle = hebrewToEnglish[title];
      console.log(`🔄 Translating "${title}" to "${searchTitle}"`);
    }
    
    const url = `http://www.omdbapi.com/?t=${encodeURIComponent(searchTitle)}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.Response === 'True') {
      const ratings = {
        imdbRating: data.imdbRating || null,
        rottenTomatoesRating: null
      };
      
      // Find Rotten Tomatoes rating
      if (data.Ratings && Array.isArray(data.Ratings)) {
        const rtRating = data.Ratings.find(r => r.Source === 'Rotten Tomatoes');
        if (rtRating) {
          ratings.rottenTomatoesRating = rtRating.Value;
        }
      }
      
      console.log(`✅ Found ratings for "${searchTitle}": IMDB ${ratings.imdbRating}, RT ${ratings.rottenTomatoesRating || 'N/A'}`);
      return ratings;
    }
    
    console.log(`⚠️  No ratings found for "${searchTitle}"`);
    return { imdbRating: null, rottenTomatoesRating: null };
  } catch (error) {
    console.error('Error fetching movie ratings:', error);
    return { imdbRating: null, rottenTomatoesRating: null };
  }
}

const expressLayouts = require('express-ejs-layouts');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix_course' 
  })
}));

app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  // expose admin flag separately so templates can check it even when
  // res.locals.user doesn't include isAdmin
  res.locals.isAdmin = req.session.isAdmin || false;
  // expose active profile
  res.locals.activeProfile = req.session.activeProfile || null;
  
  // Fetch all genres dynamically for navbar dropdown
  try {
    res.locals.allGenres = await Content.distinct('genres');
  } catch (err) {
    res.locals.allGenres = [];
  }
  
  next();
});

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.isAdmin) return next();
  return res.status(403).send('Forbidden: admin only');
}

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.render('login', { error: 'נא למלא את כל השדות' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.render('login', { error: 'אימייל או סיסמה שגויים' });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.render('login', { error: 'אימייל או סיסמה שגויים' });
    }

    req.session.userId = user._id;
    req.session.user = { 
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    };
    req.session.isAdmin = user.isAdmin;

    // Check if user has profiles
    try {
      const populated = await User.findById(user._id).populate('profiles');
      if (populated && populated.profiles && populated.profiles.length === 1) {
        // If only one profile, set it as active automatically
        req.session.activeProfile = populated.profiles[0];
        res.redirect('/');
      } else if (populated && populated.profiles && populated.profiles.length > 1) {
        // If multiple profiles, redirect to profile selection
        res.redirect('/profiles/select');
      } else {
        // If no profiles, redirect to home (or could redirect to create profile)
        res.redirect('/');
      }
    } catch (err) {
      console.error('Error populating profiles on login:', err);
      res.redirect('/');
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'שגיאה בהתחברות, נסה שוב' });
  }
});


app.get('/register', (req, res) => {
  res.render('register', { error: null });
});


app.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.render('register', { error: 'נא למלא את כל השדות' });
    }

    if (password.length < 6) {
      return res.render('register', { error: 'הסיסמה חייבת להיות לפחות 6 תווים' });
    }

    if (password !== confirmPassword) {
      return res.render('register', { error: 'הסיסמאות אינן תואמות' });
    }

    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      return res.render('register', { 
        error: 'משתמש עם אימייל או שם משתמש זה כבר קיים' 
      });
    }

    const user = new User({ 
      username: username.trim(),
      email: email.toLowerCase().trim()
    });

    await user.setPassword(password);
    await user.save();

    // create a default profile for the new user
    try {
      const defaultProfile = new Profile({ name: 'ראשי', user: user._id });
      await defaultProfile.save();
      user.profiles = [defaultProfile._id];
      await user.save();
    } catch (err) {
      console.error('Error creating default profile:', err);
    }

    console.log('New user registered:', user.email);
    res.redirect('/login');
    
  } catch (error) {
    console.error('Register error:', error);
    res.render('register', { error: 'שגיאה ביצירת משתמש, נסה שוב' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
});

app.get('/', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  
  // Check if user has an active profile selected
  if (!req.session.activeProfile) {
    // Check if user has profiles
    try {
      const user = await User.findById(req.session.userId).populate('profiles');
      if (user && user.profiles && user.profiles.length > 0) {
        // User has profiles but none selected - redirect to selection
        return res.redirect('/profiles/select');
      }
      // User has no profiles - continue to home (they can create one in settings)
    } catch (err) {
      console.error('Error checking profiles:', err);
    }
  }
  
  try {
    // Get active profile
    const profileId = req.session.activeProfile?._id || req.session.activeProfile;
    
    // Fetch all genres from DB dynamically
    const allGenres = await Content.distinct('genres');
    
    // Get continue watching for this profile
    let continueWatching = [];
    if (profileId) {
      const watchHistory = await Watch.find({ user: profileId, progress: { $gt: 0, $lt: 95 } })
        .sort({ lastWatched: -1 })
        .limit(10)
        .populate('content');
      continueWatching = watchHistory
        .map(w => {
          if (w.content) {
            const contentObj = { ...w.content.toObject(), watchProgress: w.progress };
            // Add episode info for series
            if (w.episodeNumber) {
              contentObj.watchEpisode = w.episodeNumber;
            }
            return contentObj;
          }
          return null;
        })
        .filter(Boolean);
    }
    
    // Get personalized recommendations based on profile's likes and watch history
    let recommendedContent = [];
    if (profileId) {
      try {
        const profile = await Profile.findById(profileId).populate('likes');
        const likedGenres = [];
        
        // Extract genres from liked content
        if (profile && profile.likes && profile.likes.length > 0) {
          profile.likes.forEach(content => {
            if (content.genres) {
              likedGenres.push(...content.genres);
            }
          });
        }
        
        // Get genres from watch history
        const watchedContent = await Watch.find({ user: profileId })
          .populate('content')
          .limit(20);
        watchedContent.forEach(w => {
          if (w.content && w.content.genres) {
            likedGenres.push(...w.content.genres);
          }
        });
        
        // Get unique genres
        const uniqueGenres = [...new Set(likedGenres)];
        
        // Recommend content based on these genres
        if (uniqueGenres.length > 0) {
          recommendedContent = await Content.find({
            genres: { $in: uniqueGenres },
            _id: { $nin: profile.likes.map(l => l._id) }
          }).limit(12);
        }
      } catch (err) {
        console.error('Error getting recommendations:', err);
      }
    }
    
    // Get popular content (most viewed)
    const popularContent = await Content.aggregate([
      { $sort: { views: -1 } },
      { $limit: 12 }
    ]);
    
    // Get liked content for current profile
    let likedContent = [];
    if (profileId) {
      const profile = await Profile.findById(profileId).populate('likes');
      if (profile && profile.likes && profile.likes.length > 0) {
        likedContent = profile.likes.slice(0, 12); // Show first 12
      }
    }
    
    // Get TV series
    const seriesContent = await Content.find({ type: 'series' })
      .sort({ createdAt: -1 })
      .limit(12);
    
    // Get newest content
    const newContent = await Content.find()
      .sort({ createdAt: -1 })
      .limit(12);
    
    // Get newest content by genre (10 items per genre)
    const contentByGenre = {};
    for (const genre of allGenres) {
      const genreContent = await Content.find({ genres: genre })
        .sort({ createdAt: -1 })
        .limit(10);
      if (genreContent.length > 0) {
        contentByGenre[genre] = genreContent;
      }
    }
    
    res.render('index', { 
      user: req.session.user, 
      contents: newContent,
      continueWatching,
      recommendedContent,
      popularContent,
      likedContent,
      seriesContent,
      allGenres,
      contentByGenre
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).send('Error loading feed');
  }
});

app.get('/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q || '';
    const results = await Content.find({ title: new RegExp(q, 'i') }).limit(50);
    res.render('search', { results, q });
  } catch (error) {
    console.error('Search error:', error);
    res.render('search', { results: [], q: req.query.q || '' });
  }
});

app.get('/genre/:genre', requireAuth, async (req, res) => {
  const genre = req.params.genre;
  res.render('genre', { genre, batch: INFINITE_BATCH, contents: [] });
});

app.get('/api/genre/:genre', requireAuth, async (req, res) => {
  try {
    const genre = req.params.genre;
    const skip = parseInt(req.query.skip || '0');
    const limit = parseInt(req.query.limit || String(INFINITE_BATCH));
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
      .limit(limit);
    res.json({ items });
  } catch (error) {
    console.error('Genre API error:', error);
    res.json({ items: [] });
  }
});

// Get watched content for current profile
app.get('/api/profile/watched', requireAuth, async (req, res) => {
  try {
    const profileId = req.session.activeProfile?._id || req.session.activeProfile;
    if (!profileId) return res.json({ watched: [] });
    
    const watchHistory = await Watch.find({ user: profileId }).select('content');
    const watchedIds = watchHistory.map(w => String(w.content));
    res.json({ watched: watchedIds });
  } catch (error) {
    console.error('Get watched error:', error);
    res.json({ watched: [] });
  }
});

app.get('/content/:id', requireAuth, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).send('Content not found');

    // determine if this content is liked by the active profile (or user as fallback)
    let liked = false;
    try {
      if (req.session.activeProfile) {
        const profileId = req.session.activeProfile._id ? req.session.activeProfile._id : req.session.activeProfile;
        const profile = await Profile.findById(profileId);
        if (profile && profile.likes && profile.likes.find(l => String(l) === String(content._id))) liked = true;
      } else {
        const user = await User.findById(req.session.userId);
        if (user && user.likes && user.likes.find(l => String(l) === String(content._id))) liked = true;
      }
    } catch (err) {
      console.error('Error checking liked status:', err);
    }

    // Fetch similar content based on genres
    let similarContent = [];
    try {
      if (content.genres && content.genres.length > 0) {
        // Find content with at least one matching genre, excluding the current content
        similarContent = await Content.find({
          _id: { $ne: content._id },
          genres: { $in: content.genres }
        }).limit(6);
      }
    } catch (err) {
      console.error('Error fetching similar content:', err);
    }

    // Check if series is completed (all episodes watched with >95% progress)
    let seriesCompleted = false;
    if (content.type === 'series' && content.episodes && content.episodes.length > 0) {
      try {
        const profileId = req.session.activeProfile?._id || req.session.activeProfile;
        if (profileId) {
          const watchedEpisodes = await Watch.find({
            user: profileId,
            content: content._id,
            progress: { $gte: 95 }
          });
          
          // If all episodes are watched with 95%+ progress, series is completed
          if (watchedEpisodes.length >= content.episodes.length) {
            seriesCompleted = true;
          }
        }
      } catch (err) {
        console.error('Error checking series completion:', err);
      }
    }

    res.render('content', { 
      content, 
      liked, 
      similarContent,
      user: req.session.user,
      seriesCompleted
    });
  } catch (error) {
    console.error('Content error:', error);
    res.status(404).send('Content not found');
  }
});

app.get('/player/:id', requireAuth, async (req, res) => {
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
});

app.post('/api/content/:id/like', requireAuth, async (req, res) => {
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
});

// Save watch progress for a content item (per-profile)
app.post('/api/watch/:contentId', requireAuth, async (req, res) => {
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
});

// Retrieve watch progress for current profile and content
app.get('/api/watch/:contentId', requireAuth, async (req, res) => {
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
});

// Get all episodes progress for a series
app.get('/api/watch/:contentId/episodes', requireAuth, async (req, res) => {
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
});

// Delete watch progress (for play from start)
app.delete('/api/watch/:contentId', requireAuth, async (req, res) => {
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
});

app.get('/api/stats/:userId/daily', requireAuth, async (req, res) => {
  try {
    const profileId = req.session.activeProfile?._id || req.session.activeProfile || req.params.userId;
    
    // Get watch history for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const watchHistory = await Watch.find({
      user: profileId,
      lastWatched: { $gte: sevenDaysAgo }
    });
    
    // Group by day
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dailyCounts = new Array(7).fill(0);
    
    watchHistory.forEach(watch => {
      const dayIndex = watch.lastWatched.getDay();
      dailyCounts[dayIndex]++;
    });
    
    res.json({ 
      labels: days,
      values: dailyCounts
    });
  } catch (error) {
    console.error('Daily stats error:', error);
    res.json({ 
      labels: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'], 
      values: [0, 0, 0, 0, 0, 0, 0] 
    });
  }
});

app.get('/api/stats/genres/:userId', requireAuth, async (req, res) => {
  try {
    const profileId = req.session.activeProfile?._id || req.session.activeProfile || req.params.userId;
    
    // Get all watched content
    const watchHistory = await Watch.find({ user: profileId }).populate('content');
    
    // Count genres
    const genreCounts = {};
    watchHistory.forEach(watch => {
      if (watch.content && watch.content.genres) {
        watch.content.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });
    
    // Sort by count and get top 5
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const labels = sortedGenres.map(g => g[0]);
    const values = sortedGenres.map(g => g[1]);
    
    res.json({ 
      labels: labels.length > 0 ? labels : ['אין נתונים'],
      values: values.length > 0 ? values : [0]
    });
  } catch (error) {
    console.error('Genre stats error:', error);
    res.json({ 
      labels: ['אין נתונים'], 
      values: [0] 
    });
  }
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads/'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // שומר את הסיומת
    const base = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, base + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
    files: 100 // max 100 files (enough for a season)
  }
});


app.get('/admin/add', requireAdmin, (req, res) => {
  res.render('admin_add', { error: null });
});

app.post('/admin/add', requireAdmin, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, year, genres, director, actors, description, type, seasons, totalEpisodes } = req.body;
    
    // Fetch ratings from OMDb API
    const ratings = await fetchMovieRatings(title);
    
    const contentData = {
      title,
      releaseYear: parseInt(year || '0'),
      genres: (genres || '').split(',').map(s => s.trim()).filter(Boolean),
      director,
      actors: (actors || '').split(',').map(s => s.trim()).filter(Boolean),
      description,
      type: type || 'movie',
      imdbRating: ratings.imdbRating,
      rottenTomatoesRating: ratings.rottenTomatoesRating
    };
    
    // Find image file
    if (req.files && req.files.image && req.files.image[0]) {
      contentData.imageUrl = '/uploads/' + req.files.image[0].filename;
    }
    
    if (type === 'series') {
      // Handle series - create empty series with metadata
      contentData.seasons = parseInt(seasons || '1');
      contentData.totalEpisodes = parseInt(totalEpisodes || '0');
      contentData.episodes = []; // Start with empty episodes array
    } else {
      // Handle movie
      if (req.files && req.files.video && req.files.video[0]) {
        contentData.videoUrl = '/uploads/' + req.files.video[0].filename;
      }
    }
    
    const content = new Content(contentData);
    await content.save();
    res.redirect('/content/' + content._id);
  } catch (error) {
    console.error('Add content error:', error);
    res.render('admin_add', { error: 'שגיאה בהוספת תוכן: ' + error.message });
  }
});

app.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('profiles');
    res.render('settings', { user });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).send('Error loading settings');
  }
});

app.get('/liked', requireAuth, async (req, res) => {
  try {
    if (!req.session.activeProfile) {
      return res.redirect('/profiles/select');
    }
    
    const profileId = req.session.activeProfile._id || req.session.activeProfile;
    const profile = await Profile.findById(profileId).populate('likes');
    
    const likedContent = profile && profile.likes ? profile.likes : [];
    
    res.render('liked', { likedContent });
  } catch (error) {
    console.error('Liked page error:', error);
    res.status(500).send('Error loading liked content');
  }
});

// Admin Episodes Management
app.get('/admin/series/:id/episodes', requireAdmin, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content || content.type !== 'series') {
      return res.status(404).send('סדרה לא נמצאה');
    }
    res.render('admin_episodes', { content, error: null, success: null });
  } catch (error) {
    console.error('Episodes management error:', error);
    res.status(500).send('שגיאה בטעינת עמוד הניהול');
  }
});

app.post('/admin/series/:id/episodes/add', requireAdmin, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content || content.type !== 'series') {
      return res.status(404).send('סדרה לא נמצאה');
    }

    const { season, episodeNumber, title, description, duration, airDate } = req.body;

    const newEpisode = {
      season: parseInt(season) || 1,
      episodeNumber: parseInt(episodeNumber),
      title,
      description: description || '',
      duration: duration ? `${duration} דקות` : '45 דקות',
      videoUrl: '/uploads/sample.mp4', // Default
      imageUrl: content.imageUrl || '/img/placeholder.png',
      airDate: airDate ? new Date(airDate) : new Date()
    };

    // Handle uploaded files
    if (req.files && req.files.video && req.files.video[0]) {
      newEpisode.videoUrl = '/uploads/' + req.files.video[0].filename;
    }
    if (req.files && req.files.image && req.files.image[0]) {
      newEpisode.imageUrl = '/uploads/' + req.files.image[0].filename;
    }

    // Add episode to array
    if (!content.episodes) content.episodes = [];
    content.episodes.push(newEpisode);
    
    // Update total episodes count
    content.totalEpisodes = content.episodes.length;

    await content.save();
    
    res.render('admin_episodes', { 
      content, 
      error: null, 
      success: `פרק ${episodeNumber} "${title}" נוסף בהצלחה!` 
    });
  } catch (error) {
    console.error('Add episode error:', error);
    const content = await Content.findById(req.params.id);
    res.render('admin_episodes', { 
      content, 
      error: 'שגיאה בהוספת פרק: ' + error.message,
      success: null 
    });
  }
});

app.post('/admin/series/:id/episodes/:episodeId/delete', requireAdmin, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content || content.type !== 'series') {
      return res.status(404).send('סדרה לא נמצאה');
    }

    content.episodes = content.episodes.filter(ep => ep._id.toString() !== req.params.episodeId);
    content.totalEpisodes = content.episodes.length;
    
    await content.save();
    res.redirect(`/admin/series/${req.params.id}/episodes`);
  } catch (error) {
    console.error('Delete episode error:', error);
    res.status(500).send('שגיאה במחיקת פרק');
  }
});

app.post('/profiles', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const prof = new Profile({ name, user: req.session.userId });
    await prof.save();
    await User.findByIdAndUpdate(req.session.userId, { $push: { profiles: prof._id } });
    res.redirect('/settings');
  } catch (error) {
    console.error('Create profile error:', error);
    res.redirect('/settings');
  }
});
app.delete('/profiles/:id', requireAuth, async (req, res) => {
  try {
    await Profile.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(req.session.userId, { $pull: { profiles: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ ok: false });
  }
});

// Update profile name
app.put('/profiles/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'שם הפרופיל לא יכול להיות ריק' });
    }
    
    await Profile.findByIdAndUpdate(req.params.id, { name: name.trim() });
    res.json({ ok: true });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ ok: false });
  }
});

// profile select view
app.get('/profiles/select', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('profiles');
    res.render('profile_select', { user, profiles: user.profiles });
  } catch (err) {
    console.error('Profile select error:', err);
    res.redirect('/');
  }
});

// set active profile
app.post('/profiles/select', requireAuth, async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`Netflix Clone Server Running`);
  console.log(`Port: ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
