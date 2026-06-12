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
  );

  CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    category TEXT,
    image TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
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

app.post('/api/bookings/admin', requireAdmin, (req, res) => {
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
    console.error('Booking admin insert error', err);
    res.status(500).json({ error: 'Could not save booking.' });
  }
});

app.delete('/api/bookings/:id', requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Could not delete booking', err);
    res.status(500).json({ error: 'Could not delete booking.' });
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

// Blog API Endpoints
app.get('/api/blog', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM blog_posts ORDER BY createdAt DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('Could not read blog posts', err);
    res.status(500).json({ error: 'Could not load blog posts.' });
  }
});

app.get('/api/blog/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Blog post not found.' });
    res.json(row);
  } catch (err) {
    console.error('Could not read blog post', err);
    res.status(500).json({ error: 'Could not load blog post.' });
  }
});

app.post('/api/blog', requireAdmin, (req, res) => {
  const { title, excerpt, content, author, category, image } = req.body;

  if (!title || !excerpt || !content) {
    return res.status(400).json({ error: 'Missing required blog fields.' });
  }

  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  try {
    const insert = db.prepare(`
      INSERT INTO blog_posts (title, excerpt, content, author, category, image, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      title,
      excerpt,
      content,
      author || 'Admin',
      category || 'General',
      image || '',
      createdAt,
      updatedAt
    );

    res.json({ success: true, postId: result.lastInsertRowid });
  } catch (err) {
    console.error('Blog post insert error', err);
    res.status(500).json({ error: 'Could not save blog post.' });
  }
});

app.put('/api/blog/:id', requireAdmin, (req, res) => {
  const { title, excerpt, content, author, category, image } = req.body;

  if (!title || !excerpt || !content) {
    return res.status(400).json({ error: 'Missing required blog fields.' });
  }

  const updatedAt = new Date().toISOString();

  try {
    const update = db.prepare(`
      UPDATE blog_posts 
      SET title = ?, excerpt = ?, content = ?, author = ?, category = ?, image = ?, updatedAt = ?
      WHERE id = ?
    `);

    const result = update.run(
      title,
      excerpt,
      content,
      author || 'Admin',
      category || 'General',
      image || '',
      updatedAt,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Blog post update error', err);
    res.status(500).json({ error: 'Could not update blog post.' });
  }
});

app.delete('/api/blog/:id', requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Could not delete blog post', err);
    res.status(500).json({ error: 'Could not delete blog post.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log('Open contact.html and admin.html from the same server.');
});