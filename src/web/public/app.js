const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentTab = 'conversations';

// Nav
$$('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    render();
  });
});

async function api(path) {
  const res = await fetch('/api' + path);
  return res.json();
}

async function loadStats() {
  const stats = await api('/stats');
  $('#stat-convos').textContent = stats.conversations;
  $('#stat-memories').textContent = stats.memories;
}

async function render() {
  const el = $('#content');
  switch (currentTab) {
    case 'conversations': return renderConversations(el);
    case 'memories': return renderMemories(el);
    case 'portrait': return renderPortrait(el);
    case 'search': return renderSearch(el);
  }
}

async function renderConversations(el) {
  const convos = await api('/conversations?limit=50');
  if (!convos.length) {
    el.innerHTML = '<div class="empty-state">No conversations yet.<br><code>ai-memory import chatgpt export.json</code></div>';
    return;
  }
  el.innerHTML = convos.map(c => `
    <div class="card" onclick="showConversation('${c.id}')">
      <h3>${esc(c.title || 'Untitled')}</h3>
      <div class="meta">${c.source} &middot; ${fmtDate(c.created_at)} &middot; updated ${fmtDate(c.updated_at)}</div>
    </div>
  `).join('');
}

async function renderMemories(el) {
  const mems = await api('/memories?limit=50');
  if (!mems.length) {
    el.innerHTML = '<div class="empty-state">No memories yet.<br><code>ai-memory compact</code></div>';
    return;
  }
  el.innerHTML = mems.map(m => {
    const topics = JSON.parse(m.topics || '[]');
    const keyPoints = JSON.parse(m.key_points || '[]');
    return `
      <div class="card">
        <h3>${esc(m.summary.slice(0, 100))}${m.summary.length > 100 ? '...' : ''}</h3>
        <div class="meta">${m.source} &middot; ${fmtDate(m.created_at)}${m.token_count ? ' &middot; ' + m.token_count + ' tokens' : ''}</div>
        <div class="tags">${topics.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        ${keyPoints.length ? '<div class="preview">' + keyPoints.map(k => '&bull; ' + esc(k)).join('<br>') + '</div>' : ''}
      </div>
    `;
  }).join('');
}

async function renderPortrait(el) {
  try {
    const p = await api('/portrait');
    if (p.error) throw new Error(p.error);
    const prof = p.profile;
    el.innerHTML = `
      <div class="portrait-section">
        <h2>Summary</h2>
        <p>${esc(prof.summary)}</p>
      </div>
      <div class="portrait-section">
        <h2>Interests</h2>
        <ul>${prof.interests.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>
      <div class="portrait-section">
        <h2>Communication Style</h2>
        <p>${esc(prof.communication_style)}</p>
      </div>
      ${prof.technical_strengths.length ? `<div class="portrait-section"><h2>Technical Strengths</h2><ul>${prof.technical_strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
      <div class="portrait-section">
        <h2>Patterns</h2>
        <ul>${prof.patterns.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
      </div>
      <div class="portrait-section">
        <h2>Goals</h2>
        <ul>${prof.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
      </div>
      <div class="portrait-section">
        <h2>Advice</h2>
        <ul>${prof.advice.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
      </div>
      <div class="meta" style="margin-top:16px;text-align:center">Generated ${fmtDate(p.generated_at)}</div>
    `;
  } catch {
    el.innerHTML = '<div class="empty-state">No portrait yet.<br><code>ai-memory portrait</code></div>';
  }
}

async function renderSearch(el) {
  el.innerHTML = `
    <div class="search-bar">
      <input id="search-input" placeholder="Search messages and memories..." onkeydown="if(event.key==='Enter')doSearch()">
      <button onclick="doSearch()">Search</button>
    </div>
    <div id="search-results"></div>
  `;
  $('#search-input').focus();
}

async function doSearch() {
  const q = $('#search-input').value.trim();
  if (!q) return;
  const [messages, memories] = await Promise.all([
    api(`/search?q=${encodeURIComponent(q)}&type=messages&limit=10`),
    api(`/search?q=${encodeURIComponent(q)}&type=memories&limit=10`),
  ]);

  let html = '';
  if (memories.length) {
    html += '<div class="section-heading">Memories</div>';
    html += memories.map(m => {
      const topics = JSON.parse(m.topics || '[]');
      return `<div class="card"><h3>${esc(m.summary.slice(0, 120))}</h3><div class="tags">${topics.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>`;
    }).join('');
  }
  if (messages.length) {
    html += '<div class="section-heading">Messages</div>';
    html += messages.map(m => `
      <div class="card" onclick="showConversation('${m.conversation_id}')">
        <div class="meta">${m.role} &middot; ${fmtDate(m.created_at)} &middot; ${esc(m.conversation_title || '')}</div>
        <div class="preview">${esc(m.content.slice(0, 200))}</div>
      </div>
    `).join('');
  }
  if (!html) html = '<div class="empty-state">No results found.</div>';
  $('#search-results').innerHTML = html;
}

async function showConversation(id) {
  const data = await api(`/conversations/${id}`);
  $('#modal-content').innerHTML = `
    <h2>${esc(data.title || 'Untitled')}</h2>
    <div class="meta" style="margin-bottom:20px">${data.source} &middot; ${fmtDate(data.created_at)}</div>
    ${data.messages.map(m => `
      <div class="message">
        <div class="role">${m.role}</div>
        <div>${esc(m.content)}</div>
      </div>
    `).join('')}
  `;
  $('#modal').classList.add('open');
}

function closeModal() { $('#modal').classList.remove('open'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Init
loadStats();
render();
