import { useState, useEffect } from 'react';
import axios from 'axios';

const theme = {
  bg: '#f0f8ff', primary: '#0056b3', white: '#ffffff', text: '#003366',
  danger: '#dc3545', success: '#28a745', warning: '#ffc107',
  card: { backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 12px rgba(0, 86, 179, 0.1)', borderLeft: '5px solid #0056b3', marginBottom: '20px' },
  input: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' },
  button: { padding: '10px 20px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { backgroundColor: '#0056b3', color: 'white', padding: '10px', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #ddd' },
  sidebar: { width: '250px', backgroundColor: '#003366', color: 'white', minHeight: '100vh', padding: '20px', position: 'fixed' },
  navItem: { padding: '12px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', transition: '0.3s' },
  navItemActive: { padding: '12px', cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', backgroundColor: '#0056b3', fontWeight: 'bold' }
};

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  const [data, setData] = useState({ students: [], myStudents: [], teachers: [], classes: [], fees: [], timetable: [], notifications: [], reports: {}, assets: [], tickets: [], users: [], transcript: null });
  const [forms, setForms] = useState({ className: '', classLevel: '', notifMessage: '', notifUserId: '', feeStudentId: '', feeAmount: '', feeDesc: '', feeDate: '', feeReceipt: '', attStudentId: '', attDate: '', attStatus: 'present', resStudentId: '', resExamId: '1', resSubjectId: '1', resScore: '', regStuFirstName: '', regStuLastName: '', regStuAdmission: '', regStuClass: '', regStuUser: '', regStuPass: 'password123', regTchFirstName: '', regTchLastName: '', regTchStaffId: '', regTchUser: '', regTchPass: 'password123' });

  const api = axios.create({ baseURL: 'http://localhost:5000/api' });
  api.interceptors.request.use(config => {
    config.headers.Authorization = `Bearer ${localStorage.getItem('yibs_token')}`;
    return config;
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('yibs_user');
    if (savedUser) { setUser(JSON.parse(savedUser)); loadData(JSON.parse(savedUser)); }
  }, []);

  const loadData = async (currentUser) => {
    try {
      if (currentUser.role === 'admin') {
        const [students, teachers, classes, reports] = await Promise.all([api.get('/students'), api.get('/teachers'), api.get('/classes'), api.get('/reports/dashboard')]);
        setData(prev => ({ ...prev, students: students.data, teachers: teachers.data, classes: classes.data, reports: reports.data }));
      } else if (currentUser.role === 'teacher') {
        const [myStudents, classes] = await Promise.all([api.get('/my-students'), api.get('/classes')]);
        setData(prev => ({ ...prev, myStudents: myStudents.data, classes: classes.data }));
      } else if (currentUser.role === 'it_support') {
        const [assets, tickets, users, reports] = await Promise.all([api.get('/assets'), api.get('/tickets'), api.get('/users'), api.get('/reports/dashboard')]);
        setData(prev => ({ ...prev, assets: assets.data, tickets: tickets.data, users: users.data, reports: reports.data }));
      } else if (currentUser.role === 'student') {
        const [results, fees, timetable, notifs, transcript] = await Promise.all([
          api.get(`/results/${currentUser.profile.id}`), api.get(`/fees/${currentUser.profile.id}`),
          api.get(`/timetable/${currentUser.profile.class_id}`), api.get('/notifications'), api.get(`/transcript/${currentUser.profile.id}`)
        ]);
        setData(prev => ({ ...prev, results: results.data, fees: fees.data, timetable: timetable.data, notifications: notifs.data, transcript: transcript.data }));
      }
    } catch (err) { console.error('Data load error', err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', credentials);
      const { token, user: userData } = res.data;
      localStorage.setItem('yibs_token', token);
      localStorage.setItem('yibs_user', JSON.stringify(userData));
      setUser(userData); loadData(userData);
    } catch (err) { setError('Invalid credentials.'); }
  };

  const handleLogout = () => { localStorage.clear(); setUser(null); setActiveTab('dashboard'); };
  const handleSubmit = async (endpoint, formData, successMsg) => {
    try { await api.post(endpoint, formData); alert(successMsg); loadData(user); setForms({}); } 
    catch (err) { alert('Error saving data'); }
  };

  if (!user) {
    return (
      <div style={{ backgroundColor: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ ...theme.card, width: '100%', maxWidth: '400px', textAlign: 'center', borderTop: '5px solid #0056b3', borderLeft: 'none' }}>
          <h1 style={{ color: theme.primary }}>🏫 YIBS</h1>
          <h3 style={{ color: theme.text, marginTop: 0 }}>Yaounde International Business School</h3>
          {error && <div style={{ backgroundColor: '#f8d7da', color: theme.danger, padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <input style={theme.input} placeholder="Username" value={credentials.username} onChange={e => setCredentials({...credentials, username: e.target.value})} required />
            <input style={theme.input} type="password" placeholder="Password" value={credentials.password} onChange={e => setCredentials({...credentials, password: e.target.value})} required />
            <button type="submit" style={theme.button}>Secure Login</button>
          </form>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '15px' }}>Default Password: password123</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // --- ADMIN VIEWS (No IT Modules) ---
    if (user.role === 'admin') {
      if (activeTab === 'dashboard') return (
        <div>
          <h2 style={{ color: theme.primary }}>Administrator Dashboard</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ ...theme.card, textAlign: 'center', borderTop: '5px solid #0056b3', borderLeft: 'none' }}><h3 style={{ margin: 0, fontSize: '36px', color: theme.primary }}>{data.reports.students || 0}</h3><p>Total Students</p></div>
            <div style={{ ...theme.card, textAlign: 'center', borderTop: '5px solid #28a745', borderLeft: 'none' }}><h3 style={{ margin: 0, fontSize: '36px', color: theme.success }}>{data.reports.teachers || 0}</h3><p>Total Teachers</p></div>
            <div style={{ ...theme.card, textAlign: 'center', borderTop: '5px solid #ffc107', borderLeft: 'none' }}><h3 style={{ margin: 0, fontSize: '36px', color: '#d39e00' }}>{data.reports.revenue ? data.reports.revenue.toLocaleString() : 0} XAF</h3><p>Total Revenue</p></div>
          </div>
        </div>
      );
      if (activeTab === 'students') return (
        <div style={theme.card}>
          <h3>Register New Student</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <input style={theme.input} placeholder="First Name" value={forms.regStuFirstName} onChange={e => setForms({...forms, regStuFirstName: e.target.value})} />
            <input style={theme.input} placeholder="Last Name" value={forms.regStuLastName} onChange={e => setForms({...forms, regStuLastName: e.target.value})} />
            <input style={theme.input} placeholder="Admission No" value={forms.regStuAdmission} onChange={e => setForms({...forms, regStuAdmission: e.target.value})} />
            <select style={theme.input} value={forms.regStuClass} onChange={e => setForms({...forms, regStuClass: e.target.value})}><option value="">Select Class</option>{data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input style={theme.input} placeholder="Login Username" value={forms.regStuUser} onChange={e => setForms({...forms, regStuUser: e.target.value})} />
            <input style={theme.input} type="password" placeholder="Password" value={forms.regStuPass} onChange={e => setForms({...forms, regStuPass: e.target.value})} />
          </div>
          <button style={theme.button} onClick={() => handleSubmit('/students', { first_name: forms.regStuFirstName, last_name: forms.regStuLastName, admission_no: forms.regStuAdmission, class_id: forms.regStuClass, username: forms.regStuUser, password: forms.regStuPass }, 'Student Registered!')}>Register Student</button>
        </div>
      );
      if (activeTab === 'staff') return (
        <div style={theme.card}>
          <h3>Register New Staff</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <input style={theme.input} placeholder="First Name" value={forms.regTchFirstName} onChange={e => setForms({...forms, regTchFirstName: e.target.value})} />
            <input style={theme.input} placeholder="Last Name" value={forms.regTchLastName} onChange={e => setForms({...forms, regTchLastName: e.target.value})} />
            <input style={theme.input} placeholder="Staff ID" value={forms.regTchStaffId} onChange={e => setForms({...forms, regTchStaffId: e.target.value})} />
            <input style={theme.input} placeholder="Username" value={forms.regTchUser} onChange={e => setForms({...forms, regTchUser: e.target.value})} />
            <input style={theme.input} type="password" placeholder="Password" value={forms.regTchPass} onChange={e => setForms({...forms, regTchPass: e.target.value})} />
          </div>
          <button style={theme.button} onClick={() => handleSubmit('/teachers', { first_name: forms.regTchFirstName, last_name: forms.regTchLastName, staff_id: forms.regTchStaffId, username: forms.regTchUser, password: forms.regTchPass }, 'Staff Registered!')}>Register Staff</button>
        </div>
      );
      if (activeTab === 'fees') return (
        <div style={theme.card}><h3>Fees Management</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <input style={theme.input} placeholder="Student ID" type="number" value={forms.feeStudentId} onChange={e => setForms({...forms, feeStudentId: e.target.value})} />
            <input style={theme.input} placeholder="Amount (XAF)" type="number" value={forms.feeAmount} onChange={e => setForms({...forms, feeAmount: e.target.value})} />
            <input style={theme.input} placeholder="Description" value={forms.feeDesc} onChange={e => setForms({...forms, feeDesc: e.target.value})} />
            <input style={theme.input} type="date" value={forms.feeDate} onChange={e => setForms({...forms, feeDate: e.target.value})} />
            <input style={theme.input} placeholder="Receipt No" value={forms.feeReceipt} onChange={e => setForms({...forms, feeReceipt: e.target.value})} />
            <button style={theme.button} onClick={() => handleSubmit('/fees', { student_id: forms.feeStudentId, amount: forms.feeAmount, description: forms.feeDesc, payment_date: forms.feeDate, receipt_no: forms.feeReceipt }, 'Payment Recorded!')}>Record Payment</button>
          </div>
        </div>
      );
      if (activeTab === 'results') return (
        <div style={theme.card}><h3>Enter Results (Admin Override)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <input style={theme.input} type="number" placeholder="Student ID" value={forms.resStudentId} onChange={e => setForms({...forms, resStudentId: e.target.value})} />
            <input style={theme.input} type="number" placeholder="Exam ID" value={forms.resExamId} onChange={e => setForms({...forms, resExamId: e.target.value})} />
            <input style={theme.input} type="number" placeholder="Subject ID" value={forms.resSubjectId} onChange={e => setForms({...forms, resSubjectId: e.target.value})} />
            <input style={theme.input} type="number" placeholder="Score" value={forms.resScore} onChange={e => setForms({...forms, resScore: e.target.value})} />
            <button style={theme.button} onClick={() => handleSubmit('/results', { exam_id: forms.resExamId, student_id: forms.resStudentId, subject_id: forms.resSubjectId, score: forms.resScore }, 'Result Saved!')}>Save Mark</button>
          </div>
        </div>
      );
      if (activeTab === 'attendance') return (
        <div style={theme.card}><h3>Mark Attendance (Admin Override)</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input style={{ ...theme.input, marginBottom: 0 }} type="number" placeholder="Student ID" value={forms.attStudentId} onChange={e => setForms({...forms, attStudentId: e.target.value})} />
            <input style={{ ...theme.input, marginBottom: 0 }} type="date" value={forms.attDate} onChange={e => setForms({...forms, attDate: e.target.value})} />
            <select style={{ ...theme.input, marginBottom: 0 }} value={forms.attStatus} onChange={e => setForms({...forms, attStatus: e.target.value})}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></select>
            <button style={theme.button} onClick={() => handleSubmit('/attendance', { student_id: forms.attStudentId, date: forms.attDate, status: forms.attStatus }, 'Attendance Saved!')}>Mark</button>
          </div>
        </div>
      );
      return <div style={theme.card}><h3>Admin Overview</h3><p>Manage students, staff, classes, fees, and academic records.</p></div>;
    }

    // --- TEACHER VIEWS (Strictly their students) ---
    if (user.role === 'teacher') {
      if (activeTab === 'my_students') return (
        <div style={theme.card}>
          <h3>My Students</h3>
          <p>Students assigned to the classes you teach.</p>
          <table style={theme.table}><thead><tr><th style={theme.th}>Admission No</th><th style={theme.th}>Name</th><th style={theme.th}>Class</th></tr></thead><tbody>
            {data.myStudents.map(s => <tr key={s.id}><td style={theme.td}>{s.admission_no}</td><td style={theme.td}>{s.first_name} {s.last_name}</td><td style={theme.td}>{s.class_name}</td></tr>)}
          </tbody></table>
        </div>
      );
      if (activeTab === 'attendance') return (
        <div style={theme.card}><h3>Mark Attendance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <select style={theme.input} value={forms.attStudentId} onChange={e => setForms({...forms, attStudentId: e.target.value})}>
              <option value="">Select My Student</option>
              {data.myStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.class_name})</option>)}
            </select>
            <input style={theme.input} type="date" value={forms.attDate} onChange={e => setForms({...forms, attDate: e.target.value})} />
            <select style={theme.input} value={forms.attStatus} onChange={e => setForms({...forms, attStatus: e.target.value})}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></select>
            <button style={theme.button} onClick={() => handleSubmit('/attendance', { student_id: forms.attStudentId, date: forms.attDate, status: forms.attStatus }, 'Attendance Saved!')}>Mark Attendance</button>
          </div>
        </div>
      );
      if (activeTab === 'results') return (
        <div style={theme.card}><h3>Enter Marks</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <select style={theme.input} value={forms.resStudentId} onChange={e => setForms({...forms, resStudentId: e.target.value})}>
              <option value="">Select My Student</option>
              {data.myStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
            <input style={theme.input} type="number" placeholder="Exam ID" value={forms.resExamId} onChange={e => setForms({...forms, resExamId: e.target.value})} />
            <input style={theme.input} type="number" placeholder="Subject ID" value={forms.resSubjectId} onChange={e => setForms({...forms, resSubjectId: e.target.value})} />
            <input style={theme.input} type="number" placeholder="Score" value={forms.resScore} onChange={e => setForms({...forms, resScore: e.target.value})} />
            <button style={theme.button} onClick={() => handleSubmit('/results', { exam_id: forms.resExamId, student_id: forms.resStudentId, subject_id: forms.resSubjectId, score: forms.resScore }, 'Result Saved!')}>Save Mark</button>
          </div>
        </div>
      );
      return <div style={theme.card}><h3>Staff Profile</h3><p>Name: {user.profile.first_name} {user.profile.last_name}</p><p>Staff ID: {user.profile.staff_id}</p></div>;
    }

    // --- IT SUPPORT VIEWS (Full System Access) ---
    if (user.role === 'it_support') {
      if (activeTab === 'dashboard') return (
        <div>
          <h2 style={{ color: theme.primary }}>IT Infrastructure Dashboard</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ ...theme.card, textAlign: 'center', borderTop: '5px solid #0056b3', borderLeft: 'none' }}><h3 style={{ margin: 0, fontSize: '36px', color: theme.primary }}>{data.reports.totalAssets || 0}</h3><p>Total IT Assets</p></div>
            <div style={{ ...theme.card, textAlign: 'center', borderTop: '5px solid #28a745', borderLeft: 'none' }}><h3 style={{ margin: 0, fontSize: '36px', color: theme.success }}>{data.reports.activeAssets || 0}</h3><p>Active Devices</p></div>
            <div style={{ ...theme.card, textAlign: 'center', borderTop: '5px solid #dc3545', borderLeft: 'none' }}><h3 style={{ margin: 0, fontSize: '36px', color: theme.danger }}>{data.reports.openTickets || 0}</h3><p>Open Support Tickets</p></div>
          </div>
        </div>
      );
      if (activeTab === 'assets') return (
        <div style={theme.card}>
          <h3>IT Asset Management</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <input style={theme.input} placeholder="Asset Name" id="assetName" />
            <select style={theme.input} id="assetType"><option>Computer</option><option>Network Switch</option><option>Projector</option></select>
            <input style={theme.input} placeholder="Location" id="assetLocation" />
            <select style={theme.input} id="assetStatus"><option>Active</option><option>Maintenance</option><option>Retired</option></select>
            <input style={theme.input} type="date" id="assetMaintenance" />
            <button style={theme.button} onClick={async () => {
              await handleSubmit('/assets', { name: document.getElementById('assetName').value, type: document.getElementById('assetType').value, location: document.getElementById('assetLocation').value, status: document.getElementById('assetStatus').value, last_maintenance: document.getElementById('assetMaintenance').value }, 'Asset Added');
            }}>Add Asset</button>
          </div>
          <table style={theme.table}><thead><tr><th style={theme.th}>Name</th><th style={theme.th}>Type</th><th style={theme.th}>Location</th><th style={theme.th}>Status</th></tr></thead><tbody>
            {data.assets.map(a => <tr key={a.id}><td style={theme.td}>{a.name}</td><td style={theme.td}>{a.type}</td><td style={theme.td}>{a.location}</td><td style={{...theme.td, color: a.status === 'Active' ? theme.success : theme.danger, fontWeight: 'bold'}}>{a.status}</td></tr>)}
          </tbody></table>
        </div>
      );
      if (activeTab === 'tickets') return (
        <div style={theme.card}>
          <h3>Help Desk Tickets</h3>
          <table style={theme.table}><thead><tr><th style={theme.th}>ID</th><th style={theme.th}>Reporter</th><th style={theme.th}>Category</th><th style={theme.th}>Description</th><th style={theme.th}>Status</th><th style={theme.th}>Action</th></tr></thead><tbody>
            {data.tickets.map(t => <tr key={t.id}>
              <td style={theme.td}>#{t.id}</td><td style={theme.td}>{t.reporter}</td><td style={theme.td}>{t.category}</td><td style={theme.td}>{t.description}</td>
              <td style={{...theme.td, fontWeight: 'bold', color: t.status === 'Resolved' ? theme.success : theme.warning}}>{t.status}</td>
              <td style={theme.td}>{t.status !== 'Resolved' && <button style={{...theme.button, padding: '5px 10px', fontSize: '12px', backgroundColor: theme.success}} onClick={async () => { await api.put(`/tickets/${t.id}`, { status: 'Resolved' }); loadData(user); }}>Resolve</button>}</td>
            </tr>)}
          </tbody></table>
        </div>
      );
      if (activeTab === 'users') return (
        <div style={theme.card}>
          <h3>Master System Users (Full Access)</h3>
          <table style={theme.table}><thead><tr><th style={theme.th}>ID</th><th style={theme.th}>Username</th><th style={theme.th}>Role</th></tr></thead><tbody>
            {data.users.map(u => <tr key={u.id}><td style={theme.td}>{u.id}</td><td style={theme.td}>{u.username}</td><td style={{...theme.td, fontWeight: 'bold', color: u.role === 'admin' ? theme.danger : u.role === 'it_support' ? theme.primary : theme.text}}>{u.role.toUpperCase()}</td></tr>)}
          </tbody></table>
        </div>
      );
      return <div style={theme.card}><h3>IT Overview</h3><p>Manage infrastructure, support tickets, and system users.</p></div>;
    }

    // --- STUDENT VIEWS (Strictly their own info) ---
    if (user.role === 'student') {
      if (activeTab === 'transcript') return (
        <div style={theme.card}>
          <h3>Official Academic Transcript</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div><p><strong>Student:</strong> {user.profile.first_name} {user.profile.last_name}</p><p><strong>Admission:</strong> {user.profile.admission_no}</p></div>
            <div style={{ textAlign: 'right' }}><h2 style={{ margin: 0, color: theme.primary }}>GPA: {data.transcript?.gpa || '0.00'} / 5.00</h2><button style={{...theme.button, width: 'auto', marginTop: '10px'}} onClick={() => window.print()}>🖨️ Print</button></div>
          </div>
          <table style={theme.table}><thead><tr><th style={theme.th}>Course</th><th style={theme.th}>Credits</th><th style={theme.th}>Score</th><th style={theme.th}>Grade Point</th></tr></thead><tbody>
            {data.transcript?.transcript.map((r, i) => <tr key={i}><td style={theme.td}>{r.subject_name}</td><td style={theme.td}>{r.credits}</td><td style={theme.td}>{r.score}</td><td style={{...theme.td, fontWeight: 'bold'}}>{r.gradePoint.toFixed(1)}</td></tr>)}
          </tbody></table>
        </div>
      );
      if (activeTab === 'results') return (
        <div style={theme.card}><h3>My Results</h3>
          <table style={theme.table}><thead><tr><th style={theme.th}>Exam</th><th style={theme.th}>Subject</th><th style={theme.th}>Score</th><th style={theme.th}>Grade</th></tr></thead><tbody>
            {data.results.map((r, i) => {
              let grade = 'F', color = theme.danger;
              if (r.score >= 80) { grade = 'A'; color = theme.success; } else if (r.score >= 70) { grade = 'B'; color = theme.primary; } else if (r.score >= 60) { grade = 'C'; color = '#17a2b8'; } else if (r.score >= 50) { grade = 'D'; color = '#ffc107'; } else if (r.score >= 40) { grade = 'E'; color = '#fd7e14'; }
              return <tr key={i}><td style={theme.td}>{r.exam_name}</td><td style={theme.td}>{r.subject_name}</td><td style={theme.td}>{r.score}</td><td style={{...theme.td, fontWeight: 'bold', color}}>{grade}</td></tr>;
            })}
          </tbody></table>
        </div>
      );
      if (activeTab === 'fees') return (
        <div style={theme.card}><h3>My Fee Status</h3>
          <table style={theme.table}><thead><tr><th style={theme.th}>Date</th><th style={theme.th}>Description</th><th style={theme.th}>Amount (XAF)</th><th style={theme.th}>Receipt</th></tr></thead><tbody>
            {data.fees.map((f, i) => <tr key={i}><td style={theme.td}>{f.payment_date}</td><td style={theme.td}>{f.description}</td><td style={{...theme.td, color: theme.success, fontWeight: 'bold'}}>{f.amount.toLocaleString()}</td><td style={theme.td}>{f.receipt_no}</td></tr>)}
          </tbody></table>
        </div>
      );
      if (activeTab === 'timetable') return (
        <div style={theme.card}><h3>My Timetable</h3>
          <table style={theme.table}><thead><tr><th style={theme.th}>Day</th><th style={theme.th}>Time</th><th style={theme.th}>Subject</th><th style={theme.th}>Teacher</th></tr></thead><tbody>
            {data.timetable.map((t, i) => <tr key={i}><td style={theme.td}>{t.day}</td><td style={theme.td}>{t.start_time} - {t.end_time}</td><td style={theme.td}>{t.subject}</td><td style={theme.td}>{t.teacher}</td></tr>)}
          </tbody></table>
        </div>
      );
      if (activeTab === 'notifications') return (
        <div style={theme.card}><h3>My Notifications</h3>
          <ul>{data.notifications.map((n, i) => <li key={i} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>{n.message}</li>)}</ul>
        </div>
      );
      return <div style={theme.card}><h3>Student Profile</h3><p>Name: {user.profile.first_name} {user.profile.last_name}</p><p>Admission No: {user.profile.admission_no}</p></div>;
    }
  };

  // STRICT ROLE-BASED NAVIGATION
  const getNavItems = () => {
    if (user.role === 'admin') return ['dashboard', 'students', 'staff', 'classes', 'fees', 'results', 'attendance', 'notifications'];
    if (user.role === 'teacher') return ['profile', 'my_students', 'attendance', 'results'];
    if (user.role === 'it_support') return ['dashboard', 'assets', 'tickets', 'users'];
    return ['profile', 'transcript', 'results', 'fees', 'timetable', 'notifications']; // student
  };

  return (
    <div style={{ display: 'flex', backgroundColor: theme.bg, minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif', color: theme.text }}>
      <div style={theme.sidebar}>
        <h2 style={{ color: 'white', borderBottom: '1px solid #0056b3', paddingBottom: '15px' }}>🏫 YIBS</h2>
        <p style={{ fontSize: '12px', color: '#a0c4ff', marginBottom: '20px' }}>{user.role.toUpperCase()} PORTAL</p>
        {getNavItems().map(item => (
          <div key={item} style={activeTab === item ? theme.navItemActive : theme.navItem} onClick={() => setActiveTab(item)}>
            {item.charAt(0).toUpperCase() + item.slice(1).replace(/([A-Z])/g, ' $1')}
          </div>
        ))}
        <div style={{ marginTop: '50px' }}><button onClick={handleLogout} style={{ ...theme.button, backgroundColor: theme.danger, width: '100%' }}>Logout</button></div>
      </div>
      <div style={{ marginLeft: '250px', padding: '30px', width: '100%' }}>
        <header style={{ marginBottom: '30px', borderBottom: '2px solid #0056b3', paddingBottom: '10px' }}>
          <h1 style={{ margin: 0, color: theme.primary }}>Yaounde International Business School</h1>
          <p style={{ margin: '5px 0 0', color: '#666' }}>Welcome, {user.profile?.first_name || user.username}</p>
        </header>
        {renderContent()}
      </div>
    </div>
  );
}

export default App;