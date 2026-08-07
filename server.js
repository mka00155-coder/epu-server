/* ============================================================================
   سیستەمی تۆماری ئامادەبوونی فەرمانبەران — EPU
   سێرڤەری Node.js + Express + PostgreSQL (Neon) — بۆ Render / هەر هۆستێک
   داتاکان لە داتابەیسی هاوبەشی Neon پارێزراون، بۆیە لە هەموو ئامێرەکان یەکسانن.
   پێویستە ئەنڤایرۆنمێنتی DATABASE_URL (connection string ی Neon) دابنرێت.
   ============================================================================ */
const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
if (!process.env.DATABASE_URL) {
  console.error('⚠️  DATABASE_URL دانەنراوە! تکایە connection string ی Neon وەک ئەنڤایرۆنمێنت دابنێ.');
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }   // Neon پێویستی بە SSL هەیە
});
const app = express();

const DEFAULT_ADMINS = [
  { username: 'MKA95', password: '0155', isSuper: 1, allowAdd: 1, allowDelete: 1, allowEdit: 1, allowPdf: 1 },
  { username: 'DARYA', password: '123456789', isSuper: 0, allowAdd: 1, allowDelete: 1, allowEdit: 0, allowPdf: 1 }
];
const CONTRACT_OLD = ["أحمد فائق عمر","أدريس نجم قادر","ئهوهن خالد أحمد","ئه ژين عباس حمه","بؤكان جلال قادر","بنار محمد قادر","بيگه رد رضا وه سمان","به فراو عمر عبدلله","به ناز محمد نجم الدين","چاوه رێ محمد عمر","چنار سیدگل جبار","خوزگه سه ردار عمر","خوزگه على مجيد","ده وه ن حكيم جبار","داستان جمعه قادر","داهين عبدى عبدالكريم","دنيا شيرزاد عبدالرحمن","ريكه وت أحمد حمد","ريدين فريدون نجم الدين","روشنا محمد طاهر","ره يان دلير حسين","سروه انور على","سميه عبدالله ره وف","سه روين سعيد محمد","سامان ستار على","سياكو ئاسو محمود","سيفان مجيد فقى قادر","سنه و به ر جمال خيرالله","شانو ئاكو صديق","شه مال فاتح حسن","شاديه رضا عبدالله","شه هين ئه سوه د قادر","شادان شيرکو وريا","كابان ئيسماعيل ياسين","فه رهاد صمد حمه على","گه لاويژ بكر محمد","گونچين عباس عبدالله","له ياد خالد محمد","محمد معصوم محمد","ماريا على رضا","مريم خان احمد عبدالله","نيان محمود صالح","نيان عبدالله عمر","هه ورين ئه مير فائق","هه نگاو شيروان صالح","يعقوب توفيق محمد"];
const DEFAULT_CONTRACT = ["أحمد فائق عمر","أدريس نجم قادر","ئەهوەن خالد أحمد","ئەژین عباس حمه","بۆکان جلال قادر","بنار محمد قادر","بێگەرد رظا وەسمان","بەفراو عمر عبدالله","بەناز محمد نجم الدین","چاوەڕێ محمد عمر","چنار سیدگل جبار","خۆزگە سەردار عمر","خۆزگە علی مجید","دەوەن حکیم جبار","داستان جمعه قادر","داهێن عبدی عبدالکریم","دنیا شێرزاد عبدالرحمن","ڕێکەوت أحمد حمد","ڕێدین فریدون نجم الدین","ڕۆشنا محمد طاهر","ڕەیان دلێر حسێن","سروه انوەر علی","سمیه عبدالله ڕەوف","سەروین سعید محمد","سامان ستار علی","سیاکۆ ئاسۆ محمود","سیڤان مجید فقێ قادر","سنەوبەر جمال خیرالله","شانۆ ئاکۆ صدیق","شەماڵ فاتح حسن","شادیه رضا عبدالله","شەهێن ئەسوەد قادر","شادان شێرکۆ وریا","کابان ئیسماعیل یاسین","فەرهاد صمد حمه علی","گەلاوێژ بکر محمد","گوڵچین عباس عبدالله","لەیاد خالید محمد","محمد معصوم محمد","ماریا علی رضا","مریم خان احمد عبدالله","نیان محمود صاڵح","نیان عبدالله عمر","هەورین ئەمیر فائق","هەنگاو شێروان صاڵح","یعقوب تۆفیق محمد"];
const DEFAULT_PERMANENT = ["ئاسۆ عبێد علی","أبوبكر حمه تۆفیق","بێگەرد امجد محمد","بێگەرد محمد مصطفی","بەناز نجم الدین قادر","جوتیار رضا عزیز","خالد قادر رەشید","دەریا خالد طه","دیوان أبوبکر محمد","سنور مصدق قادر","صفیه عمر أحمد","عمر قادر عمر","فیصڵ کاکەرەش عمر","نەبەس محسین حسن","ژیان جلال محمدامین","هێدي صمد هیدایت","هۆشمەند نصرالدین أنور","هەنگاو اسعد رضا","هێمن علی حاجی","رزگار نجم صاڵح"];
const DEFAULT_SERVICE = ["رابیعه کانەبی صالح","هەردی عبدالله صدیق"];
const DEFAULT_SETTINGS = {
  title: 'زانکۆی پۆلیتەکنیکی هەولێر - پەیمانگای تەکنیکی تەق تەق - تۆماری ئامادەبوونی فەرمانبەران',
  uniName: 'زانکۆی پۆلیتەکنیکی هەولێر',
  instName: 'پەیمانگای تەکنیکی تەق تەق',
  showBadge: 'true'
};

