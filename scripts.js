// 🔑 CONFIGURACIÓN — ¡USA LAS CREDENCIALES DE TU PROYECTO!
// 🔑 CONFIGURACIÓN - ¡USA LAS CREDENCIALES DE TU PROYECTO EXISTENTE!
const SUPABASE_URL = 'https://mupdiqlibvhvckcoqprp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cGRpcWxpYnZodmNrY29xcHJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc0NDg0OSwiZXhwIjoyMTAwMzIwODQ5fQ.ldSNOhv5PDAvvA88M0yGSQzHS_XaVbGfzpEQUx22Ye0';
const STORAGE_BUCKET = 'calima'; // ← Bucket nuevo

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'calima-auth',
        flowType: 'pkce'
    }
});

// ============================================================
// State
// ============================================================
let session = null;
let files = [];
let currentPath = '';

// ============================================================
// DOM
// ============================================================
const loginView      = document.getElementById('loginView');
const dashboardView  = document.getElementById('dashboardView');
const loginBtn       = document.getElementById('loginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const userMenuBtn    = document.getElementById('userMenuBtn');
const userDropdown   = document.getElementById('userDropdown');
const userAvatar     = document.getElementById('userAvatar');
const userName       = document.getElementById('userName');
const newFolderBtn   = document.getElementById('newFolderBtn');
const uploadBtn      = document.getElementById('uploadBtn');
const refreshBtn     = document.getElementById('refreshBtn');
const fileGrid       = document.getElementById('fileGrid');
const emptyState     = document.getElementById('emptyState');
const loading        = document.getElementById('loadingIndicator');
const breadcrumb     = document.getElementById('breadcrumb');
const dialogOverlay  = document.getElementById('dialogOverlay');
const dialogContent  = document.getElementById('dialogContent');
const snackbar       = document.getElementById('snackbar');
const dropOverlay    = document.getElementById('dropOverlay');
const hiddenFileInput = document.getElementById('hiddenFileInput');

// ============================================================
// Utils
// ============================================================
function showSnackbar(msg, type = 'success') {
    snackbar.textContent = msg;
    snackbar.className = 'snackbar show ' + type;
    clearTimeout(showSnackbar._t);
    showSnackbar._t = setTimeout(() => {
        snackbar.className = 'snackbar ' + type;
    }, 3000);
}

function showLoading(show) {
    loading.classList.toggle('hidden', !show);
    fileGrid.classList.toggle('hidden', show);
    if (show) emptyState.classList.add('hidden');
}

function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// Auth
// ============================================================
loginBtn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname,
            skipBrowserRedirect: false
        }
    });
    if (error) showSnackbar('Login error: ' + error.message, 'error');
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.reload();
});

// ============================================================
// User Menu
// ============================================================
userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !userDropdown.classList.contains('hidden');
    userDropdown.classList.toggle('hidden', isOpen);
    userMenuBtn.classList.toggle('open', !isOpen);
});

document.addEventListener('click', (e) => {
    if (!userDropdown.classList.contains('hidden') &&
        !userDropdown.contains(e.target) &&
        !userMenuBtn.contains(e.target)) {
        userDropdown.classList.add('hidden');
        userMenuBtn.classList.remove('open');
    }
});

// ============================================================
// File operations
// ============================================================
async function loadFiles() {
    showLoading(true);

    const { data, error } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .list(currentPath, {
            limit: 200,
            sortBy: { column: 'name', order: 'asc' }
        });

    if (error) {
        showSnackbar('Error loading: ' + error.message, 'error');
        files = [];
    } else {
        files = (data || []).filter(f => f.name !== '.keep');
    }

    renderFiles();
    renderBreadcrumb();
    showLoading(false);
}

function renderFiles() {
    fileGrid.innerHTML = '';

    if (!files.length) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    files.forEach(file => {
        const isFolder = !file.metadata || file.metadata.size === 0 || file.id === null;
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <span class="material-icons file-icon ${isFolder ? 'folder' : ''}">
                ${isFolder ? 'folder' : 'insert_drive_file'}
            </span>
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-meta">${isFolder ? 'Folder' : formatSize(file.metadata?.size)}</div>
            <button class="delete-btn" title="Delete">
                <span class="material-icons">delete</span>
            </button>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            if (isFolder) {
                currentPath = currentPath
                    ? currentPath + '/' + file.name
                    : file.name;
                loadFiles();
            } else {
                openFile(file.name);
            }
        });

        card.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(`Delete "${file.name}"?`)) return;
            const path = currentPath ? currentPath + '/' + file.name : file.name;
            const { error } = await supabaseClient.storage
                .from(STORAGE_BUCKET)
                .remove([path]);
            if (error) showSnackbar('Error: ' + error.message, 'error');
            else {
                showSnackbar('Deleted');
                loadFiles();
            }
        });

        fileGrid.appendChild(card);
    });
}

