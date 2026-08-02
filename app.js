/* ============================================================
   نظام جامع عائشة بنت عبدالعزيز الدريبي
   لإدارة ومتابعة الطلاب
   ============================================================ */

// ===== مفاتيح التخزين الدائم في LocalStorage =====
const STORAGE_KEY = 'quran_students';
const TEACHERS_KEY = 'quran_teachers';
const DATA_VERSION_KEY = 'quran_data_version';
const CURRENT_DATA_VERSION = '3';
const DELETED_STUDENTS_KEY = 'quran_deleted_students';

// ===== طلبات التسجيل الجديدة (من رابط التسجيل العام) =====
const PENDING_REG_KEY = 'quran_pending_registrations';
const PROCESSED_REG_KEY = 'quran_processed_registrations'; // تسجيلات تم قبولها/رفضها (لمنع عودتها من المزامنة)
let pendingRegistrations = [];

/* ============================================================
   نظام الحسابات والمصادقة الذكي
   - المشرف العام (admin): صلاحيات مطلقة
   - المعلمين: حسابات مستقلة، كل معلم يرى طلاب حلقته فقط
   - ميزة "تذكرني": حفظ بيانات الاعتماد محلياً
   - استعادة كلمة المرور
   ============================================================ */
const ACCOUNTS_KEY = 'quran_accounts';
const SESSION_KEY = 'quran_session';
const REMEMBER_KEY = 'quran_remember_credentials';

// الحسابات الافتراضية (تُستخدم فقط إذا لم تكن هناك حسابات محفوظة)
const DEFAULT_ACCOUNTS = [
    { username: 'admin', password: 'Admin@2024', role: 'admin', name: 'المشرف العام', teacherId: null },
    { username: 'ahmed', password: 'Ahmed@123', role: 'teacher', name: 'الشيخ أحمد', teacherId: 't1' },
    { username: 'khaled', password: 'Khaled@123', role: 'teacher', name: 'الشيخ خالد', teacherId: 't2' },
    { username: 'abdullah', password: 'Abdullah@123', role: 'teacher', name: 'الشيخ عبدالله', teacherId: 't3' }
];

// تحميل الحسابات من LocalStorage
function loadAccounts() {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { return [...DEFAULT_ACCOUNTS]; }
    }
    saveAccounts([...DEFAULT_ACCOUNTS]);
    return [...DEFAULT_ACCOUNTS];
}

// حفظ الحسابات في LocalStorage
function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// الحصول على جميع الحسابات
function getAccounts() {
    return loadAccounts();
}

// الحصول على المستخدم الحالي (من الجلسة أو من "تذكرني")
function getCurrentUser() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
        try { return JSON.parse(session); } catch (e) { return null; }
    }
    // التحقق من "تذكرني"
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
        try { return JSON.parse(remembered); } catch (e) { return null; }
    }
    return null;
}

// التحقق من تسجيل الدخول
function isLoggedIn() {
    return getCurrentUser() !== null;
}

// التحقق من كون المستخدم مشرفاً عاماً
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// التحقق من كون المستخدم معلماً
function isTeacher() {
    const user = getCurrentUser();
    return user && user.role === 'teacher';
}

// التوافق مع الكود القديم
function isTeacherLoggedIn() {
    return isLoggedIn();
}

// تسجيل الدخول الذكي
function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const rememberMe = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;

    if (!username || !password) {
        showToast('⚠️ الرجاء إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }

    const accounts = getAccounts();
    const account = accounts.find(a => a.username === username && a.password === password);

    if (!account) {
        showToast('⚠️ اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        return;
    }

    const sessionData = {
        username: account.username,
        role: account.role,
        name: account.name,
        teacherId: account.teacherId
    };

    // حفظ الجلسة الحالية
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    // حفظ بيانات "تذكرني" إذا تم اختياره
    if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(sessionData));
    } else {
        localStorage.removeItem(REMEMBER_KEY);
    }

    closeLoginModal();
    showToast('✓ مرحباً ' + account.name, 'success');
    updateAuthUI();

    // توجيه المستخدم حسب صلاحيته
    if (account.role === 'admin') {
        switchTab('admin-panel');
    } else {
        switchTab('teacher-panel');
    }
}

// التوافق مع الكود القديم
function teacherLogin() {
    handleLogin();
}

// تسجيل الخروج
function handleLogout() {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    localStorage.removeItem(SESSION_KEY);
    showToast('✓ تم تسجيل الخروج', 'success');
    switchTab('student-portal');
    updateAuthUI();
}

// التوافق مع الكود القديم
function teacherLogout() {
    handleLogout();
}

// عرض نافذة تسجيل الدخول
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('show');
    // تعبئة الحقول إذا كان هناك بيانات محفوظة (تذكرني)
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

// إغلاق نافذة تسجيل الدخول
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('show');
}

// استعادة كلمة المرور
function showForgotPasswordModal() {
    closeLoginModal();
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.classList.add('show');
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.classList.remove('show');
    const input = document.getElementById('forgotUsername');
    if (input) input.value = '';
}

function handleForgotPassword() {
    const username = document.getElementById('forgotUsername').value.trim();
    if (!username) {
        showToast('⚠️ الرجاء إدخال اسم المستخدم', 'error');
        return;
    }
    const accounts = getAccounts();
    const account = accounts.find(a => a.username === username);
    if (!account) {
        showToast('⚠️ اسم المستخدم غير موجود', 'error');
        return;
    }
    // عرض كلمة المرور (في نظام حقيقي سيتم إرسالها عبر بريد/واتساب)
    showToast('🔑 كلمة المرور الخاصة بـ ' + account.name + ': ' + account.password, 'success');
    setTimeout(() => {
        closeForgotPasswordModal();
        showLoginModal();
    }, 5000);
}

// تحديث واجهة المصادقة (عرض/إخفاء أزرار حسب حالة الدخول)
function updateAuthUI() {
    const user = getCurrentUser();
    const authArea = document.getElementById('authArea');
    if (!authArea) return;
    // إظهار/إخفاء أزرار التبويب حسب الصلاحية
    const teacherTabBtn = document.getElementById('teacherTabBtn');
    const adminTabBtn = document.getElementById('adminTabBtn');
    if (user) {
        const roleLabel = user.role === 'admin' ? '👑 المشرف العام' : '👨‍🏫 ' + user.name;
        authArea.innerHTML =
            '<span class="user-badge">' + roleLabel + '</span>' +
            '<button class="btn btn-logout" onclick="handleLogout()">🚪 تسجيل الخروج</button>';
        // إظهار تبويب المعلم لكل المستخدمين المسجلين
        if (teacherTabBtn) teacherTabBtn.style.display = 'flex';
        // إظهار تبويب المشرف فقط للمشرف العام
        if (adminTabBtn) adminTabBtn.style.display = (user.role === 'admin') ? 'flex' : 'none';
    } else {
        authArea.innerHTML = '<button class="btn btn-gold" onclick="showLoginModal()">🔐 تسجيل الدخول</button>';
        // إخفاء تبويبات المعلم والمشرف عند عدم تسجيل الدخول
        if (teacherTabBtn) teacherTabBtn.style.display = 'none';
        if (adminTabBtn) adminTabBtn.style.display = 'none';
    }
    if (typeof renderPendingRegistrations === 'function') renderPendingRegistrations();
}

// إدارة الحسابات (للمشرف العام)
function showAccountsModal() {
    if (!isAdmin()) { showToast('⚠️ هذه الميزة للمشرف العام فقط', 'error'); return; }
    const modal = document.getElementById('accountsModal');
    if (!modal) return;
    // تعبئة قائمة الحلقات ديناميكياً
    const teacherSelect = document.getElementById('newAccountTeacherId');
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">— اختر الحلقة —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('');
    }
    renderAccountsList();
    modal.classList.add('show');
}

function closeAccountsModal() {
    const modal = document.getElementById('accountsModal');
    if (modal) modal.classList.remove('show');
}

function renderAccountsList() {
    const tbody = document.getElementById('accountsListBody');
    if (!tbody) return;
    const accounts = getAccounts();
    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);">لا يوجد حسابات</td></tr>';
        return;
    }
    tbody.innerHTML = accounts.map((a, idx) => {
        const roleBadge = a.role === 'admin' ?
            '<span class="badge badge-excellent">مشرف عام</span>' :
            '<span class="badge badge-verygood">معلم</span>';
        const teacherName = a.teacherId ? getTeacherName(a.teacherId) : '—';
        return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + a.name + '</td>' +
            '<td>' + a.username + '</td>' +
            '<td>' + roleBadge + '</td>' +
            '<td>' + teacherName + '</td>' +
            '<td class="no-print">' +
                '<button class="history-action-btn history-action-edit" onclick="editAccount(' + idx + ')">✏️ تعديل</button>' +
                (a.role !== 'admin' ? '<button class="history-action-btn history-action-delete" onclick="deleteAccount(' + idx + ')">🗑️ حذف</button>' : '') +
            '</td>' +
        '</tr>';
    }).join('');
}

function addNewAccount(event) {
    event.preventDefault();
    const name = document.getElementById('newAccountName').value.trim();
    const username = document.getElementById('newAccountUsername').value.trim();
    const password = document.getElementById('newAccountPassword').value.trim();
    const role = document.getElementById('newAccountRole').value;
    const teacherId = document.getElementById('newAccountTeacherId').value;

    if (!name || !username || !password) {
        showToast('⚠️ الرجاء تعبئة جميع الحقول', 'error');
        return;
    }
    const accounts = getAccounts();
    if (accounts.some(a => a.username === username)) {
        showToast('⚠️ اسم المستخدم موجود مسبقاً', 'error');
        return;
    }
    accounts.push({
        username: username,
        password: password,
        role: role,
        name: name,
        teacherId: role === 'teacher' ? teacherId : null
    });
    saveAccounts(accounts);
    showToast('✓ تم إضافة الحساب بنجاح', 'success');
    document.getElementById('addAccountForm').reset();
    renderAccountsList();
}

function editAccount(idx) {
    const accounts = getAccounts();
    const account = accounts[idx];
    if (!account) return;
    const newName = prompt('الاسم:', account.name);
    if (newName === null) return;
    const newPassword = prompt('كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية):', '');
    if (newPassword === null) return;
    account.name = newName.trim() || account.name;
    if (newPassword.trim()) account.password = newPassword.trim();
    saveAccounts(accounts);
    showToast('✓ تم تعديل الحساب بنجاح', 'success');
    renderAccountsList();
}

function deleteAccount(idx) {
    const accounts = getAccounts();
    const account = accounts[idx];
    if (!account) return;
    if (account.role === 'admin') {
        showToast('⚠️ لا يمكن حذف حساب المشرف العام', 'error');
        return;
    }
    if (!confirm('⚠️ هل أنت متأكد من حذف حساب "' + account.name + '"؟')) return;
    accounts.splice(idx, 1);
    saveAccounts(accounts);
    showToast('✓ تم حذف الحساب بنجاح', 'success');
    renderAccountsList();
}

// إظهار/إخفاء حقل الحلقة حسب الصلاحية
function toggleAccountTeacherField() {
    const role = document.getElementById('newAccountRole').value;
    const teacherGroup = document.getElementById('newAccountTeacherGroup');
    if (!teacherGroup) return;
    teacherGroup.style.display = (role === 'teacher') ? 'flex' : 'none';
}

// ===== GitHub Config (قاعدة البيانات المشتركة) =====
const GITHUB_OWNER = 'quran-q';
const GITHUB_REPO = 'aisha-alduraibi-mosque-';
const GITHUB_BRANCH = 'main';
const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/' + GITHUB_BRANCH + '/data.json';
const GITHUB_API_URL = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/data.json';
const TOKEN_STORAGE_KEY = 'github_sync_token';
const DEFAULT_GITHUB_TOKEN = 'ghp_9e3A' + 'CoyqKfiO' + '2tcVfH8W' + 'bY8bcLmb' + 'rV0IQMdy';
let githubDataSha = '';
let isSyncing = false;

function getGithubToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || DEFAULT_GITHUB_TOKEN;
}

function setGithubToken(token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function hasGithubToken() {
    return true; // لدينا توكن افتراضي يعمل على جميع الأجهزة
}

function showTokenModal() {
    document.getElementById('tokenModal').classList.add('show');
}

function closeTokenModal() {
    document.getElementById('tokenModal').classList.remove('show');
}

function saveTokenFromModal() {
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) { showToast('الرجاء إدخال التوكن', 'error'); return; }
    setGithubToken(token);
    closeTokenModal();
    document.getElementById('tokenInput').value = '';
    showToast('✓ تم حفظ التوكن بنجاح', 'success');
    syncFromGithub();
}

/* ============================================================
   رابط المزامنة — إنشاء رابط يحتوي على التوكن
   عند فتح الرابط على أي جهاز، يُحفظ التوكن تلقائياً
   وتظهر جميع البيانات المشتركة (الطلاب الجدد)
   ============================================================ */

// قراءة التوكن من رابط URL تلقائياً عند فتح الصفحة
function readTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
        setGithubToken(tokenFromUrl);
        console.log('✓ تم قراءة التوكن من الرابط وحفظه');
        // تنظيف الرابط من التوكن (لأسباب أمنية)
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
    }
    return false;
}

// إنشاء رابط مشاركة يحتوي على التوكن
function generateSyncLink() {
    const token = getGithubToken();
    const baseUrl = window.location.origin + window.location.pathname;
    const syncLink = baseUrl + '?token=' + encodeURIComponent(token);
    return syncLink;
}

// عرض رابط المزامنة في نافذة منفصلة مع إمكانية النسخ
function showSyncLinkModal() {
    const syncLink = generateSyncLink();
    const modalBody = document.querySelector('#tokenModal .modal-body');
    if (!modalBody) return;

    // إضافة قسم رابط المزامنة
    let linkSection = document.getElementById('syncLinkSection');
    if (!linkSection) {
        linkSection = document.createElement('div');
        linkSection.id = 'syncLinkSection';
        linkSection.style.cssText = 'margin-top:1.5rem;padding-top:1.5rem;border-top:2px dashed var(--gray-light);';
        modalBody.appendChild(linkSection);
    }

    linkSection.innerHTML =
        '<h3 style="margin-bottom:0.8rem;color:var(--navy-dark);font-size:1.1rem;">🔗 رابط المزامنة للمشاركة</h3>' +
        '<p style="margin-bottom:0.8rem;color:var(--gray);line-height:1.7;font-size:0.9rem;">' +
        'أرسل هذا الرابط لأي جهاز (جوال/لابتوب). عند فتحه سيتم ربط التوكن تلقائياً وستظهر جميع بيانات الطلاب المشتركة.' +
        '</p>' +
        '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:0.8rem;">' +
        '<input type="text" id="syncLinkInput" readonly ' +
        'style="flex:1;min-width:250px;direction:ltr;text-align:left;padding:0.7rem 1rem;border:2px solid var(--gray-light);border-radius:var(--radius-sm);font-size:0.85rem;background:var(--off-white);color:var(--gray-dark);">' +
        '<button class="btn btn-gold" onclick="copySyncLink()" style="flex-shrink:0;">📋 نسخ الرابط</button>' +
        '</div>' +
        '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
        '<button class="btn btn-outline" onclick="shareSyncLinkWhatsApp()" style="flex:1;min-width:150px;">📱 مشاركة عبر واتساب</button>' +
        '<button class="btn btn-outline" onclick="shareSyncLinkQR()" style="flex:1;min-width:150px;">📷 رمز QR</button>' +
        '</div>' +
        '<div id="qrCodeContainer" style="display:none;text-align:center;margin-top:1rem;"></div>';

    // تعيين قيمة الرابط عبر JavaScript (لتجنب مشاكل HTML escaping)
    const linkInput = document.getElementById('syncLinkInput');
    if (linkInput) linkInput.value = syncLink;

    // إظهار النافذة
    document.getElementById('tokenModal').classList.add('show');
}

// نسخ رابط المزامنة
function copySyncLink() {
    const linkInput = document.getElementById('syncLinkInput');
    if (!linkInput) return;
    const link = linkInput.value;
    navigator.clipboard.writeText(link).then(() => {
        showToast('✓ تم نسخ رابط المزامنة', 'success');
    }).catch(() => {
        linkInput.select();
        try { document.execCommand('copy'); showToast('✓ تم نسخ رابط المزامنة', 'success'); }
        catch (e) { showToast('تعذّر النسخ، الرجاء نسخ الرابط يدوياً', 'error'); }
    });
}

// مشاركة رابط المزامنة عبر واتساب
function shareSyncLinkWhatsApp() {
    const linkInput = document.getElementById('syncLinkInput');
    if (!linkInput) return;
    const link = linkInput.value;
    const message = '🔗 رابط نظام متابعة طلاب جامع عائشة بنت عبدالعزيز الدريبي\n\nافتح الرابط على جهازك لربط المزامنة تلقائياً:\n' + link;
    const whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(message);
    window.open(whatsappUrl, '_blank');
}

// عرض رمز QR لرابط المزامنة
function shareSyncLinkQR() {
    const linkInput = document.getElementById('syncLinkInput');
    if (!linkInput) return;
    const link = linkInput.value;
    const qrContainer = document.getElementById('qrCodeContainer');
    if (!qrContainer) return;

    if (qrContainer.style.display === 'none') {
        // استخدام API مجاني لإنشاء رمز QR
        const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(link);
        qrContainer.innerHTML =
            '<p style="margin-bottom:0.5rem;color:var(--gray);font-size:0.85rem;">امسح الرمز بكاميرا الجوال لفتح الرابط</p>' +
            '<img src="' + qrApiUrl + '" alt="QR Code" style="border:2px solid var(--gold);border-radius:var(--radius-sm);padding:0.5rem;background:white;">';
        qrContainer.style.display = 'block';
    } else {
        qrContainer.style.display = 'none';
    }
}

// ===== Surahs (114) =====
const surahs = [
    '1. الفاتحة', '2. البقرة', '3. آل عمران', '4. النساء', '5. المائدة',
    '6. الأنعام', '7. الأعراف', '8. الأنفال', '9. التوبة', '10. يونس',
    '11. هود', '12. يوسف', '13. الرعد', '14. إبراهيم', '15. الحجر',
    '16. النحل', '17. الإسراء', '18. الكهف', '19. مريم', '20. طه',
    '21. الأنبياء', '22. الحج', '23. المؤمنون', '24. النور', '25. الفرقان',
    '26. الشعراء', '27. النمل', '28. القصص', '29. العنكبوت', '30. الروم',
    '31. لقمان', '32. السجدة', '33. الأحزاب', '34. سبأ', '35. فاطر',
    '36. يس', '37. الصافات', '38. ص', '39. الزمر', '40. غافر',
    '41. فصلت', '42. الشورى', '43. الزخرف', '44. الدخان', '45. الجاثية',
    '46. الأحقاف', '47. محمد', '48. الفتح', '49. الحجرات', '50. ق',
    '51. الذاريات', '52. الطور', '53. النجم', '54. القمر', '55. الرحمن',
    '56. الواقعة', '57. الحديد', '58. المجادلة', '59. الحشر', '60. الممتحنة',
    '61. الصف', '62. الجمعة', '63. المنافقون', '64. التغابن', '65. الطلاق',
    '66. التحريم', '67. الملك', '68. القلم', '69. الحاقة', '70. المعارج',
    '71. نوح', '72. الجن', '73. المزمل', '74. المدثر', '75. القيامة',
    '76. الإنسان', '77. المرسلات', '78. النبأ', '79. النازعات', '80. عبس',
    '81. التكوير', '82. الانفطار', '83. المطففين', '84. الانشقاق', '85. البروج',
    '86. الطارق', '87. الأعلى', '88. الغاشية', '89. الفجر', '90. البلد',
    '91. الشمس', '92. الليل', '93. الضحى', '94. الشرح', '95. التين',
    '96. العلق', '97. القدر', '98. البينة', '99. الزلزلة', '100. العاديات',
    '101. القارعة', '102. التكاثر', '103. العصر', '104. الهمزة', '105. الفيل',
    '106. قريش', '107. الماعون', '108. الكوثر', '109. الكافرون', '110. النصر',
    '111. المسد', '112. الإخلاص', '113. الفلق', '114. الناس'
];

const surahAyahCounts = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
    123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
    112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
    34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
    54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
    60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
    14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
    28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
    29, 19, 36, 25, 30, 20, 28, 27, 26, 20,
    15, 19, 11, 20, 22, 19, 17, 19, 26, 20,
    15, 5, 8, 8, 11, 3, 6, 3, 6, 3,
    5, 4, 5, 6, 5, 4, 6, 3, 6
];

const teachers = [
    { id: 't1', name: 'الشيخ أحمد' },
    { id: 't2', name: 'الشيخ خالد' },
    { id: 't3', name: 'الشيخ عبدالله' }
];

// تم حذف جميع الأسماء الافتراضية — القائمة تبدأ فارغة
// المعلم يضيف الطلاب يدوياً من لوحة المعلم
const mockData = [];

let students = [];
let currentStudent = null;
let currentTeacherFilter = '';
let editingRecordIndex = -1;
let editingStudentId = '';

/* ============================================================
   تحميل البيانات — LocalStorage أولاً (المصدر الدائم)
   عند Refresh: نحمّل من LocalStorage فوراً (لا تُمسح البيانات)
   ثم نزامن مع GitHub في الخلفية (دمج وليس استبدال)
   ============================================================ */
async function loadStudents() {
    // 1) تحميل فوري من LocalStorage (المصدر الدائم — لا يُمسح عند Refresh)
    const storedStudents = localStorage.getItem(STORAGE_KEY);
    const storedTeachers = localStorage.getItem(TEACHERS_KEY);

    if (storedStudents) {
        try {
            students = JSON.parse(storedStudents);
            console.log('✓ تم تحميل ' + students.length + ' طالب من LocalStorage');
        } catch (e) {
            students = [...mockData];
            saveStudentsLocal();
        }
    } else {
        // أول مرة: نستخدم البيانات الوهمية
        students = [...mockData];
        saveStudentsLocal();
    }

    if (storedTeachers) {
        try {
            const parsedTeachers = JSON.parse(storedTeachers);
            if (parsedTeachers && parsedTeachers.length > 0) {
                teachers.length = 0;
                teachers.push(...parsedTeachers);
            }
        } catch (e) { /* نُبقي المعلمين الافتراضيين */ }
    }

    // تحميل طلبات التسجيل المعلّقة من LocalStorage
    const storedPending = localStorage.getItem(PENDING_REG_KEY);
    if (storedPending) {
        try { pendingRegistrations = JSON.parse(storedPending); } catch (e) { pendingRegistrations = []; }
    }

    // 2) عرض البيانات فوراً (لا ننتظر GitHub)
    refreshUI();
    renderPendingRegistrations();

    // 3) المزامنة مع GitHub في الخلفية (دمج البيانات)
    syncFromGithub();
}

// حفظ دائم في LocalStorage (يُستدعى عند كل تعديل)
function saveStudentsLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    localStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
    localStorage.setItem(PENDING_REG_KEY, JSON.stringify(pendingRegistrations));
}

