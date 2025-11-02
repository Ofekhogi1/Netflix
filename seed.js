require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Content = require('./models/Content');

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  retryWrites: true,
  w: 'majority'
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    console.log('✅ Connected to MongoDB');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@netflix.com' });
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        email: 'admin@netflix.com',
        isAdmin: true
      });
      await admin.setPassword('admin123');
      await admin.save();
      console.log('✅ Admin user created (email: admin@netflix.com, password: admin123)');
    }

    // Add sample content
    const sampleContent = [
      {
        title: 'Stranger Things',
        year: 2016,
        genres: ['Sci-Fi', 'Horror', 'Drama'],
        director: 'The Duffer Brothers',
        actors: ['Millie Bobby Brown', 'Finn Wolfhard', 'Winona Ryder'],
        description: 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces.',
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        imageUrl: 'https://via.placeholder.com/300x450?text=Stranger+Things'
      },
      {
        title: 'Breaking Bad',
        year: 2008,
        genres: ['Crime', 'Drama', 'Thriller'],
        director: 'Vince Gilligan',
        actors: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn'],
        description: 'A high school chemistry teacher turned methamphetamine producer.',
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        imageUrl: 'https://via.placeholder.com/300x450?text=Breaking+Bad'
      },
      {
        title: 'The Crown',
        year: 2016,
        genres: ['Drama', 'History'],
        director: 'Peter Morgan',
        actors: ['Claire Foy', 'Olivia Colman', 'Matt Smith'],
        description: 'Follows the political rivalries and romance of Queen Elizabeth II.',
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        imageUrl: 'https://via.placeholder.com/300x450?text=The+Crown'
      }
    ];

    for (const item of sampleContent) {
      const exists = await Content.findOne({ title: item.title });
      if (!exists) {
        await Content.create(item);
        console.log(`✅ Added: ${item.title}`);
      }
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seed();