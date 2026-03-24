/**
 * EquityPath Realtors – File Upload
 *
 * Provides drag-and-drop + click-to-browse file upload with:
 *  - Image preview thumbnails
 *  - File type & size validation
 *  - Simulated upload progress (replace simulateUpload with a real fetch/XHR call)
 */

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const TYPE_ICONS = {
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'image/gif': '🖼️',
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

/** Pending files keyed by a local id */
const fileMap = new Map();
let nextId = 0;

// ── DOM References ────────────────────────────��─────────────────────────────
const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const fileList       = document.getElementById('file-list');
const fileListWrap   = document.getElementById('file-list-wrap');
const uploadBtn      = document.getElementById('upload-btn');
const clearBtn       = document.getElementById('clear-btn');
const successAlert   = document.getElementById('alert-success');
const errorAlert     = document.getElementById('alert-error');

// ── Drop Zone Events ────────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(Array.from(e.dataTransfer.files));
});

fileInput.addEventListener('change', () => {
  handleFiles(Array.from(fileInput.files));
  fileInput.value = ''; // allow re-selecting the same file
});

// ── File Handling ───────────────────────────────────────────────────────────
function handleFiles(files) {
  hideAlerts();
  files.forEach(addFile);
  renderFileList();
}

function addFile(file) {
  const validation = validateFile(file);
  const id = nextId++;

  fileMap.set(id, {
    id,
    file,
    status: validation.ok ? 'pending' : 'error',
    error: validation.ok ? null : validation.error,
    progress: 0,
  });
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'File type not allowed' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: `File exceeds ${MAX_SIZE_MB} MB limit` };
  }
  return { ok: true };
}

// ── Rendering ───────────────────────────────────────────────────────────────
function renderFileList() {
  fileList.innerHTML = '';

  if (fileMap.size === 0) {
    fileListWrap.style.display = 'none';
    return;
  }

  fileListWrap.style.display = 'block';

  fileMap.forEach((entry) => {
    const item = buildFileItem(entry);
    fileList.appendChild(item);
  });
}

function buildFileItem(entry) {
  const { id, file, status, error, progress } = entry;
  const isImage = file.type.startsWith('image/');
  const icon = TYPE_ICONS[file.type] || '📁';

  const item = document.createElement('div');
  item.className = `file-item status--${status}`;
  item.dataset.id = id;

  // Thumbnail
  const thumb = document.createElement('div');
  thumb.className = 'file-item__thumb';

  if (isImage) {
    const img = document.createElement('img');
    img.alt = file.name;
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(file);
    thumb.appendChild(img);
  } else {
    thumb.textContent = icon;
  }

  // Info
  const info = document.createElement('div');
  info.className = 'file-item__info';

  const nameEl = document.createElement('div');
  nameEl.className = 'file-item__name';
  nameEl.textContent = file.name;

  const meta = document.createElement('div');
  meta.className = 'file-item__meta';

  const sizeSpan = document.createElement('span');
  sizeSpan.textContent = formatBytes(file.size);
  meta.appendChild(sizeSpan);

  const statusSpan = document.createElement('span');
  statusSpan.className = `file-item__status ${status}`;
  statusSpan.textContent =
    status === 'success' ? '✓ Uploaded' :
    status === 'error'   ? `✗ ${error}` :
    'Ready';
  meta.appendChild(statusSpan);

  // Progress bar (only for pending)
  const progressWrap = document.createElement('div');
  progressWrap.className = 'file-item__progress';

  const progressBar = document.createElement('div');
  progressBar.className = 'file-item__progress-bar';
  progressBar.style.width = `${progress}%`;
  progressWrap.appendChild(progressBar);

  info.appendChild(nameEl);
  info.appendChild(meta);
  if (status === 'pending') info.appendChild(progressWrap);

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'file-item__remove';
  removeBtn.title = 'Remove file';
  removeBtn.setAttribute('aria-label', `Remove ${file.name}`);
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileMap.delete(id);
    renderFileList();
  });

  item.appendChild(thumb);
  item.appendChild(info);
  item.appendChild(removeBtn);

  return item;
}

// ── Upload ──────────────────────────────────────────────────────────────────
uploadBtn.addEventListener('click', startUpload);

async function startUpload() {
  hideAlerts();
  const pending = [...fileMap.values()].filter((e) => e.status === 'pending');

  if (pending.length === 0) {
    showError('No files ready to upload. Please add valid files first.');
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading…';

  let allSucceeded = true;

  for (const entry of pending) {
    try {
      await simulateUpload(entry);
      entry.status = 'success';
      entry.progress = 100;
    } catch (err) {
      entry.status = 'error';
      entry.error = err.message || 'Upload failed';
      allSucceeded = false;
    }
    renderFileList();
  }

  uploadBtn.disabled = false;
  uploadBtn.textContent = 'Upload Files';

  if (allSucceeded) {
    showSuccess(`${pending.length} file${pending.length > 1 ? 's' : ''} uploaded successfully!`);
  } else {
    showError('Some files failed to upload. Please review and try again.');
  }
}

/**
 * simulateUpload – replace this with a real upload (fetch/XHR to your backend
 * or a service like Cloudinary / AWS S3 presigned URL).
 */
function simulateUpload(entry) {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      entry.progress = Math.min(Math.round(progress), 99);

      // Update the progress bar live without a full re-render
      const item = fileList.querySelector(`[data-id="${entry.id}"]`);
      if (item) {
        const bar = item.querySelector('.file-item__progress-bar');
        if (bar) bar.style.width = `${entry.progress}%`;
      }

      if (progress >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 150);
  });
}

// ── Clear All ───────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  fileMap.clear();
  hideAlerts();
  renderFileList();
});

// ── Utility ─────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showSuccess(msg) {
  successAlert.textContent = `✓ ${msg}`;
  successAlert.classList.add('show');
}

function showError(msg) {
  errorAlert.textContent = `✗ ${msg}`;
  errorAlert.classList.add('show');
}

function hideAlerts() {
  successAlert.classList.remove('show');
  errorAlert.classList.remove('show');
}
