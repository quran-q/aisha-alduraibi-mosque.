/* ============================================================
   نظام جامع عائشة بنت عبدالعزيز الدريبي
   لإدارة ومتابعة الطلاب
   ============================================================ */

const STORAGE_KEY = 'quran_students';
const TEACHERS_KEY = 'quran_teachers';
const DATA_VERSION_KEY = 'quran_data_version';
const CURRENT_DATA_VERSION = '6'; 
const DELETED_STUDENTS_KEY = 'quran_deleted_students';
const PENDING_REG_KEY = 'quran_pending_registrations';
const PROCESSED_REG_KEY = 'quran_processed_registrations'; 
let pendingRegistrations = [];

const ACCOUNTS_KEY = 'quran_accounts';
const SESSION_KEY = 'quran_session';
const REMEMBER_KEY = 'quran_remember_credentials';

const DEFAULT_ACCOUNTS = [
    { username: 'admin', password: 'Admin@2024', role: 'admin', name: 'المشرف العام', teacherId: null },
    { username: 'ahmed', password: 'Ahmed@123', role: 'teacher', name: 'الشيخ أحمد', teacherId: 't1' },
    { username: 'khaled', password: 'Khaled@123', role: 'teacher', name: 'الشيخ خالد', teacherId: 't2' },
    { username: 'abdullah', password: 'Abdullah@123', role: 'teacher', name: 'الشيخ عبدالله', teacherId: 't3' }
];

function loadAccounts() {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    if (stored) { try { return JSON.parse(stored); } catch (e) { return [...DEFAULT_ACCOUNTS]; } }
    saveAccounts([...DEFAULT_ACCOUNTS]); return [...DEFAULT_ACCOUNTS];
}
function saveAccounts(accounts) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
function getAccounts() { return loadAccounts(); }

function getCurrentUser() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) { try { return JSON.parse(session); } catch (e) { return null; } }
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) { try { return JSON.parse(remembered); } catch (e) { return null; } }
    return null;
}

function isLoggedIn() { return getCurrentUser() !== null; }
function isAdmin() { const user = getCurrentUser(); return user && user.role === 'admin'; }
function isTeacher() { const user = getCurrentUser(); return user && user.role === 'teacher'; }
function isTeacherLoggedIn() { return isLoggedIn(); }

function handleLogin() {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const rememberMe = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;

    if (!username || !password) { showToast('الرجاء إدخال اسم المستخدم وكلمة المرور', 'error'); return; }

    const accounts = getAccounts();
    const account = accounts.find(a => a.username === username && a.password === password);

    if (!account) { showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error'); return; }

    const sessionData = { username: account.username, role: account.role, name: account.name, teacherId: account.teacherId };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    if (rememberMe) { localStorage.setItem(REMEMBER_KEY, JSON.stringify(sessionData)); } 
    else { localStorage.removeItem(REMEMBER_KEY); }

    closeLoginModal();
    showToast('مرحباً ' + account.name, 'success');
    updateAuthUI();

    if (account.role === 'admin') { switchTab('admin-panel'); } else { switchTab('teacher-panel'); }
}
function teacherLogin() { handleLogin(); }

function handleLogout() {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY); 
    showToast('تم تسجيل الخروج', 'success');
    switchTab('student-portal');
    updateAuthUI();
    setTimeout(() => { window.location.reload(); }, 500); 
}
function teacherLogout() { handleLogout(); }

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('show');
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
        try {
            const data = JSON.parse(remembered);
            const usernameInput = document.getElementById('loginUsername');
            const rememberCheckbox = document.getElementById('rememberMe');
            if (usernameInput) usernameInput.value = data.username || '';
            if (rememberCheckbox) rememberCheckbox.checked = true;
        } catch (e) {}
    }
}
function closeLoginModal() { const modal = document.getElementById('loginModal'); if (modal) modal.classList.remove('show'); }

function showForgotPasswordModal() { closeLoginModal(); const modal = document.getElementById('forgotPasswordModal'); if (modal) modal.classList.add('show'); }
function closeForgotPasswordModal() { const modal = document.getElementById('forgotPasswordModal'); if (modal) modal.classList.remove('show'); const input = document.getElementById('forgotUsername'); if (input) input.value = ''; }
function handleForgotPassword() {
    const username = document.getElementById('forgotUsername').value.trim();
    if (!username) { showToast('الرجاء إدخال اسم المستخدم', 'error'); return; }
    const accounts = getAccounts(); const account = accounts.find(a => a.username === username);
    if (!account) { showToast('اسم المستخدم غير موجود', 'error'); return; }
    showToast('كلمة المرور الخاصة بـ ' + account.name + ': ' + account.password, 'success');
    setTimeout(() => { closeForgotPasswordModal(); showLoginModal(); }, 5000);
}

function updateAuthUI() {
    const user = getCurrentUser(); const authArea = document.getElementById('authArea'); if (!authArea) return;
    const teacherTabBtn = document.getElementById('teacherTabBtn'); const adminTabBtn = document.getElementById('adminTabBtn');
    if (user) {
        const roleLabel = user.role === 'admin' ? 'المشرف العام' : user.name;
        authArea.innerHTML = '<span class="user-badge">' + roleLabel + '</span><button class="btn btn-logout" onclick="handleLogout()">تسجيل الخروج</button>';
        if (teacherTabBtn) teacherTabBtn.style.display = 'flex'; if (adminTabBtn) adminTabBtn.style.display = (user.role === 'admin') ? 'flex' : 'none';
    } else {
        authArea.innerHTML = '<button class="btn btn-gold" onclick="showLoginModal()">تسجيل الدخول</button>';
        if (teacherTabBtn) teacherTabBtn.style.display = 'none'; if (adminTabBtn) adminTabBtn.style.display = 'none';
    }
    if (typeof renderPendingRegistrations === 'function') renderPendingRegistrations();
}

function showAccountsModal() {
    if (!isAdmin()) { showToast('هذه الميزة للمشرف العام فقط', 'error'); return; }
    const modal = document.getElementById('accountsModal'); if (!modal) return;
    const teacherSelect = document.getElementById('newAccountTeacherId');
    if (teacherSelect) { teacherSelect.innerHTML = '<option value="">— اختر الحلقة —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join(''); }
    renderAccountsList(); modal.classList.add('show');
}
function closeAccountsModal() { const modal = document.getElementById('accountsModal'); if (modal) modal.classList.remove('show'); }

function renderAccountsList() {
    const tbody = document.getElementById('accountsListBody'); if (!tbody) return;
    const accounts = getAccounts();
    if (accounts.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);">لا يوجد حسابات</td></tr>'; return; }
    tbody.innerHTML = accounts.map((a, idx) => {
        const roleBadge = a.role === 'admin' ? '<span class="badge badge-excellent">مشرف عام</span>' : '<span class="badge badge-verygood">معلم</span>';
        const teacherName = a.teacherId ? getTeacherName(a.teacherId) : '—';
        return '<tr><td>' + (idx + 1) + '</td><td>' + a.name + '</td><td>' + a.username + '</td><td>' + roleBadge + '</td><td>' + teacherName + '</td><td class="no-print"><button class="history-action-btn history-action-edit" onclick="editAccount(' + idx + ')">تعديل</button>' + (a.role !== 'admin' ? '<button class="history-action-btn history-action-delete" onclick="deleteAccount(' + idx + ')">حذف</button>' : '') + '</td></tr>';
    }).join('');
}

function addNewAccount(event) {
    event.preventDefault();
    const name = document.getElementById('newAccountName').value.trim(); const username = document.getElementById('newAccountUsername').value.trim(); const password = document.getElementById('newAccountPassword').value.trim(); const role = document.getElementById('newAccountRole').value; const teacherId = document.getElementById('newAccountTeacherId').value;
    if (!name || !username || !password) { showToast('الرجاء تعبئة جميع الحقول', 'error'); return; }
    const accounts = getAccounts(); if (accounts.some(a => a.username === username)) { showToast('اسم المستخدم موجود مسبقاً', 'error'); return; }
    accounts.push({ username: username, password: password, role: role, name: name, teacherId: role === 'teacher' ? teacherId : null });
    saveAccounts(accounts); showToast('تم إضافة الحساب', 'success'); document.getElementById('addAccountForm').reset(); renderAccountsList();
}

function editAccount(idx) {
    const accounts = getAccounts(); const account = accounts[idx]; if (!account) return;
    const newName = prompt('الاسم:', account.name); if (newName === null) return;
    const newPassword = prompt('كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية):', ''); if (newPassword === null) return;
    account.name = newName.trim() || account.name; if (newPassword.trim()) account.password = newPassword.trim();
    saveAccounts(accounts); showToast('تم تعديل الحساب', 'success'); renderAccountsList();
}

function deleteAccount(idx) {
    const accounts = getAccounts(); const account = accounts[idx]; if (!account) return;
    if (account.role === 'admin') { showToast('لا يمكن حذف المشرف العام', 'error'); return; }
    if (!confirm('تأكيد حذف الحساب؟')) return;
    accounts.splice(idx, 1); saveAccounts(accounts); showToast('تم الحذف', 'success'); renderAccountsList();
}

function toggleAccountTeacherField() { const role = document.getElementById('newAccountRole').value; const teacherGroup = document.getElementById('newAccountTeacherGroup'); if (teacherGroup) teacherGroup.style.display = (role === 'teacher') ? 'flex' : 'none'; }

const GITHUB_OWNER = 'quran-q'; const GITHUB_REPO = 'aisha-alduraibi-mosque-'; const GITHUB_BRANCH = 'main';
const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/' + GITHUB_BRANCH + '/data.json';
const GITHUB_API_URL = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/data.json';
const TOKEN_STORAGE_KEY = 'github_sync_token'; const DEFAULT_GITHUB_TOKEN = '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';
let githubDataSha = ''; let isSyncing = false;

function getGithubToken() { return localStorage.getItem(TOKEN_STORAGE_KEY) || DEFAULT_GITHUB_TOKEN; }
function setGithubToken(token) { localStorage.setItem(TOKEN_STORAGE_KEY, token); }
function hasGithubToken() { return true; }
function showTokenModal() { document.getElementById('tokenModal').classList.add('show'); }
function closeTokenModal() { document.getElementById('tokenModal').classList.remove('show'); }
function saveTokenFromModal() { const token = document.getElementById('tokenInput').value.trim(); if (!token) return; setGithubToken(token); closeTokenModal(); document.getElementById('tokenInput').value = ''; showToast('تم الحفظ', 'success'); syncFromGithub(); }
function readTokenFromUrl() { const urlParams = new URLSearchParams(window.location.search); const tokenFromUrl = urlParams.get('token'); if (tokenFromUrl) { setGithubToken(tokenFromUrl); window.history.replaceState({}, document.title, window.location.origin + window.location.pathname); return true; } return false; }
function generateSyncLink() { return window.location.origin + window.location.pathname + '?token=' + encodeURIComponent(getGithubToken()); }
function copyRegistrationLink() { const link = window.location.origin + window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + '/register.html'; navigator.clipboard.writeText(link).then(function () { showToast('تم نسخ رابط التسجيل', 'success'); }).catch(function () { prompt('انسخ الرابط يدوياً:', link); }); }

const surahs = ['1. الفاتحة','2. البقرة','3. آل عمران','4. النساء','5. المائدة','6. الأنعام','7. الأعراف','8. الأنفال','9. التوبة','10. يونس','11. هود','12. يوسف','13. الرعد','14. إبراهيم','15. الحجر','16. النحل','17. الإسراء','18. الكهف','19. مريم','20. طه','21. الأنبياء','22. الحج','23. المؤمنون','24. النور','25. الفرقان','26. الشعراء','27. النمل','28. القصص','29. العنكبوت','30. الروم','31. لقمان','32. السجدة','33. الأحزاب','34. سبأ','35. فاطر','36. يس','37. الصافات','38. ص','39. الزمر','40. غافر','41. فصلت','42. الشورى','43. الزخرف','44. الدخان','45. الجاثية','46. الأحقاف','47. محمد','48. الفتح','49. الحجرات','50. ق','51. الذاريات','52. الطور','53. النجم','54. القمر','55. الرحمن','56. الواقعة','57. الحديد','58. المجادلة','59. الحشر','60. الممتحنة','61. الصف','62. الجمعة','63. المنافقون','64. التغابن','65. الطلاق','66. التحريم','67. الملك','68. القلم','69. الحاقة','70. المعارج','71. نوح','72. الجن','73. المزمل','74. المدثر','75. القيامة','76. الإنسان','77. المرسلات','78. النبأ','79. النازعات','80. عبس','81. التكوير','82. الانفطار','83. المطففين','84. الانشقاق','85. البروج','86. الطارق','87. الأعلى','88. الغاشية','89. الفجر','90. البلد','91. الشمس','92. الليل','93. الضحى','94. الشرح','95. التين','96. العلق','97. القدر','98. البينة','99. الزلزلة','100. العاديات','101. القارعة','102. التكاثر','103. العصر','104. الهمزة','105. الفيل','106. قريش','107. الماعون','108. الكوثر','109. الكافرون','110. النصر','111. المسد','112. الإخلاص','113. الفلق','114. الناس'];
const surahAyahCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,30,20,28,27,26,20,15,19,11,20,22,19,17,19,26,20,15,5,8,8,11,3,6,3,6,3,5,4,5,6,5,4,6,3,6];
const teachers = [{ id: 't1', name: 'الشيخ أحمد' }, { id: 't2', name: 'الشيخ خالد' }, { id: 't3', name: 'الشيخ عبدالله' }];
const mockData = [];

