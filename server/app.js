const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { createDatabase, isPostgresReady } = require('./database');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.DATABASE_TYPE === 'postgres' && !process.env.DATABASE_URL) {
    console.warn('DATABASE_TYPE is set to postgres but DATABASE_URL is missing. Falling back to SQLite.');
}

const db = createDatabase();

const initializeDatabase = () => {
    const seedDefaultRecords = () => {
        db.get("SELECT * FROM employees WHERE email = 'admin@etift.com'", (err, row) => {
            if (!row) {
                bcrypt.hash('admin123', 10, (err, hash) => {
                    if (err) return console.error('Unable to create default admin user.', err);
                    db.run(`INSERT INTO employees (employee_id, full_name, email, password, department, position, role)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            ['ADMIN001', 'System Admin', 'admin@etift.com', hash, 'IT', 'Administrator', 'admin']);
                    console.log('Admin user created: admin@etift.com / admin123');
                });
            }
        });

        db.get('SELECT COUNT(*) as count FROM job_postings', (err, row) => {
            if (!row || row.count === 0) {
                db.run(`INSERT INTO job_postings (title, department, location, employment_type, description, status)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        ['Operations Officer', 'Operations', 'Addis Ababa', 'Full-time', 'Support day-to-day field operations and business process improvement for ETIFT projects.', 'open']);
                db.run(`INSERT INTO job_postings (title, department, location, employment_type, description, status)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        ['Customer Care Specialist', 'Customer Experience', 'Addis Ababa', 'Full-time', 'Deliver responsive customer support and client onboarding for digital finance services.', 'open']);
            }
        });
    };

    if (isPostgresReady) {
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            employee_id TEXT UNIQUE,
            full_name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            department TEXT,
            position TEXT,
            role TEXT DEFAULT 'employee',
            phone TEXT,
            hire_date TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS leave_requests (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER,
            leave_type TEXT,
            start_date TEXT,
            end_date TEXT,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS announcements (
            id SERIAL PRIMARY KEY,
            title TEXT,
            content TEXT,
            posted_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS job_postings (
            id SERIAL PRIMARY KEY,
            title TEXT,
            department TEXT,
            location TEXT,
            employment_type TEXT,
            description TEXT,
            status TEXT DEFAULT 'open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS job_applications (
            id SERIAL PRIMARY KEY,
            job_id INTEGER,
            applicant_name TEXT,
            email TEXT,
            phone TEXT,
            experience TEXT,
            summary TEXT,
            status TEXT DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES job_postings(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER,
            date TEXT,
            check_in TEXT,
            check_out TEXT,
            status TEXT DEFAULT 'present'
        )`);
        db.run(`DELETE FROM attendance WHERE id NOT IN (SELECT MAX(id) FROM attendance GROUP BY employee_id, date)`);
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_date ON attendance (employee_id, date)');

        db.run(`CREATE TABLE IF NOT EXISTS attendance_corrections (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            attendance_date TEXT NOT NULL,
            correction_type TEXT NOT NULL,
            requested_time TEXT,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            reviewed_by INTEGER,
            reviewed_at TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS daily_attendance_qr (
            id SERIAL PRIMARY KEY,
            qr_date TEXT UNIQUE NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS shifts (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL,
            shift_date TEXT NOT NULL,
            shift_name TEXT DEFAULT 'Standard shift',
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            break_minutes INTEGER DEFAULT 60,
            notes TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        seedDefaultRecords();
        return;
    }

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE,
            full_name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            department TEXT,
            position TEXT,
            role TEXT DEFAULT 'employee',
            phone TEXT,
            hire_date TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS leave_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            leave_type TEXT,
            start_date TEXT,
            end_date TEXT,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            posted_by INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS job_postings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            department TEXT,
            location TEXT,
            employment_type TEXT,
            description TEXT,
            status TEXT DEFAULT 'open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS job_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            applicant_name TEXT,
            email TEXT,
            phone TEXT,
            experience TEXT,
            summary TEXT,
            status TEXT DEFAULT 'new',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES job_postings(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            date TEXT,
            check_in TEXT,
            check_out TEXT,
            status TEXT DEFAULT 'present'
        )`);
        db.run(`DELETE FROM attendance WHERE id NOT IN (SELECT MAX(id) FROM attendance GROUP BY employee_id, date)`);
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_date ON attendance (employee_id, date)');

        db.run(`CREATE TABLE IF NOT EXISTS attendance_corrections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            attendance_date TEXT NOT NULL,
            correction_type TEXT NOT NULL,
            requested_time TEXT,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            reviewed_by INTEGER,
            reviewed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS daily_attendance_qr (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qr_date TEXT UNIQUE NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            shift_date TEXT NOT NULL,
            shift_name TEXT DEFAULT 'Standard shift',
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            break_minutes INTEGER DEFAULT 60,
            notes TEXT,
            created_by INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        seedDefaultRecords();
    });
};

initializeDatabase();

app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cors({
    origin: (origin, callback) => {
        const isAllowedOrigin = !origin || allowedOrigins.includes(origin) || origin === process.env.PUBLIC_URL || origin === 'http://localhost:5000' || origin === 'http://127.0.0.1:5000';
        if (!isAllowedOrigin) {
            return callback(new Error('CORS origin not allowed'));
        }
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});
app.use(session({
    secret: process.env.SESSION_SECRET || 'etift_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, '../public')));

const JWT_SECRET = process.env.JWT_SECRET || 'etift_secret_key_2026';

const authenticate = (req, res, next) => {
    const token = req.session.token;
    if (!token) {
        return res.redirect('/');
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        req.session.destroy();
        res.redirect('/');
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return res.redirect('/');
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM employees WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.full_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        req.session.token = token;
        res.json({ 
            success: true, 
            role: user.role,
            name: user.full_name,
            redirect: user.role === 'admin' ? '/admin.html' : user.role === 'manager' ? '/manager.html' : '/dashboard.html'
        });
    });
});

app.get('/api/me', authenticate, (req, res) => {
    db.get('SELECT id, employee_id, full_name, email, department, position, role, phone, hire_date FROM employees WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(row);
    });
});

app.get('/api/employees', authenticate, authorize('admin', 'manager'), (req, res) => {
    db.all('SELECT id, employee_id, full_name, email, department, position, role, phone, hire_date FROM employees', (err, rows) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(rows);
    });
});

app.post('/api/employees', authenticate, authorize('admin'), (req, res) => {
    const { employee_id, full_name, email, password, department, position, role, phone, hire_date } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        db.run('INSERT INTO employees (employee_id, full_name, email, password, department, position, role, phone, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [employee_id, full_name, email, hash, department, position, role, phone, hire_date],
            function(err) {
                if (err) return res.status(500).json({ message: 'Server error' });
                res.json({ success: true, id: this.lastID });
            });
    });
});

app.put('/api/employees/:id', authenticate, authorize('admin'), (req, res) => {
    const { full_name, email, department, position, role, phone } = req.body;
    db.run('UPDATE employees SET full_name = ?, email = ?, department = ?, position = ?, role = ?, phone = ? WHERE id = ?',
        [full_name, email, department, position, role, phone, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ success: true });
        });
});

app.delete('/api/employees/:id', authenticate, authorize('admin'), (req, res) => {
    db.run('DELETE FROM employees WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ success: true });
    });
});

app.get('/api/leave-requests', authenticate, (req, res) => {
    let sql = 'SELECT l.*, e.full_name FROM leave_requests l JOIN employees e ON l.employee_id = e.id';
    if (req.user.role === 'employee') {
        sql += ' WHERE l.employee_id = ' + req.user.id;
    }
    sql += ' ORDER BY l.created_at DESC';
    db.all(sql, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(rows);
    });
});

app.post('/api/leave-requests', authenticate, (req, res) => {
    const { leave_type, start_date, end_date, reason } = req.body;
    db.run('INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, leave_type, start_date, end_date, reason],
        function(err) {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/leave-requests/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { status } = req.body;
    db.run('UPDATE leave_requests SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ success: true });
    });
});

app.get('/api/announcements', authenticate, (req, res) => {
    db.all('SELECT a.*, e.full_name as posted_by_name FROM announcements a LEFT JOIN employees e ON a.posted_by = e.id ORDER BY a.created_at DESC', (err, rows) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(rows);
    });
});

app.post('/api/announcements', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { title, content } = req.body;
    db.run('INSERT INTO announcements (title, content, posted_by) VALUES (?, ?, ?)',
        [title, content, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ success: true, id: this.lastID });
        });
});

app.get('/api/job-postings', authenticate, (req, res) => {
    db.all('SELECT * FROM job_postings ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(rows);
    });
});

app.post('/api/job-postings', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { title, department, location, employment_type, description } = req.body;
    if (!title || !department || !location || !employment_type || !description) {
        return res.status(400).json({ message: 'Please complete all job posting fields.' });
    }

    db.run('INSERT INTO job_postings (title, department, location, employment_type, description) VALUES (?, ?, ?, ?, ?)',
        [title, department, location, employment_type, description],
        function(err) {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/job-postings/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { status } = req.body;
    db.run('UPDATE job_postings SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ success: true });
    });
});

app.get('/api/job-applications', authenticate, (req, res) => {
    db.all(`SELECT a.*, j.title as job_title, j.department as job_department
            FROM job_applications a
            LEFT JOIN job_postings j ON a.job_id = j.id
            ORDER BY a.created_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(rows);
    });
});

app.post('/api/job-applications', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { job_id, applicant_name, email, phone, experience, summary, status } = req.body;
    if (!job_id || !applicant_name || !email || !experience || !summary) {
        return res.status(400).json({ message: 'Please complete candidate details.' });
    }

    db.run('INSERT INTO job_applications (job_id, applicant_name, email, phone, experience, summary, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [job_id, applicant_name, email, phone, experience, summary, status || 'new'],
        function(err) {
            if (err) return res.status(500).json({ message: 'Server error' });
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/job-applications/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { status } = req.body;
    db.run('UPDATE job_applications SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ success: true });
    });
});

const localDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const localTime = () => new Date().toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
});

const minutesFromTime = (value) => {
    if (!value) return null;
    const parts = value.split(':').map(Number);
    return parts[0] * 60 + parts[1];
};

const attendanceMetrics = (record) => {
    const checkIn = minutesFromTime(record.check_in);
    const checkOut = minutesFromTime(record.check_out);
    const scheduledStart = 14 * 60 + 30;
    const scheduledEnd = 23 * 60 + 30;
    const breakMinutes = 60;
    const lateMinutes = checkIn === null ? null : Math.max(0, checkIn - scheduledStart);
    const earlyOutMinutes = checkOut === null ? null : Math.max(0, scheduledEnd - checkOut);
    const grossMinutes = checkIn !== null && checkOut !== null ? Math.max(0, checkOut - checkIn) : 0;
    const workedMinutes = Math.max(0, grossMinutes - breakMinutes);
    const wastedMinutes = Math.max(0, (scheduledEnd - scheduledStart - breakMinutes) - workedMinutes);
    return {
        late_minutes: lateMinutes,
        early_out_minutes: earlyOutMinutes,
        worked_minutes: workedMinutes,
        wasted_minutes: wastedMinutes,
        attendance_label: lateMinutes > 0 ? 'Late come' : earlyOutMinutes > 0 ? 'Early out' : 'On time'
    };
};

const getDailyQrToken = (date, callback) => {
    db.get('SELECT token FROM daily_attendance_qr WHERE qr_date = ?', [date], (err, row) => {
        if (err) return callback(err);
        if (row) return callback(null, row.token);
        const token = crypto.randomBytes(24).toString('hex');
        db.run('INSERT INTO daily_attendance_qr (qr_date, token) VALUES (?, ?)', [date, token], (insertErr) => {
            callback(insertErr, token);
        });
    });
};

const validateQrToken = (token, callback) => {
    const today = localDate();
    db.get('SELECT token FROM daily_attendance_qr WHERE qr_date = ? AND token = ?', [today, token], (err, row) => {
        callback(err, Boolean(row));
    });
};

const getQrBaseUrl = (req) => {
    if (process.env.PUBLIC_URL) {
        return process.env.PUBLIC_URL.replace(/\/$/, '');
    }

    const requestHost = req.get('host');
    const requestProtocol = req.get('x-forwarded-proto') || req.protocol;
    const requestHostname = requestHost && requestHost.split(':')[0];
    const isLocalHost = !requestHostname || ['localhost', '127.0.0.1', '::1'].includes(requestHostname);

    if (!isLocalHost) {
        return `${requestProtocol}://${requestHost}`;
    }

    const networkInterface = Object.values(os.networkInterfaces())
        .flat()
        .find((address) => address && address.family === 'IPv4' && !address.internal);
    const networkHost = networkInterface ? networkInterface.address : requestHostname || 'localhost';
    return `${requestProtocol}://${networkHost}:${PORT}`;
};

app.get('/api/attendance/qr', authenticate, authorize('admin', 'manager'), (req, res) => {
    const date = localDate();
    getDailyQrToken(date, (err, token) => {
        if (err) return res.status(500).json({ message: 'Unable to create today’s attendance QR.' });
        const baseUrl = getQrBaseUrl(req);
        res.json({
            date,
            token,
            checkinUrl: `${baseUrl}/attendance-quick.html?mode=checkin&token=${token}`,
            checkoutUrl: `${baseUrl}/attendance-quick.html?mode=checkout&token=${token}`
        });
    });
});

const markAttendance = (mode) => (req, res) => {
    const token = req.body && req.body.token;
    validateQrToken(token, (tokenErr, valid) => {
        if (tokenErr) return res.status(500).json({ message: 'Unable to validate attendance QR.' });
        if (!valid) return res.status(400).json({ message: 'This attendance QR is expired. Please scan today’s code.' });
        const today = localDate();
        const now = localTime();
        if (mode === 'checkin') {
            db.run(`INSERT INTO attendance (employee_id, date, check_in, check_out, status)
                    VALUES (?, ?, ?, COALESCE((SELECT check_out FROM attendance WHERE employee_id = ? AND date = ?), NULL), ?)
                    ON CONFLICT (employee_id, date) DO UPDATE SET check_in = EXCLUDED.check_in, check_out = COALESCE(attendance.check_out, EXCLUDED.check_out), status = EXCLUDED.status`,
                [req.user.id, today, now, req.user.id, today, 'present'],
                function(err) {
                    if (err) return res.status(500).json({ message: 'Unable to save check-in.' });
                    res.json({ success: true, time: now, ...attendanceMetrics({ check_in: now }) });
                });
        } else {
            db.get('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [req.user.id, today], (findErr, record) => {
                if (findErr) return res.status(500).json({ message: 'Unable to load today’s attendance.' });
                if (!record || !record.check_in) return res.status(400).json({ message: 'Check in before checking out.' });
                db.run('UPDATE attendance SET check_out = ? WHERE employee_id = ? AND date = ?', [now, req.user.id, today], (err) => {
                    if (err) return res.status(500).json({ message: 'Unable to save check-out.' });
                    res.json({ success: true, time: now, ...attendanceMetrics({ ...record, check_out: now }) });
                });
            });
        }
    });
};

app.post('/api/attendance/checkin', authenticate, markAttendance('checkin'));
app.post('/api/attendance/checkout', authenticate, markAttendance('checkout'));

app.get('/api/attendance/today', authenticate, (req, res) => {
    const today = localDate();
    db.get('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [req.user.id, today], (err, row) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(row ? { ...row, ...attendanceMetrics(row) } : null);
    });
});

