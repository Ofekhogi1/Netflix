require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function cleanup() {
  try {
  
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/netflix_course', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');

    const result = await User.deleteMany({});
    console.log(`Deleted ${result.deletedCount} old users`);

    const admin = new User({
      username: 'admin',
      email: 'admin@admin.com',
      isAdmin: true
    });

    await admin.setPassword('admin');
    await admin.save();

    console.log('Admin user created successfully!');
    console.log('Email: admin@admin.com');
    console.log('Password: admin');

    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanup();