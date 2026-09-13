document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    return;
  }

  const adminName = document.getElementById('adminName');
  const userName = document.getElementById('userName');
  const managerName = document.getElementById('managerName');

  if (managerName) {
    initializeManagerPage();
    return;
  }

  if (adminName) {
    bindPageNavigation();
    initializeAdminPage();
    return;
  }

  async function initializeManagerPage() {
    const user = await getCurrentUser();
    if (!user || !['manager', 'admin'].includes(user.role)) {
      window.location.href = '/dashboard.html';
      return;
    }
    document.getElementById('managerName').textContent = user.full_name;
    const links = document.querySelectorAll('[data-manager-page]');
    const sections = { overview: 'managerOverview', attendance: 'managerAttendance', corrections: 'managerCorrections', roster: 'managerRoster' };
    links.forEach((link) => link.addEventListener('click', (event) => {
      event.preventDefault();
      const page = link.dataset.managerPage;
      Object.values(sections).forEach((id) => { document.getElementById(id).style.display = id === sections[page] ? 'block' : 'none'; });
      links.forEach((item) => item.classList.toggle('active', item === link));
    }));
    await renderManagerData();
  }

  async function renderManagerData() {
    const [employeesResponse, attendanceResponse, correctionsResponse, shiftsResponse] = await Promise.all([
      fetch('/api/employees', { credentials: 'same-origin' }),
      fetch('/api/attendance/history', { credentials: 'same-origin' }),
      fetch('/api/attendance/corrections', { credentials: 'same-origin' }),
      fetch('/api/shifts', { credentials: 'same-origin' })
    ]);
    const employees = employeesResponse.ok ? await employeesResponse.json() : [];
    const attendance = attendanceResponse.ok ? await attendanceResponse.json() : [];
    const corrections = correctionsResponse.ok ? await correctionsResponse.json() : [];
    const shifts = shiftsResponse.ok ? await shiftsResponse.json() : [];
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('managerTeamSize').textContent = employees.length;
    document.getElementById('managerPresent').textContent = attendance.filter((row) => row.date === today && row.check_in).length;
    document.getElementById('managerPending').textContent = corrections.filter((row) => row.status === 'pending').length;
    document.getElementById('managerAttendanceTable').innerHTML = makeTable(['Employee', 'Date', 'Check in', 'Check out', 'Worked', 'Exceptions'], attendance.slice(0, 100).map((row) => [row.full_name || '—', row.date, row.check_in || '—', row.check_out || '—', formatMinutes(row.worked_minutes), row.late_minutes ? `Late come ${formatMinutes(row.late_minutes)}` : row.early_out_minutes ? `Early out ${formatMinutes(row.early_out_minutes)}` : 'On time']));
    document.getElementById('managerCorrectionsTable').innerHTML = makeTable(['Employee', 'Date', 'Correction', 'Reason', 'Status', 'Action'], corrections.map((row) => [row.full_name, row.attendance_date, row.correction_type, row.reason, row.status, row.status === 'pending' ? `<button class="btn-secondary" onclick="reviewCorrection(${row.id}, 'approved')">Approve</button> <button class="btn-secondary" onclick="reviewCorrection(${row.id}, 'rejected')">Reject</button>` : '—']));
    document.getElementById('shiftEmployee').innerHTML = employees.map((employee) => `<option value="${employee.id}">${escapeHtml(employee.full_name)}</option>`).join('');
    document.getElementById('managerRosterTable').innerHTML = makeTable(['Employee', 'Date', 'Shift', 'Break'], shifts.map((row) => [row.full_name, row.shift_date, `${row.start_time} – ${row.end_time}`, `${row.break_minutes} min`]));
  }

  function formatMinutes(value) {
    if (value === null || value === undefined) return '—';
    return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, '0')}m`;
  }

  function makeTable(headers, rows) {
    if (!rows.length) return '<p class="empty-state">Nothing to show yet.</p>';
    return `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  async function reviewCorrection(id, status) {
    const response = await fetch(`/api/attendance/corrections/${id}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) { const data = await response.json(); alert(data.message || 'Unable to review request.'); return; }
    renderManagerData();
  }

  const shiftForm = document.getElementById('shiftForm');
  if (shiftForm) shiftForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetch('/api/shifts', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: document.getElementById('shiftEmployee').value, shift_date: document.getElementById('shiftDate').value, start_time: document.getElementById('shiftStart').value, end_time: document.getElementById('shiftEnd').value, notes: document.getElementById('shiftNotes').value }) });
    if (!response.ok) { const data = await response.json(); alert(data.message || 'Unable to publish shift.'); return; }
    shiftForm.reset(); renderManagerData();
  });

  if (userName) {
    bindPageNavigation();
    initializeDashboardPage();
  }
});

function formatMinutes(value) {
  if (value === null || value === undefined) return '—';
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, '0')}m`;
}

function makeTable(headers, rows) {
  if (!rows.length) return '<p class="empty-state">Nothing to show yet.</p>';
  return `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

async function reviewCorrection(id, status) {
  const response = await fetch(`/api/attendance/corrections/${id}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  if (!response.ok) { const data = await response.json(); alert(data.message || 'Unable to review request.'); return; }
  if (typeof renderManagerData === 'function') renderManagerData();
}

async function handleLogin(event) {
  event.preventDefault();
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorBox = document.getElementById('loginError');

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorBox.textContent = 'Please enter both email and password.';
    return;
  }

  try {
    errorBox.textContent = '';
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.redirect) {
      window.location.href = data.redirect;
    } else {
      window.location.href = '/dashboard.html';
    }
  } catch (error) {
    errorBox.textContent = error.message || 'Unable to sign in. Please try again.';
  }
}

function bindPageNavigation() {
  document.querySelectorAll('.sidebar-menu a[data-page]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const page = link.dataset.page;
      if (document.getElementById('adminName')) {
        showAdminPage(page);
      } else {
        showDashboardPage(page);
      }
    });
  });
}

async function initializeDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return;

  document.getElementById('userName').textContent = `Welcome, ${user.full_name}`;
  if (['admin', 'manager'].includes(user.role)) {
    const adminLink = document.getElementById('adminMenu');
    if (adminLink) adminLink.style.display = 'block';
  }

  const attendanceStatus = document.getElementById('attendanceStatus');
  if (attendanceStatus) {
    const record = await fetch('/api/attendance/today', { credentials: 'same-origin' }).then((res) => res.ok ? res.json() : null);
    updateAttendanceStatus(record, attendanceStatus);
  }

  renderDashboardStats();
  renderAnnouncements();
  renderProfile();
  renderLeaveHistory();
  renderAttendanceHistory();
  renderCorrections();
  renderSchedule();
  showDashboardPage('dashboard');
}

async function initializeAdminPage() {
  const user = await getCurrentUser();
  if (!user) return;

  if (!['admin', 'manager'].includes(user.role)) {
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('adminName').textContent = user.full_name || 'Administrator';

  if (user.role !== 'admin') {
    const addButton = document.querySelector('.page-header .btn-primary');
    if (addButton) addButton.style.display = 'none';
  }

  renderEmployees();
  renderLeaveRequests();
  renderAdminAnnouncements();
  renderJobPostings();
  renderJobApplications();
  renderAttendanceQrCodes();
  showAdminPage('employees');
}

async function getCurrentUser() {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' });
    if (!response.ok) {
      window.location.href = '/';
      return null;
    }
    return await response.json();
  } catch (error) {
    window.location.href = '/';
    return null;
  }
}

function showDashboardPage(page) {
  const pages = ['dashboardPage', 'profilePage', 'leavePage', 'attendancePage', 'correctionsPage', 'schedulePage', 'announcementsPage'];
  pages.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = id === `${page}Page` ? 'block' : 'none';
    }
  });

  document.querySelectorAll('.sidebar-menu a[data-page]').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === page);
  });
}