let students = []; let currentStudent = null; let currentTeacherFilter = ''; let currentTrackFilter = 'all'; let editingRecordIndex = -1; let editingStudentId = '';

async function loadStudents() {
    const storedStudents = localStorage.getItem(STORAGE_KEY); const storedTeachers = localStorage.getItem(TEACHERS_KEY);
    if (storedStudents) { try { students = JSON.parse(storedStudents); } catch (e) { students = [...mockData]; saveStudentsLocal(); } } else { students = [...mockData]; saveStudentsLocal(); }
    if (storedTeachers) { try { const parsedTeachers = JSON.parse(storedTeachers); if (parsedTeachers && parsedTeachers.length > 0) { teachers.length = 0; teachers.push(...parsedTeachers); } } catch (e) {} }
    const storedPending = localStorage.getItem(PENDING_REG_KEY); if (storedPending) { try { pendingRegistrations = JSON.parse(storedPending); } catch (e) { pendingRegistrations = []; } }
    refreshUI(); renderPendingRegistrations(); syncFromGithub();
}

function saveStudentsLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); localStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers)); localStorage.setItem(PENDING_REG_KEY, JSON.stringify(pendingRegistrations)); }

async function saveStudents() {
    saveStudentsLocal(); if (!hasGithubToken() || isSyncing) return;
    isSyncing = true;
    try {
        if (!githubDataSha) await fetchGithubSha();
        const dataToSave = { teachers: teachers, students: students, deletedStudents: getDeletedStudents(), pendingRegistrations: pendingRegistrations, processedRegistrations: getProcessedRegistrations() };
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataToSave, null, 2))));
        const response = await fetch(GITHUB_API_URL, { method: 'PUT', headers: { 'Authorization': 'token ' + getGithubToken(), 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'تحديث بيانات الطلاب', content: content, sha: githubDataSha, branch: GITHUB_BRANCH }) });
        if (response.ok) { const result = await response.json(); githubDataSha = result.content.sha; }
    } catch (e) {} finally { isSyncing = false; }
}

async function fetchGithubSha() { if (!hasGithubToken()) return; try { const response = await fetch(GITHUB_API_URL, { headers: { 'Authorization': 'token ' + getGithubToken(), 'Accept': 'application/vnd.github.v3+json' } }); if (response.ok) { const data = await response.json(); githubDataSha = data.sha; } } catch (e) {} }

async function syncFromGithub() {
    if (isSyncing) return;
    try {
        const response = await fetch(GITHUB_API_URL, { headers: { 'Authorization': 'token ' + getGithubToken(), 'Accept': 'application/vnd.github.v3+json' }, cache: 'no-store' });
        if (response.ok) {
            const shaData = await response.json(); githubDataSha = shaData.sha;
            let data = {}; try { const decodedBytes = Uint8Array.from(atob(shaData.content.replace(/\s/g, '')), c => c.charCodeAt(0)); data = JSON.parse(new TextDecoder().decode(decodedBytes)); } catch (err) { return; }
            const remoteStudents = (data.students && Array.isArray(data.students)) ? data.students : []; const remoteStudentIds = remoteStudents.map(s => s.id); const localDeletedIds = getDeletedStudents(); let changed = false; const mergedStudents = [];
            remoteStudents.forEach(remoteStudent => {
                if (localDeletedIds.includes(remoteStudent.id)) return; const localStudent = students.find(s => s.id === remoteStudent.id);
                if (localStudent) { const localHistoryCount = (localStudent.history || []).length; const remoteHistoryCount = (remoteStudent.history || []).length; if (localHistoryCount > remoteHistoryCount) { mergedStudents.push(localStudent); } else if (remoteHistoryCount > localHistoryCount) { mergedStudents.push(remoteStudent); changed = true; } else { mergedStudents.push(localStudent); } } else { mergedStudents.push(remoteStudent); changed = true; }
            });
            students.forEach(localStudent => { if (!remoteStudentIds.includes(localStudent.id)) { mergedStudents.push(localStudent); } });
            const remoteDeletedIds = (data.deletedStudents && Array.isArray(data.deletedStudents)) ? data.deletedStudents : [];
            if (remoteDeletedIds.length > 0) { const beforeCount = mergedStudents.length; const filtered = mergedStudents.filter(s => !remoteDeletedIds.includes(s.id)); if (filtered.length !== beforeCount) { changed = true; remoteDeletedIds.forEach(id => { if (!localDeletedIds.includes(id)) saveDeletedStudent(id); }); } mergedStudents.length = 0; mergedStudents.push(...filtered); }
            if (changed || mergedStudents.length !== students.length) { students = mergedStudents; if (data.teachers && data.teachers.length > 0) { teachers.length = 0; teachers.push(...data.teachers); } saveStudentsLocal(); refreshUI(); if (currentStudent) { const updated = students.find(s => s.id === currentStudent.id); if (updated) displayReport(updated); } }
            const remotePending = (data.pendingRegistrations && Array.isArray(data.pendingRegistrations)) ? data.pendingRegistrations : []; const remoteProcessed = (data.processedRegistrations && Array.isArray(data.processedRegistrations)) ? data.processedRegistrations : []; const localProcessedIds = getProcessedRegistrations(); let pendingChanged = false;
            remotePending.forEach(function (reg) { if (localProcessedIds.includes(reg.id) || remoteProcessed.includes(reg.id)) return; if (!pendingRegistrations.some(p => p.id === reg.id)) { pendingRegistrations.push(reg); pendingChanged = true; } });
            if (remoteProcessed.length > 0) { const before = pendingRegistrations.length; pendingRegistrations = pendingRegistrations.filter(p => !remoteProcessed.includes(p.id)); if (pendingRegistrations.length !== before) pendingChanged = true; remoteProcessed.forEach(id => saveProcessedRegistration(id)); }
            if (pendingChanged) { saveStudentsLocal(); renderPendingRegistrations(); }
            const localOnlyStudents = students.filter(s => !remoteStudentIds.includes(s.id)); const localOnlyDeleted = localDeletedIds.filter(id => !remoteDeletedIds.includes(id)); const remotePendingIds = remotePending.map(p => p.id); const localOnlyPending = pendingRegistrations.filter(p => !remotePendingIds.includes(p.id)); const localOnlyProcessed = localProcessedIds.filter(id => !remoteProcessed.includes(id));
            if (localOnlyStudents.length > 0 || localOnlyDeleted.length > 0 || localOnlyPending.length > 0 || localOnlyProcessed.length > 0) { await saveStudents(); }
        }
    } catch (e) {}
}

function saveProcessedRegistration(regId) { let processed = getProcessedRegistrations(); if (!processed.includes(regId)) { processed.push(regId); localStorage.setItem(PROCESSED_REG_KEY, JSON.stringify(processed)); } }
function getProcessedRegistrations() { try { const stored = localStorage.getItem(PROCESSED_REG_KEY); return stored ? JSON.parse(stored) : []; } catch (e) { return []; } }

function renderPendingRegistrations() {
    const tbody = document.getElementById('pendingRegsBody'); const badge = document.getElementById('adminPendingBadge'); const emptyMsg = document.getElementById('pendingRegsEmpty'); const count = pendingRegistrations.length;
    if (badge) { if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; } else { badge.style.display = 'none'; } }
    if (!tbody) return; if (count === 0) { tbody.innerHTML = ''; if (emptyMsg) emptyMsg.style.display = 'block'; return; }
    if (emptyMsg) emptyMsg.style.display = 'none';
    const sorted = [...pendingRegistrations].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    tbody.innerHTML = sorted.map(reg => {
        const submitted = formatDate((reg.submittedAt || '').split('T')[0]); const isDuplicate = students.some(s => s.nationalId === reg.nationalId);
        const trackLabel = reg.track === 'صيفي' ? '<br><span style="font-size:0.75rem;color:var(--gold);font-weight:bold;">مسار صيفي مكثف</span>' : '<br><span style="font-size:0.75rem;color:var(--gray);">مسار أساسي</span>';
        return '<tr><td>' + reg.name + trackLabel + (isDuplicate ? ' <br><span style="color:var(--red);font-size:0.75rem;">(مكرر)</span>' : '') + '</td><td style="direction:ltr;">' + reg.nationalId + '</td><td style="direction:ltr;">' + (reg.fatherPhone || '—') + '</td><td style="direction:ltr;">' + (reg.studentPhone || '—') + '</td><td>' + (reg.birthDate ? formatDate(reg.birthDate) : '—') + '</td><td>' + (reg.educationLevel || '—') + '</td><td>' + (reg.nationality || '—') + '</td><td>' + submitted + '</td><td style="white-space:nowrap;"><button class="btn btn-gold" style="padding:0.4rem 0.8rem;font-size:0.85rem;" onclick="showAcceptRegistrationModal(\'' + reg.id + '\')">قبول</button> <button class="btn btn-danger" onclick="rejectRegistration(\'' + reg.id + '\')">رفض</button></td></tr>';
    }).join('');
}

function showAcceptRegistrationModal(regId) {
    const reg = pendingRegistrations.find(p => p.id === regId); if (!reg) return;
    const modal = document.getElementById('acceptRegModal'); const body = document.getElementById('acceptRegModalBody'); if (!modal || !body) return;
    let teacherOptions = teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('');
    body.innerHTML = '<p style="margin-bottom:1rem;color:var(--gray-dark);">سيتم تسجيل <strong>' + reg.name + '</strong> بعد اختيار الحلقة.</p><div class="form-group" style="margin-bottom:1.2rem;"><label>اختر الحلقة</label><select id="acceptRegTeacherSelect">' + teacherOptions + '</select></div><div class="form-actions"><button class="btn btn-gold" style="width:100%;" onclick="confirmAcceptRegistration(\'' + reg.id + '\')">تأكيد القبول</button></div>';
    modal.classList.add('show');
}
function closeAcceptRegModal() { const modal = document.getElementById('acceptRegModal'); if (modal) modal.classList.remove('show'); }

