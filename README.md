<<<<<<< HEAD
# Netflix-Project
Netflix Project College Of Management
=======
# 🎬 Netflix Clone - מדריך התקנה מלא

## 📋 תוכן עניינים
1. [דרישות מקדימות](#דרישות-מקדימות)
2. [התקנה](#התקנה)
3. [הגדרת הפרויקט](#הגדרת-הפרויקט)
4. [הרצת הפרויקט](#הרצת-הפרויקט)
5. [פתרון בעיות](#פתרון-בעיות)

---

## 🔧 דרישות מקדימות

לפני שמתחילים, וודא שיש לך מותקן:

- **Node.js** (גרסה 14 ומעלה) - [הורד כאן](https://nodejs.org/)
- **MongoDB** (גרסה 4.4 ומעלה) - [הורד כאן](https://www.mongodb.com/try/download/community)
- **Git** (אופציונלי) - [הורד כאן](https://git-scm.com/)

---

## 📦 התקנה

### שלב 1: הורד את הפרויקט
```bash
# אם יש לך Git:
git clone <your-repo-url>
cd netflix-clone

# או פשוט פרוס את הקבצים לתיקייה
```

### שלב 2: התקן את החבילות
```bash
npm install
```

זה יתקין את כל החבילות הנדרשות:
- express
- mongoose
- express-session
- connect-mongo
- bcryptjs
- express-ejs-layouts
- multer
- dotenv

---

## ⚙️ הגדרת הפרויקט

### שלב 1: צור קובץ `.env`
צור קובץ בשם `.env` בתיקיית הבסיס של הפרויקט:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/netflix_course

# Session Secret
SESSION_SECRET=your-super-secret-key-change-this-in-production

# Server Port
PORT=3000

# Pagination
PAGE_SIZE=12
INFINITE_SCROLL_BATCH=8
```

### שלב 2: צור את מבנה התיקיות
```bash
mkdir -p uploads
mkdir -p public/css
mkdir -p public/img
mkdir -p models
mkdir -p views
```

### שלב 3: העתק את הקבצים למקומות הנכונים

#### קבצי Models (תיקיית models/):
- `User.js` (כבר קיים)
- `Content.js` (צור אותו)
- `Profile.js` (צור אותו)
- `WatchHistory.js` (השתמש בקובץ שיצרתי)

#### קבצי Views (תיקיית views/):
- `layout.ejs` (כבר קיים)
- `index.ejs` (כבר קיים)
- `login.ejs` (כבר קיים)
- `register.ejs` (כבר קיים)
- `search.ejs` (כבר קיים)
- `settings.ejs` (השתמש בקובץ המלא שיצרתי)
- `content.ejs` (השתמש בקובץ המלא שיצרתי)
- `player.ejs` (השתמש בקובץ המלא שיצרתי)
- `admin_add.ejs` (השתמש בקובץ המלא שיצרתי)
- `genre.ejs` (השתמש בקובץ החדש שיצרתי)

#### קבצי CSS (תיקיית public/css/):
- `styles.css` (השתמש בקובץ המלא שיצרתי)

---

## 🎯 יצירת Models חסרים

### Content.js (models/Content.js)
```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContentSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  year: { type: Number },
  genres: [{ type: String }],
  director: { type: String },
  actors: [{ type: String }],
  videoUrl: { type: String },
  imageUrl: { type: String },
  type: { 
    type: String, 
    enum: ['movie', 'series', 'documentary'], 
    default: 'movie' 
  },
  episodes: [{
    title: String,
    duration: String,
    videoUrl: String
  }]
}, {
  timestamps: true
});

// Text search index
ContentSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Content', ContentSchema);
```

### Profile.js (models/Profile.js)
```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    maxlength: 20
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  avatar: { 
    type: String, 
    default: 'default.png' 
  },
  kidsMode: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', ProfileSchema);
```

---

## 🚀 הרצת הפרויקט

### שלב 1: הפעל את MongoDB
```bash
# Windows:
mongod

# Mac/Linux:
sudo systemctl start mongod
# או
brew services start mongodb-community
```

### שלב 2: הרץ את השרת
```bash
npm start
# או בפיתוח עם nodemon:
npm run dev
```

### שלב 3: פתח את הדפדפן
```
http://localhost:3000
```

---

## 👤 משתמש ברירת מחדל

לאחר ההתקנה, צור משתמש מנהל:

1. לך ל-`http://localhost:3000/register`
2. הירשם עם הפרטים הבאים:
   - **Username**: admin
   - **Email**: admin@netflix.com
   - **Password**: admin123

3. אחרי ההרשמה, עדכן את המשתמש ב-MongoDB ל-admin:
```javascript
// בקונסול MongoDB או ב-MongoDB Compass:
db.users.updateOne(
  { email: "admin@netflix.com" },
  { $set: { isAdmin: true } }
)
```

---

## 📁 מבנה הפרויקט

```
netflix-clone/
├── models/
│   ├── User.js
│   ├── Content.js
│   ├── Profile.js
│   └── WatchHistory.js
├── views/
│   ├── layout.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── search.ejs
│   ├── settings.ejs
│   ├── content.ejs
│   ├── player.ejs
│   ├── admin_add.ejs
│   └── genre.ejs
├── public/
│   ├── css/
│   │   └── styles.css
│   └── img/
│       └── placeholder.png
├── uploads/
├── server.js
├── .env
├── package.json
└── README.md
```

---

## 🔍 פתרון בעיות

### בעיה: MongoDB לא מתחבר
**פתרון:**
```bash
# וודא ש-MongoDB פועל:
mongod --version

# נסה להתחבר ידנית:
mongo
```

### בעיה: Port 3000 תפוס
**פתרון:**
```bash
# שנה את ה-PORT בקובץ .env:
PORT=3001
```

### בעיה: קבצים לא נטענים
**פתרון:**
```bash
# וודא שיש תיקיית uploads:
mkdir uploads

# בדוק הרשאות:
chmod 755 uploads
```

### בעיה: Sessions לא עובדים
**פתרון:**
```bash
# נקה את ה-sessions ב-MongoDB:
db.sessions.deleteMany({})
```

### בעיה: Styles לא נטענים
**פתרון:**
1. וודא ש-`styles.css` נמצא ב-`public/css/`
2. נקה cache בדפדפן (Ctrl+Shift+Delete)
3. בדוק ב-DevTools Network tab אם הקובץ נטען

---

## 🎨 תכונות נוספות

### הוספת תוכן
1. התחבר כמשתמש admin
2. לך ל-"הוסף תוכן"
3. מלא את הפרטים והעלה קבצים

### ניהול פרופילים
1. לך להגדרות
2. לחץ על "הוסף פרופיל"
3. הזן שם (עד 5 פרופילים)

### סטטיסטיקות
- צפיות יומיות
- ז'אנרים פופולריים
- תכנים שאהבתי

---

## 📝 הערות חשובות

1. **ביטחון**: שנה את `SESSION_SECRET` בפרודקשן!
2. **קבצים**: תיקיית `uploads/` לא צריכה להיות ב-Git
3. **MongoDB**: השתמש ב-MongoDB Atlas לפרודקשן
4. **Performance**: הוסף caching לפרודקשן

---

## 🐛 דיווח על באגים

אם מצאת בעיה:
1. בדוק את ה-console logs
2. בדוק את MongoDB logs
3. צור Issue עם פרטים מלאים

---

## 📞 תמיכה

צריך עזרה? פתח Issue או שלח אימייל.

---

## ✅ Checklist התקנה

- [ ] Node.js מותקן
- [ ] MongoDB מותקן ופועל
- [ ] `npm install` הרץ בהצלחה
- [ ] קובץ `.env` נוצר
- [ ] תיקיית `uploads` קיימת
- [ ] כל קבצי ה-Views במקום
- [ ] `styles.css` במקום
- [ ] כל ה-Models נוצרו
- [ ] השרת רץ ללא שגיאות
- [ ] ניתן לגשת לדף הבית

---

## 🎉 מזל טוב!

הפרויקט שלך מוכן! תהנה �
>>>>>>> fee4545 (Upload local project)
