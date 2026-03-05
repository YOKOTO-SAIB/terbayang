// ============================================================
//  gist.js  —  YokotoFX Studio  |  GitHub Gist DB Layer
//  Semua file HTML include script ini terlebih dahulu.
//  Konfigurasi GIST_ID & TOKEN diisi oleh admin 1x via setup.
// ============================================================

const GIST_CFG_KEY = 'Setup GitHub Gist';   // localStorage key untuk config
const SESSION_KEY  = 'yfx_session';     // sessionStorage key user/admin
const CACHE_KEY    = 'yfx_db_cache';    // localStorage cache DB
const CACHE_TTL    = 30000;             // 30 detik cache TTL

// ── Config helpers ──────────────────────────────────────────
function getCfg() {
  const raw = localStorage.getItem(GIST_CFG_KEY);
  return raw ? JSON.parse(raw) : { gist_id: '', token: '', setup_done: false };
}
function saveCfg(cfg) {
  localStorage.setItem(GIST_CFG_KEY, JSON.stringify(cfg));
}
function isSetup() {
  const c = getCfg();
  return c.setup_done && c.gist_id && c.token;
}

// ── Session helpers ──────────────────────────────────────────
function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}
function setSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
function isAdmin() {
  const s = getSession();
  return s && s.logged_in && s.role === 'admin';
}

// ── GitHub Gist API ──────────────────────────────────────────
async function gistRead() {
  // Check cache
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { ts, data } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) return JSON.parse(JSON.stringify(data));
  }

  const cfg = getCfg();
  const res = await fetch(`https://api.github.com/gists/${cfg.gist_id}`, {
    headers: {
      'Authorization': `token ${cfg.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) throw new Error(`Gist read failed: ${res.status}`);
  const gist = await res.json();
  const raw = gist.files['db.json']?.content;
  if (!raw) throw new Error('db.json not found in Gist');
  const data = JSON.parse(raw);

  // Save cache
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  return data;
}

async function gistWrite(data) {
  const cfg = getCfg();
  // Invalidate cache
  localStorage.removeItem(CACHE_KEY);

  const res = await fetch(`https://api.github.com/gists/${cfg.gist_id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${cfg.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: {
        'db.json': { content: JSON.stringify(data, null, 2) }
      }
    })
  });
  if (!res.ok) throw new Error(`Gist write failed: ${res.status}`);
  return true;
}

// ── Setup: buat Gist baru dari db.json default ────────────────
const DEFAULT_DB = {
  site_settings: {
    name: 'YokotoFX Studio',
    telegram: 'Yokoto_saiba',
    hero_title: 'Solusi Digital Trading Terbaik',
    hero_sub: 'Tools premium untuk trader profesional. Akses alat analisis canggih dengan harga yang sangat terjangkau.',
    accent_color: '#2480e8'
  },
  products: [
    { id:'p1', name:'Web Analisis Trading', desc:'Platform analisis trading canggih dengan berbagai indikator teknikal dan fundamental realtime.', icon:'📊', active:true, price_monthly:30000, price_yearly:450000, price_yearly_original:600000 },
    { id:'p2', name:'Signal Bot Trading', desc:'Bot sinyal trading otomatis berbasis AI untuk membantu keputusan entry dan exit terbaik.', icon:'🤖', active:true, price_monthly:30000, price_yearly:450000, price_yearly_original:600000 },
    { id:'p3', name:'Dashboard Portofolio', desc:'Monitor seluruh aset dan performa trading Anda dalam satu dashboard yang intuitif.', icon:'📈', active:true, price_monthly:30000, price_yearly:450000, price_yearly_original:600000 }
  ],
  benefits: [
    { id:'b1', icon:'✅', title:'Akses Instan', desc:'Langsung aktif setelah pembayaran dikonfirmasi' },
    { id:'b2', icon:'🔄', title:'Update Otomatis', desc:'Selalu dapat versi terbaru tanpa biaya tambahan' },
    { id:'b3', icon:'💬', title:'Support 24/7', desc:'Tim support siap membantu via Telegram kapan saja' },
    { id:'b4', icon:'💰', title:'Harga Terjangkau', desc:'Kualitas premium dengan harga yang sangat bersahabat' }
  ],
  redeem_codes: [
    { code:'admin yokotofxownerfynixorstudio', role:'admin', used:false, created_at:'2025-01-01T00:00:00.000Z', expires_at:null, one_time:true }
  ],
  hosted_files: []
};

async function setupGist(token) {
  // Buat gist baru
  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: 'YokotoFX Studio Database',
      public: false,
      files: {
        'db.json': { content: JSON.stringify(DEFAULT_DB, null, 2) }
      }
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `Setup failed: ${res.status}`);
  }
  const gist = await res.json();
  saveCfg({ gist_id: gist.id, token, setup_done: true });
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: DEFAULT_DB }));
  return gist.id;
}

// ── Utility ──────────────────────────────────────────────────
function uid() {
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function fmtRp(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function isExpired(iso) {
  if (!iso) return false;
  return new Date() > new Date(iso);
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}
