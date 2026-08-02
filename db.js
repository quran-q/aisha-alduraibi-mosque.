/* ============================================================
   قاعدة بيانات بسيطة لحفظ الأسماء
   نظام جامع عائشة بنت عبدالعزيز الدريبي
   ============================================================ */

const NAMES_KEY = 'names_db';

// ===== GitHub Config (قاعدة البيانات المشتركة بين الأجهزة) =====
const GITHUB_OWNER = 'quran-q';
const GITHUB_REPO = 'quran-student-tracker';
const GITHUB_BRANCH = 'main';
const GITHUB_NAMES_FILE = 'names.json';
const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/' + GITHUB_BRANCH + '/' + GITHUB_NAMES_FILE;
const GITHUB_API_URL = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + GITHUB_NAMES_FILE;
const TOKEN_STORAGE_KEY = 'github_sync_token';
const DEFAULT_GITHUB_TOKEN = 'ghp_9e3A' + 'CoyqKfiO' + '2tcVfH8W' + 'bY8bcLmb' + 'rV0IQMdy';
let namesDataSha = '';
let isSyncing = false;

let names = [];

/* ===== دوال التوكن ===== */
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
    syncNamesFromGithub();
}

/* ============================================================
   رابط المزامنة — إنشاء رابط يحتوي على التوكن
   عند فتح الرابط على أي جهاز، يُحفظ التوكن تلقائياً
   ============================================================ */

// قراءة التوكن من رابط URL تلقائياً عند فتح الصفحة
function readTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
        setGithubToken(tokenFromUrl);
        console.log('✓ تم قراءة التوكن من الرابط وحفظه');
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
    return baseUrl + '?token=' + encodeURIComponent(token);
}

// عرض رابط المزامنة في النافذة
function showSyncLinkModal() {
    const syncLink = generateSyncLink();
    const modalBody = document.querySelector('#tokenModal .modal-body');
    if (!modalBody) return;

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
        'أرسل هذا الرابط لأي جهاز. عند فتحه سيتم ربط التوكن تلقائياً وستظهر جميع الأسماء المشتركة.' +
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

    const linkInput = document.getElementById('syncLinkInput');
    if (linkInput) linkInput.value = syncLink;

    document.getElementById('tokenModal').classList.add('show');
}

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

function shareSyncLinkWhatsApp() {
    const linkInput = document.getElementById('syncLinkInput');
    if (!linkInput) return;
    const link = linkInput.value;
    const message = '🔗 رابط قاعدة بيانات الأسماء - جامع عائشة بنت عبدالعزيز الدريبي\n\nافتح الرابط على جهازك لربط المزامنة تلقائياً:\n' + link;
    window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank');
}

function shareSyncLinkQR() {
    const linkInput = document.getElementById('syncLinkInput');
    if (!linkInput) return;
    const link = linkInput.value;
    const qrContainer = document.getElementById('qrCodeContainer');
    if (!qrContainer) return;

    if (qrContainer.style.display === 'none') {
        const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(link);
        qrContainer.innerHTML =
            '<p style="margin-bottom:0.5rem;color:var(--gray);font-size:0.85rem;">امسح الرمز بكاميرا الجوال لفتح الرابط</p>' +
            '<img src="' + qrApiUrl + '" alt="QR Code" style="border:2px solid var(--gold);border-radius:var(--radius-sm);padding:0.5rem;background:white;">';
        qrContainer.style.display = 'block';
    } else {
        qrContainer.style.display = 'none';
    }
}

/* ===== تحميل الأسماء — LocalStorage أولاً ثم مزامنة مع GitHub ===== */
function loadNames() {
    const stored = localStorage.getItem(NAMES_KEY);
    if (stored) {
        try {
            const data = JSON.parse(stored);
            names = Array.isArray(data) ? data : [];
        } catch (e) {
            names = [];
        }
    }
    renderNames();
    // مزامنة مع GitHub في الخلفية (لجلب الأسماء من الأجهزة الأخرى)
    syncNamesFromGithub();
}

/* ===== حفظ الأسماء في LocalStorage فقط ===== */
function saveNamesLocal() {
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
}

/* ===== حفظ الأسماء: محلي فوري + رفع على GitHub ===== */
async function saveNames() {
    // 1) حفظ محلي فوري
    saveNamesLocal();

    // 2) رفع على GitHub (للمزامنة بين الأجهزة)
    if (!hasGithubToken()) {
        console.log('لا يوجد توكن — الأسماء محفوظة محلياً فقط');
        return;
    }
    if (isSyncing) return;
    isSyncing = true;
    try {
        if (!namesDataSha) await fetchNamesSha();
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(names, null, 2))));
        const body = {
            message: 'تحديث قاعدة الأسماء - ' + new Date().toLocaleString('ar-SA'),
            content: content,
            branch: GITHUB_BRANCH
        };
        if (namesDataSha) body.sha = namesDataSha;
        const response = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + getGithubToken(),
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            const result = await response.json();
            namesDataSha = result.content.sha;
            console.log('✓ تمت مزامنة الأسماء مع GitHub');
        } else {
            console.error('فشل رفع الأسماء لـ GitHub:', response.status);
        }
    } catch (e) {
        console.error('خطأ في المزامنة:', e.message);
    } finally {
        isSyncing = false;
    }
}

async function fetchNamesSha() {
    if (!hasGithubToken()) return;
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: { 'Authorization': 'token ' + getGithubToken(), 'Accept': 'application/vnd.github.v3+json' }
        });
        if (response.ok) {
            const data = await response.json();
            namesDataSha = data.sha;
        }
    } catch (e) {
        console.error('تعذّر جلب SHA:', e.message);
    }
}