app.get('/api/attendance/history', authenticate, (req, res) => {
    const query = req.user.role === 'employee'
        ? 'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 60'
        : 'SELECT a.*, e.full_name FROM attendance a JOIN employees e ON e.id = a.employee_id ORDER BY date DESC LIMIT 200';
    db.all(query, req.user.role === 'employee' ? [req.user.id] : [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json(rows.map((row) => ({ ...row, ...attendanceMetrics(row) })));
    });
});

app.get('/api/attendance/corrections', authenticate, (req, res) => {
    const isEmployee = req.user.role === 'employee';
    const query = isEmployee
        ? `SELECT c.*, e.full_name FROM attendance_corrections c JOIN employees e ON e.id = c.employee_id WHERE c.employee_id = ? ORDER BY c.created_at DESC`
        : `SELECT c.*, e.full_name FROM attendance_corrections c JOIN employees e ON e.id = c.employee_id ORDER BY c.created_at DESC`;
    db.all(query, isEmployee ? [req.user.id] : [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Unable to load correction requests.' });
        res.json(rows);
    });
});

app.post('/api/attendance/corrections', authenticate, (req, res) => {
    const { attendance_date, correction_type, requested_time, reason } = req.body;
    if (!attendance_date || !['check_in', 'check_out'].includes(correction_type) || !reason) {
        return res.status(400).json({ message: 'Date, correction type, and reason are required.' });
    }
    db.run(`INSERT INTO attendance_corrections (employee_id, attendance_date, correction_type, requested_time, reason)
            VALUES (?, ?, ?, ?, ?)`, [req.user.id, attendance_date, correction_type, requested_time || null, reason.trim()], function(err) {
        if (err) return res.status(500).json({ message: 'Unable to submit correction request.' });
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/attendance/corrections/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid correction status.' });
    db.get('SELECT * FROM attendance_corrections WHERE id = ?', [req.params.id], (findErr, correction) => {
        if (findErr || !correction) return res.status(404).json({ message: 'Correction request not found.' });
        db.run('UPDATE attendance_corrections SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, req.user.id, req.params.id], (err) => {
                if (err) return res.status(500).json({ message: 'Unable to review correction request.' });
                if (status === 'approved') {
                    const column = correction.correction_type === 'check_in' ? 'check_in' : 'check_out';
                    db.run('INSERT INTO attendance (employee_id, date, status) VALUES (?, ?, \'present\') ON CONFLICT (employee_id, date) DO NOTHING',
                        [correction.employee_id, correction.attendance_date], (insertErr) => {
                            if (insertErr) return res.status(500).json({ message: 'Request approved but attendance could not be updated.' });
                            db.run(`UPDATE attendance SET ${column} = ? WHERE employee_id = ? AND date = ?`,
                                [correction.requested_time, correction.employee_id, correction.attendance_date], (updateErr) => {
                                    if (updateErr) return res.status(500).json({ message: 'Request approved but attendance could not be updated.' });
                                    res.json({ success: true });
                                });
                        });
                } else {
                    res.json({ success: true });
                }
            });
    });
});

app.get('/api/shifts', authenticate, (req, res) => {
    const query = req.user.role === 'employee'
        ? `SELECT s.*, e.full_name FROM shifts s JOIN employees e ON e.id = s.employee_id WHERE s.employee_id = ? ORDER BY s.shift_date ASC`
        : `SELECT s.*, e.full_name FROM shifts s JOIN employees e ON e.id = s.employee_id ORDER BY s.shift_date ASC`;
    db.all(query, req.user.role === 'employee' ? [req.user.id] : [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Unable to load shifts.' });
        res.json(rows);
    });
});

app.post('/api/shifts', authenticate, authorize('admin', 'manager'), (req, res) => {
    const { employee_id, shift_date, shift_name, start_time, end_time, break_minutes, notes } = req.body;
    if (!employee_id || !shift_date || !start_time || !end_time) return res.status(400).json({ message: 'Employee, date, start, and end time are required.' });
    db.run(`INSERT INTO shifts (employee_id, shift_date, shift_name, start_time, end_time, break_minutes, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [employee_id, shift_date, shift_name || 'Standard shift', start_time, end_time, Number(break_minutes || 60), notes || null, req.user.id], function(err) {
        if (err) return res.status(500).json({ message: 'Unable to create shift.' });
        res.json({ success: true, id: this.lastID });
    });
});

app.get('/api/dashboard/stats', authenticate, (req, res) => {
    db.get('SELECT COUNT(*) as total FROM employees', (err, total) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        db.get("SELECT COUNT(*) as pending FROM leave_requests WHERE status = 'pending'", (err, pending) => {
            if (err) return res.status(500).json({ message: 'Server error' });
            const today = new Date().toISOString().split('T')[0];
            db.get("SELECT COUNT(*) as present FROM attendance WHERE date = ? AND status = 'present'", [today], (err, present) => {
                if (err) return res.status(500).json({ message: 'Server error' });
                res.json({
                    totalEmployees: total.total || 0,
                    pendingLeaves: pending.pending || 0,
                    todayPresent: present.present || 0
                });
            });
        });
    });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API not found' });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Access from any browser on this machine or local network.');
    console.log('Default admin login: admin@etift.com / admin123');
});