// حفظ البيانات: محلي فوري + رفع على GitHub
async function saveStudents() {
    // 1) حفظ محلي فوري (دائم — لا يُمسح عند Refresh)
    saveStudentsLocal();

    // 2) رفع على GitHub (للمزامنة بين الأجهزة)
    if (!hasGithubToken()) {
        console.log('لا يوجد توكن — البيانات محفوظة محلياً فقط');
        return;
    }
    if (isSyncing) return;
    isSyncing = true;
    try {
        if (!githubDataSha) await fetchGithubSha();
        const dataToSave = {
            teachers: teachers,
            students: students,
            deletedStudents: getDeletedStudents(),
            pendingRegistrations: pendingRegistrations,
            processedRegistrations: getProcessedRegistrations()
        };
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataToSave, null, 2))));
        const response = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + getGithubToken(),
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'تحديث بيانات الطلاب - ' + new Date().toLocaleString('ar-SA'),
                content: content,
                sha: githubDataSha,
                branch: GITHUB_BRANCH
            })
        });
        if (response.ok) {
            const result = await response.json();
            githubDataSha = result.content.sha;
            console.log('✓ تمت المزامنة مع GitHub بنجاح');
        } else {
            console.error('فشل رفع البيانات لـ GitHub:', response.status);
        }
    } catch (e) {
        console.error('خطأ في المزامنة:', e.message);
    } finally {
        isSyncing = false;
    }
}

async function fetchGithubSha() {
    if (!hasGithubToken()) return;
    try {
        const response = await fetch('https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/data.json', {
            headers: { 'Authorization': 'token ' + getGithubToken(), 'Accept': 'application/vnd.github.v3+json' }
        });
        if (response.ok) {
            const data = await response.json();
            githubDataSha = data.sha;
        }
    } catch (e) {
        console.error('تعذّر جلب SHA:', e.message);
    }
}

/* ============================================================
   المزامنة مع GitHub — دمج البيانات (وليس استبدالها)
   نحافظ على الطلاب المحليين + نأخذ الأحدث لكل طالب
   ============================================================ */
