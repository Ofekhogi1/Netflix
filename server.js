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

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
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
      email: user.email 
    };
    req.session.isAdmin = user.isAdmin;

    res.redirect('/');
    
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
  
  try {
    const contents = await Content.find().sort({ createdAt: -1 }).limit(20);
    res.render('index', { user: req.session.user, contents });
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
  res.render('genre', { genre, batch: INFINITE_BATCH });
});

app.get('/api/genre/:genre', requireAuth, async (req, res) => {
  try {
    const genre = req.params.genre;
    const skip = parseInt(req.query.skip || '0');
    const limit = parseInt(req.query.limit || String(INFINITE_BATCH));
    const items = await Content.find({ genres: genre }).skip(skip).limit(limit);
    res.json({ items });
  } catch (error) {
    console.error('Genre API error:', error);
    res.json({ items: [] });
  }
});

app.get('/content/:id', requireAuth, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).send('Content not found');
    res.render('content', { content });
  } catch (error) {
    console.error('Content error:', error);
    res.status(404).send('Content not found');
  }
});

app.get('/player/:id', requireAuth, async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).send('Content not found');
    res.render('player', { content });
  } catch (error) {
    console.error('Player error:', error);
    res.status(404).send('Content not found');
  }
});

app.post('/api/content/:id/like', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
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

app.get('/api/stats/:userId/daily', requireAuth, async (req, res) => {
  res.json({ 
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
    values: [2, 3, 1, 4, 5, 2, 0] 
  });
});

app.get('/api/stats/genres/:userId', requireAuth, async (req, res) => {
  res.json({ 
    labels: ['Drama', 'Comedy', 'Action'], 
    values: [10, 5, 8] 
  });
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

const upload = multer({ storage });


app.get('/admin/add', requireAdmin, (req, res) => {
  res.render('admin_add', { error: null });
});

app.post('/admin/add', requireAdmin, upload.fields([
  { name: 'video' },
  { name: 'image' }
]), async (req, res) => {
  try {
    const { title, year, genres, director, actors, description } = req.body;
    
    const content = new Content({
      title,
      year: parseInt(year || '0'),
      genres: (genres || '').split(',').map(s => s.trim()).filter(Boolean),
      director,
      actors: (actors || '').split(',').map(s => s.trim()).filter(Boolean),
      description,
      videoUrl: req.files && req.files.video ? '/uploads/' + req.files.video[0].filename : '',
      imageUrl: req.files && req.files.image ? '/uploads/' + req.files.image[0].filename : ''
    });
    
    await content.save();
    res.redirect('/content/' + content._id);
  } catch (error) {
    console.error('Add content error:', error);
    res.render('admin_add', { error: 'Error adding content' });
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

app.listen(PORT, () => {
  console.log(`Netflix Clone Server Running`);
  console.log(`Port: ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
