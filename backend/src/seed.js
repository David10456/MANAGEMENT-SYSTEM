const db = require('./db');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  try {
    console.log('🔄 Resetting and upgrading database...');
    await db.runAsync('PRAGMA foreign_keys = OFF;');
    const tables = ['helpdesk_tickets', 'assets', 'notifications', 'timetable', 'fees', 'results', 'exams', 'attendance', 'class_subjects', 'students', 'teachers', 'subjects', 'classes', 'departments', 'users'];
    for (const table of tables) {
      await db.runAsync(`DROP TABLE IF EXISTS ${table}`);
    }
    await db.runAsync('PRAGMA foreign_keys = ON;');

    console.log('🏗️ Creating upgraded tables...');
    await db.runAsync(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student', 'it_support')))`);
    await db.runAsync(`CREATE TABLE departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, head_of_department TEXT)`);
    await db.runAsync(`CREATE TABLE classes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, level TEXT NOT NULL, department_id INTEGER, FOREIGN KEY (department_id) REFERENCES departments(id))`);
    await db.runAsync(`CREATE TABLE subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, credits INTEGER NOT NULL, semester INTEGER NOT NULL)`);
    await db.runAsync(`CREATE TABLE students (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, admission_no TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, class_id INTEGER, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (class_id) REFERENCES classes(id))`);
    await db.runAsync(`CREATE TABLE teachers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, staff_id TEXT UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))`);
    await db.runAsync(`CREATE TABLE class_subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, subject_id INTEGER, teacher_id INTEGER, FOREIGN KEY (class_id) REFERENCES classes(id), FOREIGN KEY (subject_id) REFERENCES subjects(id), FOREIGN KEY (teacher_id) REFERENCES teachers(id))`);
    await db.runAsync(`CREATE TABLE attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')), session_code TEXT, FOREIGN KEY (student_id) REFERENCES students(id))`);
    await db.runAsync(`CREATE TABLE exams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, term TEXT NOT NULL, year INTEGER NOT NULL)`);
    await db.runAsync(`CREATE TABLE results (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER, student_id INTEGER, subject_id INTEGER, score REAL NOT NULL, FOREIGN KEY (exam_id) REFERENCES exams(id), FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (subject_id) REFERENCES subjects(id))`);
    await db.runAsync(`CREATE TABLE fees (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, amount REAL NOT NULL, description TEXT, payment_date TEXT NOT NULL, receipt_no TEXT UNIQUE NOT NULL, FOREIGN KEY (student_id) REFERENCES students(id))`);
    await db.runAsync(`CREATE TABLE timetable (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, subject_id INTEGER, teacher_id INTEGER, day TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (class_id) REFERENCES classes(id), FOREIGN KEY (subject_id) REFERENCES subjects(id), FOREIGN KEY (teacher_id) REFERENCES teachers(id))`);
    
    // NEW MODULE 6: INFRASTRUCTURE MANAGEMENT
    await db.runAsync(`CREATE TABLE assets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, location TEXT NOT NULL, status TEXT CHECK(status IN ('Active', 'Maintenance', 'Retired')), last_maintenance TEXT)`);
    
    // NEW MODULE 7: HELP DESK
    await db.runAsync(`CREATE TABLE helpdesk_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER, category TEXT NOT NULL, description TEXT NOT NULL, status TEXT CHECK(status IN ('Open', 'In Progress', 'Resolved')), created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (reporter_id) REFERENCES users(id))`);
    
    await db.runAsync(`CREATE TABLE notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, message TEXT NOT NULL, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);

    console.log('🌱 Seeding YIBS upgraded data...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Users
    await db.runAsync("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedPassword, 'admin']);
    await db.runAsync("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['teacher1', hashedPassword, 'teacher']);
    await db.runAsync("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['it_support', hashedPassword, 'it_support']);
    await db.runAsync("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['student1', hashedPassword, 'student']);

    // Departments & Classes
    await db.runAsync("INSERT INTO departments (name, head_of_department) VALUES (?, ?)", ['Accounting & Finance', 'Dr. Jean-Pierre Ngono']);
    await db.runAsync("INSERT INTO departments (name, head_of_department) VALUES (?, ?)", ['Marketing & Commerce', 'Mme. Amina Bello']);
    await db.runAsync("INSERT INTO classes (name, level, department_id) VALUES (?, ?, ?)", ['HND 1 Accounting', 'Higher National Diploma', 1]);
    await db.runAsync("INSERT INTO classes (name, level, department_id) VALUES (?, ?, ?)", ['HND 1 Marketing', 'Higher National Diploma', 2]);

    // Subjects (with Credits and Semester)
    await db.runAsync("INSERT INTO subjects (name, code, credits, semester) VALUES (?, ?, ?, ?)", ['Financial Accounting', 'ACC101', 4, 1]);
    await db.runAsync("INSERT INTO subjects (name, code, credits, semester) VALUES (?, ?, ?, ?)", ['Principles of Management', 'MGT101', 3, 1]);
    await db.runAsync("INSERT INTO subjects (name, code, credits, semester) VALUES (?, ?, ?, ?)", ['Marketing Fundamentals', 'MKT101', 3, 1]);

    // Teachers & Students
    await db.runAsync("INSERT INTO teachers (user_id, staff_id, first_name, last_name) VALUES (?, ?, ?, ?)", [2, 'YIBS/TCH/001', 'Jean-Pierre', 'Ngono']);
    await db.runAsync("INSERT INTO students (user_id, admission_no, first_name, last_name, class_id) VALUES (?, ?, ?, ?, ?)", [4, 'YIBS/HND1/ACC/001', 'Samuel', 'Eboa', 1]);

    // Assignments
    await db.runAsync("INSERT INTO class_subjects (class_id, subject_id, teacher_id) VALUES (?, ?, ?)", [1, 1, 1]);
    await db.runAsync("INSERT INTO class_subjects (class_id, subject_id, teacher_id) VALUES (?, ?, ?)", [1, 2, 1]);

    // Exams & Results
    await db.runAsync("INSERT INTO exams (name, term, year) VALUES (?, ?, ?)", ['First Semester Examination', 'Semester 1', 2026]);
    await db.runAsync("INSERT INTO results (exam_id, student_id, subject_id, score) VALUES (?, ?, ?, ?)", [1, 1, 1, 82.5]); // Accounting
    await db.runAsync("INSERT INTO results (exam_id, student_id, subject_id, score) VALUES (?, ?, ?, ?)", [1, 1, 2, 65.0]); // Management

    // NEW: Infrastructure Assets
    await db.runAsync("INSERT INTO assets (name, type, location, status, last_maintenance) VALUES (?, ?, ?, ?, ?)", ['Dell Optiplex 7090', 'Computer', 'Lab 1', 'Active', '2026-05-01']);
    await db.runAsync("INSERT INTO assets (name, type, location, status, last_maintenance) VALUES (?, ?, ?, ?, ?)", ['Cisco Catalyst 2960', 'Network Switch', 'Server Room', 'Active', '2026-04-15']);
    await db.runAsync("INSERT INTO assets (name, type, location, status, last_maintenance) VALUES (?, ?, ?, ?, ?)", ['Epson Projector', 'Projector', 'Lecture Hall A', 'Maintenance', '2026-05-20']);

    // NEW: Help Desk Tickets
    await db.runAsync("INSERT INTO helpdesk_tickets (reporter_id, category, description, status) VALUES (?, ?, ?, ?)", [4, 'Hardware', 'Projector in Lecture Hall A is not displaying video.', 'In Progress']);
    await db.runAsync("INSERT INTO helpdesk_tickets (reporter_id, category, description, status) VALUES (?, ?, ?, ?)", [4, 'Network', 'Wi-Fi is disconnected in Lab 1.', 'Open']);

    console.log('✅ YIBS System fully upgraded with Infrastructure and Help Desk modules!');
    console.log('🔑 New Login: it_support / password123');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();