function showAdminPage(page) {
  const pageMap = {
    employees: 'employeesPage',
    'leave-mgmt': 'leaveMgmtPage',
    'announce-mgmt': 'announceMgmtPage',
    recruitment: 'recruitmentPage',
    'attendance-qr': 'attendanceQrPage'
  };

  const pageId = pageMap[page] || 'employeesPage';
  const pages = ['employeesPage', 'leaveMgmtPage', 'announceMgmtPage', 'recruitmentPage', 'attendanceQrPage'];
  pages.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = id === pageId ? 'block' : 'none';
    }
  });

  document.querySelectorAll('.sidebar-menu a[data-page]').forEach((link) => {
    const isActive = page === link.dataset.page;
    link.classList.toggle('active', isActive);
  });
}

async function renderDashboardStats() {
  try {
    const totalEmployeesEl = document.getElementById('totalEmployees');
    const pendingLeavesEl = document.getElementById('pendingLeaves');
    const todayPresentEl = document.getElementById('todayPresent');
    if (!totalEmployeesEl && !pendingLeavesEl && !todayPresentEl) {
      return;
    }

    const response = await fetch('/api/dashboard/stats', { credentials: 'same-origin' });
    if (!response.ok) return;

    const stats = await response.json();
    if (totalEmployeesEl) totalEmployeesEl.textContent = stats.totalEmployees || 0;
    if (pendingLeavesEl) pendingLeavesEl.textContent = stats.pendingLeaves || 0;
    if (todayPresentEl) todayPresentEl.textContent = stats.todayPresent || 0;
  } catch (error) {
    console.error('Unable to load dashboard stats', error);
  }
}

async function renderAnnouncements() {
  try {
    const response = await fetch('/api/announcements', { credentials: 'same-origin' });
    if (!response.ok) return;
    const items = await response.json();
    const container = document.getElementById('announcementsList');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<p>No announcements yet.</p>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="announcement-item">
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.content)}</p>
        <div class="meta">Posted by ${escapeHtml(item.posted_by_name || 'ETIFT Team')} • ${formatDate(item.created_at)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Unable to load announcements', error);
  }
}

async function renderAdminAnnouncements() {
  try {
    const response = await fetch('/api/announcements', { credentials: 'same-origin' });
    if (!response.ok) return;
    const items = await response.json();
    const container = document.getElementById('adminAnnouncements');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<p>No announcements available.</p>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="announcement-item">
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.content)}</p>
        <div class="meta">Posted by ${escapeHtml(item.posted_by_name || 'ETIFT Team')} • ${formatDate(item.created_at)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Unable to load admin announcements', error);
  }
}

async function renderJobPostings() {
  try {
    const response = await fetch('/api/job-postings', { credentials: 'same-origin' });
    if (!response.ok) return;
    const jobs = await response.json();
    const container = document.getElementById('jobPostingsList');
    const select = document.getElementById('candidateJobId');

    if (select) {
      select.innerHTML = jobs.length ? jobs.map((job) => `<option value="${job.id}">${escapeHtml(job.title)} (${escapeHtml(job.department)})</option>`).join('') : '<option value="">No roles available</option>';
      select.disabled = !jobs.length;
    }

    if (!container) return;
    if (!jobs.length) {
      container.innerHTML = '<p>No active job posts yet.</p>';
      return;
    }

    container.innerHTML = jobs.map((job) => `
      <div class="recruitment-item">
        <h4>${escapeHtml(job.title)} - ${escapeHtml(job.department)}</h4>
        <p><strong>Location:</strong> ${escapeHtml(job.location)} • <strong>Type:</strong> ${escapeHtml(job.employment_type)} • <strong>Status:</strong> <span class="status-badge status-${job.status || 'new'}">${capitalize(job.status || 'open')}</span></p>
        <p>${escapeHtml(job.description)}</p>
        <div class="action-buttons">
          <button class="btn-secondary" data-job-status-toggle="${job.id}" data-status="${job.status === 'closed' ? 'open' : 'closed'}">${job.status === 'closed' ? 'Reopen' : 'Close'}</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-job-status-toggle]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-job-status-toggle');
        const status = button.getAttribute('data-status');
        try {
          const response = await fetch(`/api/job-postings/${id}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Unable to update role status.');
          }
          renderJobPostings();
        } catch (error) {
          alert(error.message || 'Unable to update hiring status.');
        }
      });
    });
  } catch (error) {
    console.error('Unable to load job postings', error);
  }
}