async function openFile(name) {
    const path = currentPath ? currentPath + '/' + name : name;
    const { data, error } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, 3600);

    if (error) {
        showSnackbar('Error: ' + error.message, 'error');
        return;
    }
    window.open(data.signedUrl, '_blank');
}

// ============================================================
// Breadcrumb
// ============================================================
function renderBreadcrumb() {
    if (!currentPath) {
        breadcrumb.classList.add('hidden');
        return;
    }
    breadcrumb.classList.remove('hidden');

    const parts = currentPath.split('/');
    let html = `<span data-path="">📁 Calima</span>`;

    parts.forEach((part, i) => {
        const path = parts.slice(0, i + 1).join('/');
        html += `<span class="sep">/</span>`;
        html += `<span data-path="${path}">${escapeHtml(part)}</span>`;
    });

    breadcrumb.innerHTML = html;
    breadcrumb.querySelectorAll('span[data-path]').forEach(el => {
        el.addEventListener('click', () => {
            currentPath = el.dataset.path;
            loadFiles();
        });
    });
}

// ============================================================
// Dialogs
// ============================================================
function showDialog(html) {
    dialogContent.innerHTML = html;
    dialogOverlay.classList.remove('hidden');
}

function closeDialog() {
    dialogOverlay.classList.add('hidden');
    dialogContent.innerHTML = '';
}

dialogOverlay.addEventListener('click', (e) => {
    if (e.target === dialogOverlay) closeDialog();
});

// New folder
newFolderBtn.addEventListener('click', () => {
    showDialog(`
        <h3><span class="material-icons">create_new_folder</span> New folder</h3>
        <input type="text" class="dialog-input" id="folderNameInput" placeholder="Folder name" autofocus />
        <div class="dialog-actions">
            <button class="btn-cancel" id="cancelBtn">Cancel</button>
            <button class="btn-confirm" id="confirmBtn">Create</button>
        </div>
    `);

    const input = document.getElementById('folderNameInput');
    const confirm = document.getElementById('confirmBtn');
    const cancel = document.getElementById('cancelBtn');

    input.focus();
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm.click(); });

    cancel.addEventListener('click', closeDialog);
    confirm.addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) return;

        const path = currentPath
            ? currentPath + '/' + name + '/.keep'
            : name + '/.keep';

        const { error } = await supabaseClient.storage
            .from(STORAGE_BUCKET)
            .upload(path, new Blob([''], { type: 'text/plain' }));

        if (error) showSnackbar('Error: ' + error.message, 'error');
        else {
            showSnackbar('Folder created');
            closeDialog();
            loadFiles();
        }
    });
});

// ============================================================
// Upload (abre directamente el explorador)
// ============================================================
uploadBtn.addEventListener('click', () => {
    hiddenFileInput.value = ''; // reset para permitir re-seleccionar el mismo archivo
    hiddenFileInput.click();
});

hiddenFileInput.addEventListener('change', async (e) => {
    const chosen = Array.from(e.target.files || []);
    if (!chosen.length) return;
    await uploadMultipleFiles(chosen);
});

// Refresh
refreshBtn.addEventListener('click', loadFiles);

// ============================================================
// Init — manejar el callback de OAuth
// ============================================================
async function init() {
    // Detectar si venimos del callback de OAuth
    const url = new URL(window.location.href);
    const hasCodeInHash = window.location.hash.includes('access_token');
    const hasCodeInQuery = url.searchParams.has('code');

    if (hasCodeInHash || hasCodeInQuery) {
        console.log('🔐 Procesando callback de OAuth...');

        // Esperar a que el SDK procese el código
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('⏱️ Timeout esperando SIGNED_IN');
                resolve();
            }, 3000);

            const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, s) => {
                console.log('📢 Auth event:', event, s ? '(con sesión)' : '(sin sesión)');
                if (event === 'SIGNED_IN' && s) {
                    session = s;
                    clearTimeout(timeout);
                    subscription.unsubscribe();
                    resolve();
                }
            });
        });

        // Limpiar la URL
        window.history.replaceState(null, document.title, window.location.pathname);
    } else {
        // Flujo normal
        const { data: { session: s }, error } = await supabaseClient.auth.getSession();
        if (error) console.error('Error getSession:', error);
        session = s;
    }

    console.log('👤 Sesión final:', session);
    updateUI();
}

