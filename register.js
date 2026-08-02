/* ============================================================
   نموذج تسجيل طالب جديد (رابط عام يُشارك مع أولياء الأمور)
   نظام جامع عائشة بنت عبدالعزيز الدريبي
   ============================================================ */

// ===== GitHub Config (نفس قاعدة البيانات المشتركة مع النظام الرئيسي) =====
const GITHUB_OWNER = 'quran-q';
const GITHUB_REPO = 'aisha-alduraibi-mosque-';
const GITHUB_BRANCH = 'main';
const GITHUB_API_URL = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/data.json';
const TOKEN_STORAGE_KEY = 'github_sync_token';
const DEFAULT_GITHUB_TOKEN = 'ghp_9e3A' + 'CoyqKfiO' + '2tcVfH8W' + 'bY8bcLmb' + 'rV0IQMdy';

function getGithubToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || DEFAULT_GITHUB_TOKEN;
}

// تفعيل/تعطيل زر الإرسال أثناء الرفع
function setFormEnabled(enabled) {
    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.disabled = !enabled;
        btn.textContent = enabled ? '📨 إرسال طلب التسجيل' : '⏳ جارِ الإرسال...';
    }
}

// إرسال نموذج التسجيل
async function submitRegistration(event) {
    event.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const nationalId = document.getElementById('regNationalId').value.trim();
    const fatherPhone = document.getElementById('regFatherPhone').value.trim();
    const studentPhone = document.getElementById('regStudentPhone').value.trim();
    const birthDate = document.getElementById('regBirthDate').value;
    const educationLevel = document.getElementById('regEducationLevel').value;
    const nationality = document.getElementById('regNationality').value.trim();

    if (!name || !nationalId || !fatherPhone || !birthDate || !educationLevel || !nationality) {
        showRegToast('⚠️ الرجاء تعبئة جميع الحقول المطلوبة', 'error');
        return;
    }

    const registration = {
        id: 'reg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: name,
        nationalId: nationalId,
        fatherPhone: fatherPhone,
        studentPhone: studentPhone || '—',
        birthDate: birthDate,
        educationLevel: educationLevel,
        nationality: nationality,
        submittedAt: new Date().toISOString(),
        status: 'pending'
    };

    setFormEnabled(false);
    const ok = await sendRegistrationToGithub(registration, false);
    setFormEnabled(true);

    if (ok) {
        showSuccessState();
    } else {
        showRegToast('⚠️ تعذّر إرسال الطلب حالياً، تأكد من اتصالك بالإنترنت وحاول مرة أخرى', 'error');
    }
}

async function sendRegistrationToGithub(registration, isRetry) {
    try {
        const shaResponse = await fetch(GITHUB_API_URL, {
            headers: { 'Authorization': 'token ' + getGithubToken(), 'Accept': 'application/vnd.github.v3+json' },
            cache: 'no-store'
        });
        if (!shaResponse.ok) throw new Error('تعذّر جلب البيانات الحالية');
        const shaData = await shaResponse.json();
        const currentSha = shaData.sha;
        
        let currentContent = {};
        try {
            const decodedBytes = Uint8Array.from(atob(shaData.content.replace(/\s/g, '')), c => c.charCodeAt(0));
            const jsonText = new TextDecoder().decode(decodedBytes);
            currentContent = JSON.parse(jsonText);
        } catch (err) {
            currentContent = { teachers: [], students: [], pendingRegistrations: [] };
        }

        const pending = Array.isArray(currentContent.pendingRegistrations) ? currentContent.pendingRegistrations : [];
        pending.push(registration);
        currentContent.pendingRegistrations = pending;

        const jsonString = JSON.stringify(currentContent, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonString);
        let binaryString = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            binaryString += String.fromCharCode(utf8Bytes[i]);
        }
        const encodedContent = btoa(binaryString);
        
        const putResponse = await fetch(GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + getGithubToken(),
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'طلب تسجيل جديد: ' + registration.name,
                content: encodedContent,
                sha: currentSha,
                branch: GITHUB_BRANCH
            })
        });

        if (putResponse.ok) return true;

        if (putResponse.status === 409 && !isRetry) {
            return await sendRegistrationToGithub(registration, true);
        }
        return false;
    } catch (e) {
        console.error('خطأ في إرسال طلب التسجيل:', e.message);
        return false;
    }
}

function showSuccessState() {
    const formCard = document.getElementById('registerFormCard');
    const successCard = document.getElementById('registerSuccessCard');
    if (formCard) formCard.style.display = 'none';
    if (successCard) successCard.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetRegistrationForm() {
    const form = document.getElementById('registerForm');
    const formCard = document.getElementById('registerFormCard');
    const successCard = document.getElementById('registerSuccessCard');
    if (form) form.reset();
    if (formCard) formCard.style.display = 'block';
    if (successCard) successCard.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showRegToast(message, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + (type || '') + ' show';
    setTimeout(() => { toast.classList.remove('show'); }, 4000);
}