/* ------------------------------ یارمەتیدەرەکان ------------------------------ */
async function q(text, params) { return (await pool.query(text, params)).rows; }
function adminToClient(row) {
  if (!row) return null;
  return {
    username: row.username, password: row.password, isSuper: row.issuper,
    allowAdd: row.allowadd, allowDelete: row.allowdelete, allowEdit: row.allowedit, allowPdf: row.allowpdf
  };
}
async function getAdmin(username) { const r = await q('SELECT * FROM admins WHERE username=$1', [username]); return adminToClient(r[0]); }
async function getSettings() {
  const rows = await q('SELECT key,value FROM settings');
  const o = {}; rows.forEach(r => o[r.key] = r.value);
  return { title: o.title || DEFAULT_SETTINGS.title, uniName: o.uniName || DEFAULT_SETTINGS.uniName,
           instName: o.instName || DEFAULT_SETTINGS.instName, showBadge: o.showBadge !== 'false' };
}
async function setSetting(key, value) {
  await q('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', [key, String(value)]);
}

/* ------------------------------ سکیما ------------------------------ */
async function ensureSchema() {
  await q(`CREATE TABLE IF NOT EXISTS admins (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    issuper BOOLEAN NOT NULL DEFAULT FALSE,
    allowadd BOOLEAN NOT NULL DEFAULT TRUE,
    allowdelete BOOLEAN NOT NULL DEFAULT TRUE,
    allowedit BOOLEAN NOT NULL DEFAULT TRUE,
    allowpdf BOOLEAN NOT NULL DEFAULT TRUE
  )`);
  await q(`CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    empno TEXT NOT NULL DEFAULT ''
  )`);
  await q(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_emp_cat ON employees(category)`);
}

/* ------------------------------ داتای بنەڕەتی (seed) ------------------------------ */
async function seed() {
  const ac = (await q('SELECT COUNT(*)::int AS c FROM admins'))[0].c;
  if (ac === 0) {
    for (const a of DEFAULT_ADMINS) {
      await q('INSERT INTO admins (username,password,issuper,allowadd,allowdelete,allowedit,allowpdf) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [a.username, a.password, !!a.isSuper, !!a.allowAdd, !!a.allowDelete, !!a.allowEdit, !!a.allowPdf]);
    }
  }
  const ec = (await q("SELECT COUNT(*)::int AS c FROM employees WHERE category='contract'"))[0].c;
  if (ec === 0) {
    for (const n of DEFAULT_CONTRACT) await q("INSERT INTO employees (category,name,empno) VALUES ('contract',$1,'')", [n]);
  }
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await q('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, String(v)]);
  }
  // بەشی هەمیشەیی — یەک جار
  if (!(await q("SELECT 1 FROM settings WHERE key='seededPermanent'")).length) {
    for (const n of DEFAULT_PERMANENT) await q("INSERT INTO employees (category,name,empno) VALUES ('permanent',$1,'')", [n]);
    await setSetting('seededPermanent', '1');
  }
  // بەشی کارگوزار — یەک جار
  if (!(await q("SELECT 1 FROM settings WHERE key='seededService'")).length) {
    for (const n of DEFAULT_SERVICE) await q("INSERT INTO employees (category,name,empno) VALUES ('service',$1,'')", [n]);
    await setSetting('seededService', '1');
  }
  // ڕاستکردنەوەی ڕێنووسی گرێبەست — یەک جار
  if (!(await q("SELECT 1 FROM settings WHERE key='contractSpellingFixV1'")).length) {
    for (let i = 0; i < CONTRACT_OLD.length; i++) {
      if (CONTRACT_OLD[i] !== DEFAULT_CONTRACT[i]) {
        await q("UPDATE employees SET name=$1 WHERE category='contract' AND name=$2", [DEFAULT_CONTRACT[i], CONTRACT_OLD[i]]);
      }
    }
    await setSetting('contractSpellingFixV1', '1');
  }
}

/* ------------------------------ سێشن + دەسەڵات ------------------------------ */
const sessions = new Map(); // token -> username
async function currentUserFrom(req) {
  const t = req.headers['x-auth-token'];
  if (!t || !sessions.has(t)) return null;
  return await getAdmin(sessions.get(t));
}
async function requireAuth(req, res) {
  const u = await currentUserFrom(req);
  if (!u) { res.status(401).json({ error: 'پێویستە بچیتە ژوورەوە.' }); return null; }
  return u;
}
async function requireSuper(req, res) {
  const u = await requireAuth(req, res); if (!u) return null;
  if (!u.isSuper) { res.status(403).json({ error: 'تەنها بەڕێوەبەری سەرەکی.' }); return null; }
  return u;
}
// async wrapper بۆ گرتنی هەڵەکان
const h = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => {
  console.error(e); if (!res.headersSent) res.status(500).json({ error: 'هەڵەی سێرڤەر.' });
});

/* ------------------------------ middleware ------------------------------ */
app.use(express.json({ limit: '15mb' }));
app.use(express.static(require('path').join(__dirname, 'public')));

/* ------------------------------ چوونەژوورەوە ------------------------------ */
app.post('/api/login', h(async (req, res) => {
  const { username, password } = req.body || {};
  const rows = await q('SELECT * FROM admins WHERE username=$1 AND password=$2',
    [String(username || '').trim(), String(password || '').trim()]);
  if (!rows.length) return res.status(401).json({ error: 'ناوی بەکارهێنەر یان پاسوۆرد هەڵەیە.' });
  const token = crypto.randomUUID();
  sessions.set(token, rows[0].username);
  res.json({ token, user: adminToClient(rows[0]) });
}));
app.post('/api/logout', h(async (req, res) => { const t = req.headers['x-auth-token']; if (t) sessions.delete(t); res.json({ ok: true }); }));
app.get('/api/me', h(async (req, res) => { const u = await requireAuth(req, res); if (!u) return; res.json({ user: u }); }));

/* ------------------------------ ڕێکخستنەکان ------------------------------ */
app.get('/api/settings', h(async (req, res) => { res.json(await getSettings()); }));
app.put('/api/settings', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const b = req.body || {};
  if ('uniName' in b || 'instName' in b) {
    if (!u.isSuper) return res.status(403).json({ error: 'تەنها بەڕێوەبەری سەرەکی دەتوانێت ناوی فەرمانگە بگۆڕێت.' });
    if ('uniName' in b) await setSetting('uniName', b.uniName);
    if ('instName' in b) await setSetting('instName', b.instName);
  }
  if ('title' in b) {
    if (!u.allowEdit) return res.status(403).json({ error: 'دەسەڵاتی دەستکاریت نییە.' });
    await setSetting('title', b.title);
  }
  if ('showBadge' in b) await setSetting('showBadge', b.showBadge ? 'true' : 'false');
  res.json(await getSettings());
}));

/* ------------------------------ فەرمانبەران ------------------------------ */
app.get('/api/employees', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  res.json(await q('SELECT id,category,name,empno AS "empNo" FROM employees'));
}));
app.post('/api/employees', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  if (!u.allowAdd) return res.status(403).json({ error: 'دەسەڵاتی زیادکردنت نییە.' });
  const { category, name, empNo } = req.body || {};
  if (!['contract', 'permanent', 'service'].includes(category)) return res.status(400).json({ error: 'بەشی هەڵە.' });
  if (!String(name || '').trim()) return res.status(400).json({ error: 'ناو پێویستە.' });
  const r = await q('INSERT INTO employees (category,name,empno) VALUES ($1,$2,$3) RETURNING id',
    [category, String(name).trim(), String(empNo || '').trim()]);
  res.json({ id: r[0].id });
}));
app.put('/api/employees/:id', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  if (!u.allowEdit) return res.status(403).json({ error: 'دەسەڵاتی دەستکاریت نییە.' });
  const rows = await q('SELECT * FROM employees WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'نەدۆزرایەوە.' });
  const row = rows[0], b = req.body || {};
  const name = String(b.name != null ? b.name : row.name).trim() || row.name;
  const empNo = String(b.empNo != null ? b.empNo : row.empno).trim();
  await q('UPDATE employees SET name=$1, empno=$2 WHERE id=$3', [name, empNo, req.params.id]);
  res.json({ ok: true });
}));
app.delete('/api/employees/:id', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  if (!u.allowDelete) return res.status(403).json({ error: 'دەسەڵاتی سڕینەوەت نییە.' });
  await q('DELETE FROM employees WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}));

/* ------------------------------ ئادمینەکان (تەنها سەرەکی) ------------------------------ */
app.get('/api/admins', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  res.json((await q('SELECT * FROM admins ORDER BY issuper DESC, username')).map(adminToClient));
}));
app.post('/api/admins', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const b = req.body || {};
  const un = String(b.username || '').trim(), pw = String(b.password || '').trim();
  if (!un || !pw) return res.status(400).json({ error: 'بەکارهێنەر و پاسوۆرد پێویستە.' });
  if (await getAdmin(un)) return res.status(409).json({ error: 'ئەم بەکارهێنەرە پێشتر هەیە.' });
  await q('INSERT INTO admins (username,password,issuper,allowadd,allowdelete,allowedit,allowpdf) VALUES ($1,$2,FALSE,$3,$4,$5,$6)',
    [un, pw, !!b.allowAdd, !!b.allowDelete, !!b.allowEdit, !!b.allowPdf]);
  res.json({ ok: true });
}));
app.put('/api/admins/:username', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const target = await getAdmin(req.params.username);
  if (!target) return res.status(404).json({ error: 'نەدۆزرایەوە.' });
  const b = req.body || {};
  if (target.isSuper && target.username === 'MKA95' && 'password' in b)
    return res.status(403).json({ error: 'ناتوانرێت پاسوۆردی سەرەکی سەرەکی بگۆڕدرێت لێرەوە.' });
  const map = { password: 'password', allowAdd: 'allowadd', allowDelete: 'allowdelete', allowEdit: 'allowedit', allowPdf: 'allowpdf' };
  const sets = [], vals = []; let i = 1;
  for (const k of Object.keys(map)) {
    if (k in b) {
      if (target.isSuper && k !== 'password') continue; // دەسەڵاتی سەرەکی ناگۆڕدرێت
      sets.push(map[k] + '=$' + i); vals.push(k === 'password' ? String(b[k]).trim() : !!b[k]); i++;
    }
  }
  if (sets.length) { vals.push(target.username); await q('UPDATE admins SET ' + sets.join(',') + ' WHERE username=$' + i, vals); }
  res.json({ ok: true });
}));
app.delete('/api/admins/:username', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const target = await getAdmin(req.params.username);
  if (!target) return res.status(404).json({ error: 'نەدۆزرایەوە.' });
  if (target.isSuper) return res.status(403).json({ error: 'ناتوانرێت بەڕێوەبەری سەرەکی بسڕدرێتەوە.' });
  await q('DELETE FROM admins WHERE username=$1', [target.username]);
  res.json({ ok: true });
}));

/* ------------------------------ باکئەپ / گەڕاندنەوە ------------------------------ */
app.get('/api/backup', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  res.json({
    version: 3, exportedAt: new Date().toISOString(),
    admins: (await q('SELECT * FROM admins')).map(adminToClient),
    employees: await q('SELECT id,category,name,empno AS "empNo" FROM employees'),
    settings: await getSettings()
  });
}));
app.post('/api/restore', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const data = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (Array.isArray(data.admins)) {
      await client.query('DELETE FROM admins');
      for (const a of data.admins) {
        await client.query('INSERT INTO admins (username,password,issuper,allowadd,allowdelete,allowedit,allowpdf) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [a.username, a.password, !!a.isSuper, !!a.allowAdd, !!a.allowDelete, !!a.allowEdit, !!a.allowPdf]);
      }
    }
    if (Array.isArray(data.employees)) {
      await client.query('DELETE FROM employees');
      for (const e of data.employees) {
        await client.query('INSERT INTO employees (category,name,empno) VALUES ($1,$2,$3)', [e.category, e.name, e.empNo || e.empno || '']);
      }
    }
    const upsert = (k, v) => client.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', [k, v]);
    if (data.settings) {
      const s = data.settings;
      if (s.title != null) await upsert('title', s.title);
      if (s.uniName != null) await upsert('uniName', s.uniName);
      if (s.instName != null) await upsert('instName', s.instName);
      if (s.showBadge != null) await upsert('showBadge', s.showBadge ? 'true' : 'false');
    } else if (data.title) { await upsert('title', data.title); }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: 'فایلی باکئەپ دروست نییە.' });
  } finally { client.release(); }
}));

/* ------------------------------ دەستپێک ------------------------------ */
(async () => {
  try {
    await ensureSchema();
    await seed();
    console.log('✅ داتابەیس ئامادەیە (Neon Postgres).');
  } catch (e) {
    console.error('❌ کێشە لە پەیوەندی/ئامادەکردنی داتابەیس:', e.message);
  }
  app.listen(PORT, () => {
    console.log('==================================================');
    console.log('  EPU — سیستەمی تۆماری ئامادەبوونی فەرمانبەران');
    console.log('  سێرڤەر کارایە لەسەر پۆرت: ' + PORT);
    console.log('==================================================');
  });
})();
