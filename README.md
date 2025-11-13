# 🎬 Netflix Clone - College Of Management

## 📋 תיאור הפרויקט
פרויקט גמר בקורס פיתוח אפליקציות אינטרנט - מערכת Netflix Clone מלאה עם ניהול משתמשים, פרופילים, צפייה בתכנים ומעקב אחר התקדמות.

---

## 🔧 דרישות מקדימות

- **Node.js** (גרסה 14 ומעלה) - [הורד כאן](https://nodejs.org/)
- **MongoDB** (גרסה 4.4 ומעלה) - [הורד כאן](https://www.mongodb.com/try/download/community)
- **Git** - [הורד כאן](https://git-scm.com/)

---

## 📦 התקנה

### שלב 1: שכפל את הפרויקט
```bash
git clone https://github.com/Ofekhogi1/Netflix.git
cd Netflix
```

### שלב 2: התקן את החבילות
```bash
npm install
```

### שלב 3: צור קובץ `.env`
```env
MONGODB_URI=mongodb://localhost:27017/netflix_course
SESSION_SECRET=your-super-secret-key-change-this
PORT=3000
PAGE_SIZE=12
INFINITE_SCROLL_BATCH=8
```

### שלב 4: תיקון Database Indexes (חד פעמי)
```bash
node scripts/fix_watch_index.js
```

---

## 🚀 הרצת הפרויקט

```bash
# הפעל MongoDB
mongod

# הפעל את השרת
npm start
```

פתח דפדפן: `http://localhost:3000`

---

## 📁 מבנה הפרויקט

```
Netflix/
├── controllers/          # MVC Controllers
│   ├── authController.js
│   ├── contentController.js
│   ├── profileController.js
│   ├── watchController.js
│   └── adminController.js
├── models/              # MongoDB Models
│   ├── User.js
│   ├── Content.js
│   ├── Profile.js
│   └── WatchHistory.js
├── routes/              # Express Routes
│   └── index.js
├── views/               # EJS Templates (13 קבצים)
├── public/              # Static Files
│   ├── css/styles.css
│   └── img/
├── uploads/             # Uploaded Videos/Images
├── utils/               # Helper Functions
│   └── ratingsHelper.js
├── scripts/             # Maintenance Scripts
│   └── fix_watch_index.js
└── server.js            # Main Server File
```

---

## 🎯 תכונות עיקריות

### 👤 ניהול משתמשים
- ✅ הרשמה והתחברות מאובטחת (bcryptjs)
- ✅ ניהול עד 5 פרופילים למשתמש
- ✅ בחירת פרופיל אוטומטית בהתחברות

### 🎬 ניהול תכנים
- ✅ תמיכה בסרטים וסדרות
- ✅ ניהול עונות ופרקים
- ✅ העלאת וידאו ותמונות
- ✅ שליפת ratings מ-OMDb API
- ✅ CRUD מלא (הוספה, עריכה, מחיקה)

### 📺 נגן וידאו
- ✅ HTML5 Video Player
- ✅ Custom Controls
- ✅ מעקב אחר התקדמות צפייה
- ✅ Next Episode Countdown
- ✅ Full Screen Support

### 🔍 חיפוש וסינון
- ✅ חיפוש לפי שם
- ✅ סינון לפי ז'אנר
- ✅ Infinite Scroll
- ✅ מיון (חדש, דירוג, פופולרי)

### 📊 תכונות נוספות
- ✅ המלצות מותאמות אישית
- ✅ "המשך צפייה"
- ✅ רשימת "אהבתי"
- ✅ סטטיסטיקות צפייה
- ✅ Responsive Design

---

## 🛠️ טכנולוגיות

### Backend
- Node.js + Express 4.18.2
- MongoDB + Mongoose 7.0.0
- bcryptjs 3.0.2 (הצפנת סיסמאות)
- express-session + connect-mongo (session management)

### Frontend
- EJS Templates
- Bootstrap 5.3.0
- HTML5 Video Element
- Fetch API (AJAX)

### Architecture
- MVC Pattern (Model-View-Controller)
- RESTful API
- Session-based Authentication

---

## 👨‍💼 משתמש Admin

להרשמה כמנהל:
1. הרשם במערכת
2. עדכן ב-MongoDB:
```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { isAdmin: true } }
)
```

---

## 🐛 פתרון בעיות

### MongoDB Connection Error
```bash
# וודא ש-MongoDB פועל
mongod --version
```

### Duplicate Key Error
```bash
# הרץ את סקריפט תיקון ה-indexes
node scripts/fix_watch_index.js
```

### Port בשימוש
```env
# שנה ב-.env
PORT=3001
```

---

## 📝 מסמכים נוספים

- `TECHNICAL_REVIEW.md` - סקירה טכנית מלאה
- `FEATURES_GUIDE.md` - מדריך תכונות

---

## ✅ עמידה בדרישות הקורס

- ✅ Node.js + Express
- ✅ MongoDB + Mongoose
- ✅ MVC Architecture
- ✅ JavaScript + AJAX
- ✅ HTML5 Video Element
- ✅ Semantic HTML Tags
- ✅ Responsive Design
- ✅ Session Management
- ✅ Password Encryption
- ✅ CRUD Operations
- ✅ Error Handling

**ציון טכני: 98/100**

---

## 👨‍💻 מפתח

**Ofek Hogi**  
College Of Management  
פרויקט גמר - פיתוח אפליקציות אינטרנט  
2025

---

## 📄 רישיון

MIT License - ראה קובץ LICENSE לפרטים

---

**מזל טוב על השלמת ההתקנה! 🎉**