async function renderJobApplications() {
  try {
    const response = await fetch('/api/job-applications', { credentials: 'same-origin' });
    if (!response.ok) return;
    const applications = await response.json();
    const container = document.getElementById('candidateList');
    if (!container) return;

    if (!applications.length) {
      container.innerHTML = '<p>No candidates recorded yet.</p>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Role</th>
            <th>Experience</th>
            <th>Summary</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${applications.map((application) => `
            <tr>
              <td>${escapeHtml(application.applicant_name || 'N/A')}<br><small>${escapeHtml(application.email || 'N/A')}</small></td>
              <td>${escapeHtml(application.job_title || 'N/A')}</td>
              <td>${escapeHtml(application.experience || 'N/A')}</td>
              <td>${escapeHtml(application.summary || '—')}</td>
              <td><span class="status-badge status-${application.status || 'new'}">${capitalize(application.status || 'new')}</span></td>
              <td>
                <select data-candidate-status-select="${application.id}">
                  <option value="new" ${application.status === 'new' ? 'selected' : ''}>New</option>
                  <option value="screening" ${application.status === 'screening' ? 'selected' : ''}>Screening</option>
                  <option value="interview" ${application.status === 'interview' ? 'selected' : ''}>Interview</option>
                  <option value="offer" ${application.status === 'offer' ? 'selected' : ''}>Offer</option>
                  <option value="hired" ${application.status === 'hired' ? 'selected' : ''}>Hired</option>
                  <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('[data-candidate-status-select]').forEach((select) => {
      select.addEventListener('change', async (event) => {
        const id = event.target.getAttribute('data-candidate-status-select');
        const status = event.target.value;
        try {
          const response = await fetch(`/api/job-applications/${id}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Unable to update candidate status.');
          }
          renderJobApplications();
        } catch (error) {
          alert(error.message || 'Candidate status could not be updated.');
        }
      });
    });
  } catch (error) {
    console.error('Unable to load job applications', error);
  }
}

const jobPostingForm = document.getElementById('jobPostingForm');
if (jobPostingForm) {
  jobPostingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      title: document.getElementById('jobTitle').value.trim(),
      department: document.getElementById('jobDepartment').value.trim(),
      location: document.getElementById('jobLocation').value.trim(),
      employment_type: document.getElementById('jobEmploymentType').value,
      description: document.getElementById('jobDescription').value.trim()
    };

    if (!payload.title || !payload.department || !payload.location || !payload.description) {
      alert('Please complete all job posting details.');
      return;
    }

    try {
      const response = await fetch('/api/job-postings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create job posting.');

      jobPostingForm.reset();
      renderJobPostings();
      alert('Job posting published successfully.');
    } catch (error) {
      alert(error.message || 'Job posting could not be created.');
    }
  });
}

const candidateForm = document.getElementById('candidateForm');
if (candidateForm) {
  candidateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      job_id: document.getElementById('candidateJobId').value,
      applicant_name: document.getElementById('candidateName').value.trim(),
      email: document.getElementById('candidateEmail').value.trim(),
      phone: document.getElementById('candidatePhone').value.trim(),
      experience: document.getElementById('candidateExperience').value.trim(),
      summary: document.getElementById('candidateSummary').value.trim(),
      status: document.getElementById('candidateStatus').value
    };

    if (!payload.job_id || !payload.applicant_name || !payload.email || !payload.experience || !payload.summary) {
      alert('Please complete candidate details before saving.');
      return;
    }

    try {
      const response = await fetch('/api/job-applications', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save candidate.');

      candidateForm.reset();
      renderJobApplications();
      alert('Candidate saved successfully.');
    } catch (error) {
      alert(error.message || 'Candidate could not be saved.');
    }
  });
}

