CREATE TABLE IF NOT EXISTS employees (
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
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    leave_type TEXT,
    start_date TEXT,
    end_date TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    posted_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    title TEXT,
    department TEXT,
    location TEXT,
    employment_type TEXT,
    description TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
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
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    date TEXT,
    check_in TEXT,
    check_out TEXT,
    status TEXT DEFAULT 'present'
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_date
ON attendance (employee_id, date);

CREATE TABLE IF NOT EXISTS attendance_corrections (
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
);

CREATE TABLE IF NOT EXISTS daily_attendance_qr (
    id SERIAL PRIMARY KEY,
    qr_date TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
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
);

INSERT INTO employees (employee_id, full_name, email, password, department, position, role)
SELECT 'ADMIN001', 'System Admin', 'admin@etift.com', 'REPLACE_WITH_HASHED_PASSWORD', 'IT', 'Administrator', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'admin@etift.com');

INSERT INTO job_postings (title, department, location, employment_type, description, status)
SELECT 'Operations Officer', 'Operations', 'Addis Ababa', 'Full-time', 'Support day-to-day field operations and business process improvement for ETIFT projects.', 'open'
WHERE NOT EXISTS (SELECT 1 FROM job_postings WHERE title = 'Operations Officer');

INSERT INTO job_postings (title, department, location, employment_type, description, status)
SELECT 'Customer Care Specialist', 'Customer Experience', 'Addis Ababa', 'Full-time', 'Deliver responsive customer support and client onboarding for digital finance services.', 'open'
WHERE NOT EXISTS (SELECT 1 FROM job_postings WHERE title = 'Customer Care Specialist');