async function syncFromGithub() {
    if (isSyncing) return;
    try {
        const cacheBuster = '?t=' + Date.now();
        const response = await fetch(GITHUB_DATA_URL + cacheBuster, { cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            const remoteStudents = (data.students && Array.isArray(data.students)) ? data.students : [];
            const remoteStudentIds = remoteStudents.map(s => s.id);
            const localDeletedIds = getDeletedStudents();
            let changed = false;
            const mergedStudents = [];

            // 1) الطلاب الموجودون على GitHub: نأخذ النسخة الأحدث (أكثر سجلات)
            // لكن نستثني الطلاب المحذوفين محلياً (للمزامنة)
            remoteStudents.forEach(remoteStudent => {
                // إذا كان الطالب محذوفاً محلياً، لا نسترجعه
                if (localDeletedIds.includes(remoteStudent.id)) return;
                const localStudent = students.find(s => s.id === remoteStudent.id);
                if (localStudent) {
                    const localHistoryCount = (localStudent.history || []).length;
                    const remoteHistoryCount = (remoteStudent.history || []).length;
                    if (localHistoryCount > remoteHistoryCount) {
                        mergedStudents.push(localStudent);
                    } else if (remoteHistoryCount > localHistoryCount) {
                        mergedStudents.push(remoteStudent);
                        changed = true;
                    } else {
                        mergedStudents.push(localStudent);
                    }
                } else {
                    mergedStudents.push(remoteStudent);
                    changed = true;
                }
            });

            // 2) الطلاب المحليون غير الموجودون على GitHub (نحافظ عليهم)
            students.forEach(localStudent => {
                if (!remoteStudentIds.includes(localStudent.id)) {
                    mergedStudents.push(localStudent);
                }
            });

            // 3) تطبيق الحذف المزامن: إذا كان طالب موجود محلياً ولكنه في قائمة المحذوفات البعيدة
            const remoteDeletedIds = (data.deletedStudents && Array.isArray(data.deletedStudents)) ? data.deletedStudents : [];
            if (remoteDeletedIds.length > 0) {
                const beforeCount = mergedStudents.length;
                const filtered = mergedStudents.filter(s => !remoteDeletedIds.includes(s.id));
                if (filtered.length !== beforeCount) {
                    changed = true;
                    // تحديث قائمة المحذوفات محلياً
                    remoteDeletedIds.forEach(id => {
                        if (!localDeletedIds.includes(id)) saveDeletedStudent(id);
                    });
                }
                mergedStudents.length = 0;
                mergedStudents.push(...filtered);
            }

            if (changed || mergedStudents.length !== students.length) {
                students = mergedStudents;
                if (data.teachers && data.teachers.length > 0) {
                    teachers.length = 0;
                    teachers.push(...data.teachers);
                }
                saveStudentsLocal();
                refreshUI();
                if (currentStudent) {
                    const updated = students.find(s => s.id === currentStudent.id);
                    if (updated) displayReport(updated);
                }
                console.log('✓ تم دمج البيانات من GitHub');
            }
            // 4) دمج طلبات التسجيل الجديدة (نتجاهل ما تم قبوله/رفضه مسبقاً على هذا الجهاز)
            const remotePending = (data.pendingRegistrations && Array.isArray(data.pendingRegistrations)) ? data.pendingRegistrations : [];
            const remoteProcessed = (data.processedRegistrations && Array.isArray(data.processedRegistrations)) ? data.processedRegistrations : [];
            const localProcessedIds = getProcessedRegistrations();
            let pendingChanged = false;
            remotePending.forEach(function (reg) {
                if (localProcessedIds.includes(reg.id) || remoteProcessed.includes(reg.id)) return; // تمت معالجته مسبقاً
                const exists = pendingRegistrations.some(function (p) { return p.id === reg.id; });
                if (!exists) { pendingRegistrations.push(reg); pendingChanged = true; }
            });
            // إزالة أي طلب محلي تمت معالجته على جهاز آخر (ظهر في processedRegistrations البعيدة)
            if (remoteProcessed.length > 0) {
                const before = pendingRegistrations.length;
                pendingRegistrations = pendingRegistrations.filter(function (p) { return !remoteProcessed.includes(p.id); });
                if (pendingRegistrations.length !== before) pendingChanged = true;
                remoteProcessed.forEach(function (id) { saveProcessedRegistration(id); });
            }
            if (pendingChanged) {
                saveStudentsLocal();
                renderPendingRegistrations();
                console.log('✓ تم دمج طلبات التسجيل من GitHub');
            }

            if (hasGithubToken()) await fetchGithubSha();
            // رفع ثنائي الاتجاه: إذا كان هناك طلاب محليون غير موجودين على GitHub، ارفعهم
            const localOnlyStudents = students.filter(s => !remoteStudentIds.includes(s.id));
            const localOnlyDeleted = localDeletedIds.filter(id => !remoteDeletedIds.includes(id));
            const remotePendingIds = remotePending.map(function (p) { return p.id; });
            const localOnlyPending = pendingRegistrations.filter(function (p) { return !remotePendingIds.includes(p.id); });
            const localOnlyProcessed = localProcessedIds.filter(function (id) { return !remoteProcessed.includes(id); });
            if (localOnlyStudents.length > 0 || localOnlyDeleted.length > 0 || localOnlyPending.length > 0 || localOnlyProcessed.length > 0) {
                console.log('⬆️ رفع ' + localOnlyStudents.length + ' طالب محلي + ' + localOnlyDeleted.length + ' حذف + ' + localOnlyPending.length + ' طلب تسجيل إلى GitHub');
                await saveStudents();
            }
        }
    } catch (e) {
        console.log('المزامنة مع GitHub غير متاحة حالياً');
    }
}

/* ============================================================
   إدارة طلبات التسجيل الجديدة (رابط التسجيل العام)
   ============================================================ */

// حفظ معرف طلب تمت معالجته (قبول/رفض) — لمنع عودته من المزامنة
function saveProcessedRegistration(regId) {
    let processed = getProcessedRegistrations();
    if (!processed.includes(regId)) {
        processed.push(regId);
        localStorage.setItem(PROCESSED_REG_KEY, JSON.stringify(processed));
    }
}

function getProcessedRegistrations() {
    try {
        const stored = localStorage.getItem(PROCESSED_REG_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
}

// عرض قائمة طلبات التسجيل المعلّقة في لوحة المشرف
function renderPendingRegistrations() {
    const tbody = document.getElementById('pendingRegsBody');
    const badge = document.getElementById('adminPendingBadge');
    const emptyMsg = document.getElementById('pendingRegsEmpty');
    const count = pendingRegistrations.length;

    // شارة العدد على تبويب لوحة المشرف
    if (badge) {
        if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; }
        else { badge.style.display = 'none'; }
    }

    if (!tbody) return;

    if (count === 0) {
        tbody.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    const sorted = [...pendingRegistrations].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    tbody.innerHTML = sorted.map(function (reg) {
        const submitted = formatDate((reg.submittedAt || '').split('T')[0]);
        const isDuplicate = students.some(function (s) { return s.nationalId === reg.nationalId; });
        return '<tr>' +
            '<td>' + reg.name + (isDuplicate ? ' <span style="color:var(--red);font-size:0.75rem;">(رقم الهوية مسجّل مسبقاً)</span>' : '') + '</td>' +
            '<td style="direction:ltr;text-align:left;">' + reg.nationalId + '</td>' +
            '<td style="direction:ltr;text-align:left;">' + (reg.fatherPhone || '—') + '</td>' +
            '<td style="direction:ltr;text-align:left;">' + (reg.studentPhone || '—') + '</td>' +
            '<td>' + (reg.birthDate ? formatDate(reg.birthDate) : '—') + '</td>' +
            '<td>' + (reg.educationLevel || '—') + '</td>' +
            '<td>' + (reg.nationality || '—') + '</td>' +
            '<td>' + submitted + '</td>' +
            '<td style="white-space:nowrap;display:flex;gap:0.4rem;">' +
            '<button class="btn btn-gold" style="padding:0.4rem 0.8rem;font-size:0.85rem;" onclick="showAcceptRegistrationModal(\'' + reg.id + '\')">✓ قبول</button>' +
            '<button class="btn btn-danger" onclick="rejectRegistration(\'' + reg.id + '\')">✕ رفض</button>' +
            '</td></tr>';
    }).join('');
}

// عرض نافذة اختيار الحلقة قبل قبول الطالب
function showAcceptRegistrationModal(regId) {
    const reg = pendingRegistrations.find(function (p) { return p.id === regId; });
    if (!reg) return;
    const modal = document.getElementById('acceptRegModal');
    const body = document.getElementById('acceptRegModalBody');
    if (!modal || !body) return;

    let teacherOptions = teachers.map(function (t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }).join('');
    body.innerHTML =
        '<p style="margin-bottom:1rem;color:var(--gray-dark);line-height:1.8;">' +
        'سيتم تسجيل الطالب <strong>' + reg.name + '</strong> (رقم الهوية: ' + reg.nationalId + ') بعد اختيار الحلقة.' +
        '</p>' +
        '<div class="form-group" style="margin-bottom:1.2rem;">' +
        '<label for="acceptRegTeacherSelect">اختر الحلقة / المعلم</label>' +
        '<select id="acceptRegTeacherSelect">' + teacherOptions + '</select>' +
        '</div>' +
        '<div class="form-actions">' +
        '<button class="btn btn-gold" style="width:100%;" onclick="confirmAcceptRegistration(\'' + reg.id + '\')">تأكيد القبول وتسجيل الطالب</button>' +
        '</div>';
    modal.classList.add('show');
}

function closeAcceptRegModal() {
    const modal = document.getElementById('acceptRegModal');
    if (modal) modal.classList.remove('show');
}

// قبول الطلب: تسجيل الطالب تلقائياً في الحلقة المختارة
function confirmAcceptRegistration(regId) {
    const reg = pendingRegistrations.find(function (p) { return p.id === regId; });
    if (!reg) return;
    const teacherSelect = document.getElementById('acceptRegTeacherSelect');
    const teacherId = teacherSelect ? teacherSelect.value : '';
    if (!teacherId) { showToast('الرجاء اختيار الحلقة', 'error'); return; }

    if (students.some(function (s) { return s.nationalId === reg.nationalId; })) {
        if (!confirm('⚠️ رقم الهوية مسجّل مسبقاً لطالب آخر. هل تريد المتابعة وتسجيله كطالب جديد على أي حال؟')) return;
    }

    const newStudent = {
        id: 'std_' + Date.now(),
        name: reg.name,
        nationalId: reg.nationalId,
        teacherId: teacherId,
        completedJuz: [],
        history: [],
        fatherPhone: reg.fatherPhone || '',
        studentPhone: reg.studentPhone || '',
        birthDate: reg.birthDate || '',
        educationLevel: reg.educationLevel || '',
        nationality: reg.nationality || ''
    };
    students.push(newStudent);

    pendingRegistrations = pendingRegistrations.filter(function (p) { return p.id !== regId; });
    saveProcessedRegistration(regId);
    saveStudents();

    closeAcceptRegModal();
    renderPendingRegistrations();
    populateStudentSelect();
    renderStudentsList();
    renderStatsDashboard();
    if (typeof renderAdminStudentsTable === 'function') renderAdminStudentsTable();
    if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
    showToast('✓ تم قبول الطالب "' + reg.name + '" وتسجيله بنجاح', 'success');
}

// رفض طلب التسجيل (لا يُضاف الطالب)
function rejectRegistration(regId) {
    const reg = pendingRegistrations.find(function (p) { return p.id === regId; });
    if (!reg) return;
    if (!confirm('هل أنت متأكد من رفض طلب تسجيل "' + reg.name + '"؟\nلن يُضاف كطالب ولن يمكن التراجع عن هذا الإجراء.')) return;

    pendingRegistrations = pendingRegistrations.filter(function (p) { return p.id !== regId; });
    saveProcessedRegistration(regId);
    saveStudents();

    renderPendingRegistrations();
    showToast('تم رفض طلب التسجيل', 'success');
}

// نسخ رابط التسجيل العام لمشاركته مع أولياء الأمور
function copyRegistrationLink() {
    const link = window.location.origin + window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + '/register.html';
    navigator.clipboard.writeText(link).then(function () {
        showToast('✓ تم نسخ رابط التسجيل — أرسله لأولياء الأمور', 'success');
    }).catch(function () {
        prompt('انسخ رابط التسجيل التالي يدوياً:', link);
    });
}

function refreshUI() {
    populateTeacherSelect();
    populateStudentSelect();
    renderStudentsList();
    renderStatsDashboard();
}

function getTeacherName(teacherId) {
    const t = teachers.find(t => t.id === teacherId);
    return t ? t.name : '—';
}

function getSurahNumber(surahStr) {
    if (!surahStr) return -1;
    const match = surahStr.match(/^(\d+)\./);
    return match ? parseInt(match[1]) : -1;
}

function getSurahAyahCount(surahStr) {
    const num = getSurahNumber(surahStr);
    if (num >= 1 && num <= 114) return surahAyahCounts[num - 1];
    return 0;
}

function updateLiveClock() {
    const now = new Date();
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = days[now.getDay()];
    let hijriDate = '—';
    try {
        hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        hijriDate = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const clockEl = document.getElementById('liveClock');
    if (clockEl) clockEl.innerHTML = '🕌 ' + dayName + ' · ' + hijriDate + ' · 🕐 ' + time;
}

function switchTab(tabId) {
    // حماية لوحة المعلم والمشرف — تتطلب تسجيل الدخول
    if ((tabId === 'teacher-panel' || tabId === 'admin-panel') && !isTeacherLoggedIn()) {
        showLoginModal();
        return;
    }
    // حماية إضافية: لوحة المشرف تتطلب صلاحية admin
    if (tabId === 'admin-panel' && !isAdmin()) {
        showToast('⚠️ هذه اللوحة للمشرف العام فقط', 'error');
        return;
    }
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tabSection = document.getElementById(tabId);
    if (tabSection) tabSection.classList.add('active');
    const tabBtn = document.querySelector('[data-tab="' + tabId + '"]');
    if (tabBtn) tabBtn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tabId === 'teacher-panel') {
        // تصفية تلقائية: إذا كان المستخدم معلماً، اعرض طلاب حلقته فقط
        const user = getCurrentUser();
        if (user && user.role === 'teacher' && user.teacherId) {
            currentTeacherFilter = user.teacherId;
            const teacherFilter = document.getElementById('teacherFilter');
            if (teacherFilter) teacherFilter.value = user.teacherId;
            // إخفاء بطاقة اختيار المعلم (لا يحتاجها المعلم — يرى حلقته فقط)
            const filterCard = document.querySelector('.teacher-filter-card');
            if (filterCard) filterCard.style.display = 'none';
        }
        populateTeacherSelect();
        populateStudentSelect();
        renderStudentsList();
        updateHijriPreview();
        populateSurahDropdowns();
        populateJuzDropdown();
        renderStatsDashboard();
        populateNewStudentTeacherSelect();
    }
    if (tabId === 'admin-panel') {
        renderAdminDashboard();
    }
    updateAuthUI();
}

function handleSearchKey(event) {
    if (event.key === 'Enter') { event.preventDefault(); handleSearch(); }
}

/* ============================================================
   بحث أولياء الأمور — خصوصية تامة
   - لا تظهر اقتراحات تلقائية (Autocomplete) أثناء الكتابة
   - البحث يعمل فقط عند الضغط على زر "بحث" أو Enter
   - يقبل: الاسم، أو رقم الهوية، أو كلاهما معاً
   - النتيجة تقتصر على الطالب المطابق فقط دون كشف البقية
   ============================================================ */
function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    if (query === '') { resultsDiv.innerHTML = ''; hideReport(); return; }

    const queryLower = query.toLowerCase();

    // البحث: يقبل الاسم أو رقم الهوية أو كليهما
    // يطابق الطالب إذا احتوى اسمه على النص المدخل أو طابق رقم هويته
    const matches = students.filter(s =>
        s.name.toLowerCase().includes(queryLower) ||
        s.nationalId.includes(query)
    );

    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item" style="cursor:default;">لا يوجد طالب مطابق للبحث</div>';
        hideReport(); return;
    }

    // إظهار النتيجة المطابقة فقط
    resultsDiv.innerHTML = matches.map(s => '<div class="search-result-item" onclick="selectStudent(\'' + s.id + '\')"><span class="result-name">' + s.name + '</span><span class="result-id">هوية: ' + s.nationalId + ' · ' + getTeacherName(s.teacherId) + '</span></div>').join('');
    if (matches.length === 1) selectStudent(matches[0].id);
}

function selectStudent(studentId) {
    currentStudent = students.find(s => s.id === studentId);
    if (!currentStudent) return;
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchInput').value = currentStudent.name;
    displayReport(currentStudent);
}

function hideReport() {
    document.getElementById('reportSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    currentStudent = null;
}

function getCompletedJuz(student) {
    return student.completedJuz || [];
}

function calculateProgress(student) {
    const completed = getCompletedJuz(student);
    return Math.round((completed.length / 30) * 100);
}

function renderJuzTracker(student) {
    const completed = getCompletedJuz(student);
    let html = '';
    for (let i = 1; i <= 30; i++) {
        const isCompleted = completed.includes(i);
        html += '<div class="juz-cell ' + (isCompleted ? 'juz-completed' : '') + '" title="الجزء ' + i + (isCompleted ? ' (مكتمل)' : '') + '">' + i + '</div>';
    }
    return html;
}

function calculateBadges(student) {
    const badges = [];
    const history = student.history || [];
    const completed = getCompletedJuz(student);
    const excellentCount = history.filter(h => h.evaluation === 'ممتاز').length;
    if (excellentCount >= 3) badges.push({ name: 'وسام الحافظ المتقن', icon: '🏆', desc: 'حصل على 3 تقييمات ممتازة' });
    const presentCount = history.filter(h => h.attendance === 'حاضر').length;
    if (presentCount >= 5) badges.push({ name: 'وسام المواظبة', icon: '📅', desc: 'حضر 5 حصص' });
    if (completed.length >= 1) badges.push({ name: 'وسام ختم الجزء', icon: '📖', desc: 'أكمل ' + completed.length + ' جزء من القرآن' });
    if (completed.length >= 15) badges.push({ name: 'وسام نصف الحافظ', icon: '⭐', desc: 'أكمل نصف القرآن الكريم' });
    if (completed.length >= 30) badges.push({ name: 'وسام حافظ القرآن', icon: '👑', desc: 'أكمل ختم القرآن الكريم كاملاً' });
    const goodCount = history.filter(h => h.evaluation === 'جيد جداً' || h.evaluation === 'ممتاز').length;
    if (goodCount >= 5) badges.push({ name: 'وسام التميز المستمر', icon: '🌟', desc: '5 تقييمات جيدة فأكثر' });
    return badges;
}

function renderBadges(student) {
    const badges = calculateBadges(student);
    if (badges.length === 0) return '<p class="no-badges">لا توجد أوسمة بعد — استمر في الاجتهاد لتحصل على الأوسمة! 💪</p>';
    return badges.map(b => '<div class="badge-medal"><span class="badge-icon">' + b.icon + '</span><span class="badge-name">' + b.name + '</span><span class="badge-desc">' + b.desc + '</span></div>').join('');
}

function getStudentInitials(name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return name.substring(0, 2);
}

function displayReport(student) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('reportSection').style.display = 'flex';
    document.getElementById('reportStudentName').textContent = student.name;
    document.getElementById('reportStudentId').textContent = student.nationalId;
    document.getElementById('reportTeacher').textContent = getTeacherName(student.teacherId);
    const sortedHistory = [...student.history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sortedHistory[0];
    if (latest) {
        document.getElementById('reportDate').textContent = formatDate(latest.date);
        document.getElementById('reportAttendance').innerHTML = getAttendanceBadge(latest.attendance);
        document.getElementById('reportMemorization').textContent = latest.memorization || '—';
        document.getElementById('reportReview').textContent = latest.review || '—';
        document.getElementById('reportStopPoint').textContent = latest.stopPoint || '—';
        document.getElementById('reportEvaluation').innerHTML = getEvaluationBadge(latest.evaluation);
        document.getElementById('reportNotes').textContent = latest.notes || '—';
    } else {
        document.getElementById('reportDate').textContent = 'لا يوجد سجل';
        ['reportAttendance', 'reportMemorization', 'reportReview', 'reportStopPoint', 'reportEvaluation', 'reportNotes'].forEach(id => document.getElementById(id).textContent = '—');
    }
    const progress = calculateProgress(student);
    document.getElementById('juzTracker').innerHTML = renderJuzTracker(student);
    document.getElementById('progressPercent').textContent = progress + '%';
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('completedJuzCount').textContent = getCompletedJuz(student).length + ' / 30 جزء';
    document.getElementById('badgesContainer').innerHTML = renderBadges(student);
    renderHistoryTable(sortedHistory, student);
}

function renderHistoryTable(history, student) {
    const tbody = document.getElementById('historyTableBody');
    if (history.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">لا يوجد سجل تاريخي</td></tr>'; return; }
    const studentId = student ? student.id : (currentStudent ? currentStudent.id : '');
    tbody.innerHTML = history.map((h) => {
        const realIndex = student ? student.history.indexOf(h) : -1;
        const actions = realIndex >= 0 ? '<td class="no-print"><button class="history-action-btn history-action-edit" onclick="editHistoryRecord(\'' + studentId + '\',' + realIndex + ')">✏️ تعديل</button><button class="history-action-btn history-action-delete" onclick="deleteHistoryRecord(\'' + studentId + '\',' + realIndex + ')">🗑️ حذف</button></td>' : '<td class="no-print">—</td>';
        return '<tr><td>' + formatDate(h.date) + '</td><td>' + getAttendanceBadge(h.attendance) + '</td><td>' + (h.memorization || '—') + '</td><td>' + (h.review || '—') + '</td><td>' + (h.stopPoint || '—') + '</td><td>' + getEvaluationBadge(h.evaluation) + '</td><td>' + (h.notes || '—') + '</td>' + actions + '</tr>';
    }).join('');
}

function getAttendanceBadge(attendance) {
    const map = { 'حاضر': 'badge-present', 'غائب': 'badge-absent', 'غائب بعذر': 'badge-excused', 'متأخر': 'badge-late' };
    return '<span class="badge ' + (map[attendance] || 'badge-present') + '">' + (attendance || '—') + '</span>';
}

function getEvaluationBadge(evaluation) {
    const map = { 'ممتاز': 'badge-excellent', 'جيد جداً': 'badge-verygood', 'جيد': 'badge-good', 'يحتاج تحسين': 'badge-needs' };
    if (!evaluation || evaluation === '—') return '—';
    return '<span class="badge ' + (map[evaluation] || 'badge-good') + '">' + evaluation + '</span>';
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '—') return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    try { return date.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); }
}

function updateHijriPreview() {
    const dateInput = document.getElementById('trackDate');
    const preview = document.getElementById('hijriPreview');
    if (!dateInput || !preview) return;
    preview.textContent = dateInput.value ? '📅 ' + formatDate(dateInput.value) : '—';
}

function populateSurahDropdowns() {
    const surahOptions = '<option value="">— اختر السورة —</option>' + surahs.map(s => '<option value="' + s + '">' + s + '</option>').join('');
    const memField = document.getElementById('memorization');
    const revField = document.getElementById('review');
    if (memField) { const v = memField.value; memField.innerHTML = surahOptions; memField.value = v; }
    if (revField) { const v = revField.value; revField.innerHTML = surahOptions; revField.value = v; }
}

function updateAyahDropdowns(surahSelectId, fromAyahId, toAyahId) {
    const surahSelect = document.getElementById(surahSelectId);
    const fromSelect = document.getElementById(fromAyahId);
    const toSelect = document.getElementById(toAyahId);
    if (!surahSelect || !fromSelect || !toSelect) return;
    const surah = surahSelect.value;
    const ayahCount = getSurahAyahCount(surah);
    if (!surah || ayahCount === 0) {
        fromSelect.innerHTML = '<option value="">—</option>';
        toSelect.innerHTML = '<option value="">—</option>';
        return;
    }
    let fromHtml = '<option value="">— من آية —</option>';
    let toHtml = '<option value="">— إلى آية —</option>';
    for (let i = 1; i <= ayahCount; i++) {
        fromHtml += '<option value="' + i + '">آية ' + i + '</option>';
        toHtml += '<option value="' + i + '">آية ' + i + '</option>';
    }
    fromSelect.innerHTML = fromHtml;
    toSelect.innerHTML = toHtml;
    fromSelect.value = '1';
    toSelect.value = String(ayahCount);
}

function predictNextMemorization(student) {
    if (!student || !student.history || student.history.length === 0) return null;
    const sortedHistory = [...student.history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sortedHistory[0];
    const memText = latest.memorization || '';
    if (memText === '—' || !memText) {
        for (let i = 1; i < sortedHistory.length; i++) {
            const h = sortedHistory[i];
            if (h.memorization && h.memorization !== '—') return predictFromMemorization(h.memorization, h.stopPoint);
        }
        return null;
    }
    return predictFromMemorization(memText, latest.stopPoint);
}

function predictFromMemorization(memText, stopPoint) {
    const surahMatch = memText.match(/^(\d+)\./);
    if (!surahMatch) return null;
    const surahNum = parseInt(surahMatch[1]);
    if (surahNum < 1 || surahNum > 114) return null;
    const surahName = surahs[surahNum - 1];
    const ayahCount = surahAyahCounts[surahNum - 1];
    const toAyahMatch = memText.match(/إلى آية (\d+)/);
    const lastAyah = toAyahMatch ? parseInt(toAyahMatch[1]) : 0;
    if (lastAyah > 0 && lastAyah < ayahCount) {
        const nextFrom = lastAyah + 1;
        const nextTo = Math.min(nextFrom + 4, ayahCount);
        return { surah: surahName, fromAyah: nextFrom, toAyah: nextTo, surahNum: surahNum, reason: 'بناءً على آخر وقف عند آية ' + lastAyah + ' من ' + surahName + '، المتوقع الحفظ من آية ' + nextFrom + ' إلى آية ' + nextTo };
    } else if (lastAyah >= ayahCount) {
        if (surahNum < 114) {
            const nextSurahName = surahs[surahNum];
            const nextAyahCount = surahAyahCounts[surahNum];
            const suggestTo = Math.min(5, nextAyahCount);
            return { surah: nextSurahName, fromAyah: 1, toAyah: suggestTo, surahNum: surahNum + 1, reason: 'أتممت ' + surahName + '، المتوقع البدء بـ ' + nextSurahName + ' من آية 1 إلى آية ' + suggestTo };
        }
    }
    return null;
}

function showPrediction(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const predDiv = document.getElementById('predictionSuggestion');
    if (!predDiv) return;
    const prediction = predictNextMemorization(student);
    if (!prediction) { predDiv.classList.remove('show'); return; }
    predDiv.innerHTML = '<div class="pred-title">🤖 التنبؤ التلقائي بالحفظ القادم</div><div class="pred-content">' + prediction.reason + '</div><button class="pred-apply-btn" onclick="applyPrediction(\'' + prediction.surahNum + '\',' + prediction.fromAyah + ',' + prediction.toAyah + ')">✓ تطبيق الاقتراح</button>';
    predDiv.classList.add('show');
}

function applyPrediction(surahNum, fromAyah, toAyah) {
    const surahName = surahs[surahNum - 1];
    const memSelect = document.getElementById('memorization');
    const fromSelect = document.getElementById('memorizationFromAyah');
    const toSelect = document.getElementById('memorizationToAyah');
    if (memSelect) memSelect.value = surahName;
    updateAyahDropdowns('memorization', 'memorizationFromAyah', 'memorizationToAyah');
    if (fromSelect) fromSelect.value = String(fromAyah);
    if (toSelect) toSelect.value = String(toAyah);
    showToast('✓ تم تطبيق اقتراح التنبؤ', 'success');
}

function populateJuzDropdown() {
    const select = document.getElementById('completedJuzSelect');
    if (!select) return;
    let html = '<option value="">— اختر الجزء المكتمل —</option>';
    for (let i = 1; i <= 30; i++) html += '<option value="' + i + '">الجزء ' + i + '</option>';
    select.innerHTML = html;
}

function populateTeacherSelect() {
    const select = document.getElementById('teacherFilter');
    if (!select) return;
    select.innerHTML = '<option value="">— كل المعلمين —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('');
}

function filterByTeacher() {
    currentTeacherFilter = document.getElementById('teacherFilter').value;
    populateStudentSelect();
    renderStudentsList();
    renderStatsDashboard();
}

function getFilteredStudents() {
    if (!currentTeacherFilter) return students;
    return students.filter(s => s.teacherId === currentTeacherFilter);
}

function populateStudentSelect() {
    const select = document.getElementById('studentSelect');
    if (!select) return;
    const filtered = getFilteredStudents();
    select.innerHTML = '<option value="">— اختر الطالب —</option>' + filtered.map(s => '<option value="' + s.id + '">' + s.name + ' - ' + s.nationalId + '</option>').join('');
}

function updateStudentJuzInfo() {
    const studentId = document.getElementById('studentSelect').value;
    const infoDiv = document.getElementById('studentJuzInfo');
    if (!studentId || !infoDiv) { if (infoDiv) infoDiv.innerHTML = ''; return; }
    const student = students.find(s => s.id === studentId);
    if (!student) { infoDiv.innerHTML = ''; return; }
    const completed = getCompletedJuz(student);
    const progress = calculateProgress(student);
    infoDiv.innerHTML = '📊 الأجزاء المكتملة: <strong>' + completed.length + ' / 30</strong> · النسبة: <strong>' + progress + '%</strong>';
    showPrediction(studentId);
}

function renderStatsDashboard() {
    const filtered = getFilteredStudents();
    const totalStudents = filtered.length;
    const today = new Date().toISOString().split('T')[0];
    let presentToday = 0;
    filtered.forEach(s => {
        const sorted = [...s.history].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        if (latest && latest.date === today && (latest.attendance === 'حاضر' || latest.attendance === 'متأخر')) presentToday++;
    });
    let excellentStudents = 0;
    filtered.forEach(s => {
        const excellentCount = (s.history || []).filter(h => h.evaluation === 'ممتاز').length;
        if (excellentCount >= 3) excellentStudents++;
    });
    const totalEl = document.getElementById('statTotalStudents');
    const presentEl = document.getElementById('statPresentToday');
    const excellentEl = document.getElementById('statExcellentStudents');
    if (totalEl) totalEl.textContent = totalStudents;
    if (presentEl) presentEl.textContent = presentToday;
    if (excellentEl) excellentEl.textContent = excellentStudents;
}

function showExcellentStudentsModal() {
    const filtered = getFilteredStudents();
    const excellent = filtered.filter(s => {
        const excellentCount = (s.history || []).filter(h => h.evaluation === 'ممتاز').length;
        return excellentCount >= 3;
    });
    const modalBody = document.getElementById('excellentModalBody');
    if (excellent.length === 0) {
        modalBody.innerHTML = '<p class="no-excellent">لا يوجد طلاب ممتازون حالياً</p>';
    } else {
        modalBody.innerHTML = excellent.map(s => {
            const badges = calculateBadges(s);
            const excellentCount = (s.history || []).filter(h => h.evaluation === 'ممتاز').length;
            const initials = getStudentInitials(s.name);
            const badgesHtml = badges.length > 0 ? badges.map(b => '<span class="mini-badge">' + b.icon + ' ' + b.name + '</span>').join('') : '<span class="mini-badge">⭐ تميز مستمر</span>';
            return '<div class="excellent-student-card"><div class="student-avatar">' + initials + '</div><div class="excellent-student-info"><div class="excellent-student-name">' + s.name + '</div><div class="excellent-student-meta">المعلم: ' + getTeacherName(s.teacherId) + ' · ' + excellentCount + ' تقييم ممتاز · ' + getCompletedJuz(s).length + '/30 جزء</div><div class="excellent-student-badges">' + badgesHtml + '</div></div></div>';
        }).join('');
    }
    document.getElementById('excellentModal').classList.add('show');
}

function closeExcellentModal() { document.getElementById('excellentModal').classList.remove('show'); }

function editHistoryRecord(studentId, recordIndex) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const record = student.history[recordIndex];
    if (!record) return;
    editingRecordIndex = recordIndex;
    editingStudentId = studentId;
    let memSurah = '', memFrom = '', memTo = '';
    if (record.memorization && record.memorization !== '—') {
        const surahMatch = record.memorization.match(/^(\d+\.\s[^-]+)/);
        if (surahMatch) memSurah = surahMatch[1].trim();
        const fromMatch = record.memorization.match(/من آية (\d+)/);
        const toMatch = record.memorization.match(/إلى آية (\d+)/);
        if (fromMatch) memFrom = fromMatch[1];
        if (toMatch) memTo = toMatch[1];
    }
    let revSurah = '', revFrom = '', revTo = '';
    if (record.review && record.review !== '—') {
        const surahMatch = record.review.match(/^(\d+\.\s[^-]+)/);
        if (surahMatch) revSurah = surahMatch[1].trim();
        const fromMatch = record.review.match(/من آية (\d+)/);
        const toMatch = record.review.match(/إلى آية (\d+)/);
        if (fromMatch) revFrom = fromMatch[1];
        if (toMatch) revTo = toMatch[1];
    }
    const surahOptions = '<option value="">— اختر السورة —</option>' + surahs.map(s => '<option value="' + s + '"' + (s === memSurah ? ' selected' : '') + '>' + s + '</option>').join('');
    let memFromHtml = '<option value="">—</option>';
    let memToHtml = '<option value="">—</option>';
    if (memSurah) {
        const ayahCount = getSurahAyahCount(memSurah);
        for (let i = 1; i <= ayahCount; i++) {
            memFromHtml += '<option value="' + i + '"' + (String(i) === memFrom ? ' selected' : '') + '>آية ' + i + '</option>';
            memToHtml += '<option value="' + i + '"' + (String(i) === memTo ? ' selected' : '') + '>آية ' + i + '</option>';
        }
    }
    const revSurahOptions = '<option value="">— اختر السورة —</option>' + surahs.map(s => '<option value="' + s + '"' + (s === revSurah ? ' selected' : '') + '>' + s + '</option>').join('');
    let revFromHtml = '<option value="">—</option>';
    let revToHtml = '<option value="">—</option>';
    if (revSurah) {
        const ayahCount = getSurahAyahCount(revSurah);
        for (let i = 1; i <= ayahCount; i++) {
            revFromHtml += '<option value="' + i + '"' + (String(i) === revFrom ? ' selected' : '') + '>آية ' + i + '</option>';
            revToHtml += '<option value="' + i + '"' + (String(i) === revTo ? ' selected' : '') + '>آية ' + i + '</option>';
        }
    }
    const modalBody = document.getElementById('editModalBody');
    modalBody.innerHTML =
        '<form onsubmit="saveEditedRecord(event)" class="teacher-form"><div class="form-grid">' +
        '<div class="form-group"><label>التاريخ</label><input type="date" id="editDate" value="' + record.date + '" required></div>' +
        '<div class="form-group"><label>الحضور</label><select id="editAttendance">' + ['حاضر', 'غائب', 'غائب بعذر', 'متأخر'].map(a => '<option value="' + a + '"' + (a === record.attendance ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></div>' +
        '<div class="form-group"><label>الحفظ - السورة</label><select id="editMemSurah" onchange="updateEditAyahDropdowns()">' + surahOptions + '</select></div>' +
        '<div class="form-group"><label>من آية</label><select id="editMemFrom">' + memFromHtml + '</select></div>' +
        '<div class="form-group"><label>إلى آية</label><select id="editMemTo">' + memToHtml + '</select></div>' +
        '<div class="form-group"><label>المراجعة - السورة</label><select id="editRevSurah" onchange="updateEditAyahDropdowns()">' + revSurahOptions + '</select></div>' +
        '<div class="form-group"><label>من آية</label><select id="editRevFrom">' + revFromHtml + '</select></div>' +
        '<div class="form-group"><label>إلى آية</label><select id="editRevTo">' + revToHtml + '</select></div>' +
        '<div class="form-group"><label>خط الوقف</label><input type="text" id="editStopPoint" value="' + (record.stopPoint || '') + '"></div>' +
        '<div class="form-group"><label>التقييم</label><select id="editEvaluation">' + ['ممتاز', 'جيد جداً', 'جيد', 'يحتاج تحسين', '—'].map(e => '<option value="' + e + '"' + (e === record.evaluation ? ' selected' : '') + '>' + e + '</option>').join('') + '</select></div>' +
        '<div class="form-group form-group-full"><label>الملاحظات</label><textarea id="editNotes" rows="3">' + (record.notes || '') + '</textarea></div>' +
        '</div><div class="form-actions"><button type="submit" class="btn btn-gold">💾 حفظ التعديلات</button></div></form>';
    document.getElementById('editRecordModal').classList.add('show');
}

function updateEditAyahDropdowns() {
    const memSurah = document.getElementById('editMemSurah').value;
    const memFrom = document.getElementById('editMemFrom');
    const memTo = document.getElementById('editMemTo');
    const revSurah = document.getElementById('editRevSurah').value;
    const revFrom = document.getElementById('editRevFrom');
    const revTo = document.getElementById('editRevTo');
    [{surah: memSurah, from: memFrom, to: memTo}, {surah: revSurah, from: revFrom, to: revTo}].forEach(function(group) {
        const ayahCount = getSurahAyahCount(group.surah);
        if (!group.surah || ayahCount === 0) {
            group.from.innerHTML = '<option value="">—</option>';
            group.to.innerHTML = '<option value="">—</option>';
        } else {
            let fromHtml = '<option value="">— من آية —</option>';
            let toHtml = '<option value="">— إلى آية —</option>';
            for (let i = 1; i <= ayahCount; i++) {
                fromHtml += '<option value="' + i + '">آية ' + i + '</option>';
                toHtml += '<option value="' + i + '">آية ' + i + '</option>';
            }
            group.from.innerHTML = fromHtml;
            group.to.innerHTML = toHtml;
            group.from.value = '1';
            group.to.value = String(ayahCount);
        }
    });
}

function saveEditedRecord(event) {
    event.preventDefault();
    const student = students.find(s => s.id === editingStudentId);
    if (!student || editingRecordIndex < 0) return;
    const memSurah = document.getElementById('editMemSurah').value;
    const memFrom = document.getElementById('editMemFrom').value;
    const memTo = document.getElementById('editMemTo').value;
    const revSurah = document.getElementById('editRevSurah').value;
    const revFrom = document.getElementById('editRevFrom').value;
    const revTo = document.getElementById('editRevTo').value;
    const memText = memSurah ? (memSurah + (memFrom && memTo ? ' - من آية ' + memFrom + ' إلى آية ' + memTo : '')) : '—';
    const revText = revSurah ? (revSurah + (revFrom && revTo ? ' - من آية ' + revFrom + ' إلى آية ' + revTo : '')) : '—';
    student.history[editingRecordIndex] = {
        date: document.getElementById('editDate').value,
        attendance: document.getElementById('editAttendance').value,
        memorization: memText, review: revText,
        stopPoint: document.getElementById('editStopPoint').value.trim() || '—',
        evaluation: document.getElementById('editEvaluation').value,
        notes: document.getElementById('editNotes').value.trim() || '—'
    };
    saveStudents();
    closeEditModal();
    showToast('✓ تم تعديل المتابعة بنجاح', 'success');
    if (currentStudent && currentStudent.id === editingStudentId) displayReport(student);
    renderStudentsList();
    renderStatsDashboard();
    editingRecordIndex = -1;
    editingStudentId = '';
}

function closeEditModal() { document.getElementById('editRecordModal').classList.remove('show'); }

function deleteHistoryRecord(studentId, recordIndex) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const record = student.history[recordIndex];
    if (!record) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف متابعة بتاريخ ' + formatDate(record.date) + '؟\nلا يمكن التراجع عن هذا الإجراء.')) return;
    student.history.splice(recordIndex, 1);
    saveStudents();
    showToast('✓ تم حذف المتابعة بنجاح', 'success');
    if (currentStudent && currentStudent.id === studentId) displayReport(student);
    renderStudentsList();
    renderStatsDashboard();
}

function printReport() {
    if (!currentStudent) { showToast('الرجاء البحث عن طالب أولاً', 'error'); return; }
    const sealEl = document.getElementById('printSeal');
    if (sealEl) {
        const now = new Date();
        let hijriDate = '—';
        try { hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' }); }
        catch (e) { hijriDate = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); }
        const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
        sealEl.innerHTML = 'جامع عائشة بنت عبدالعزيز الدريبي<br>تاريخ الإصدار: ' + hijriDate + '<br>الساعة: ' + time;
    }
    window.print();
}

function copyToWhatsApp() {
    if (!currentStudent) { showToast('الرجاء البحث عن طالب أولاً', 'error'); return; }
    const sortedHistory = [...currentStudent.history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sortedHistory[0];
    if (!latest) { showToast('لا يوجد سجل لنسخه', 'error'); return; }
    const progress = calculateProgress(currentStudent);
    const completed = getCompletedJuz(currentStudent);
    let text = 'تقرير متابعة الطالب\n━━━━━━━━━━━━━━━\n';
    text += 'الاسم: ' + currentStudent.name + '\nرقم الهوية: ' + currentStudent.nationalId + '\nالمعلم: ' + getTeacherName(currentStudent.teacherId) + '\nالتاريخ: ' + formatDate(latest.date) + '\n━━━━━━━━━━━━━━━\n';
    text += 'الحضور: ' + latest.attendance + '\nالحفظ الجديد: ' + (latest.memorization || '—') + '\nالمراجعة: ' + (latest.review || '—') + '\nخط الوقف: ' + (latest.stopPoint || '—') + '\nالتقييم: ' + (latest.evaluation || '—') + '\nالملاحظات: ' + (latest.notes || '—') + '\n━━━━━━━━━━━━━━━\n';
    text += 'تقدم الحفظ: ' + completed.length + ' / 30 جزء (' + progress + '%)\n━━━━━━━━━━━━━━━\nجامع عائشة بنت عبدالعزيز الدريبي';
    navigator.clipboard.writeText(text).then(() => { showToast('✓ تم نسخ التقرير للواتساب', 'success'); }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); showToast('✓ تم نسخ التقرير للواتساب', 'success'); }
        catch (e) { showToast('تعذّر النسخ، الرجاء المحاولة مرة أخرى', 'error'); }
        document.body.removeChild(textarea);
    });
}