async function renderAttendanceQrCodes() {
  const checkInElement = document.getElementById('checkInQrCode');
  const checkOutElement = document.getElementById('checkOutQrCode');
  if (!checkInElement && !checkOutElement) return;
  try {
    const response = await fetch('/api/attendance/qr', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unable to load today’s attendance QR.');
    const qr = await response.json();
    const makeQr = (url) => `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(url)}`;
    if (checkInElement) checkInElement.src = makeQr(qr.checkinUrl);
    if (checkOutElement) checkOutElement.src = makeQr(qr.checkoutUrl);
    document.querySelectorAll('[data-qr-date]').forEach((element) => { element.textContent = qr.date; });
  } catch (error) {
    console.error(error);
  }
}

async function renderProfile() {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' });
    if (!response.ok) return;
    const user = await response.json();
    const container = document.getElementById('profileInfo');
    if (!container) return;

    container.innerHTML = `
      <p><strong>Employee ID:</strong> <span>${escapeHtml(user.employee_id || 'N/A')}</span></p>
      <p><strong>Full Name:</strong> <span>${escapeHtml(user.full_name || 'N/A')}</span></p>
      <p><strong>Email:</strong> <span>${escapeHtml(user.email || 'N/A')}</span></p>
      <p><strong>Department:</strong> <span>${escapeHtml(user.department || 'N/A')}</span></p>
      <p><strong>Position:</strong> <span>${escapeHtml(user.position || 'N/A')}</span></p>
      <p><strong>Role:</strong> <span>${escapeHtml(user.role || 'employee')}</span></p>
      <p><strong>Phone:</strong> <span>${escapeHtml(user.phone || 'N/A')}</span></p>
      <p><strong>Hire Date:</strong> <span>${formatDate(user.hire_date)}</span></p>
    `;
  } catch (error) {
    console.error('Unable to load profile', error);
  }
}