init();

supabaseClient.auth.onAuthStateChange((_event, s) => {
    session = s;
    updateUI();
});

function updateUI() {
    if (session) {
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');

        const user = session.user;
        const meta = user.user_metadata || {};
        const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';
        const avatar = meta.avatar_url || meta.picture || '';

        userName.textContent = name;
        if (avatar) userAvatar.src = avatar;
        else {
            userAvatar.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
                    <rect width="100%" height="100%" fill="#22222C"/>
                    <text x="50%" y="54%" font-size="34" text-anchor="middle" fill="#C6B8FF"
                          font-family="sans-serif" dominant-baseline="middle">
                        ${(name[0] || '?').toUpperCase()}
                    </text>
                </svg>
            `);
        }

        loadFiles();
    } else {
        loginView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    }
}

// ============================================================
// DRAG & DROP GLOBAL
// ============================================================
let dragCounter = 0;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

window.addEventListener('dragenter', (e) => {
    if (!session) return;
    if (!e.dataTransfer?.types?.includes('Files')) return;

    dragCounter++;
    if (dragCounter === 1) {
        dropOverlay.classList.remove('hidden');
    }
});

window.addEventListener('dragleave', (e) => {
    if (!session) return;
    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        dropOverlay.classList.add('hidden');
    }
});

window.addEventListener('drop', async (e) => {
    if (!session) return;

    dragCounter = 0;
    dropOverlay.classList.add('hidden');

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (!droppedFiles.length) return;

    await uploadMultipleFiles(droppedFiles);
});

// ============================================================
// Subida múltiple
// ============================================================
async function uploadMultipleFiles(filesToUpload) {
    const total = filesToUpload.length;

    showDialog(`
        <h3><span class="material-icons">cloud_upload</span> Uploading...</h3>
        <div class="upload-progress">
            <div class="upload-progress-bar" id="uploadBar"></div>
        </div>
        <p class="upload-status" id="uploadStatus">0 / ${total} files</p>
        <div class="upload-list" id="uploadList"></div>
        <div class="dialog-actions hidden" id="uploadDoneActions">
            <button class="btn-confirm" id="uploadDoneBtn">Done</button>
        </div>
    `);

    const bar = document.getElementById('uploadBar');
    const status = document.getElementById('uploadStatus');
    const list = document.getElementById('uploadList');
    const doneActions = document.getElementById('uploadDoneActions');
    const doneBtn = document.getElementById('uploadDoneBtn');

    let completed = 0;
    let failed = 0;

    for (const file of filesToUpload) {
        const row = document.createElement('div');
        row.className = 'upload-item';
        row.innerHTML = `
            <span class="material-icons">insert_drive_file</span>
            <span class="upload-item-name">${escapeHtml(file.name)}</span>
            <span class="material-icons upload-item-status">hourglass_empty</span>
        `;
        list.appendChild(row);
        const statusIcon = row.querySelector('.upload-item-status');

        const path = currentPath ? currentPath + '/' + file.name : file.name;

        try {
            const { error } = await supabaseClient.storage
                .from(STORAGE_BUCKET)
                .upload(path, file, { upsert: true });

            if (error) throw error;

            statusIcon.textContent = 'check_circle';
            statusIcon.classList.add('success');
        } catch (err) {
            console.error('Error subiendo', file.name, err);
            statusIcon.textContent = 'error';
            statusIcon.classList.add('error');
            failed++;
        }

        completed++;
        const pct = (completed / total) * 100;
        bar.style.width = pct + '%';
        status.textContent = `${completed} / ${total} files`;
    }

    doneActions.classList.remove('hidden');
    doneBtn.addEventListener('click', () => {
        closeDialog();
        loadFiles();
        if (failed === 0) {
            showSnackbar(`Uploaded ${total} file${total > 1 ? 's' : ''}`);
        } else if (failed === total) {
            showSnackbar('Upload failed', 'error');
        } else {
            showSnackbar(`Uploaded ${total - failed}, failed ${failed}`, 'error');
        }
    });
}