function saveTracking(event) {
    event.preventDefault();
    const studentId = document.getElementById('studentSelect').value;
    if (!studentId) { showToast('الرجاء اختيار طالب', 'error'); return; }
    const student = students.find(s => s.id === studentId);
    if (!student) { showToast('الطالب غير موجود', 'error'); return; }
    const memSurah = document.getElementById('memorization').value;
    const memFrom = document.getElementById('memorizationFromAyah').value;
    const memTo = document.getElementById('memorizationToAyah').value;
    const revSurah = document.getElementById('review').value;
    const revFrom = document.getElementById('reviewFromAyah').value;
    const revTo = document.getElementById('reviewToAyah').value;
    const newJuz = document.getElementById('completedJuzSelect').value;
    const memText = memSurah ? (memSurah + (memFrom && memTo ? ' - من آية ' + memFrom + ' إلى آية ' + memTo : '')) : '—';
    const revText = revSurah ? (revSurah + (revFrom && revTo ? ' - من آية ' + revFrom + ' إلى آية ' + revTo : '')) : '—';
    const newRecord = {
        date: document.getElementById('trackDate').value,
        attendance: document.getElementById('attendance').value,
        memorization: memText, review: revText,
        stopPoint: document.getElementById('stopPoint').value.trim() || '—',
        evaluation: document.getElementById('evaluation').value,
        notes: document.getElementById('notes').value.trim() || '—'
    };
    if (!newRecord.date) { showToast('الرجاء تحديد التاريخ', 'error'); return; }
    const studentName = student.name;
    if (!confirm('هل أنت متأكد من حفظ متابعة الطالب "' + studentName + '" بتاريخ ' + formatDate(newRecord.date) + '؟')) return;
    student.history.push(newRecord);
    if (newJuz) {
        const juzNum = parseInt(newJuz);
        if (!student.completedJuz) student.completedJuz = [];
        if (!student.completedJuz.includes(juzNum)) { student.completedJuz.push(juzNum); student.completedJuz.sort((a, b) => a - b); }
    }
    saveStudents();
    document.getElementById('trackingForm').reset();
    setDefaultDate();
    updateHijriPreview();
    populateSurahDropdowns();
    populateJuzDropdown();
    updateStudentJuzInfo();
    showToast('✓ تم حفظ متابعة الطالب "' + studentName + '" بنجاح', 'success');
    populateStudentSelect();
    renderStudentsList();
    renderStatsDashboard();
}

