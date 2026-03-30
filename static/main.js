const PAGE_SIZE = 15;
let stories = [];
let currentPage = 1;
let activeFilter = 'all';
let searchQuery = '';
let voted = new Set();

if (document.getElementById('storyList')) {

  async function loadStories() {
    try {
      const res = await fetch('/api/getStories');
      const data = await res.json();
      stories = data.map((s, i) => ({ ...s, id: s._id, rank: i + 1 }));
    } catch (e) { stories = []; }

    document.getElementById('skeletonList').style.display = 'none';
    document.getElementById('storyList').style.display = '';
    document.getElementById('loadMore').style.display = '';
    renderStories(true);
  }

  function getFiltered() {
    return stories.filter(s => {
      const matchCat = activeFilter === 'all' || s.cat === activeFilter;
      const matchSearch = !searchQuery ||
        (s.title || '').toLowerCase().includes(searchQuery) ||
        (s.domain || '').toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });
  }

  function renderStories(reset = false) {
    const list = document.getElementById('storyList');
    const filtered = getFiltered();
    const slice = filtered.slice(0, currentPage * PAGE_SIZE);

    if (reset) list.innerHTML = '';

    const existing = list.querySelectorAll('.story-item').length;
    slice.slice(existing).forEach((s, i) => {
      const li = document.createElement('li');
      li.className = 'story-item';
      li.dataset.id = s.id;
      li.style.animationDelay = (i * 30) + 'ms';

      const catBadge = s.cat && s.cat !== 'tech'
        ? `<span class="cat-badge ${s.cat}">${s.cat === 'show' ? 'Show KN' : s.cat}</span>`
        : '';

      const pts = s.points || 0;
      const comments = s.comments || 0;
      const commentText = comments === 0 ? 'discuss' : `${comments} comment${comments !== 1 ? 's' : ''}`;

      li.innerHTML = `
        <span class="story-rank">${s.rank}.</span>
        <div class="vote-col">
          <button class="vote-btn ${voted.has(s.id) ? 'voted' : ''}" data-id="${s.id}" title="upvote">▲</button>
          <span class="vote-count" id="pts-${s.id}">${pts}</span>
        </div>
        <div class="story-body">
          <div class="story-title-row">
            <a href="${s.url || '#'}" target="_blank" rel="noopener" class="story-title">${s.title}</a>
            ${s.domain ? `<a href="${s.url || '#'}" target="_blank" rel="noopener" class="story-domain">${s.domain}</a>` : ''}
            ${catBadge}
          </div>
          <div class="story-meta">
            <span>${pts} points</span>
            <span class="meta-sep">·</span>
            <span>by <a href="#">${s.author || 'anonymous'}</a></span>
            <span class="meta-sep">·</span>
            <span>${s.time || 'just now'}</span>
            <span class="meta-sep">·</span>
            <a href="#" class="comments-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${commentText}
            </a>
          </div>
        </div>`;
      list.appendChild(li);
    });

    document.getElementById('loadMore').style.display =
      slice.length < filtered.length ? 'inline-block' : 'none';
  }

  // vote
  document.getElementById('storyList').addEventListener('click', async e => {
    const btn = e.target.closest('.vote-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const story = stories.find(s => s.id === id);
    if (!story) return;
    if (voted.has(id)) {
      voted.delete(id); story.points--; btn.classList.remove('voted');
    } else {
      voted.add(id); story.points++; btn.classList.add('voted');
      fetch('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
    }
    document.getElementById('pts-' + id).textContent = story.points;
  });

  // filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.cat;
      currentPage = 1;
      renderStories(true);
    });
  });

  // load more
  document.getElementById('loadMore').addEventListener('click', () => {
    currentPage++;
    renderStories();
  });

  // search
  const searchToggle = document.getElementById('searchToggle');
  const searchBar    = document.getElementById('searchBar');
  const searchInput  = document.getElementById('searchInput');
  const searchClose  = document.getElementById('searchClose');

  searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('open');
    if (searchBar.classList.contains('open')) searchInput.focus();
  });
  searchClose.addEventListener('click', () => {
    searchBar.classList.remove('open');
    searchInput.value = '';
    searchQuery = '';
    currentPage = 1;
    renderStories(true);
  });
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    currentPage = 1;
    renderStories(true);
  });

  loadStories();
}
