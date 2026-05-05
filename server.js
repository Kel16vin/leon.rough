const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
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

// Initialize database
const db = new Database(dbFile);

db.exec(`
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
  )
`);

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

  try {
    const insert = db.prepare(`
      INSERT INTO bookings (
        fullName, phone, email, contactMethod, serviceType,
        customService, preferredDate, preferredTime, urgency,
        description, agreeUpdates, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
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
    );

    res.json({ success: true, bookingId: result.lastInsertRowid });
  } catch (err) {
    console.error('Booking insert error', err);
    res.status(500).json({ error: 'Could not save booking.' });
  }
});

app.get('/api/bookings', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Could not read bookings', err);
    res.status(500).json({ error: 'Could not load bookings.' });
  }
});

app.get('/api/bookings/:id', requireAdmin, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Booking not found.' });
    res.json(row);
  } catch (err) {
    console.error('Could not read booking', err);
    res.status(500).json({ error: 'Could not load booking.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log('Open contact.html and admin.html from the same server.');
});