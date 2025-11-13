const User = require('../models/User');
const Profile = require('../models/Profile');

// GET login page
exports.getLogin = (req, res) => {
  res.render('login', { error: null });
};

// POST login
exports.postLogin = async (req, res) => {
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
};

// GET register page
exports.getRegister = (req, res) => {
  res.render('register', { error: null });
};

// POST register
exports.postRegister = async (req, res) => {
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
};

// GET logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
};