function confirmAcceptRegistration(regId) {
    const reg = pendingRegistrations.find(p => p.id === regId); if (!reg) return;
    const teacherId = document.getElementById('acceptRegTeacherSelect') ? document.getElementById('acceptRegTeacherSelect').value : '';
    if (!teacherId) { showToast('الرجاء اختيار الحلقة', 'error'); return; }
    if (students.some(s => s.nationalId === reg.nationalId)) { if (!confirm('رقم الهوية مسجّل مسبقاً. متابعة؟')) return; }
    const newStudent = { id: 'std_' + Date.now(), name: reg.name, nationalId: reg.nationalId, teacherId: teacherId, track: reg.track || 'أساسي', status: 'active', completedJuz: [], history: [], fatherPhone: reg.fatherPhone || '', studentPhone: reg.studentPhone || '', birthDate: reg.birthDate || '', educationLevel: reg.educationLevel || '', nationality: reg.nationality || '' };
    students.push(newStudent); pendingRegistrations = pendingRegistrations.filter(p => p.id !== regId); saveProcessedRegistration(regId); saveStudents(); closeAcceptRegModal(); refreshUI(); showToast('تم قبول الطالب وتسجيله بنجاح', 'success');
}
function rejectRegistration(regId) { if (!confirm('تأكيد الرفض؟')) return; pendingRegistrations = pendingRegistrations.filter(p => p.id !== regId); saveProcessedRegistration(regId); saveStudents(); renderPendingRegistrations(); showToast('تم رفض الطلب', 'success'); }

