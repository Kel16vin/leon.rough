const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;
const rootDir = path.join(__dirname);
const dbFile = path.join(rootDir, 'bookings.db');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Elite@123';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'elite-maintenance-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 }
  })
);

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  return res.redirect('/login.html');
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.redirect('/admin.html');
  }
  return res.redirect('/login.html?error=1');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

app.get('/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

app.use(express.static(rootDir));

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Could not open database', err);
    process.exit(1);
  }
});

const createTableSql = `
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  contactMethod TEXT,
  serviceType TEXT NOT NULL,
  customService TEXT,
  preferredDate TEXT,
  preferredTime TEXT,
  urgency TEXT,
  description TEXT NOT NULL,
  agreeUpdates INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);
`;

db.run(createTableSql, (err) => {
  if (err) {
    console.error('Could not create bookings table', err);
    process.exit(1);
  }
});

app.post('/api/bookings', (req, res) => {
  const {
    fullName,
    phone,
    email,
    contactMethod,
    serviceType,
    customService,
    preferredDate,
    preferredTime,
    urgency,
    description,
    agreeUpdates
  } = req.body;

  if (!fullName || !phone || !serviceType || !description) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  const createdAt = new Date().toISOString();
  const agreeUpdatesValue = agreeUpdates ? 1 : 0;
  const insertSql = `
    INSERT INTO bookings (
      fullName, phone, email, contactMethod, serviceType,
      customService, preferredDate, preferredTime, urgency,
      description, agreeUpdates, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    insertSql,
    [
      fullName,
      phone,
      email || '',
      contactMethod || '',
      serviceType,
      customService || '',
      preferredDate || '',
      preferredTime || '',
      urgency || '',
      description,
      agreeUpdatesValue,
      createdAt
    ],
    function (err) {
      if (err) {
        console.error('Booking insert error', err);
        return res.status(500).json({ error: 'Could not save booking.' });
      }
      res.json({ success: true, bookingId: this.lastID });
    }
  );
});

app.get('/api/bookings', requireAdmin, (req, res) => {
  const selectSql = 'SELECT * FROM bookings ORDER BY createdAt DESC';
  db.all(selectSql, [], (err, rows) => {
    if (err) {
      console.error('Could not read bookings', err);
      return res.status(500).json({ error: 'Could not load bookings.' });
    }
    res.json(rows);
  });
});

app.get('/api/bookings/:id', requireAdmin, (req, res) => {
  const selectSql = 'SELECT * FROM bookings WHERE id = ?';
  db.get(selectSql, [req.params.id], (err, row) => {
    if (err) {
      console.error('Could not read booking', err);
      return res.status(500).json({ error: 'Could not load booking.' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    res.json(row);
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log('Open contact.html and admin.html from the same server.');
});
