const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import controllers
const authController = require('../controllers/authController');
const contentController = require('../controllers/contentController');
const profileController = require('../controllers/profileController');
const watchController = require('../controllers/watchController');
const adminController = require('../controllers/adminController');

// Multer configuration for file uploads
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

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
    files: 100 // max 100 files (enough for a season)
  }
});

// Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.isAdmin) return next();
  return res.status(403).send('Forbidden: admin only');
}

// ========== AUTH ROUTES ==========
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);
router.get('/logout', authController.logout);

// ========== CONTENT ROUTES ==========
router.get('/content/:id', requireAuth, contentController.getContentDetail);
router.get('/player/:id', requireAuth, contentController.getPlayer);
router.post('/api/content/:id/like', requireAuth, contentController.toggleLike);
router.get('/search', requireAuth, contentController.getSearch);
router.get('/genre/:genre', requireAuth, contentController.getGenrePage);
router.get('/api/genre/:genre', requireAuth, contentController.getGenreAPI);
router.get('/liked', requireAuth, contentController.getLiked);

// ========== PROFILE ROUTES ==========
router.get('/profiles/select', requireAuth, profileController.getProfileSelect);
router.post('/profiles/select', requireAuth, profileController.setActiveProfile);
router.post('/profiles', requireAuth, profileController.createProfile);
router.delete('/profiles/:id', requireAuth, profileController.deleteProfile);
router.put('/profiles/:id', requireAuth, profileController.updateProfile);

// ========== WATCH HISTORY ROUTES ==========
router.post('/api/watch/:contentId', requireAuth, watchController.saveProgress);
router.get('/api/watch/:contentId', requireAuth, watchController.getProgress);
router.get('/api/watch/:contentId/episodes', requireAuth, watchController.getEpisodesProgress);
router.delete('/api/watch/:contentId', requireAuth, watchController.deleteProgress);
router.get('/api/profile/watched', requireAuth, watchController.getProfileWatched);

// ========== ADMIN ROUTES ==========
router.get('/admin/add', requireAdmin, adminController.getAddContent);
router.post('/admin/add', requireAdmin, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), adminController.postAddContent);

router.get('/admin/content/:id/edit', requireAdmin, adminController.getEditContent);
router.put('/admin/content/:id', requireAdmin, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), adminController.updateContent);
router.delete('/admin/content/:id', requireAdmin, adminController.deleteContent);

router.get('/admin/series/:id/episodes', requireAdmin, adminController.getManageEpisodes);
router.post('/admin/series/:id/episodes/add', requireAdmin, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), adminController.addEpisode);
router.post('/admin/series/:id/episodes/:episodeId/delete', requireAdmin, adminController.deleteEpisode);

module.exports = router;