function refreshUI() { populateTeacherSelect(); populateStudentSelect(); renderStudentsList(); renderStatsDashboard(); renderAIInsightsPanel(); renderDailySummary(); renderRiskCards(); renderSmartAlerts('teacherAlertsBody', getFilteredStudents()); }
function getTeacherName(teacherId) { const t = teachers.find(t => t.id === teacherId); return t ? t.name : '—'; }
function getSurahNumber(surahStr) { if (!surahStr) return -1; const match = surahStr.match(/^(\d+)\./); return match ? parseInt(match[1]) : -1; }
function getSurahAyahCount(surahStr) { const num = getSurahNumber(surahStr); if (num >= 1 && num <= 114) return surahAyahCounts[num - 1]; return 0; }
function updateLiveClock() { const now = new Date(); const days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']; const dayName = days[now.getDay()]; let hijriDate = '—'; try { hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { hijriDate = now.toLocaleDateString('ar-SA'); } const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); const clockEl = document.getElementById('liveClock'); if (clockEl) clockEl.innerHTML = dayName + ' · ' + hijriDate + ' · ' + time; }

function switchTab(tabId) {
    if ((tabId === 'teacher-panel' || tabId === 'admin-panel') && !isTeacherLoggedIn()) { showLoginModal(); return; }
    if (tabId === 'admin-panel' && !isAdmin()) { showToast('هذه اللوحة للمشرف العام فقط', 'error'); return; }
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active')); document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tabSection = document.getElementById(tabId); if (tabSection) tabSection.classList.add('active'); const tabBtn = document.querySelector('[data-tab="' + tabId + '"]'); if (tabBtn) tabBtn.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tabId === 'teacher-panel') { const user = getCurrentUser(); if (user && user.role === 'teacher' && user.teacherId) { currentTeacherFilter = user.teacherId; const teacherFilter = document.getElementById('teacherFilter'); if (teacherFilter) teacherFilter.value = user.teacherId; const filterCard = document.querySelector('.teacher-filter-card'); if (filterCard) filterCard.style.display = 'none'; } refreshUI(); updateHijriPreview(); populateSurahDropdowns(); populateJuzDropdown(); populateNewStudentTeacherSelect(); }
    if (tabId === 'admin-panel') { renderAdminDashboard(); }
    updateAuthUI();
}

function handleSearchKey(event) { if (event.key === 'Enter') { event.preventDefault(); handleSearch(); } }
function handleSearch() {
    const query = document.getElementById('searchInput').value.trim(); const resultsDiv = document.getElementById('searchResults');
    if (query === '') { resultsDiv.innerHTML = ''; hideReport(); return; }
    const match = students.find(s => s.name.trim() === query || s.nationalId.trim() === query);
    if (!match) { resultsDiv.innerHTML = '<div class="search-result-item" style="cursor:default;color:var(--red);">لم يتم العثور على طالب. الرجاء كتابة الاسم أو رقم الهوية بالكامل.</div>'; hideReport(); return; }
    resultsDiv.innerHTML = ''; selectStudent(match.id);
}
function selectStudent(studentId) { currentStudent = students.find(s => s.id === studentId); if (!currentStudent) return; document.getElementById('searchResults').innerHTML = ''; document.getElementById('searchInput').value = currentStudent.name; displayReport(currentStudent); }
function hideReport() { document.getElementById('reportSection').style.display = 'none'; document.getElementById('emptyState').style.display = 'block'; currentStudent = null; }

function getCompletedJuz(student) { return student.completedJuz || []; }
function calculateProgress(student) { const completed = getCompletedJuz(student); return Math.round((completed.length / 30) * 100); }
function renderJuzTracker(student) { const completed = getCompletedJuz(student); let html = ''; for (let i = 1; i <= 30; i++) { const isCompleted = completed.includes(i); html += '<div class="juz-cell ' + (isCompleted ? 'juz-completed' : '') + '">' + i + '</div>'; } return html; }

function calculateBadges(student) {
    const badges = []; const history = student.history || []; const completed = getCompletedJuz(student); const excellentCount = history.filter(h => h.evaluation === 'ممتاز').length;
    if (excellentCount >= 3) badges.push({ name: 'الحافظ المتقن', desc: '3 تقييمات ممتازة' });
    const presentCount = history.filter(h => h.attendance === 'حاضر').length; if (presentCount >= 5) badges.push({ name: 'المواظبة', desc: '5 حصص' });
    if (completed.length >= 1) badges.push({ name: 'ختم الجزء', desc: 'أكمل جزء' }); if (completed.length >= 15) badges.push({ name: 'نصف الحافظ', desc: 'نصف القرآن' }); if (completed.length >= 30) badges.push({ name: 'حافظ القرآن', desc: 'ختم القرآن' });
    return badges;
}
function renderBadges(student) { const badges = calculateBadges(student); if (badges.length === 0) return '<p class="no-badges">لا توجد أوسمة بعد</p>'; return badges.map(b => '<div class="badge-medal"><span class="badge-name">' + b.name + '</span></div>').join(''); }
function getStudentInitials(name) { const parts = name.trim().split(' '); if (parts.length >= 2) return parts[0][0] + parts[1][0]; return name.substring(0, 2); }

function displayReport(student) {
    document.getElementById('emptyState').style.display = 'none'; document.getElementById('reportSection').style.display = 'flex';
    document.getElementById('reportStudentName').textContent = student.name; document.getElementById('reportStudentId').textContent = student.nationalId; document.getElementById('reportTeacher').textContent = getTeacherName(student.teacherId);
    
    const trackBadge = (student.track === 'صيفي') ? '<span style="font-size:0.7rem; background:var(--gold); color:white; padding:2px 6px; border-radius:4px; margin-right:8px;">صيفي مكثف</span>' : '';
    const archiveBadge = (student.status === 'archived') ? '<span style="font-size:0.7rem; background:var(--gray); color:white; padding:2px 6px; border-radius:4px; margin-right:8px;">مؤرشف</span>' : '';
    document.getElementById('reportStudentName').innerHTML = student.name + trackBadge + archiveBadge;

    const sortedHistory = [...student.history].sort((a, b) => new Date(b.date) - new Date(a.date)); const latest = sortedHistory[0];
    if (latest) {
        document.getElementById('reportDate').textContent = formatDate(latest.date); document.getElementById('reportAttendance').innerHTML = getAttendanceBadge(latest.attendance);
        document.getElementById('reportMemorization').textContent = latest.memorization || '—'; document.getElementById('reportReview').textContent = latest.review || '—';
        document.getElementById('reportStopPoint').textContent = latest.stopPoint || '—'; document.getElementById('reportEvaluation').innerHTML = getEvaluationBadge(latest.evaluation); document.getElementById('reportNotes').textContent = latest.notes || '—';
    } else { document.getElementById('reportDate').textContent = 'لا يوجد سجل'; ['reportAttendance', 'reportMemorization', 'reportReview', 'reportStopPoint', 'reportEvaluation', 'reportNotes'].forEach(id => document.getElementById(id).textContent = '—'); }
    const progress = calculateProgress(student); document.getElementById('juzTracker').innerHTML = renderJuzTracker(student); document.getElementById('progressPercent').textContent = progress + '%'; document.getElementById('progressBar').style.width = progress + '%'; document.getElementById('completedJuzCount').textContent = getCompletedJuz(student).length + ' / 30 جزء'; document.getElementById('badgesContainer').innerHTML = renderBadges(student);
    updateAIEvalComment(student);
    renderHistoryTable(sortedHistory, student);
}

function renderHistoryTable(history, student) {
    const tbody = document.getElementById('historyTableBody'); if (history.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">لا يوجد سجل تاريخي</td></tr>'; return; }
    const studentId = student ? student.id : (currentStudent ? currentStudent.id : '');
    tbody.innerHTML = history.map((h) => {
        const realIndex = student ? student.history.indexOf(h) : -1;
        const actions = realIndex >= 0 ? '<td class="no-print"><button class="history-action-btn history-action-edit" onclick="editHistoryRecord(\'' + studentId + '\',' + realIndex + ')">تعديل</button><button class="history-action-btn history-action-delete" onclick="deleteHistoryRecord(\'' + studentId + '\',' + realIndex + ')">حذف</button></td>' : '<td class="no-print">—</td>';
        return '<tr><td>' + formatDate(h.date) + '</td><td>' + getAttendanceBadge(h.attendance) + '</td><td>' + (h.memorization || '—') + '</td><td>' + (h.review || '—') + '</td><td>' + (h.stopPoint || '—') + '</td><td>' + getEvaluationBadge(h.evaluation) + '</td><td>' + (h.notes || '—') + '</td>' + actions + '</tr>';
    }).join('');
}

function getAttendanceBadge(attendance) { const map = { 'حاضر': 'badge-present', 'غائب': 'badge-absent', 'غائب بعذر': 'badge-excused', 'متأخر': 'badge-late' }; return '<span class="badge ' + (map[attendance] || 'badge-present') + '">' + (attendance || '—') + '</span>'; }
function getEvaluationBadge(evaluation) { const map = { 'ممتاز': 'badge-excellent', 'جيد جداً': 'badge-verygood', 'جيد': 'badge-good', 'يحتاج تحسين': 'badge-needs' }; if (!evaluation || evaluation === '—') return '—'; return '<span class="badge ' + (map[evaluation] || 'badge-good') + '">' + evaluation + '</span>'; }
function formatDate(dateStr) { if (!dateStr || dateStr === '—') return '—'; const date = new Date(dateStr); if (isNaN(date.getTime())) return '—'; try { return date.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return date.toLocaleDateString('ar-SA'); } }
function updateHijriPreview() { const dateInput = document.getElementById('trackDate'); const preview = document.getElementById('hijriPreview'); if (!dateInput || !preview) return; preview.textContent = dateInput.value ? formatDate(dateInput.value) : '—'; }

function populateSurahDropdowns() {
    const surahOptions = '<option value="">— اختر السورة —</option>' + surahs.map(s => '<option value="' + s + '">' + s + '</option>').join('');
    const memField = document.getElementById('memorization'); const revField = document.getElementById('review');
    if (memField) { const v = memField.value; memField.innerHTML = surahOptions; memField.value = v; } if (revField) { const v = revField.value; revField.innerHTML = surahOptions; revField.value = v; }
}
function updateAyahDropdowns(surahSelectId, fromAyahId, toAyahId) {
    const surahSelect = document.getElementById(surahSelectId); const fromSelect = document.getElementById(fromAyahId); const toSelect = document.getElementById(toAyahId);
    if (!surahSelect || !fromSelect || !toSelect) return; const surah = surahSelect.value; const ayahCount = getSurahAyahCount(surah);
    if (!surah || ayahCount === 0) { fromSelect.innerHTML = '<option value="">—</option>'; toSelect.innerHTML = '<option value="">—</option>'; return; }
    let fromHtml = '<option value="">— من آية —</option>'; let toHtml = '<option value="">— إلى آية —</option>';
    for (let i = 1; i <= ayahCount; i++) { fromHtml += '<option value="' + i + '">آية ' + i + '</option>'; toHtml += '<option value="' + i + '">آية ' + i + '</option>'; }
    fromSelect.innerHTML = fromHtml; toSelect.innerHTML = toHtml; fromSelect.value = '1'; toSelect.value = String(ayahCount);
}

function predictNextMemorization(student) {
    if (!student || !student.history || student.history.length === 0) return null;
    const sortedHistory = [...student.history].sort((a, b) => new Date(b.date) - new Date(a.date)); const latest = sortedHistory[0]; const memText = latest.memorization || '';
    if (memText === '—' || !memText) { for (let i = 1; i < sortedHistory.length; i++) { const h = sortedHistory[i]; if (h.memorization && h.memorization !== '—') return predictFromMemorization(h.memorization, h.stopPoint); } return null; }
    return predictFromMemorization(memText, latest.stopPoint);
}
function predictFromMemorization(memText, stopPoint) {
    const surahMatch = memText.match(/^(\d+)\./); if (!surahMatch) return null; const surahNum = parseInt(surahMatch[1]); if (surahNum < 1 || surahNum > 114) return null;
    const surahName = surahs[surahNum - 1]; const ayahCount = surahAyahCounts[surahNum - 1]; const toAyahMatch = memText.match(/إلى آية (\d+)/); const lastAyah = toAyahMatch ? parseInt(toAyahMatch[1]) : 0;
    if (lastAyah > 0 && lastAyah < ayahCount) { const nextFrom = lastAyah + 1; const nextTo = Math.min(nextFrom + 4, ayahCount); return { surah: surahName, fromAyah: nextFrom, toAyah: nextTo, surahNum: surahNum, reason: 'المتوقع الحفظ من آية ' + nextFrom + ' إلى آية ' + nextTo }; } 
    else if (lastAyah >= ayahCount) { if (surahNum < 114) { const nextSurahName = surahs[surahNum]; const nextAyahCount = surahAyahCounts[surahNum]; const suggestTo = Math.min(5, nextAyahCount); return { surah: nextSurahName, fromAyah: 1, toAyah: suggestTo, surahNum: surahNum + 1, reason: 'المتوقع البدء بـ ' + nextSurahName + ' من آية 1' }; } }
    return null;
}
function showPrediction(studentId) {
    const student = students.find(s => s.id === studentId); if (!student) return; const predDiv = document.getElementById('predictionSuggestion'); if (!predDiv) return;
    const prediction = predictNextMemorization(student); if (!prediction) { predDiv.classList.remove('show'); return; }
    predDiv.innerHTML = '<div class="pred-title">التنبؤ بالحفظ</div><div class="pred-content">' + prediction.reason + '</div><button class="pred-apply-btn" onclick="applyPrediction(\'' + prediction.surahNum + '\',' + prediction.fromAyah + ',' + prediction.toAyah + ')">تطبيق</button>'; predDiv.classList.add('show');
}
function applyPrediction(surahNum, fromAyah, toAyah) {
    const surahName = surahs[surahNum - 1]; const memSelect = document.getElementById('memorization'); const fromSelect = document.getElementById('memorizationFromAyah'); const toSelect = document.getElementById('memorizationToAyah');
    if (memSelect) memSelect.value = surahName; updateAyahDropdowns('memorization', 'memorizationFromAyah', 'memorizationToAyah');
    if (fromSelect) fromSelect.value = String(fromAyah); if (toSelect) toSelect.value = String(toAyah); showToast('تم تطبيق الاقتراح', 'success');
}

function populateJuzDropdown() { const select = document.getElementById('completedJuzSelect'); if (!select) return; let html = '<option value="">— اختر الجزء —</option>'; for (let i = 1; i <= 30; i++) html += '<option value="' + i + '">الجزء ' + i + '</option>'; select.innerHTML = html; }
function populateTeacherSelect() { const select = document.getElementById('teacherFilter'); if (!select) return; select.innerHTML = '<option value="">— كل المعلمين —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join(''); }
function filterByTrack() { const select = document.getElementById('trackFilter'); currentTrackFilter = select ? select.value : 'all'; refreshUI(); }
function filterByTeacher() { currentTeacherFilter = document.getElementById('teacherFilter').value; refreshUI(); }

function getFilteredStudents() {
    let filtered = students.filter(s => s.status !== 'archived');
    if (currentTeacherFilter) filtered = filtered.filter(s => s.teacherId === currentTeacherFilter);
    if (currentTrackFilter !== 'all') filtered = filtered.filter(s => (s.track || 'أساسي') === currentTrackFilter);
    return filtered;
}

function populateStudentSelect() {
    const select = document.getElementById('studentSelect'); if (!select) return; const filtered = getFilteredStudents();
    select.innerHTML = '<option value="">— اختر الطالب —</option>' + filtered.map(s => '<option value="' + s.id + '">' + s.name + ' - ' + s.nationalId + '</option>').join('');
}
function updateStudentJuzInfo() {
    const studentId = document.getElementById('studentSelect').value; const infoDiv = document.getElementById('studentJuzInfo');
    if (!studentId || !infoDiv) { if (infoDiv) infoDiv.innerHTML = ''; return; }
    const student = students.find(s => s.id === studentId); if (!student) { infoDiv.innerHTML = ''; return; }
    const completed = getCompletedJuz(student); const progress = calculateProgress(student);
    infoDiv.innerHTML = 'الأجزاء المكتملة: <strong>' + completed.length + ' / 30</strong> · النسبة: <strong>' + progress + '%</strong>'; showPrediction(studentId);
}

function renderStatsDashboard() {
    const filtered = getFilteredStudents(); const totalStudents = filtered.length; const today = new Date().toISOString().split('T')[0];
    let presentToday = 0; let excellentStudents = 0;
    filtered.forEach(s => {
        const sorted = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date)); const latest = sorted[0];
        if (latest && latest.date === today && (latest.attendance === 'حاضر' || latest.attendance === 'متأخر')) presentToday++;
        if ((s.history || []).filter(h => h.evaluation === 'ممتاز').length >= 3) excellentStudents++;
    });
    const totalEl = document.getElementById('statTotalStudents'); const presentEl = document.getElementById('statPresentToday'); const excellentEl = document.getElementById('statExcellentStudents');
    if (totalEl) totalEl.textContent = totalStudents; if (presentEl) presentEl.textContent = presentToday; if (excellentEl) excellentEl.textContent = excellentStudents;
}

/* ===== التحليل الذكي وتوصيات المعلم (AI Insights) ===== */
const EVAL_SCORE = { 'ممتاز': 4, 'جيد جداً': 3, 'جيد': 2, 'يحتاج تحسين': 1 };

function computeStudentInsight(student) {
    const history = [...(student.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (history.length === 0) {
        return { type: 'no-data', label: 'بيانات غير كافية', explanation: 'لم يتم تسجيل أي متابعة لهذا الطالب بعد — سجّل أول متابعة ليبدأ التحليل.', cls: 'ai-neutral' };
    }

    const recent5 = history.slice(0, 5);
    const recent3 = history.slice(0, 3);
    const prev3 = history.slice(3, 6);

    const absentRecent = recent5.filter(h => h.attendance === 'غائب').length;
    const scoresRecent3 = recent3.map(h => EVAL_SCORE[h.evaluation]).filter(v => v !== undefined);
    const scoresPrev3 = prev3.map(h => EVAL_SCORE[h.evaluation]).filter(v => v !== undefined);
    const avgRecent = scoresRecent3.length ? scoresRecent3.reduce((a, b) => a + b, 0) / scoresRecent3.length : null;
    const avgPrev = scoresPrev3.length ? scoresPrev3.reduce((a, b) => a + b, 0) / scoresPrev3.length : null;

    let excellentStreak = 0;
    for (const h of history) { if (h.evaluation === 'ممتاز') excellentStreak++; else break; }

    const memSessionsRecent = recent3.filter(h => h.memorization && h.memorization !== '—').length;
    const reviewOnlyRecent = recent3.filter(h => (!h.memorization || h.memorization === '—') && h.review && h.review !== '—').length;

    // 1) غياب متكرر → متابعة شخصية
    if (absentRecent >= 2) {
        return { type: 'followup', label: 'يحتاج متابعة شخصية', explanation: 'غياب ' + absentRecent + ' مرات من آخر ' + recent5.length + ' حصص — يُنصح بالتواصل مع ولي الأمر لمعرفة السبب.', cls: 'ai-critical' };
    }

    // 2) تقييمات ضعيفة → تخفيض الكمية
    if (avgRecent !== null && avgRecent <= 1.5) {
        return { type: 'decrease', label: 'تخفيض كمية الحفظ', explanation: 'متوسط التقييمات الأخيرة منخفض (' + avgRecent.toFixed(1) + ' من 4) — يُفضّل تقليل كمية الحفظ الجديد والتركيز على تثبيت ما سبق حفظه.', cls: 'ai-warning' };
    }

    // 3) تميّز مستمر + انتظام → جاهز للاختبار
    if (excellentStreak >= 3 && absentRecent === 0) {
        return { type: 'ready', label: 'جاهز للاختبار', explanation: excellentStreak + ' تقييمات ممتازة متتالية مع انتظام في الحضور — الطالب مستعد لاختبار تثبيت أو عرض جزء كامل أمام المشرف.', cls: 'ai-excellent' };
    }

    // 4) مراجعة فقط بدون حفظ جديد
    if (reviewOnlyRecent >= 2 && memSessionsRecent === 0) {
        return { type: 'review-only', label: 'مراجعة فقط', explanation: 'آخر الحصص كانت مراجعة بدون حفظ جديد — مناسب إذا كان الهدف تثبيت المحفوظ، وإلا شجّعه على استئناف الحفظ الجديد.', cls: 'ai-info' };
    }

    // 5) تحسّن ملحوظ → زيادة الكمية
    if (avgRecent !== null && avgPrev !== null && avgRecent > avgPrev && avgRecent >= 3) {
        return { type: 'increase', label: 'زيادة كمية الحفظ', explanation: 'أداء الطالب في تحسّن مستمر (من ' + avgPrev.toFixed(1) + ' إلى ' + avgRecent.toFixed(1) + ') — يمكن زيادة كمية الحفظ اليومي تدريجياً.', cls: 'ai-excellent' };
    }

    // 6) تراجع طفيف → متابعة
    if (avgRecent !== null && avgPrev !== null && avgRecent < avgPrev) {
        return { type: 'followup', label: 'يحتاج متابعة', explanation: 'لوحظ تراجع طفيف في مستوى التقييمات مؤخراً (من ' + avgPrev.toFixed(1) + ' إلى ' + avgRecent.toFixed(1) + ') — يُفضّل متابعة الطالب عن قرب لمعرفة السبب.', cls: 'ai-warning' };
    }

    // افتراضي: أداء مستقر
    return { type: 'stable', label: 'أداء مستقر', explanation: 'أداء الطالب منتظم ومستقر — يمكن الاستمرار بنفس خطة الحفظ والمراجعة الحالية.', cls: 'ai-neutral' };
}

function renderAIInsightsPanel() {
    const container = document.getElementById('aiInsightsBody');
    const summaryEl = document.getElementById('aiInsightsSummary');
    if (!container) return;
    const filtered = getFilteredStudents();
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:1.5rem 0;">لا يوجد طلاب لعرض التحليل</p>';
        if (summaryEl) summaryEl.innerHTML = '';
        return;
    }
    const counts = {};
    const cards = filtered.map(function (s) {
        const insight = computeStudentInsight(s);
        counts[insight.type] = (counts[insight.type] || 0) + 1;
        return '<div class="ai-insight-card ' + insight.cls + '">' +
            '<div class="ai-insight-header"><span class="ai-insight-name">' + s.name + '</span>' +
            '<span class="ai-insight-badge ' + insight.cls + '">' + insight.label + '</span></div>' +
            '<p class="ai-insight-text">' + insight.explanation + '</p></div>';
    }).join('');
    container.innerHTML = cards;

    if (summaryEl) {
        const chips = [
            { key: 'increase', label: 'يحتاج زيادة', cls: 'ai-excellent' },
            { key: 'ready', label: 'جاهز للاختبار', cls: 'ai-excellent' },
            { key: 'review-only', label: 'مراجعة فقط', cls: 'ai-info' },
            { key: 'decrease', label: 'يحتاج تخفيض', cls: 'ai-warning' },
            { key: 'followup', label: 'يحتاج متابعة', cls: 'ai-critical' },
            { key: 'stable', label: 'مستقر', cls: 'ai-neutral' },
            { key: 'no-data', label: 'بلا بيانات', cls: 'ai-neutral' }
        ];
        summaryEl.innerHTML = chips.filter(c => counts[c.key] > 0).map(c => '<span class="ai-summary-chip ' + c.cls + '">' + c.label + ': ' + counts[c.key] + '</span>').join('');
    }
}

/* ===== الإنذار المبكر: كشف الطلاب المعرّضين للخطر (Feature 4) ===== */
function computeStudentRisk(student) {
    const history = [...(student.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const reasons = [];
    if (history.length === 0) return { atRisk: false, reasons: [] };
    const recent5 = history.slice(0, 5);
    const absentRecent = recent5.filter(h => h.attendance === 'غائب').length;
    if (absentRecent >= 2) reasons.push('غياب متكرر (' + absentRecent + ' من آخر ' + recent5.length + ' حصص)');
    const noMemRecent = recent5.slice(0, 3).filter(h => !h.memorization || h.memorization === '—').length;
    if (noMemRecent >= 3) reasons.push('توقف عن الحفظ الجديد في آخر 3 حصص');
    const weakEvals = recent5.filter(h => h.evaluation === 'يحتاج تحسين').length;
    if (weakEvals >= 2) reasons.push('تقييمات ضعيفة متكررة (' + weakEvals + ' من آخر ' + recent5.length + ')');
    const daysSince = Math.round((new Date() - new Date(history[0].date)) / (1000 * 60 * 60 * 24));
    if (daysSince >= 10) reasons.push('لم تُسجَّل له متابعة منذ ' + daysSince + ' يوماً');
    return { atRisk: reasons.length > 0, reasons: reasons };
}

function renderRiskCards() {
    const container = document.getElementById('riskCardsBody'); if (!container) return;
    const filtered = getFilteredStudents();
    const atRisk = filtered.map(s => ({ student: s, risk: computeStudentRisk(s) })).filter(x => x.risk.atRisk);
    if (atRisk.length === 0) { container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:1rem 0;grid-column:1/-1;">لا يوجد طلاب معرّضون للخطر حالياً</p>'; return; }
    container.innerHTML = atRisk.map(x => '<div class="ai-insight-card ai-critical"><div class="ai-insight-header"><span class="ai-insight-name">' + x.student.name + '</span></div><div class="risk-chips">' + x.risk.reasons.map(r => '<span class="risk-chip">' + r + '</span>').join('') + '</div></div>').join('');
}

/* ===== تعليقات التقييم التلقائية (Feature 3) ===== */
function generateEvaluationComment(student) {
    const history = [...(student.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (history.length === 0) return 'لا توجد بيانات كافية بعد لإصدار تقييم لهذا الطالب.';
    const recent5 = history.slice(0, 5);
    const attendanceRate = Math.round((recent5.filter(h => h.attendance === 'حاضر').length / recent5.length) * 100);
    const scores = recent5.map(h => EVAL_SCORE[h.evaluation]).filter(v => v !== undefined);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    let level = 'متوسط';
    if (avg !== null) { if (avg >= 3.5) level = 'ممتاز'; else if (avg >= 2.5) level = 'جيد جداً'; else if (avg >= 1.8) level = 'جيد'; else level = 'يحتاج تحسين'; }
    const completed = getCompletedJuz(student).length;
    let comment = 'الطالب ' + student.name + ' يحافظ على نسبة حضور ' + attendanceRate + '% خلال آخر ' + recent5.length + ' حصص، ومستوى الأداء العام ' + level + '. أنجز حتى الآن ' + completed + ' جزءاً من أصل 30. ';
    const risk = computeStudentRisk(student);
    comment += risk.atRisk ? ('يُلاحظ: ' + risk.reasons.join('، ') + '.') : 'لا توجد ملاحظات سلبية حالياً، ويُنصح بالاستمرار على نفس الوتيرة.';
    return comment;
}
function updateAIEvalComment(student) {
    const box = document.getElementById('aiEvalBox'); const textEl = document.getElementById('aiEvalCommentText'); if (!box || !textEl) return;
    textEl.textContent = generateEvaluationComment(student); box.style.display = 'block';
}
function copyAIEvalComment() {
    const textEl = document.getElementById('aiEvalCommentText'); if (!textEl) return;
    navigator.clipboard.writeText(textEl.textContent).then(() => showToast('تم نسخ التعليق', 'success')).catch(() => prompt('انسخ النص يدوياً:', textEl.textContent));
}

/* ===== الملخص اليومي الذكي ومؤشر صحة الفصل (Feature 2) ===== */
function computeClassHealthScore(list) {
    if (list.length === 0) return 0;
    let total = 0;
    list.forEach(s => {
        const history = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent5 = history.slice(0, 5);
        const attendanceRate = recent5.length ? recent5.filter(h => h.attendance === 'حاضر').length / recent5.length : 0.5;
        const scores = recent5.map(h => EVAL_SCORE[h.evaluation]).filter(v => v !== undefined);
        const avgEval = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) / 4 : 0.5;
        const riskFactor = computeStudentRisk(s).atRisk ? 0 : 1;
        total += (attendanceRate * 0.35 + avgEval * 0.45 + riskFactor * 0.2);
    });
    return Math.round((total / list.length) * 100);
}

function renderDailySummary() {
    const container = document.getElementById('dailySummaryBody'); if (!container) return;
    const filtered = getFilteredStudents();
    const scoreEl = document.getElementById('classHealthScore'); const barEl = document.getElementById('classHealthBar');
    if (filtered.length === 0) { container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:1rem 0;">لا يوجد طلاب لعرض الملخص</p>'; if (scoreEl) scoreEl.textContent = '—'; if (barEl) barEl.style.width = '0%'; return; }

    const needsAttention = []; const improving = []; const declining = []; const repeatedAbsence = []; const readyForTest = [];
    filtered.forEach(s => {
        const insight = computeStudentInsight(s); const risk = computeStudentRisk(s);
        if (risk.atRisk) needsAttention.push(s.name);
        if (insight.type === 'increase') improving.push(s.name);
        if (insight.type === 'followup' || insight.type === 'decrease') declining.push(s.name);
        const history = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (history.slice(0, 5).filter(h => h.attendance === 'غائب').length >= 2) repeatedAbsence.push(s.name);
        if (insight.type === 'ready') readyForTest.push(s.name);
    });

    const health = computeClassHealthScore(filtered);
    if (scoreEl) scoreEl.textContent = health + '%'; if (barEl) barEl.style.width = health + '%';

    function section(title, arr, cls) { if (arr.length === 0) return ''; return '<div class="daily-summary-block"><span class="ai-summary-chip ' + cls + '">' + title + ' (' + arr.length + ')</span><p class="daily-summary-names">' + arr.join('، ') + '</p></div>'; }
    const html = section('يحتاجون متابعة', needsAttention, 'ai-critical') + section('يتحسنون بسرعة', improving, 'ai-excellent') + section('أداء متراجع', declining, 'ai-warning') + section('غياب متكرر', repeatedAbsence, 'ai-critical') + section('جاهزون للاختبار', readyForTest, 'ai-excellent');
    container.innerHTML = html || '<p style="text-align:center;color:var(--gray);padding:1rem 0;">لا توجد ملاحظات خاصة اليوم — الوضع مستقر</p>';
}

/* ===== التنبيهات الذكية (Feature 7) ===== */
function computeSmartAlerts(scopeStudents) {
    const alerts = [];
    scopeStudents.forEach(s => {
        const history = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (history.length > 0) { const daysSince = Math.round((new Date() - new Date(history[0].date)) / (1000 * 60 * 60 * 24)); if (daysSince >= 10) alerts.push({ type: 'no-review', text: 'الطالب ' + s.name + ' لم تُسجَّل له متابعة منذ ' + daysSince + ' يوماً' }); }
        const recent5 = history.slice(0, 5); const absentRecent = recent5.filter(h => h.attendance === 'غائب').length;
        if (absentRecent >= 2) alerts.push({ type: 'attendance', text: 'انخفاض حضور الطالب ' + s.name + ' (' + absentRecent + ' غياب من آخر ' + recent5.length + ')' });
        const weakRecent = recent5.filter(h => h.evaluation === 'يحتاج تحسين');
        if (weakRecent.length >= 2) { const surahName = (weakRecent[0].memorization || '').split(' - ')[0]; if (surahName) alerts.push({ type: 'surah', text: 'الطالب ' + s.name + ' يواجه صعوبة متكررة في ' + surahName }); }
    });
    if (typeof pendingRegistrations !== 'undefined' && pendingRegistrations.length > 0) alerts.push({ type: 'pending', text: pendingRegistrations.length + ' طلب تسجيل جديد بانتظار مراجعة المشرف' });
    return alerts;
}
function renderSmartAlerts(containerId, scopeStudents) {
    const container = document.getElementById(containerId); if (!container) return;
    const alerts = computeSmartAlerts(scopeStudents);
    container.innerHTML = alerts.length === 0 ? '<p style="text-align:center;color:var(--gray);padding:1rem 0;">لا توجد تنبيهات حالياً</p>' : alerts.map(a => '<div class="alert-item alert-' + a.type + '">' + a.text + '</div>').join('');
}

/* ===== تحليلات المشرف: أداء الحلقات والمعلمين (Feature 5 + 6) ===== */
function computeCircleStats(teacherId) {
    const list = students.filter(s => s.teacherId === teacherId && s.status !== 'archived');
    const health = computeClassHealthScore(list);
    let totalJuz = 0; let excellentCount = 0; let atRiskCount = 0;
    list.forEach(s => { totalJuz += getCompletedJuz(s).length; if ((s.history || []).filter(h => h.evaluation === 'ممتاز').length >= 3) excellentCount++; if (computeStudentRisk(s).atRisk) atRiskCount++; });
    return { teacherId: teacherId, teacherName: getTeacherName(teacherId), studentCount: list.length, health: health, totalJuz: totalJuz, excellentCount: excellentCount, atRiskCount: atRiskCount };
}

function renderSupervisorAnalytics() {
    const rankBody = document.getElementById('teacherRankingBody'); const circlesBody = document.getElementById('circleComparisonBody'); const riskBody = document.getElementById('adminRiskBody');
    if (!rankBody && !circlesBody && !riskBody) return;
    const stats = teachers.map(t => computeCircleStats(t.id)).sort((a, b) => b.health - a.health);

    if (rankBody) {
        rankBody.innerHTML = stats.length === 0 ? '<tr><td colspan="7" style="text-align:center;">لا يوجد معلمون</td></tr>' : stats.map((c, idx) => {
            const suggestion = c.studentCount === 0 ? 'لا يوجد طلاب في هذه الحلقة بعد' : (c.health >= 80 ? 'أداء ممتاز، استمر بنفس الأسلوب' : (c.health >= 60 ? 'أداء جيد، يمكن تحسين متابعة الطلاب المتأخرين' : 'يحتاج تحسين: راجع أسباب الغياب والتقييمات الضعيفة في الحلقة'));
            return '<tr><td>' + (idx + 1) + '</td><td>' + c.teacherName + '</td><td>' + c.studentCount + '</td><td>' + c.health + '%</td><td>' + c.excellentCount + '</td><td>' + c.atRiskCount + '</td><td style="font-size:0.8rem;">' + suggestion + '</td></tr>';
        }).join('');
    }
    if (circlesBody) { circlesBody.innerHTML = stats.map(c => '<div class="circle-compare-row"><span class="circle-compare-name">' + c.teacherName + '</span><div class="circle-compare-bar-wrap"><div class="circle-compare-bar" style="width:' + c.health + '%;"></div></div><span class="circle-compare-value">' + c.health + '%</span></div>').join(''); }
    if (riskBody) {
        const allActive = students.filter(s => s.status !== 'archived');
        const atRisk = allActive.map(s => ({ student: s, risk: computeStudentRisk(s) })).filter(x => x.risk.atRisk);
        riskBody.innerHTML = atRisk.length === 0 ? '<p style="text-align:center;color:var(--gray);padding:1rem 0;grid-column:1/-1;">لا يوجد طلاب في خطر حالياً</p>' : atRisk.map(x => '<div class="ai-insight-card ai-critical"><div class="ai-insight-header"><span class="ai-insight-name">' + x.student.name + '</span><span style="font-size:0.75rem;color:var(--gray);">' + getTeacherName(x.student.teacherId) + '</span></div><div class="risk-chips">' + x.risk.reasons.map(r => '<span class="risk-chip">' + r + '</span>').join('') + '</div></div>').join('');
    }
    const bestEl = document.getElementById('bestCircleName'); if (bestEl) { const best = stats.find(c => c.studentCount > 0); bestEl.textContent = best ? (best.teacherName + ' (' + best.health + '%)') : '—'; }
}

/* ===== التقارير الأسبوعية والشهرية (Feature 8) ===== */
function computePeriodStats(days) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const activeStudents = students.filter(s => s.status !== 'archived');
    let totalSessions = 0; let presentSessions = 0; let excellentSessions = 0;
    const studentScores = [];
    activeStudents.forEach(s => {
        const periodHistory = (s.history || []).filter(h => new Date(h.date) >= cutoff);
        totalSessions += periodHistory.length; presentSessions += periodHistory.filter(h => h.attendance === 'حاضر').length; excellentSessions += periodHistory.filter(h => h.evaluation === 'ممتاز').length;
        const scores = periodHistory.map(h => EVAL_SCORE[h.evaluation]).filter(v => v !== undefined);
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        studentScores.push({ name: s.name, teacher: getTeacherName(s.teacherId), avg: avg, sessions: periodHistory.length, completedJuz: getCompletedJuz(s).length });
    });
    const bestStudents = [...studentScores].filter(s => s.avg !== null).sort((a, b) => b.avg - a.avg).slice(0, 5);
    const teacherStats = teachers.map(t => computeCircleStats(t.id)).sort((a, b) => b.health - a.health);
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
    return { totalStudents: activeStudents.length, totalSessions: totalSessions, attendanceRate: attendanceRate, excellentSessions: excellentSessions, bestStudents: bestStudents, teacherStats: teacherStats, periodDays: days };
}

function generateReport(period) {
    const days = period === 'weekly' ? 7 : 30; const stats = computePeriodStats(days);
    const title = period === 'weekly' ? 'تقرير أسبوعي' : 'تقرير شهري'; const dateStr = formatDate(new Date().toISOString().split('T')[0]);
    let html = '<div class="report-print-header"><h1>' + title + ' — جامع عائشة بنت عبدالعزيز الدريبي</h1><p>تاريخ الإصدار: ' + dateStr + ' · الفترة: آخر ' + stats.periodDays + ' يوماً</p></div>';
    html += '<div class="report-print-stats"><div><strong>' + stats.totalStudents + '</strong><span>إجمالي الطلاب</span></div><div><strong>' + stats.totalSessions + '</strong><span>عدد الحصص المسجّلة</span></div><div><strong>' + stats.attendanceRate + '%</strong><span>نسبة الحضور</span></div><div><strong>' + stats.excellentSessions + '</strong><span>تقييمات ممتازة</span></div></div>';
    html += '<h2>أفضل الطلاب</h2><table class="report-print-table"><thead><tr><th>#</th><th>الاسم</th><th>المعلم</th><th>عدد الحصص</th><th>الأجزاء المكتملة</th></tr></thead><tbody>';
    html += stats.bestStudents.length ? stats.bestStudents.map((s, i) => '<tr><td>' + (i + 1) + '</td><td>' + s.name + '</td><td>' + s.teacher + '</td><td>' + s.sessions + '</td><td>' + s.completedJuz + '</td></tr>').join('') : '<tr><td colspan="5" style="text-align:center;">لا توجد بيانات كافية</td></tr>';
    html += '</tbody></table>';
    html += '<h2>ترتيب الحلقات / المعلمين</h2><table class="report-print-table"><thead><tr><th>#</th><th>المعلم</th><th>عدد الطلاب</th><th>مؤشر الأداء</th><th>ممتازون</th></tr></thead><tbody>';
    html += stats.teacherStats.map((c, i) => '<tr><td>' + (i + 1) + '</td><td>' + c.teacherName + '</td><td>' + c.studentCount + '</td><td>' + c.health + '%</td><td>' + c.excellentCount + '</td></tr>').join('');
    html += '</tbody></table>';
    document.getElementById('reportPrintArea').innerHTML = html;
    document.body.classList.add('printing-report');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-report'), 800);
}

function showExcellentStudentsModal() {
    const filtered = getFilteredStudents(); const excellent = filtered.filter(s => { return (s.history || []).filter(h => h.evaluation === 'ممتاز').length >= 3; });
    const modalBody = document.getElementById('excellentModalBody');
    if (excellent.length === 0) { modalBody.innerHTML = '<p class="no-excellent">لا يوجد طلاب ممتازون حالياً</p>'; } 
    else {
        modalBody.innerHTML = excellent.map(s => {
            const excellentCount = (s.history || []).filter(h => h.evaluation === 'ممتاز').length; const initials = getStudentInitials(s.name);
            return '<div class="excellent-student-card"><div class="student-avatar">' + initials + '</div><div class="excellent-student-info"><div class="excellent-student-name">' + s.name + '</div><div class="excellent-student-meta">المعلم: ' + getTeacherName(s.teacherId) + ' · ' + excellentCount + ' تقييم ممتاز</div></div></div>';
        }).join('');
    }
    document.getElementById('excellentModal').classList.add('show');
}
function closeExcellentModal() { document.getElementById('excellentModal').classList.remove('show'); }

function editHistoryRecord(studentId, recordIndex) {
    const student = students.find(s => s.id === studentId); if (!student) return; const record = student.history[recordIndex]; if (!record) return;
    editingRecordIndex = recordIndex; editingStudentId = studentId; let memSurah = '', memFrom = '', memTo = '';
    if (record.memorization && record.memorization !== '—') {
        const surahMatch = record.memorization.match(/^(\d+\.\s[^-]+)/); if (surahMatch) memSurah = surahMatch[1].trim();
        const fromMatch = record.memorization.match(/من آية (\d+)/); const toMatch = record.memorization.match(/إلى آية (\d+)/);
        if (fromMatch) memFrom = fromMatch[1]; if (toMatch) memTo = toMatch[1];
    }
    let revSurah = '', revFrom = '', revTo = '';
    if (record.review && record.review !== '—') {
        const surahMatch = record.review.match(/^(\d+\.\s[^-]+)/); if (surahMatch) revSurah = surahMatch[1].trim();
        const fromMatch = record.review.match(/من آية (\d+)/); const toMatch = record.review.match(/إلى آية (\d+)/);
        if (fromMatch) revFrom = fromMatch[1]; if (toMatch) revTo = toMatch[1];
    }
    const surahOptions = '<option value="">— اختر السورة —</option>' + surahs.map(s => '<option value="' + s + '"' + (s === memSurah ? ' selected' : '') + '>' + s + '</option>').join('');
    let memFromHtml = '<option value="">—</option>'; let memToHtml = '<option value="">—</option>';
    if (memSurah) { const ayahCount = getSurahAyahCount(memSurah); for (let i = 1; i <= ayahCount; i++) { memFromHtml += '<option value="' + i + '"' + (String(i) === memFrom ? ' selected' : '') + '>آية ' + i + '</option>'; memToHtml += '<option value="' + i + '"' + (String(i) === memTo ? ' selected' : '') + '>آية ' + i + '</option>'; } }
    const revSurahOptions = '<option value="">— اختر السورة —</option>' + surahs.map(s => '<option value="' + s + '"' + (s === revSurah ? ' selected' : '') + '>' + s + '</option>').join('');
    let revFromHtml = '<option value="">—</option>'; let revToHtml = '<option value="">—</option>';
    if (revSurah) { const ayahCount = getSurahAyahCount(revSurah); for (let i = 1; i <= ayahCount; i++) { revFromHtml += '<option value="' + i + '"' + (String(i) === revFrom ? ' selected' : '') + '>آية ' + i + '</option>'; revToHtml += '<option value="' + i + '"' + (String(i) === revTo ? ' selected' : '') + '>آية ' + i + '</option>'; } }
    
    document.getElementById('editModalBody').innerHTML = '<form onsubmit="saveEditedRecord(event)" class="teacher-form"><div class="form-grid">' +
        '<div class="form-group"><label>التاريخ</label><input type="date" id="editDate" value="' + record.date + '" required></div><div class="form-group"><label>الحضور</label><select id="editAttendance">' + ['حاضر', 'غائب', 'غائب بعذر', 'متأخر'].map(a => '<option value="' + a + '"' + (a === record.attendance ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></div>' +
        '<div class="form-group"><label>الحفظ - السورة</label><select id="editMemSurah" onchange="updateEditAyahDropdowns()">' + surahOptions + '</select></div><div class="form-group"><label>من آية</label><select id="editMemFrom">' + memFromHtml + '</select></div><div class="form-group"><label>إلى آية</label><select id="editMemTo">' + memToHtml + '</select></div>' +
        '<div class="form-group"><label>المراجعة - السورة</label><select id="editRevSurah" onchange="updateEditAyahDropdowns()">' + revSurahOptions + '</select></div><div class="form-group"><label>من آية</label><select id="editRevFrom">' + revFromHtml + '</select></div><div class="form-group"><label>إلى آية</label><select id="editRevTo">' + revToHtml + '</select></div>' +
        '<div class="form-group"><label>خط الوقف</label><input type="text" id="editStopPoint" value="' + (record.stopPoint || '') + '"></div><div class="form-group"><label>التقييم</label><select id="editEvaluation">' + ['ممتاز', 'جيد جداً', 'جيد', 'يحتاج تحسين', '—'].map(e => '<option value="' + e + '"' + (e === record.evaluation ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></div>' +
        '<div class="form-group form-group-full"><label>الملاحظات</label><textarea id="editNotes" rows="3">' + (record.notes || '') + '</textarea></div>' +
        '</div><div class="form-actions"><button type="submit" class="btn btn-gold">حفظ التعديلات</button></div></form>';
    document.getElementById('editRecordModal').classList.add('show');
}

function updateEditAyahDropdowns() {
    const memSurah = document.getElementById('editMemSurah').value; const memFrom = document.getElementById('editMemFrom'); const memTo = document.getElementById('editMemTo');
    const revSurah = document.getElementById('editRevSurah').value; const revFrom = document.getElementById('editRevFrom'); const revTo = document.getElementById('editRevTo');
    [{surah: memSurah, from: memFrom, to: memTo}, {surah: revSurah, from: revFrom, to: revTo}].forEach(function(group) {
        const ayahCount = getSurahAyahCount(group.surah);
        if (!group.surah || ayahCount === 0) { group.from.innerHTML = '<option value="">—</option>'; group.to.innerHTML = '<option value="">—</option>'; } 
        else { let fromHtml = '<option value="">— من آية —</option>'; let toHtml = '<option value="">— إلى آية —</option>'; for (let i = 1; i <= ayahCount; i++) { fromHtml += '<option value="' + i + '">آية ' + i + '</option>'; toHtml += '<option value="' + i + '">آية ' + i + '</option>'; } group.from.innerHTML = fromHtml; group.to.innerHTML = toHtml; group.from.value = '1'; group.to.value = String(ayahCount); }
    });
}
function saveEditedRecord(event) {
    event.preventDefault(); const student = students.find(s => s.id === editingStudentId); if (!student || editingRecordIndex < 0) return;
    const memSurah = document.getElementById('editMemSurah').value; const memFrom = document.getElementById('editMemFrom').value; const memTo = document.getElementById('editMemTo').value;
    const revSurah = document.getElementById('editRevSurah').value; const revFrom = document.getElementById('editRevFrom').value; const revTo = document.getElementById('editRevTo').value;
    const memText = memSurah ? (memSurah + (memFrom && memTo ? ' - من آية ' + memFrom + ' إلى آية ' + memTo : '')) : '—'; const revText = revSurah ? (revSurah + (revFrom && revTo ? ' - من آية ' + revFrom + ' إلى آية ' + revTo : '')) : '—';
    student.history[editingRecordIndex] = { date: document.getElementById('editDate').value, attendance: document.getElementById('editAttendance').value, memorization: memText, review: revText, stopPoint: document.getElementById('editStopPoint').value.trim() || '—', evaluation: document.getElementById('editEvaluation').value, notes: document.getElementById('editNotes').value.trim() || '—' };
    saveStudents(); closeEditModal(); showToast('تم التعديل بنجاح', 'success'); if (currentStudent && currentStudent.id === editingStudentId) displayReport(student); refreshUI(); editingRecordIndex = -1; editingStudentId = '';
}
function closeEditModal() { document.getElementById('editRecordModal').classList.remove('show'); }
function deleteHistoryRecord(studentId, recordIndex) { const student = students.find(s => s.id === studentId); if (!student) return; if (!confirm('تأكيد الحذف؟')) return; student.history.splice(recordIndex, 1); saveStudents(); showToast('تم الحذف', 'success'); if (currentStudent && currentStudent.id === studentId) displayReport(student); refreshUI(); }

function printReport() {
    if (!currentStudent) { showToast('الرجاء البحث عن طالب', 'error'); return; }
    const sealEl = document.getElementById('printSeal');
    if (sealEl) { const now = new Date(); let hijriDate = '—'; try { hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { hijriDate = now.toLocaleDateString('ar-SA'); } sealEl.innerHTML = 'تاريخ الإصدار: ' + hijriDate + '<br>الساعة: ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }); }
    window.print();
}

function copyToWhatsApp() {
    if (!currentStudent) { showToast('الرجاء البحث عن طالب', 'error'); return; }
    const sortedHistory = [...currentStudent.history].sort((a, b) => new Date(b.date) - new Date(a.date)); const latest = sortedHistory[0]; if (!latest) { showToast('لا يوجد سجل', 'error'); return; }
    const progress = calculateProgress(currentStudent);
    let text = 'تقرير متابعة الطالب\n━━━━━━━━━━━━━━━\nالاسم: ' + currentStudent.name + '\nالمعلم: ' + getTeacherName(currentStudent.teacherId) + '\nالتاريخ: ' + formatDate(latest.date) + '\n━━━━━━━━━━━━━━━\nالحضور: ' + latest.attendance + '\nالحفظ: ' + (latest.memorization || '—') + '\nالمراجعة: ' + (latest.review || '—') + '\n━━━━━━━━━━━━━━━\nالتقدم: ' + progress + '%';
    navigator.clipboard.writeText(text).then(() => { showToast('تم نسخ التقرير للواتساب', 'success'); }).catch(() => { prompt('انسخ النص يدوياً:', text); });
}

function saveTracking(event) {
    event.preventDefault(); const studentId = document.getElementById('studentSelect').value; if (!studentId) { showToast('الرجاء اختيار طالب', 'error'); return; }
    const student = students.find(s => s.id === studentId); if (!student) return;
    const memSurah = document.getElementById('memorization').value; const memFrom = document.getElementById('memorizationFromAyah').value; const memTo = document.getElementById('memorizationToAyah').value;
    const revSurah = document.getElementById('review').value; const revFrom = document.getElementById('reviewFromAyah').value; const revTo = document.getElementById('reviewToAyah').value;
    const newJuz = document.getElementById('completedJuzSelect').value;
    const memText = memSurah ? (memSurah + (memFrom && memTo ? ' - من آية ' + memFrom + ' إلى آية ' + memTo : '')) : '—'; const revText = revSurah ? (revSurah + (revFrom && revTo ? ' - من آية ' + revFrom + ' إلى آية ' + revTo : '')) : '—';
    const newRecord = { date: document.getElementById('trackDate').value, attendance: document.getElementById('attendance').value, memorization: memText, review: revText, stopPoint: document.getElementById('stopPoint').value.trim() || '—', evaluation: document.getElementById('evaluation').value, notes: document.getElementById('notes').value.trim() || '—' };
    if (!newRecord.date) return; student.history.push(newRecord);
    if (newJuz) { const juzNum = parseInt(newJuz); if (!student.completedJuz) student.completedJuz = []; if (!student.completedJuz.includes(juzNum)) { student.completedJuz.push(juzNum); student.completedJuz.sort((a, b) => a - b); } }
    saveStudents(); document.getElementById('trackingForm').reset(); setDefaultDate(); updateHijriPreview(); populateSurahDropdowns(); populateJuzDropdown(); updateStudentJuzInfo(); showToast('تم الحفظ', 'success'); refreshUI();
}

function addStudent(event) {
    event.preventDefault(); const name = document.getElementById('newStudentName').value.trim(); const nationalId = document.getElementById('newStudentId').value.trim(); const teacherId = document.getElementById('newStudentTeacher').value; const track = document.getElementById('newStudentTrack') ? document.getElementById('newStudentTrack').value : 'أساسي';
    if (!name || !nationalId || !teacherId) return; if (students.some(s => s.nationalId === nationalId)) { showToast('موجود مسبقاً', 'error'); return; }
    const newStudent = { id: 'std_' + Date.now(), name: name, nationalId: nationalId, teacherId: teacherId, track: track, status: 'active', completedJuz: [], history: [] };
    students.push(newStudent); saveStudents(); document.getElementById('addStudentForm').reset(); showToast('تم الإضافة', 'success'); refreshUI();
}

function renderStudentsList() {
    const tbody = document.getElementById('studentsListBody'); if (!tbody) return; const filtered = getFilteredStudents();
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">لا يوجد طلاب</td></tr>'; return; }
    tbody.innerHTML = filtered.map((s, idx) => {
        const sorted = [...s.history].sort((a, b) => new Date(b.date) - new Date(a.date)); const lastDate = sorted.length > 0 ? formatDate(sorted[0].date) : '—';
        const trackBadge = (s.track === 'صيفي') ? '<span style="font-size:0.7rem; background:var(--gold); color:white; padding:2px 4px; border-radius:4px; margin-right:5px;">صيفي</span>' : '';
        const nameWithIndicators = '<div style="font-weight:700;color:var(--navy-dark);">' + s.name + trackBadge + '</div>' + renderAchievementIndicators(s);
        return '<tr><td>' + (idx + 1) + '</td><td>' + nameWithIndicators + '</td><td>' + s.nationalId + '</td><td>' + getTeacherName(s.teacherId) + '</td><td>' + getCompletedJuz(s).length + '/30</td><td>' + s.history.length + '</td><td>' + lastDate + '</td><td><button class="btn btn-danger" onclick="deleteStudent(\'' + s.id + '\')">حذف</button></td></tr>';
    }).join('');
}

function saveDeletedStudent(studentId) { let deleted = []; try { const stored = localStorage.getItem(DELETED_STUDENTS_KEY); deleted = stored ? JSON.parse(stored) : []; } catch (e) { deleted = []; } if (!deleted.includes(studentId)) { deleted.push(studentId); localStorage.setItem(DELETED_STUDENTS_KEY, JSON.stringify(deleted)); } }
function getDeletedStudents() { try { const stored = localStorage.getItem(DELETED_STUDENTS_KEY); return stored ? JSON.parse(stored) : []; } catch (e) { return []; } }
function deleteStudent(studentId) { const student = students.find(s => s.id === studentId); if (!student) return; if (!confirm('تأكيد الحذف النهائي؟')) return; students = students.filter(s => s.id !== studentId); saveDeletedStudent(studentId); saveStudents(); showToast('تم الحذف', 'success'); refreshUI(); renderArchivedStudentsTable(); }

function archiveStudent(studentId) { const student = students.find(s => s.id === studentId); if (!student) return; if (!confirm('أرشفة الطالب؟ سيختفي من قوائم المعلمين.')) return; student.status = 'archived'; saveStudents(); showToast('تمت الأرشفة', 'success'); renderAdminStudentsTable(); renderArchivedStudentsTable(); }
function restoreStudent(studentId) { const student = students.find(s => s.id === studentId); if (!student) return; if (!confirm('استعادة الطالب؟')) return; student.status = 'active'; saveStudents(); showToast('تمت الاستعادة', 'success'); renderAdminStudentsTable(); renderArchivedStudentsTable(); }
function changeStudentTrack(studentId, newTrack) { const student = students.find(s => s.id === studentId); if (!student) return; if (student.track === newTrack) return; student.track = newTrack; saveStudents(); showToast('تم التغيير', 'success'); }

function renderArchivedStudentsTable() {
    const tbody = document.getElementById('archivedStudentsBody'); if (!tbody) return; const archived = students.filter(s => s.status === 'archived');
    if (archived.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا يوجد مؤرشفين</td></tr>'; return; }
    tbody.innerHTML = archived.map((s, idx) => { return '<tr><td>' + (idx + 1) + '</td><td><div style="font-weight:700;">' + s.name + '</div></td><td>' + s.nationalId + '</td><td>' + (s.track || 'أساسي') + '</td><td>' + (s.history ? s.history.length : 0) + '</td><td style="white-space:nowrap;"><button class="btn btn-gold" style="padding:0.2rem 0.5rem;font-size:0.8rem;margin-left:4px;" onclick="restoreStudent(\'' + s.id + '\')">استعادة</button> <button class="btn btn-danger" style="padding:0.2rem 0.5rem;font-size:0.8rem;" onclick="deleteStudent(\'' + s.id + '\')">حذف</button></td></tr>'; }).join('');
}

function setDefaultDate() { const today = new Date().toISOString().split('T')[0]; const trackDate = document.getElementById('trackDate'); if (trackDate) trackDate.value = today; }
function showToast(message, type) { const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = message; toast.className = 'toast ' + (type || '') + ' show'; setTimeout(() => { toast.classList.remove('show'); }, 3500); }
function populateNewStudentTeacherSelect() { const select = document.getElementById('newStudentTeacher'); if (!select) return; const user = getCurrentUser(); if (user && user.role === 'teacher' && user.teacherId) { select.innerHTML = '<option value="' + user.teacherId + '">' + getTeacherName(user.teacherId) + '</option>'; select.value = user.teacherId; select.disabled = true; } else { select.innerHTML = '<option value="">— اختر المعلم —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join(''); select.disabled = false; } }

function renderAdminDashboard() {
    renderPendingRegistrations(); const filtered = getFilteredStudents();
    document.getElementById('adminStatTotalStudents').textContent = filtered.length; document.getElementById('adminStatTotalTeachers').textContent = teachers.length;
    renderAdminTeachersTable(); renderAdminStudentsTable(); renderArchivedStudentsTable(); populateAdminStudentFilter();
    renderSupervisorAnalytics(); renderSmartAlerts('adminAlertsBody', students.filter(s => s.status !== 'archived'));
}

function renderAdminTeachersTable() {
    const tbody = document.getElementById('adminTeachersBody'); if (!tbody) return;
    if (teachers.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا يوجد معلمون</td></tr>'; return; }
    tbody.innerHTML = teachers.map((t, idx) => {
        const circleStudents = students.filter(s => s.teacherId === t.id && s.status !== 'archived'); const canDelete = circleStudents.length === 0;
        return '<tr><td>' + (idx + 1) + '</td><td>' + t.name + '</td><td style="direction:ltr;">' + t.id + '</td><td>' + circleStudents.length + '</td><td>—</td><td><button class="history-action-btn history-action-edit" onclick="editTeacher(' + idx + ')">تعديل</button>' + (canDelete ? '<button class="history-action-btn history-action-delete" onclick="deleteTeacher(' + idx + ')">حذف</button>' : '<span style="font-size:0.8rem;color:var(--gray);">لديه طلاب</span>') + '</td></tr>';
    }).join('');
}
function addNewTeacher(event) { event.preventDefault(); const name = document.getElementById('newTeacherName').value.trim(); const id = document.getElementById('newTeacherId').value.trim(); if (!name || !id) return; if (teachers.some(t => t.id === id)) { showToast('موجود مسبقاً', 'error'); return; } teachers.push({ id: id, name: name }); saveStudentsLocal(); saveStudents(); showToast('تم', 'success'); document.getElementById('addTeacherForm').reset(); renderAdminTeachersTable(); populateAdminStudentFilter(); }
function editTeacher(idx) { const teacher = teachers[idx]; if (!teacher) return; const newName = prompt('الاسم:', teacher.name); if (!newName) return; teacher.name = newName.trim(); saveStudentsLocal(); saveStudents(); renderAdminTeachersTable(); }
function deleteTeacher(idx) { const teacher = teachers[idx]; if (!teacher) return; const circleStudents = students.filter(s => s.teacherId === teacher.id && s.status !== 'archived'); if (circleStudents.length > 0) return; if (!confirm('تأكيد؟')) return; teachers.splice(idx, 1); saveStudentsLocal(); saveStudents(); renderAdminTeachersTable(); populateAdminStudentFilter(); }
function populateAdminStudentFilter() { const select = document.getElementById('adminStudentFilter'); if (!select) return; const current = select.value; select.innerHTML = '<option value="">— كل الحلقات —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join(''); select.value = current; }

function renderAdminStudentsTable() {
    const tbody = document.getElementById('adminStudentsBody'); if (!tbody) return;
    const filterValue = document.getElementById('adminStudentFilter') ? document.getElementById('adminStudentFilter').value : '';
    let filtered = filterValue ? students.filter(s => s.teacherId === filterValue) : students;
    filtered = filtered.filter(s => s.status !== 'archived');
    if (currentTrackFilter !== 'all') filtered = filtered.filter(s => (s.track || 'أساسي') === currentTrackFilter);
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا يوجد</td></tr>'; return; }
    
    tbody.innerHTML = filtered.map((s, idx) => {
        const transferOptions = teachers.map(t => '<option value="' + t.id + '"' + (t.id === s.teacherId ? ' selected' : '') + '>' + t.name + '</option>').join('');
        const trackOptions = ['أساسي', 'صيفي'].map(opt => '<option value="' + opt + '"' + ((s.track || 'أساسي') === opt ? ' selected' : '') + '>' + opt + '</option>').join('');
        return '<tr><td>' + (idx + 1) + '</td><td>' + s.name + '</td><td>' + s.nationalId + '</td><td>' + getTeacherName(s.teacherId) + '</td><td><select onchange="changeStudentTrack(\'' + s.id + '\', this.value)" style="padding:0.3rem;border:1px solid #ccc;border-radius:4px;">' + trackOptions + '</select></td><td><select onchange="transferStudent(\'' + s.id + '\', this.value)" style="padding:0.3rem;border:1px solid #ccc;border-radius:4px;">' + transferOptions + '</select></td><td style="white-space:nowrap;"><button class="btn btn-outline" style="padding:0.2rem 0.5rem;font-size:0.8rem;" onclick="archiveStudent(\'' + s.id + '\')">أرشفة</button></td></tr>';
    }).join('');
}
function transferStudent(studentId, newTeacherId) { const student = students.find(s => s.id === studentId); if (!student) return; if (student.teacherId === newTeacherId) return; student.teacherId = newTeacherId; saveStudents(); renderAdminStudentsTable(); renderAdminTeachersTable(); }

function exportData() { const dataStr = JSON.stringify({ teachers: teachers, students: students, exportDate: new Date().toISOString() }, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }

function bulkAttendance() {
    const filtered = getFilteredStudents(); if (filtered.length === 0) return; const today = new Date().toISOString().split('T')[0];
    const alreadyMarked = filtered.filter(s => { const sorted = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date)); const latest = sorted[0]; return latest && latest.date === today && latest.attendance === 'حاضر'; });
    if (alreadyMarked.length === filtered.length) return; if (!confirm('تسجيل حضور جماعي؟')) return;
    filtered.forEach(s => { const sorted = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date)); const latest = sorted[0]; if (latest && latest.date === today && latest.attendance === 'حاضر') return; if (!s.history) s.history = []; s.history.push({ date: today, attendance: 'حاضر', memorization: '—', review: '—', stopPoint: '—', evaluation: '—', notes: 'جماعي' }); });
    saveStudents(); refreshUI();
}

function bulkCompleteJuz() {
    const studentId = document.getElementById('studentSelect').value; if (!studentId) return; const student = students.find(s => s.id === studentId); if (!student) return;
    if (!student.completedJuz) student.completedJuz = []; const nextJuz = student.completedJuz.length + 1;
    if (nextJuz > 30 || student.completedJuz.includes(nextJuz)) return; if (!confirm('إكمال الجزء ' + nextJuz + '؟')) return;
    student.completedJuz.push(nextJuz); student.completedJuz.sort((a, b) => a - b); saveStudents(); updateStudentJuzInfo(); refreshUI();
}

function bulkExcellentEval() {
    const studentId = document.getElementById('studentSelect').value; if (!studentId) return; const student = students.find(s => s.id === studentId); if (!student) return;
    const today = new Date().toISOString().split('T')[0]; const sorted = [...(student.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date)); const latest = sorted[0];
    if (latest && latest.date === today) { latest.evaluation = 'ممتاز'; } else { if (!student.history) student.history = []; student.history.push({ date: today, attendance: 'حاضر', memorization: '—', review: '—', stopPoint: '—', evaluation: 'ممتاز', notes: '' }); }
    saveStudents(); refreshUI();
}

function getStudentAchievementStats(student) {
    const history = student.history || []; const completedJuz = getCompletedJuz(student); const totalAyahsQuran = 6236; const ayahsPerJuz = Math.round(totalAyahsQuran / 30);
    let totalAyahs = 0; let memorizedSurahs = new Set(); let firstSessionAyahs = 0; let lastSessionAyahs = 0;
    history.forEach(function(h) {
        if (h.memorization && h.memorization !== '—') {
            var surahMatch = h.memorization.match(/^(\d+)\./);
            if (surahMatch) {
                var surahNum = parseInt(surahMatch[1]); memorizedSurahs.add(surahNum);
                var fromMatch = h.memorization.match(/من آية (\d+)/); var toMatch = h.memorization.match(/إلى آية (\d+)/);
                if (fromMatch && toMatch) { totalAyahs += (parseInt(toMatch[1]) - parseInt(fromMatch[1]) + 1); } else if (surahNum >= 1 && surahNum <= 114) { totalAyahs += surahAyahCounts[surahNum - 1]; }
            }
        }
    });
    var surahsCount = memorizedSurahs.size; var juzCount = completedJuz.length;
    var juzProgress = Math.round((juzCount / 30) * 100); var ayahProgress = Math.min(100, Math.round((totalAyahs / totalAyahsQuran) * 100));
    var prediction = null;
    if (history.length > 0) {
        var sortedHistory = history.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
        var firstDate = new Date(sortedHistory[0].date); var lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
        var daysDiff = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
        var ayahsPerDay = totalAyahs / daysDiff; var remainingAyahs = totalAyahsQuran - totalAyahs;
        var daysToComplete = ayahsPerDay > 0 ? Math.ceil(remainingAyahs / ayahsPerDay) : 0;
        var currentJuzPosition = totalAyahs % ayahsPerJuz; var remainingInJuz = ayahsPerJuz - currentJuzPosition;
        var daysToNextJuz = ayahsPerDay > 0 ? Math.ceil(remainingInJuz / ayahsPerDay) : 0;
        var weeklyRate = Math.round(ayahsPerDay * 7);
        firstSessionAyahs = extractAyahCount(sortedHistory[0].memorization); lastSessionAyahs = extractAyahCount(sortedHistory[sortedHistory.length - 1].memorization);
        var improvementRate = firstSessionAyahs > 0 ? Math.round(((lastSessionAyahs - firstSessionAyahs) / firstSessionAyahs) * 100) : 0;
        var completionDate = new Date(); completionDate.setDate(completionDate.getDate() + daysToComplete);
        var nextJuzDate = new Date(); nextJuzDate.setDate(nextJuzDate.getDate() + daysToNextJuz);
        prediction = { ayahsPerDay: Math.round(ayahsPerDay * 10) / 10, weeklyRate: weeklyRate, daysToNextJuz: daysToNextJuz, daysToComplete: daysToComplete, firstSessionAyahs: firstSessionAyahs, lastSessionAyahs: lastSessionAyahs, improvementRate: improvementRate, nextJuzDate: formatDate(nextJuzDate.toISOString().split('T')[0]), completionDate: formatDate(completionDate.toISOString().split('T')[0]), nextJuzNumber: juzCount + 1 };
    }
    return { ayahs: totalAyahs, ayahProgress: ayahProgress, surahs: surahsCount, juz: juzCount, juzProgress: juzProgress, prediction: prediction };
}

function extractAyahCount(memText) {
    if (!memText || memText === '—') return 0;
    var fromMatch = memText.match(/من آية (\d+)/); var toMatch = memText.match(/إلى آية (\d+)/);
    if (fromMatch && toMatch) return parseInt(toMatch[1]) - parseInt(fromMatch[1]) + 1;
    var surahMatch = memText.match(/^(\d+)\./); if (surahMatch) { var surahNum = parseInt(surahMatch[1]); if (surahNum >= 1 && surahNum <= 114) return surahAyahCounts[surahNum - 1]; }
    return 0;
}

function renderAchievementIndicators(student) {
    var stats = getStudentAchievementStats(student);
    var html = '<div class="student-achievement-indicators"><span class="achievement-chip chip-ayahs">آيات: ' + stats.ayahs + '</span><span class="achievement-chip chip-surahs">سور: ' + stats.surahs + '</span><span class="achievement-chip chip-juz">أجزاء: ' + stats.juz + '/30</span><span class="achievement-chip chip-progress"><div class="achievement-progress-bar"><div class="achievement-progress-fill" style="width:' + stats.juzProgress + '%"></div></div>' + stats.juzProgress + '%</span></div>';
    return html;
}

function checkDataVersion() {
    const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (storedVersion !== CURRENT_DATA_VERSION) { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(TEACHERS_KEY); localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION); }
}

document.addEventListener('DOMContentLoaded', () => {
    readTokenFromUrl(); checkDataVersion(); loadStudents(); setDefaultDate(); updateHijriPreview(); populateSurahDropdowns(); populateJuzDropdown();
    document.getElementById('emptyState').style.display = 'block'; updateLiveClock(); setInterval(updateLiveClock, 1000); setInterval(syncFromGithub, 10000); updateAuthUI();
});