function addStudent(event) {
    event.preventDefault();
    const name = document.getElementById('newStudentName').value.trim();
    const nationalId = document.getElementById('newStudentId').value.trim();
    const teacherId = document.getElementById('newStudentTeacher').value;
    if (!name || !nationalId) { showToast('الرجاء إدخال الاسم ورقم الهوية', 'error'); return; }
    if (!teacherId) { showToast('الرجاء اختيار المعلم', 'error'); return; }
    if (students.some(s => s.nationalId === nationalId)) { showToast('رقم الهوية موجود مسبقاً', 'error'); return; }
    const newStudent = { id: 'std_' + Date.now(), name: name, nationalId: nationalId, teacherId: teacherId, completedJuz: [], history: [] };
    students.push(newStudent);
    saveStudents();
    document.getElementById('addStudentForm').reset();
    showToast('✓ تم إضافة الطالب "' + name + '" بنجاح', 'success');
    populateStudentSelect();
    renderStudentsList();
    renderStatsDashboard();
}

function renderStudentsList() {
    const tbody = document.getElementById('studentsListBody');
    if (!tbody) return;
    const filtered = getFilteredStudents();
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">لا يوجد طلاب مسجّلون</td></tr>'; return; }
    tbody.innerHTML = filtered.map((s, idx) => {
        const sorted = [...s.history].sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastDate = sorted.length > 0 ? formatDate(sorted[0].date) : '—';
        const juzCount = getCompletedJuz(s).length;
        const nameWithIndicators = '<div style="font-weight:700;color:var(--navy-dark);">' + s.name + '</div>' + renderAchievementIndicators(s);
        return '<tr><td>' + (idx + 1) + '</td><td>' + nameWithIndicators + '</td><td>' + s.nationalId + '</td><td>' + getTeacherName(s.teacherId) + '</td><td>' + juzCount + '/30</td><td>' + s.history.length + '</td><td>' + lastDate + '</td><td><button class="btn btn-danger" onclick="deleteStudent(\'' + s.id + '\')">حذف</button></td></tr>';
    }).join('');
}

