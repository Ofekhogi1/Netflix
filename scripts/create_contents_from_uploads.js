require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Content = require('../models/Content');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const mongoOptions = { useNewUrlParser: true, useUnifiedTopology: true };

// Map basenames to rich metadata (Hebrew titles, genres, directors, actors, descriptions)
const METADATA = {
  "12987469_1920_1080_60fps-1762867711600-884481246": {
    title: "מלך האריות",
    year: 2006,
    genres: ["אקשן", "דרמה"],
    director: "רוב מינקוף",
    actors: ["מופאסה", "סקאר", "סימבה"],
  description: "מלך האריות הוא סרט ילדים קלאסי שמתאר את מסעו של סימבה לקבלת גורלו ולחידוש סדר הטבע בממלכה.",
  imageUrl: "/uploads/2_wa-1762867711658-74638994.jpg"
  },
  "14538043_3840_2160_120fps": {
    title: "אינספשן",
    year: 2010,
    genres: ["מדע בדיוני", "מותחן"],
    director: "כריסטופר נולאן",
    actors: ["ליאונרדו דיקפריו", "ג'וזף גורדון-לוויט"],
    description: "קבוצת צוללי חלומות מבצעת משימות סבוכות בתוך תת-שכבות של התת-מודע."
  },
  "14550540_1920_1080_25fps": {
    title: "המטריקס",
    year: 1999,
    genres: ["מדע בדיוני", "אקשן"],
    director: "האחיות וואצ'ובסקי",
    actors: ["קיאנו ריבס", "לורה רם"],
    description: "כאשר ניל מבין שעולמו מלא אשליות, הוא מצטרף למרד נגד השליטה הממוחשבת."
  },
  "14666888_3840_2160_25fps": {
    title: "בין כוכבים",
    year: 2014,
    genres: ["מדע בדיוני", "דרמה"],
    director: "כריסטופר נולאן",
    actors: ["מתיו מקונוהי"],
    description: "מסע אפי של מדענים וחללית לחפש בית חדש לאנושות מעבר לגבולות היקום."
  },
  "12671593_3840_2160_24fps": {
    title: "טיטניק",
    year: 1997,
    genres: ["דרמה", "רומנטיקה"],
    director: "ג'יימס קמרון",
    actors: ["ליאונרדו דיקפריו", "קייט וינסלט"],
    description: "סיפור האהבה האיקוני על סיפון האניה הטרגית טיטניק."
  },
  "12834077_3840_2160_24fps": {
    title: "שומרי הגלקסיה",
    year: 2014,
    genres: ["מדע בדיוני", "קומדיה"],
    director: "ג'יימס גאן",
    actors: ["כריס פראט", "זואי סלדנה"],
    description: "חבורת נוכלים הופכת לגיבורים המצילים את הגלקסיה."
  },
  "13107446_3840_2160_24fps": {
    title: "גלדיאטור",
    year: 2000,
    genres: ["אקשן", "דרמה"],
    director: "רידלי סקוט",
    actors: ["ראסל קרואו"],
    description: "מאבקו של רומאי לשחרור ולעצמאות לאחר שמאבדים את משפחתו."
  },
  "13529321_3840_2160_60fps": {
    title: "אביר האפלה",
    year: 2008,
    genres: ["אקשן", "מותחן"],
    director: "כריסטופר נולאן",
    actors: ["כריסטיאן בייל", "הית' לדג'ר"],
    description: "המאבק של הגיבור נגד פשע חדש בעיר גורם לשאלות מוסריות וכבדות."
  },
  "13722734_3840_2160_30fps": {
    title: "פורסט גאמפ",
    year: 1994,
    genres: ["דרמה", "קומדיה"],
    director: "רוברט זמקיס",
    actors: ["טום הנקס"],
    description: "הסיפור המרגש של אדם פשוט שמשפיע על אירועים היסטוריים רבים."
  },
  "13936312_1920_1080_25fps": {
    title: "אינטרסטלר",
    year: 2014,
    genres: ["מדע בדיוני", "דרמה"],
    director: "כריסטופר נולאן",
    actors: ["מתיו מקוניה"],
    description: "צוות אסטרונאוטים מבצע מסע בין-כוכבי כדי להציל את האנושות."
  },
  "14461439_1920_1080_30fps": {
    title: "שובר שורות",
    year: 2008,
    genres: ["דרמה", "פשע"],
    director: "וינס גיליגן",
    actors: ["בריאן קראנסטון"],
    description: "סדרה על התדרדרותו של מורה לכימיה שנכנס לעסק הסמים."
  },
  "14497704_1920_1080_30fps": {
    title: "משחקי הרעב",
    year: 2012,
    genres: ["הרפתקאות", "מדע בדיוני"],
    director: "פרנסיס לורנס",
    actors: ["ג'ניפר לורנס"],
    description: "נערה מתנדבת במלחמה על הישרדות במשחקים טלוויזיוניים."
  },
  "14507149_3840_2160_50fps": {
    title: "אווטאר",
    year: 2009,
    genres: ["מדע בדיוני", "הרפתקאות"],
    director: "ג'יימס קמרון",
    actors: ["סאם וורת'ינגטון"],
    description: "האביב של תרבות חייזרית מול אינטרסים של האדם והכובש."
  }
};

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Please set MONGODB_URI in your .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
  console.log('✅ Connected to MongoDB');

  const files = fs.readdirSync(uploadsDir);
  const jpgs = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(path.extname(f).toLowerCase()));
  const videos = files.filter(f => ['.mp4', '.mkv', '.webm', '.mov'].includes(path.extname(f).toLowerCase()));

  if (videos.length === 0) {
    console.log('No video files found in uploads/');
    process.exit(0);
  }

  let jpgIndex = 0;

  for (const video of videos) {
    const videoUrl = '/uploads/' + video;
    const existing = await Content.findOne({ videoUrl });
    if (existing) {
      console.log(`Skipping existing entry for ${video}`);
      continue;
    }

    const base = path.parse(video).name;

    let meta = METADATA[base];
    if (!meta) {
      // fallback metadata
      meta = {
        title: `סרטון ${base}`,
        year: 2018,
        genres: ['דרמה'],
        director: 'במאי דגמ"א',
        actors: ['שחקן א', 'שחקן ב'],
        description: `תיאור דוגמה עבור ${base}.`
      };
    }

    // Determine image for this video using an explicit priority:
    // 1) metadata.imageUrl override
    // 2) exact basename match (video base === image base)
    // 3) substring match (image name contains video base or vice versa)
    // 4) round-robin jpgs
    function chooseImageForVideo(baseName) {
      // 1) metadata override
      if (meta.imageUrl) return { url: meta.imageUrl, reason: 'metadata override' };

      // 2) exact basename match
      for (const j of jpgs) {
        if (path.parse(j).name === baseName) return { url: '/uploads/' + j, reason: 'exact basename match' };
      }

      // 3) substring match
      for (const j of jpgs) {
        const jbase = path.parse(j).name;
        if (jbase.includes(baseName) || baseName.includes(jbase)) return { url: '/uploads/' + j, reason: 'substring match' };
      }

      // 4) round-robin
      if (jpgs.length > 0) {
        const chosen = jpgs[jpgIndex % jpgs.length];
        jpgIndex++;
        return { url: '/uploads/' + chosen, reason: 'round-robin' };
      }

      // fallback
      return { url: '/img/placeholder.png', reason: 'placeholder' };
    }

    const chosen = chooseImageForVideo(base);
    const imageUrl = chosen.url;
    console.log(`Image chosen for ${video}: ${imageUrl} (${chosen.reason})`);

    const doc = {
      title: meta.title,
      year: meta.year || 0,
      genres: meta.genres || [],
      director: meta.director || '',
      actors: meta.actors || [],
      description: meta.description || '',
      videoUrl,
      imageUrl,
      views: Math.floor(Math.random() * 5000),
      rating: Math.round((Math.random() * 5) * 10) / 10
    };

    try {
      await Content.create(doc);
      console.log(`Created content for ${video} -> ${meta.title}`);
    } catch (err) {
      console.error(`Failed to create content for ${video}:`, err.message);
    }
  }

  console.log('Done creating content from uploads');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
