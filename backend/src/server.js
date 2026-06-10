// server.js
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: [
    'https://frontend-infrastructure-2k12-bnemohntk-david10456s-projects.vercel.app',  // ← Your Vercel frontend URL
    'http://localhost:3000',                           // Local React dev
    'http://localhost:5173',                           // Local Vite dev
    'http://localhost:5000'                            // Local backend
  ],
  credentials: true
}));
app.use(express.json());

// Use environment variable or default (Render sets PORT automatically)
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'yibs_super_secret_key_2026';

// MIDDLEWARE
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) { res.status(400).json({ message: 'Invalid token' }); }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

// Auto-initialize database on startup
async function initializeDatabase() {
  try {
    const isPostgres = process.env.NODE_ENV === 'production' && process.env.DATABASE_URL;
    let result;
    
    if (isPostgres) {
      const res = await db.query('SELECT COUNT(*) FROM users');
      result = { count: parseInt(res.rows[0].count) };
    } else {
      result = await db.getAsync('SELECT COUNT(*) as count FROM users');
    }
    
    if (result.count === 0) {
      console.log('🌱 No users found, running database seed...');
      const seedDatabase = require('./seed');
      await seedDatabase();
    } else {
      console.log('✅ Database already initialized with', result.count, 'users');
    }
  } catch (err) {
    console.error('⚠️ Database initialization check failed:', err.message);
    console.log('📝 You may need to run: npm run seed');
  }
}

