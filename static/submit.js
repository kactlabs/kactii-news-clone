'use strict';

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

// --- Validation ---
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => (el.textContent = ''));
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function showError(errorId, inputEl, msg) {
  document.getElementById(errorId).textContent = msg;
  inputEl.classList.add('invalid');
  inputEl.focus();
}

function validate() {
  clearErrors();
  const titleEl  = document.getElementById('post-title');
  const authorEl = document.getElementById('post-author');
  const urlEl    = document.getElementById('post-url');
  let ok = true;

  if (!titleEl.value.trim()) {
    showError('title-error', titleEl, 'Title is required.');
    ok = false;
  }
  if (ok && !authorEl.value.trim()) {
    showError('author-error', authorEl, 'Author is required.');
    ok = false;
  }
  if (ok && urlEl.value.trim()) {
    try { new URL(urlEl.value.trim()); }
    catch { showError('url-error', urlEl, 'Enter a valid URL.'); ok = false; }
  }
  return ok;
}

// --- Submit handler ---
document.getElementById('submit-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!validate()) return;

  const btn    = this.querySelector('button[type="submit"]');
  const title  = document.getElementById('post-title').value.trim();
  const rawUrl = document.getElementById('post-url').value.trim();
  const author = document.getElementById('post-author').value.trim();

  btn.disabled    = true;
  btn.textContent = 'Submitting…';

  try {
    const res  = await fetch('/api/addStory', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title,
        url:    rawUrl || '',
        author,
        cat:    'tech',
      }),
    });

    const data = await res.json();

    if (data.error) {
      const titleEl = document.getElementById('post-title');
      showError('title-error', titleEl, data.error);
      btn.disabled    = false;
      btn.textContent = 'Submit Post';
    } else {
      window.location.href = '/posts';
    }
  } catch {
    const titleEl = document.getElementById('post-title');
    showError('title-error', titleEl, 'Something went wrong. Please try again.');
    btn.disabled    = false;
    btn.textContent = 'Submit Post';
  }
});