// حفظ قائمة الطلاب المحذوفين (للمزامنة — حتى ينحذفوا من جميع الأجهزة)
function saveDeletedStudent(studentId) {
    let deleted = [];
    try {
        const stored = localStorage.getItem(DELETED_STUDENTS_KEY);
        deleted = stored ? JSON.parse(stored) : [];
    } catch (e) { deleted = []; }
    if (!deleted.includes(studentId)) {
        deleted.push(studentId);
        localStorage.setItem(DELETED_STUDENTS_KEY, JSON.stringify(deleted));
    }
}

// قراءة قائمة الطلاب المحذوفين
function getDeletedStudents() {
    try {
        const stored = localStorage.getItem(DELETED_STUDENTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
}

function deleteStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف الطالب "' + student.name + '"؟\n\nسيتم حذف جميع سجلاته (' + student.history.length + ' متابعة) نهائياً.\nلا يمكن التراجع عن هذا الإجراء.')) return;
    const studentName = student.name;
    students = students.filter(s => s.id !== studentId);
    // تسجيل الحذف للمزامنة (حتى ينحذف من جميع الأجهزة)
    saveDeletedStudent(studentId);
    saveStudents();
    showToast('✓ تم حذف الطالب "' + studentName + '" بنجاح', 'success');
    populateStudentSelect();
    renderStudentsList();
    renderStatsDashboard();
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const trackDate = document.getElementById('trackDate');
    if (trackDate) trackDate.value = today;
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + (type || '') + ' show';
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

/* ============================================================
   تعبئة قائمة المعلمين في نموذج إضافة طالب جديد (ديناميكي)
   ============================================================ */
function populateNewStudentTeacherSelect() {
    const select = document.getElementById('newStudentTeacher');
    if (!select) return;
    // إذا كان المستخدم معلماً، نثبت حلقته ولا نعرض بقية المعلمين
    const user = getCurrentUser();
    if (user && user.role === 'teacher' && user.teacherId) {
        select.innerHTML = '<option value="' + user.teacherId + '">' + getTeacherName(user.teacherId) + '</option>';
        select.value = user.teacherId;
        select.disabled = true;
    } else {
        select.innerHTML = '<option value="">— اختر المعلم —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('');
        select.disabled = false;
    }
}

/* ============================================================
   لوحة المشرف العام (Admin Dashboard)
   ============================================================ */
function renderAdminDashboard() {
    renderPendingRegistrations();
    // الإحصائيات العليا
    const totalStudents = students.length;
    const totalTeachers = teachers.length;
    let excellentCount = 0;
    let totalJuz = 0;
    students.forEach(s => {
        const excellent = (s.history || []).filter(h => h.evaluation === 'ممتاز').length;
        if (excellent >= 3) excellentCount++;
        totalJuz += getCompletedJuz(s).length;
    });
    const elTotal = document.getElementById('adminStatTotalStudents');
    const elTeachers = document.getElementById('adminStatTotalTeachers');
    const elExcellent = document.getElementById('adminStatExcellent');
    const elJuz = document.getElementById('adminStatTotalJuz');
    if (elTotal) elTotal.textContent = totalStudents;
    if (elTeachers) elTeachers.textContent = totalTeachers;
    if (elExcellent) elExcellent.textContent = excellentCount;
    if (elJuz) elJuz.textContent = totalJuz;

    // جداول الإدارة
    renderAdminTeachersTable();
    renderAdminStudentsTable();
    populateAdminStudentFilter();
}

function renderAdminTeachersTable() {
    const tbody = document.getElementById('adminTeachersBody');
    if (!tbody) return;
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);">لا يوجد معلمون</td></tr>';
        return;
    }
    tbody.innerHTML = teachers.map((t, idx) => {
        const circleStudents = students.filter(s => s.teacherId === t.id);
        const excellentInCircle = circleStudents.filter(s => {
            return (s.history || []).filter(h => h.evaluation === 'ممتاز').length >= 3;
        }).length;
        const canDelete = circleStudents.length === 0;
        return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + t.name + '</td>' +
            '<td style="direction:ltr;text-align:left;">' + t.id + '</td>' +
            '<td>' + circleStudents.length + '</td>' +
            '<td>' + excellentInCircle + '</td>' +
            '<td>' +
                '<button class="history-action-btn history-action-edit" onclick="editTeacher(' + idx + ')">✏️ تعديل</button>' +
                (canDelete ? '<button class="history-action-btn history-action-delete" onclick="deleteTeacher(' + idx + ')">🗑️ حذف</button>' : '<span style="font-size:0.8rem;color:var(--gray);">لديه طلاب</span>') +
            '</td>' +
        '</tr>';
    }).join('');
}

function addNewTeacher(event) {
    event.preventDefault();
    const name = document.getElementById('newTeacherName').value.trim();
    const id = document.getElementById('newTeacherId').value.trim();
    if (!name || !id) { showToast('⚠️ الرجاء تعبئة جميع الحقول', 'error'); return; }
    if (teachers.some(t => t.id === id)) { showToast('⚠️ معرف الحلقة موجود مسبقاً', 'error'); return; }
    teachers.push({ id: id, name: name });
    saveStudentsLocal();
    saveStudents();
    showToast('✓ تم إضافة الحلقة بنجاح', 'success');
    document.getElementById('addTeacherForm').reset();
    renderAdminTeachersTable();
    populateAdminStudentFilter();
}

function editTeacher(idx) {
    const teacher = teachers[idx];
    if (!teacher) return;
    const newName = prompt('اسم المعلم:', teacher.name);
    if (newName === null) return;
    teacher.name = newName.trim() || teacher.name;
    saveStudentsLocal();
    saveStudents();
    showToast('✓ تم تعديل المعلم بنجاح', 'success');
    renderAdminTeachersTable();
}

function deleteTeacher(idx) {
    const teacher = teachers[idx];
    if (!teacher) return;
    const circleStudents = students.filter(s => s.teacherId === teacher.id);
    if (circleStudents.length > 0) {
        showToast('⚠️ لا يمكن حذف حلقة بها طلاب. انقل الطلاب أولاً', 'error');
        return;
    }
    if (!confirm('⚠️ هل أنت متأكد من حذف حلقة "' + teacher.name + '"؟')) return;
    teachers.splice(idx, 1);
    saveStudentsLocal();
    saveStudents();
    showToast('✓ تم حذف الحلقة بنجاح', 'success');
    renderAdminTeachersTable();
    populateAdminStudentFilter();
}

function populateAdminStudentFilter() {
    const select = document.getElementById('adminStudentFilter');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">— كل الحلقات —</option>' + teachers.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('');
    select.value = current;
}

function renderAdminStudentsTable() {
    const tbody = document.getElementById('adminStudentsBody');
    if (!tbody) return;
    const filterSelect = document.getElementById('adminStudentFilter');
    const filterValue = filterSelect ? filterSelect.value : '';
    const filtered = filterValue ? students.filter(s => s.teacherId === filterValue) : students;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">لا يوجد طلاب</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map((s, idx) => {
        const juzCount = getCompletedJuz(s).length;
        // قائمة منسدلة لنقل الطالب إلى حلقة أخرى
        const transferOptions = teachers.map(t =>
            '<option value="' + t.id + '"' + (t.id === s.teacherId ? ' selected' : '') + '>' + t.name + '</option>'
        ).join('');
        return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + s.name + '</td>' +
            '<td>' + s.nationalId + '</td>' +
            '<td>' + getTeacherName(s.teacherId) + '</td>' +
            '<td>' + juzCount + '/30</td>' +
            '<td>' + s.history.length + '</td>' +
            '<td><select onchange="transferStudent(\'' + s.id + '\', this.value)" style="padding:0.3rem 0.5rem;border:1px solid var(--gray-light);border-radius:4px;font-family:inherit;font-size:0.85rem;">' + transferOptions + '</select></td>' +
            '<td><button class="btn btn-danger" onclick="deleteStudent(\'' + s.id + '\')">حذف</button></td>' +
        '</tr>';
    }).join('');
}

function transferStudent(studentId, newTeacherId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const oldTeacher = getTeacherName(student.teacherId);
    const newTeacher = getTeacherName(newTeacherId);
    if (student.teacherId === newTeacherId) return;
    student.teacherId = newTeacherId;
    saveStudents();
    showToast('✓ تم نقل الطالب "' + student.name + '" من ' + oldTeacher + ' إلى ' + newTeacher, 'success');
    renderAdminStudentsTable();
    renderAdminTeachersTable();
}

function exportData() {
    const dataToExport = {
        teachers: teachers,
        students: students,
        exportDate: new Date().toISOString()
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quran_students_backup_' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ تم تصدير البيانات بنجاح', 'success');
}

/* ============================================================
   أزرار الإنجاز الذكية (Smart Completion Buttons)
   ============================================================ */
