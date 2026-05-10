// Paste your Apps Script /exec URL here after deploying apps-script/Code.gs.
const WEB_APP_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';

const form = document.getElementById('rsvp-form');
const submitBtn = document.getElementById('submit-btn');
const errorEl = document.getElementById('form-error');
const confirmation = document.getElementById('confirmation');
const whoToggle = document.getElementById('who-toggle');
const whoCount = document.getElementById('who-count');
const whoList = document.getElementById('who-list');
const bringingSelect = document.getElementById('bringing-select');
const bringingOtherWrap = document.getElementById('bringing-other-wrap');
const bringingOther = document.getElementById('bringing-other');

bringingSelect.addEventListener('change', () => {
  const isOther = bringingSelect.value === 'Other';
  bringingOtherWrap.hidden = !isOther;
  if (!isOther) bringingOther.value = '';
});

let currentList = null;

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  if (!form.checkValidity()) {
    showError('Please fill in name, email, phone, and how many.');
    return;
  }

  if (WEB_APP_URL.startsWith('PASTE_')) {
    showError('Site is not finished — backend URL is missing. Tell Yosef.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const data = new FormData(form);
    // If "Other" is selected, fold the typed-in value into `bringing`.
    if (data.get('bringing') === 'Other') {
      const typed = (data.get('bringing_other') || '').toString().trim();
      data.set('bringing', typed ? `Other: ${typed}` : 'Other (will text host)');
    }
    data.delete('bringing_other');
    // Apps Script web apps accept urlencoded without CORS preflight.
    const body = new URLSearchParams();
    for (const [k, v] of data.entries()) body.append(k, v);

    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Submission failed.');
    }

    form.hidden = true;
    confirmation.hidden = false;
    currentList = null; // force refresh
    if (!whoList.hidden) loadList();
    updateWhoCount();
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Count me in';
    showError("Couldn't submit — try again, or RSVP to one of the hosts below.");
    console.error(err);
  }
});

async function fetchList() {
  if (WEB_APP_URL.startsWith('PASTE_')) return [];
  const res = await fetch(WEB_APP_URL + '?list=1');
  if (!res.ok) throw new Error('list fetch failed');
  return await res.json();
}

function renderList(rows) {
  if (!rows.length) {
    whoList.innerHTML = '<li class="empty">No one yet. Be the first 🔥</li>';
    return;
  }
  whoList.innerHTML = rows.map(r => {
    const name = escapeHtml(r.name || '');
    const count = Number(r.count) || 1;
    const bringing = (r.bringing || '').trim();
    const bringingPart = bringing && !/^nothing/i.test(bringing)
      ? ` <span class="who-bringing">— bringing ${escapeHtml(bringing)}</span>`
      : '';
    const countPart = count > 1 ? ` <span class="who-bringing">(party of ${count})</span>` : '';
    return `<li>${name}${countPart}${bringingPart}</li>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function loadList() {
  try {
    currentList = await fetchList();
    renderList(currentList);
    updateWhoCount();
  } catch (err) {
    whoList.innerHTML = '<li class="empty">Couldn\'t load the list right now.</li>';
    console.error(err);
  }
}

function updateWhoCount() {
  if (!currentList) return;
  const total = currentList.reduce((s, r) => s + (Number(r.count) || 0), 0);
  whoCount.textContent = total ? ` (${total})` : '';
}

whoToggle.addEventListener('click', () => {
  const opening = whoList.hidden;
  whoList.hidden = !opening;
  if (opening && currentList === null) loadList();
});

// Pre-fetch count silently so the toggle shows a number immediately.
loadList().catch(() => {});