async function renderLeaveHistory() {
  try {
    const response = await fetch('/api/leave-requests', { credentials: 'same-origin' });
    if (!response.ok) return;
    const requests = await response.json();
    const container = document.getElementById('leaveHistory');
    if (!container) return;

    if (!requests.length) {
      container.innerHTML = '<p>No leave requests yet.</p>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Reason</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map((request) => `
            <tr>
              <td>${escapeHtml(request.leave_type || 'N/A')}</td>
              <td>${formatDate(request.start_date)} to ${formatDate(request.end_date)}</td>
              <td>${escapeHtml(request.reason || '—')}</td>
              <td><span class="status-badge status-${request.status || 'pending'}">${capitalize(request.status || 'pending')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Unable to load leave requests', error);
  }
}

async function renderAttendanceHistory() {
  try {
    const response = await fetch('/api/attendance/history', { credentials: 'same-origin' });
    if (!response.ok) return;
    const records = await response.json();
    const container = document.getElementById('attendanceHistory');
    if (!container) return;

    if (!records.length) {
      container.innerHTML = '<p>No attendance records yet.</p>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Worked</th>
            <th>Wasted</th>
            <th>Report</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((record) => `
            <tr>
              <td>${formatDate(record.date)}</td>
              <td>${record.check_in || '—'}</td>
              <td>${record.check_out || '—'}</td>
              <td>${formatMinutes(record.worked_minutes)}</td>
              <td>${formatMinutes(record.wasted_minutes)}</td>
              <td>${record.late_minutes ? `Late come (${formatMinutes(record.late_minutes)})` : record.early_out_minutes ? `Early out (${formatMinutes(record.early_out_minutes)})` : 'On time'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Unable to load attendance history', error);
  }

  async function renderCorrections() {
    const container = document.getElementById('correctionHistory');
    if (!container) return;
    const response = await fetch('/api/attendance/corrections', { credentials: 'same-origin' });
    const rows = response.ok ? await response.json() : [];
    container.innerHTML = makeTable(['Date', 'Missing scan', 'Requested time', 'Reason', 'Status'], rows.map((row) => [row.attendance_date, row.correction_type, row.requested_time || '—', escapeHtml(row.reason), capitalize(row.status)]));
  }

  async function renderSchedule() {
    const container = document.getElementById('scheduleList');
    if (!container) return;
    const response = await fetch('/api/shifts', { credentials: 'same-origin' });
    const rows = response.ok ? await response.json() : [];
    container.innerHTML = makeTable(['Date', 'Shift', 'Start', 'End', 'Break', 'Notes'], rows.map((row) => [row.shift_date, escapeHtml(row.shift_name), row.start_time, row.end_time, `${row.break_minutes} min`, escapeHtml(row.notes || '—')]));
  }

  const correctionForm = document.getElementById('correctionForm');
  if (correctionForm) correctionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetch('/api/attendance/corrections', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance_date: document.getElementById('correctionDate').value, correction_type: document.getElementById('correctionType').value, requested_time: document.getElementById('correctionTime').value, reason: document.getElementById('correctionReason').value.trim() }) });
    if (!response.ok) { const data = await response.json(); alert(data.message || 'Unable to submit correction.'); return; }
    correctionForm.reset(); renderCorrections(); alert('Correction request sent to your manager.');
  });
}

const leaveForm = document.getElementById('leaveForm');
if (leaveForm) {
  leaveForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const leaveType = document.getElementById('leaveType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const reason = document.getElementById('leaveReason').value.trim();

    if (!leaveType || !startDate || !endDate) {
      alert('Please complete the leave details.');
      return;
    }

    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: endDate, reason })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to submit leave request.');

      leaveForm.reset();
      renderLeaveHistory();
      renderDashboardStats();
      alert('Leave request submitted successfully.');
    } catch (error) {
      alert(error.message || 'Unable to submit the leave request.');
    }
  });
}

const announceForm = document.getElementById('announceForm');
if (announceForm) {
  announceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('announceTitle').value.trim();
    const content = document.getElementById('announceContent').value.trim();

    if (!title || !content) {
      alert('Please add both title and content.');
      return;
    }

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to post announcement.');

      announceForm.reset();
      renderAdminAnnouncements();
      renderAnnouncements();
      alert('Announcement posted successfully.');
    } catch (error) {
      alert(error.message || 'Announcement could not be posted.');
    }
  });
}

async function renderEmployees() {
  try {
    const response = await fetch('/api/employees', { credentials: 'same-origin' });
    if (!response.ok) return;
    const employees = await response.json();
    const container = document.getElementById('employeeList');
    if (!container) return;

    if (!employees.length) {
      container.innerHTML = '<p>No employees added yet.</p>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Position</th>
            <th>Role</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${employees.map((employee) => `
            <tr>
              <td>${escapeHtml(employee.employee_id || 'N/A')}</td>
              <td>${escapeHtml(employee.full_name || 'N/A')}</td>
              <td>${escapeHtml(employee.department || 'N/A')}</td>
              <td>${escapeHtml(employee.position || 'N/A')}</td>
              <td>${capitalize(employee.role || 'employee')}</td>
              <td>${escapeHtml(employee.email || 'N/A')}</td>
              <td>${escapeHtml(employee.phone || 'N/A')}</td>
              <td>
                <button class="btn-secondary" data-delete-id="${employee.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('[data-delete-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const employeeId = button.getAttribute('data-delete-id');
        if (!employeeId) return;
        if (!confirm('Delete this employee?')) return;

        try {
          const response = await fetch(`/api/employees/${employeeId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Unable to delete employee.');
          }
          renderEmployees();
          renderDashboardStats();
        } catch (error) {
          alert(error.message || 'Delete failed.');
        }
      });
    });
  } catch (error) {
    console.error('Unable to load employees', error);
  }
}

async function renderLeaveRequests() {
  try {
    const response = await fetch('/api/leave-requests', { credentials: 'same-origin' });
    if (!response.ok) return;
    const requests = await response.json();
    const container = document.getElementById('leaveRequestsList');
    if (!container) return;

    if (!requests.length) {
      container.innerHTML = '<p>No leave requests found.</p>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map((request) => `
            <tr>
              <td>${escapeHtml(request.full_name || 'N/A')}</td>
              <td>${escapeHtml(request.leave_type || 'N/A')}</td>
              <td>${formatDate(request.start_date)} to ${formatDate(request.end_date)}</td>
              <td>${escapeHtml(request.reason || '—')}</td>
              <td><span class="status-badge status-${request.status || 'pending'}">${capitalize(request.status || 'pending')}</span></td>
              <td>
                ${request.status === 'pending' ? `
                  <button class="btn-secondary" data-action="approve" data-id="${request.id}">Approve</button>
                  <button class="btn-secondary" data-action="reject" data-id="${request.id}">Reject</button>
                ` : '—'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-id');
        const action = button.getAttribute('data-action');
        const status = action === 'approve' ? 'approved' : 'rejected';

        try {
          const response = await fetch(`/api/leave-requests/${id}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Unable to update leave status.');
          }
          renderLeaveRequests();
          renderDashboardStats();
        } catch (error) {
          alert(error.message || 'Update failed.');
        }
      });
    });
  } catch (error) {
    console.error('Unable to load leave requests admin', error);
  }
}

const employeeForm = document.getElementById('employeeForm');
if (employeeForm) {
  employeeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      employee_id: document.getElementById('empId').value.trim(),
      full_name: document.getElementById('empName').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      password: document.getElementById('empPassword').value,
      department: document.getElementById('empDepartment').value.trim(),
      position: document.getElementById('empPosition').value.trim(),
      role: document.getElementById('empRole').value,
      phone: document.getElementById('empPhone').value.trim(),
      hire_date: document.getElementById('empHireDate').value
    };

    if (!payload.employee_id || !payload.full_name || !payload.email || !payload.password) {
      alert('Employee ID, name, email and password are required.');
      return;
    }

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to add employee.');

      employeeForm.reset();
      hideAddEmployee();
      renderEmployees();
      renderDashboardStats();
      alert('Employee added successfully.');
    } catch (error) {
      alert(error.message || 'Unable to add employee.');
    }
  });
}

window.showAddEmployee = function () {
  const form = document.getElementById('addEmployeeForm');
  if (form) form.style.display = 'block';
};

window.hideAddEmployee = function () {
  const form = document.getElementById('addEmployeeForm');
  if (form) form.style.display = 'none';
};

window.logout = function () {
  window.location.href = '/api/logout';
};

window.showPage = function (page) {
  showDashboardPage(page);
};

window.checkIn = async function () {
  try {
    const response = await fetch('/api/attendance/checkin', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to check in.');

    const attendanceStatus = document.getElementById('attendanceStatus');
    if (attendanceStatus) {
      attendanceStatus.textContent = `Checked in successfully at ${data.time}`;
    }

    renderDashboardStats();
  } catch (error) {
    alert(error.message || 'Unable to check in.');
  }
};

window.checkOut = async function () {
  try {
    const response = await fetch('/api/attendance/checkout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to check out.');

    const attendanceStatus = document.getElementById('attendanceStatus');
    if (attendanceStatus) {
      attendanceStatus.textContent = `Checked out successfully at ${data.time}`;
    }

    renderDashboardStats();
  } catch (error) {
    alert(error.message || 'Unable to check out.');
  }
};

function updateAttendanceStatus(record, element) {
  if (!element) return;

  if (!record) {
    element.textContent = 'No check-in recorded yet today.';
    element.style.background = '#fff3e0';
    element.style.color = '#e65100';
    return;
  }

  if (record.check_in && !record.check_out) {
    element.textContent = `Checked in at ${record.check_in}. Please remember to check out before leaving.`;
    element.style.background = '#e8f5e9';
    element.style.color = '#2e7d32';
    return;
  }

  if (record.check_in && record.check_out) {
    element.textContent = `Checked in at ${record.check_in} and checked out at ${record.check_out}.`;
    element.style.background = '#e3f2fd';
    element.style.color = '#1565c0';
    return;
  }

  element.textContent = 'Attendance record is ready for today.';
  element.style.background = '#f5f5f5';
  element.style.color = '#555';
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalize(value) {
  if (!value) return 'N/A';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
