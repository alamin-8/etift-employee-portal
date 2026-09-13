# ETIFT Employee Portal

A full-stack employee portal for Ethiopian Inclusive Finance Technology (ETIFT). The system is designed to help HR and management handle employee administration, attendance, leave requests, announcements, and recruitment.

## Features

- Employee login and role-based access control
- Admin dashboard for employee management
- Leave request workflow
- Attendance tracking with check-in and check-out
- QR-based attendance access for employees using mobile phones
- Announcement publishing
- Recruitment and candidate tracking
- Responsive web interface for desktop and mobile usage

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: SQLite
- Auth: Express session + JWT
- Security: bcrypt password hashing

## Project Structure

- `public/` – frontend pages and styles
- `server/app.js` – backend server and API routes
- `etift.db` – local SQLite database
- `package.json` – project scripts and dependencies

## Getting Started

1. Install dependencies:

   npm install

2. Start the server:

   npm start

3. Open the app in your browser:

   http://localhost:5000

## Demo Login Credentials

Admin:
- Email: admin@etift.com
- Password: admin123

Sample employee:
- Email: aster.bekele@etift.com
- Password: welcome123

## Admin Capabilities

- Add employees
- Manage roles and access
- Review leave requests
- Publish announcements
- View attendance status
- Create and manage recruitment posts
- Generate QR codes for attendance check-in/out

## QR Attendance Usage

1. Log in to the admin panel.
2. Go to the Attendance QR section.
3. Display the QR code on the admin computer.
4. Employees scan the code with their phone.
5. They log in using their ETIFT account to mark attendance.

## Production Hardening Notes

Before exposing this app publicly, configure the following environment values:

- `NODE_ENV=production`
- `PUBLIC_URL=https://your-domain.com`
- `SESSION_SECRET=<strong-random-secret>`
- `JWT_SECRET=<strong-random-secret>`
- `ALLOWED_ORIGINS=https://your-domain.com`

Use HTTPS in production and ensure the database remains persistent across deploys.

## Notes

This project is now prepared for a real deployment environment, but it still benefits from a persistent production database and a managed domain/SSL setup.

## License

This project is for demonstration and internal company review purposes.