// MODULE 1: AUTHENTICATION

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    let profile = {};
    if (user.role === 'student') profile = await db.getAsync('SELECT * FROM students WHERE user_id = ?', [user.id]);
    else if (user.role === 'teacher') profile = await db.getAsync('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, profile } });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// ADMIN ONLY ROUTES
app.get('/api/students', authenticate, authorize('admin'), async (req, res) => {
  try {
    const students = await db.allAsync(`SELECT s.id, s.admission_no, s.first_name, s.last_name, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id ORDER BY s.id ASC`);
    res.json(students);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/students', authenticate, authorize('admin'), async (req, res) => {
  const { first_name, last_name, admission_no, class_id, username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await db.runAsync('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, 'student']);
    const studentResult = await db.runAsync('INSERT INTO students (user_id, admission_no, first_name, last_name, class_id) VALUES (?, ?, ?, ?, ?)', [userResult.lastID, admission_no, first_name, last_name, class_id || null]);
    res.json({ message: 'Student registered', id: studentResult.lastID });
  } catch (err) { res.status(500).json({ message: 'Error registering student' }); }
});

app.get('/api/teachers', authenticate, authorize('admin'), async (req, res) => {
  try { res.json(await db.allAsync(`SELECT id, staff_id, first_name, last_name FROM teachers ORDER BY id ASC`)); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/teachers', authenticate, authorize('admin'), async (req, res) => {
  const { first_name, last_name, staff_id, username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await db.runAsync('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, 'teacher']);
    const teacherResult = await db.runAsync('INSERT INTO teachers (user_id, staff_id, first_name, last_name) VALUES (?, ?, ?, ?)', [userResult.lastID, staff_id, first_name, last_name]);
    res.json({ message: 'Staff registered', id: teacherResult.lastID });
  } catch (err) { res.status(500).json({ message: 'Error registering staff' }); }
});

app.get('/api/classes', authenticate, authorize('admin'), async (req, res) => {
  try { res.json(await db.allAsync(`SELECT c.*, COUNT(s.id) as student_count FROM classes c LEFT JOIN students s ON c.id = s.class_id GROUP BY c.id`)); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/classes', authenticate, authorize('admin'), async (req, res) => {
  try { res.json(await db.runAsync('INSERT INTO classes (name, level) VALUES (?, ?)', [req.body.name, req.body.level])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/fees', authenticate, authorize('admin'), async (req, res) => {
  try { res.json(await db.runAsync('INSERT INTO fees (student_id, amount, description, payment_date, receipt_no) VALUES (?, ?, ?, ?, ?)', [req.body.student_id, req.body.amount, req.body.description, req.body.payment_date, req.body.receipt_no])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/notifications', authenticate, authorize('admin'), async (req, res) => {
  try { res.json(await db.runAsync('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [req.body.user_id, req.body.message])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

// TEACHER ROUTES
app.get('/api/my-students', authenticate, authorize('teacher'), async (req, res) => {
  try {
    const teacher = await db.getAsync('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher) return res.json([]);
    const students = await db.allAsync(`
      SELECT DISTINCT s.id, s.admission_no, s.first_name, s.last_name, c.name as class_name 
      FROM students s 
      JOIN class_subjects cs ON s.class_id = cs.class_id 
      JOIN classes c ON s.class_id = c.id
      WHERE cs.teacher_id = ?
    `, [teacher.id]);
    res.json(students);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/attendance', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try { res.json(await db.runAsync('INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)', [req.body.student_id, req.body.date, req.body.status])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/results', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try { res.json(await db.runAsync('INSERT INTO results (exam_id, student_id, subject_id, score) VALUES (?, ?, ?, ?)', [req.body.exam_id, req.body.student_id, req.body.subject_id, req.body.score])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

// STUDENT ROUTES
app.get('/api/results/:studentId', authenticate, async (req, res) => {
  if (req.user.role === 'student' && req.user.profile.id !== parseInt(req.params.studentId)) return res.status(403).send('Access denied');
  try { res.json(await db.allAsync(`SELECT r.score, sub.name as subject_name, e.name as exam_name FROM results r JOIN subjects sub ON r.subject_id = sub.id JOIN exams e ON r.exam_id = e.id WHERE r.student_id = ?`, [req.params.studentId])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/fees/:studentId', authenticate, async (req, res) => {
  if (req.user.role === 'student' && req.user.profile.id !== parseInt(req.params.studentId)) return res.status(403).send('Access denied');
  try { res.json(await db.allAsync(`SELECT * FROM fees WHERE student_id = ? ORDER BY payment_date DESC`, [req.params.studentId])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/timetable/:classId', authenticate, async (req, res) => {
  try { res.json(await db.allAsync(`SELECT t.day, t.start_time, t.end_time, sub.name as subject, te.first_name || ' ' || te.last_name as teacher FROM timetable t JOIN subjects sub ON t.subject_id = sub.id JOIN teachers te ON t.teacher_id = te.id WHERE t.class_id = ?`, [req.params.classId])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/transcript/:studentId', authenticate, async (req, res) => {
  if (req.user.role === 'student' && req.user.profile.id !== parseInt(req.params.studentId)) return res.status(403).send('Access denied');
  try {
    const results = await db.allAsync(`SELECT r.score, sub.name as subject_name, sub.credits FROM results r JOIN subjects sub ON r.subject_id = sub.id WHERE r.student_id = ?`, [req.params.studentId]);
    let totalPoints = 0, totalCredits = 0;
    const transcript = results.map(r => {
      let gp = r.score >= 80 ? 5.0 : r.score >= 70 ? 4.0 : r.score >= 60 ? 3.0 : r.score >= 50 ? 2.0 : r.score >= 40 ? 1.0 : 0.0;
      totalPoints += (gp * r.credits); totalCredits += r.credits;
      return { ...r, gradePoint: gp };
    });
    res.json({ transcript, gpa: totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0.00 });
  } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/notifications', authenticate, async (req, res) => {
  try { res.json(await db.allAsync(`SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC`, [req.user.id])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

// IT SUPPORT ROUTES
app.get('/api/assets', authenticate, authorize('it_support'), async (req, res) => {
  try { res.json(await db.allAsync('SELECT * FROM assets ORDER BY id DESC')); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/assets', authenticate, authorize('it_support'), async (req, res) => {
  try { res.json(await db.runAsync('INSERT INTO assets (name, type, location, status, last_maintenance) VALUES (?, ?, ?, ?, ?)', [req.body.name, req.body.type, req.body.location, req.body.status, req.body.last_maintenance])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/tickets', authenticate, authorize('it_support'), async (req, res) => {
  try { res.json(await db.allAsync('SELECT t.*, u.username as reporter FROM helpdesk_tickets t JOIN users u ON t.reporter_id = u.id ORDER BY t.created_at DESC')); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.put('/api/tickets/:id', authenticate, authorize('it_support'), async (req, res) => {
  try { res.json(await db.runAsync('UPDATE helpdesk_tickets SET status = ? WHERE id = ?', [req.body.status, req.params.id])); } 
  catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/users', authenticate, authorize('it_support'), async (req, res) => {
  try { res.json(await db.allAsync('SELECT id, username, role FROM users ORDER BY id ASC')); } 
  catch (err) { res.status(500).send('Server Error'); }
});

// DASHBOARD
app.get('/api/reports/dashboard', authenticate, authorize('admin', 'it_support'), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const s = await db.getAsync('SELECT COUNT(*) as count FROM students');
      const t = await db.getAsync('SELECT COUNT(*) as count FROM teachers');
      const r = await db.getAsync('SELECT SUM(amount) as total FROM fees');
      res.json({ students: s.count, teachers: t.count, revenue: r.total || 0 });
    } else {
      const a = await db.getAsync('SELECT COUNT(*) as count FROM assets');
      const aa = await db.getAsync("SELECT COUNT(*) as count FROM assets WHERE status = 'Active'");
      const ot = await db.getAsync("SELECT COUNT(*) as count FROM helpdesk_tickets WHERE status != 'Resolved'");
      res.json({ totalAssets: a.count, activeAssets: aa.count, openTickets: ot.count });
    }
  } catch (err) { res.status(500).send('Server Error'); }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'YIBS School Management API is running!',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});
// Add this BEFORE the /api/seed route
const SEED_TOKEN = process.env.SEED_TOKEN || '44406ee0ed19ad891bf4d86aed45ffea';

app.get('/api/seed', async (req, res) => {
  // Simple token check
  const token = req.headers['x-seed-token'];
  if (token !== SEED_TOKEN) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  try {
    console.log('🌱 Running database seed...');
    const seedDatabase = require('./seed');
    await seedDatabase();
    res.json({ message: '✅ Database seeded successfully!' });
  } catch (err) {
    console.error('❌ Seed failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server and initialize database
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 YIBS Secure Backend running on http://localhost:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL (Render)' : 'SQLite (Local)'}`);
  
  // Initialize database after server starts
  initializeDatabase();
});

module.exports = app;