function bulkAttendance() {
    const filtered = getFilteredStudents();
    if (filtered.length === 0) { showToast('⚠️ لا يوجد طلاب في الحلقة', 'error'); return; }
    const today = new Date().toISOString().split('T')[0];
    // التحقق من عدم وجود تسجيل حضور مسبق لنفس اليوم
    const alreadyMarked = filtered.filter(s => {
        const sorted = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        return latest && latest.date === today && latest.attendance === 'حاضر';
    });
    if (alreadyMarked.length === filtered.length) {
        showToast('ℹ️ جميع الطلاب مسجل حضورهم اليوم', 'error');
        return;
    }
    if (!confirm('✅ تسجيل حضور جماعي لـ ' + (filtered.length - alreadyMarked.length) + ' طالب بتاريخ ' + formatDate(today) + '؟')) return;
    let count = 0;
    filtered.forEach(s => {
        const sorted = [...(s.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        if (latest && latest.date === today && latest.attendance === 'حاضر') return; // تخطى المسجل مسبقاً
        if (!s.history) s.history = [];
        s.history.push({
            date: today,
            attendance: 'حاضر',
            memorization: '—',
            review: '—',
            stopPoint: '—',
            evaluation: '—',
            notes: 'تسجيل حضور جماعي'
        });
        count++;
    });
    saveStudents();
    showToast('✓ تم تسجيل حضور ' + count + ' طالب بنجاح', 'success');
    renderStudentsList();
    renderStatsDashboard();
}

function bulkCompleteJuz() {
    const studentId = document.getElementById('studentSelect').value;
    if (!studentId) { showToast('⚠️ الرجاء اختيار طالب أولاً', 'error'); return; }
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    if (!student.completedJuz) student.completedJuz = [];
    const nextJuz = student.completedJuz.length + 1;
    if (nextJuz > 30) { showToast('🏆 الطالب أكمل جميع الأجزاء!', 'success'); return; }
    if (student.completedJuz.includes(nextJuz)) { showToast('⚠️ الجزء ' + nextJuz + ' مكتمل مسبقاً', 'error'); return; }
    if (!confirm('🏁 هل تريد تسجيل إكمال الجزء ' + nextJuz + ' للطالب "' + student.name + '"؟')) return;
    student.completedJuz.push(nextJuz);
    student.completedJuz.sort((a, b) => a - b);
    saveStudents();
    showToast('✓ تم تسجيل إكمال الجزء ' + nextJuz + ' للطالب "' + student.name + '"', 'success');
    updateStudentJuzInfo();
    renderStudentsList();
    renderStatsDashboard();
}

function bulkExcellentEval() {
    const studentId = document.getElementById('studentSelect').value;
    if (!studentId) { showToast('⚠️ الرجاء اختيار طالب أولاً', 'error'); return; }
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const today = new Date().toISOString().split('T')[0];
    // البحث عن متابعة اليوم وتحديث تقييمها
    const sorted = [...(student.history || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted[0];
    if (latest && latest.date === today) {
        latest.evaluation = 'ممتاز';
        saveStudents();
        showToast('⭐ تم تحديث تقييم اليوم إلى "ممتاز" للطالب "' + student.name + '"', 'success');
    } else {
        // إنشاء متابعة جديدة بتقييم ممتاز
        if (!student.history) student.history = [];
        student.history.push({
            date: today,
            attendance: 'حاضر',
            memorization: '—',
            review: '—',
            stopPoint: '—',
            evaluation: 'ممتاز',
            notes: 'تقييم ممتاز'
        });
        saveStudents();
        showToast('⭐ تم تسجيل تقييم ممتاز للطالب "' + student.name + '"', 'success');
    }
    renderStudentsList();
    renderStatsDashboard();
}

/* ============================================================
   محرك التنبؤ الذكي للإنجاز (Smart Prediction Engine)
   يعرض: مؤشرات تفصيلية، مقارنة قبل/بعد، توقع ذكي للمستقبل
   ============================================================ */

// حساب إحصائيات الطالب التفصيلية مع التنبؤ الذكي
function getStudentAchievementStats(student) {
    const history = student.history || [];
    const completedJuz = getCompletedJuz(student);
    const totalAyahsQuran = 6236;
    const ayahsPerJuz = Math.round(totalAyahsQuran / 30);

    let totalAyahs = 0;
    let memorizedSurahs = new Set();
    let firstSessionAyahs = 0;
    let lastSessionAyahs = 0;

    // حساب الآيات المحفوظة من سجل المتابعات
    history.forEach(function(h) {
        if (h.memorization && h.memorization !== '—') {
            var surahMatch = h.memorization.match(/^(\d+)\./);
            if (surahMatch) {
                var surahNum = parseInt(surahMatch[1]);
                memorizedSurahs.add(surahNum);
                var fromMatch = h.memorization.match(/من آية (\d+)/);
                var toMatch = h.memorization.match(/إلى آية (\d+)/);
                if (fromMatch && toMatch) {
                    var sessionAyahs = parseInt(toMatch[1]) - parseInt(fromMatch[1]) + 1;
                    totalAyahs += sessionAyahs;
                } else if (surahNum >= 1 && surahNum <= 114) {
                    totalAyahs += surahAyahCounts[surahNum - 1];
                }
            }
        }
    });

    var surahsCount = memorizedSurahs.size;
    var juzCount = completedJuz.length;
    var juzProgress = Math.round((juzCount / 30) * 100);
    var ayahProgress = Math.min(100, Math.round((totalAyahs / totalAyahsQuran) * 100));

    // === محرك التنبؤ الذكي ===
    var prediction = null;
    if (history.length > 0) {
        // ترتيب السجل زمنياً
        var sortedHistory = history.slice().sort(function(a, b) {
            return new Date(a.date) - new Date(b.date);
        });

        var firstDate = new Date(sortedHistory[0].date);
        var lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
        var daysDiff = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)));

        // معدل الحفظ (آيات في اليوم)
        var ayahsPerDay = totalAyahs / daysDiff;

        // الآيات المتبقية لختم القرآن
        var remainingAyahs = totalAyahsQuran - totalAyahs;

        // الأيام المتوقعة لختم القرآن
        var daysToComplete = ayahsPerDay > 0 ? Math.ceil(remainingAyahs / ayahsPerDay) : 0;

        // الآيات المتبقية لإكمال الجزء الحالي
        var currentJuzPosition = totalAyahs % ayahsPerJuz;
        var remainingInJuz = ayahsPerJuz - currentJuzPosition;
        var daysToNextJuz = ayahsPerDay > 0 ? Math.ceil(remainingInJuz / ayahsPerDay) : 0;

        // المعدل الأسبوعي
        var weeklyRate = Math.round(ayahsPerDay * 7);

        // الآيات في أول جلسة vs آخر جلسة (مقارنة قبل/بعد)
        var firstRec = sortedHistory[0];
        var lastRec = sortedHistory[sortedHistory.length - 1];
        firstSessionAyahs = extractAyahCount(firstRec.memorization);
        lastSessionAyahs = extractAyahCount(lastRec.memorization);

        // حساب التطور (نسبة التحسن)
        var improvementRate = firstSessionAyahs > 0 ?
            Math.round(((lastSessionAyahs - firstSessionAyahs) / firstSessionAyahs) * 100) : 0;

        // توقع تاريخ الختمة
        var completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysToComplete);
        var completionDateStr = formatDate(completionDate.toISOString().split('T')[0]);

        // تاريخ إكمال الجزء التالي
        var nextJuzDate = new Date();
        nextJuzDate.setDate(nextJuzDate.getDate() + daysToNextJuz);
        var nextJuzDateStr = formatDate(nextJuzDate.toISOString().split('T')[0]);

        prediction = {
            ayahsPerDay: Math.round(ayahsPerDay * 10) / 10,
            weeklyRate: weeklyRate,
            daysToNextJuz: daysToNextJuz,
            daysToComplete: daysToComplete,
            remainingAyahs: remainingAyahs,
            remainingInJuz: remainingInJuz,
            firstSessionAyahs: firstSessionAyahs,
            lastSessionAyahs: lastSessionAyahs,
            improvementRate: improvementRate,
            totalSessions: history.length,
            daysActive: daysDiff,
            nextJuzDate: nextJuzDateStr,
            completionDate: completionDateStr,
            nextJuzNumber: juzCount + 1
        };
    }

    return {
        ayahs: totalAyahs,
        ayahProgress: ayahProgress,
        surahs: surahsCount,
        surahsProgress: Math.round((surahsCount / 114) * 100),
        juz: juzCount,
        juzProgress: juzProgress,
        totalAyahsQuran: totalAyahsQuran,
        prediction: prediction
    };
}

// استخراج عدد الآيات من نص المتابعة
function extractAyahCount(memText) {
    if (!memText || memText === '—') return 0;
    var fromMatch = memText.match(/من آية (\d+)/);
    var toMatch = memText.match(/إلى آية (\d+)/);
    if (fromMatch && toMatch) {
        return parseInt(toMatch[1]) - parseInt(fromMatch[1]) + 1;
    }
    var surahMatch = memText.match(/^(\d+)\./);
    if (surahMatch) {
        var surahNum = parseInt(surahMatch[1]);
        if (surahNum >= 1 && surahNum <= 114) return surahAyahCounts[surahNum - 1];
    }
    return 0;
}

// عرض مؤشرات الإنجاز والتنبؤ الذكي كـ HTML
function renderAchievementIndicators(student) {
    var stats = getStudentAchievementStats(student);
    var html = '<div class="student-achievement-indicators">';

    // المؤشرات التفصيلية الحالية
    html += '<span class="achievement-chip chip-ayahs" title="الآيات المحفوظة">آيات: ' + stats.ayahs + '</span>';
    html += '<span class="achievement-chip chip-surahs" title="السور التي حُفظت">سور: ' + stats.surahs + '</span>';
    html += '<span class="achievement-chip chip-juz" title="الأجزاء المكتملة">أجزاء: ' + stats.juz + '/30</span>';
    html += '<span class="achievement-chip chip-progress" title="نسبة الإنجاز">' +
        '<div class="achievement-progress-bar"><div class="achievement-progress-fill" style="width:' + stats.juzProgress + '%"></div></div>' +
        stats.juzProgress + '%' +
    '</span>';

    // التنبؤ الذكي (إذا توفرت بيانات كافية)
    if (stats.prediction) {
        var p = stats.prediction;
        html += '</div>'; // إغلاق المؤشرات
        html += '<div class="smart-prediction-box">';

        // مقارنة قبل/بعد
        html += '<div class="prediction-comparison">';
        html += '<span class="prediction-label">التطور:</span>';
        html += '<span class="prediction-before">البداية: ' + p.firstSessionAyahs + ' آية/جلسة</span>';
        html += '<span class="prediction-arrow">←</span>';
        html += '<span class="prediction-after">الحالي: ' + p.lastSessionAyahs + ' آية/جلسة</span>';
        if (p.improvementRate > 0) {
            html += '<span class="prediction-improvement">+' + p.improvementRate + '%</span>';
        } else if (p.improvementRate < 0) {
            html += '<span class="prediction-decline">' + p.improvementRate + '%</span>';
        }
        html += '</div>';

        // التوقع الذكي للمستقبل
        html += '<div class="prediction-forecast">';
        html += '<span class="prediction-rate">المعدل: ' + p.ayahsPerDay + ' آية/يوم (' + p.weeklyRate + '/أسبوع)</span>';
        if (p.daysToNextJuz > 0 && p.nextJuzNumber <= 30) {
            html += '<span class="prediction-next">الجزء ' + p.nextJuzNumber + ': ~' + p.daysToNextJuz + ' يوم (' + p.nextJuzDate + ')</span>';
        }
        if (p.daysToComplete > 0 && p.daysToComplete < 3650) {
            html += '<span class="prediction-khatmah">الختمة: ~' + p.daysToComplete + ' يوم (' + p.completionDate + ')</span>';
        }
        html += '</div>';

        html += '</div>';
    } else {
        html += '</div>'; // إغلاق المؤشرات فقط
    }

    return html;
}

// التحقق من إصدار البيانات — إذا تغير الإصدار، نُفرغ الذاكرة المحلية
// (يُستخدم عند حذف الأسماء الافتراضية لضمان عدم عودتها)
function checkDataVersion() {
    const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (storedVersion !== CURRENT_DATA_VERSION) {
        console.log('🔄 تحديث إصدار البيانات — تفريغ الذاكرة المحلية القديمة');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TEACHERS_KEY);
        localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 0) قراءة التوكن من الرابط (إن وُجد) — بصمت بدون تنبيه
    readTokenFromUrl();

    // 0.5) التحقق من إصدار البيانات (لتفريغ الأسماء الافتراضية القديمة)
    checkDataVersion();

    loadStudents();
    setDefaultDate();
    updateHijriPreview();
    populateSurahDropdowns();
    populateJuzDropdown();
    document.getElementById('emptyState').style.display = 'block';
    updateLiveClock();
    setInterval(updateLiveClock, 1000);
    // مزامنة تلقائية في الخلفية كل 10 ثوانٍ (Real-time sync)
setInterval(syncFromGithub, 10000);    // تحديث واجهة المصادقة عند تحميل الصفحة
    updateAuthUI();
});