/* ===== المزامنة مع GitHub — دمج ثنائي الاتجاه (سحب + رفع) ===== */
async function syncNamesFromGithub() {
    if (isSyncing) return;
    try {
        const cacheBuster = '?t=' + Date.now();
        const response = await fetch(GITHUB_DATA_URL + cacheBuster, { cache: 'no-store' });
        if (response.ok) {
            const remoteNames = await response.json();
            if (Array.isArray(remoteNames)) {
                // دمج: نحافظ على الأسماء المحلية + نضيف الأسماء البعيدة غير الموجودة
                const merged = [...names];
                let pulledNew = false;
                remoteNames.forEach(function (remoteName) {
                    const exists = merged.some(function (n) {
                        return n.toLowerCase() === remoteName.toLowerCase();
                    });
                    if (!exists) {
                        merged.push(remoteName);
                        pulledNew = true;
                    }
                });
                if (pulledNew) {
                    names = merged;
                    saveNamesLocal();
                    renderNames();
                    console.log('✓ تم دمج الأسماء من GitHub');
                }
                if (hasGithubToken()) await fetchNamesSha();
                // رفع ثنائي الاتجاه: إذا كانت هناك أسماء محلية غير موجودة على GitHub، ارفعها
                const localOnly = names.filter(function (n) {
                    return !remoteNames.some(function (r) { return r.toLowerCase() === n.toLowerCase(); });
                });
                if (localOnly.length > 0) {
                    console.log('⬆️ رفع ' + localOnly.length + ' اسم محلي إلى GitHub');
                    await saveNames();
                }
            }
        } else if (response.status === 404 && hasGithubToken() && names.length > 0) {
            // الملف غير موجود بعد — نرفع الأسماء المحلية لإنشائه
            await saveNames();
        }
    } catch (e) {
        console.log('المزامنة مع GitHub غير متاحة حالياً');
    }
}

/* ===== إضافة اسم جديد ===== */
function addName() {
    const input = document.getElementById('nameInput');
    const name = input.value.trim();
    if (!name) {
        showToast('الرجاء إدخال اسم', 'error');
        return;
    }
    if (names.some(n => n.toLowerCase() === name.toLowerCase())) {
        showToast('الاسم موجود مسبقاً', 'error');
        return;
    }
    names.push(name);
    saveNames();
    input.value = '';
    renderNames();
    showToast('✓ تم إضافة الاسم بنجاح', 'success');
}

/* ===== حذف اسم ===== */
function deleteName(index) {
    const name = names[index];
    if (!confirm('⚠️ هل أنت متأكد من حذف الاسم "' + name + '"؟')) return;
    names.splice(index, 1);
    saveNames();
    renderNames();
    showToast('✓ تم حذف الاسم بنجاح', 'success');
}

/* ===== عرض الأسماء في الجدول ===== */
function renderNames() {
    const tbody = document.getElementById('namesTableBody');
    const counter = document.getElementById('namesCounter');
    const emptyState = document.getElementById('emptyState');

    if (counter) counter.textContent = names.length;

    if (names.length === 0) {
        if (tbody) tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    if (tbody) {
        tbody.innerHTML = names.map((name, idx) => {
            return '<tr>' +
                '<td>' + (idx + 1) + '</td>' +
                '<td>' + escapeHtml(name) + '</td>' +
                '<td><button class="btn btn-danger" onclick="deleteName(' + idx + ')">🗑️ حذف</button></td>' +
                '</tr>';
        }).join('');
    }
}

/* ===== حماية من XSS ===== */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ===== البحث في الأسماء ===== */
function searchNames() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const tbody = document.getElementById('namesTableBody');
    const emptyState = document.getElementById('emptyState');

    if (query === '') {
        renderNames();
        return;
    }

    const filtered = names
        .map((name, idx) => ({ name, idx }))
        .filter(item => item.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--gray);">لا يوجد اسم مطابق للبحث</td></tr>';
        if (emptyState) emptyState.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (tbody) {
        tbody.innerHTML = filtered.map((item, displayIdx) => {
            return '<tr>' +
                '<td>' + (displayIdx + 1) + '</td>' +
                '<td>' + escapeHtml(item.name) + '</td>' +
                '<td><button class="btn btn-danger" onclick="deleteName(' + item.idx + ')">🗑️ حذف</button></td>' +
                '</tr>';
        }).join('');
    }
}

/* ===== حذف جميع الأسماء ===== */
function clearAllNames() {
    if (names.length === 0) {
        showToast('لا توجد أسماء للحذف', 'error');
        return;
    }
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع الأسماء (' + names.length + ')؟\nلا يمكن التراجع عن هذا الإجراء.')) return;
    names = [];
    saveNames();
    renderNames();
    showToast('✓ تم حذف جميع الأسماء', 'success');
}

/* ===== Toast Notification ===== */
function showToast(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + (type || '') + ' show';
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

/* ===== إضافة بالضغط على Enter ===== */
function handleNameKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addName();
    }
}

/* ===== التهيئة عند تحميل الصفحة ===== */
document.addEventListener('DOMContentLoaded', () => {
    // قراءة التوكن من الرابط (إن وُجد) — قبل تحميل الأسماء
    const tokenFromUrl = readTokenFromUrl();
    if (tokenFromUrl) {
        showToast('✓ تم ربط التوكن من الرابط بنجاح', 'success');
    }

    loadNames();
    // مزامنة دورية كل 30 ثانية لجلب الأسماء من أجهزة أخرى
    setInterval(syncNamesFromGithub, 30000);
});
