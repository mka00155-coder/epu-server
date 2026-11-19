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
  // Neon پێویستی بە SSL هەیە. بۆ داتابەیسی ناوخۆیی (تاقیکردنەوە) دەتوانیت DATABASE_SSL=false دابنێیت.
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});
const SERVER_VERSION = '3.4.0';   // کڵاینت بەمە دەزانێت server.js نوێیە (ئەگەر نەبێت ئاگادارکردنەوە نیشان دەدات)
const app = express();
app.set('trust proxy', 1);   // Render لە پشت proxy یەوەیە — بۆ زانینی IPی ڕاستەقینە (سنووری هەوڵی لۆگین)

/* ------------------------------ ڕووکار (public/) ------------------------------
   ڕووکاری سەرەکی لە public/index.html دەخوێنرێتەوە (یەک جار لە دەستپێکدا)، gzip دەکرێت و
   لەگەڵ ETag دەنێردرێت — بۆ ئەوەی لەسەر مۆبایل و Render خێراتر بێت. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const PUBLIC_DIR = path.join(__dirname, 'public');
function loadIndex() {
  const file = path.join(PUBLIC_DIR, 'index.html');
  let raw;
  try { raw = fs.readFileSync(file); }
  catch (e) {
    console.error('❌ فایلی ' + file + ' نەدۆزرایەوە. فۆڵدەری public (index.html + logo.png) دەبێت لەگەڵ server.js بار بکرێت.');
    process.exit(1);
  }
  const tag = crypto.createHash('sha1').update(raw).digest('hex');
  return { raw, gz: zlib.gzipSync(raw, { level: 9 }), etag: '"' + tag + '"', etagGz: '"' + tag + '-gzip"' };
}
const INDEX = loadIndex();

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
  showBadge: 'true',
  coverTitle: 'تۆماری ئامادەبوونی فەرمانبەران',
  coverSubtitle: 'ساڵی خوێندنی ٢٠٢٥ - ٢٠٢٦',
  coverNote: '',
  uniNameEn: 'Erbil Polytechnic University',
  instNameEn: 'Taq Taq Technical Institute'
};

/* ------------------------------ یارمەتیدەرەکان ------------------------------ */
async function q(text, params) { return (await pool.query(text, params)).rows; }
function adminToClient(row) {
  if (!row) return null;
  return {
    username: row.username, password: row.password, isSuper: row.issuper,
    allowAdd: row.allowadd, allowDelete: row.allowdelete, allowEdit: row.allowedit, allowPdf: row.allowpdf,
    allowProfile: !!row.allowprofile, allowScan: !!row.allowscan, allowReport: !!row.allowreport,
    allowSheetView: !!row.allowsheetview, allowSheetEdit: !!row.allowsheetedit,
    photo: row.photo || ''
  };
}
// بۆ لیستی ئادمینەکان (تەنها بەڕێوەبەری سەرەکی): + دوایین گۆڕینی پاسۆرد
const adminToListItem = row => Object.assign(adminToClient(row), {
  pwChangedAt: row.pw_changed_at ? new Date(new Date(row.pw_changed_at).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ') : '',
  pwChangedBy: row.pw_changed_by || ''
});
async function getAdmin(username) { const r = await q('SELECT * FROM admins WHERE username=$1', [username]); return adminToClient(r[0]); }
// withSecrets=true تەنها بۆ بەڕێوەبەری سەرەکی / ئەو ئادمینانەی دەسەڵاتی پرۆفایلیان هەیە (کلیلی ImgBB بۆ ئەپلۆدی وێنە پێویستە).
// بۆ بەکارهێنەری نەچووەتە ژوورەوە (پەڕەی لۆگین) کلیلەکە ناگەڕێتەوە.
const canSeeSecrets = u => !!(u && (u.isSuper || u.allowProfile));
async function getSettings(withSecrets) {
  const rows = await q('SELECT key,value FROM settings');
  const o = {}; rows.forEach(r => o[r.key] = r.value);
  const out = { title: o.title || DEFAULT_SETTINGS.title, uniName: o.uniName || DEFAULT_SETTINGS.uniName,
           instName: o.instName || DEFAULT_SETTINGS.instName, showBadge: o.showBadge !== 'false',
           coverTitle: o.coverTitle || DEFAULT_SETTINGS.coverTitle,
           coverSubtitle: o.coverSubtitle || DEFAULT_SETTINGS.coverSubtitle,
           coverNote: (o.coverNote != null ? o.coverNote : DEFAULT_SETTINGS.coverNote),
           lastBackup: (o.lastBackup || ''),
           uniNameEn: (o.uniNameEn || DEFAULT_SETTINGS.uniNameEn),
           instNameEn: (o.instNameEn || DEFAULT_SETTINGS.instNameEn) };
  if (withSecrets) out.imgbbKey = (o.imgbbKey || '');
  return out;
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
  // خانەکانی پرۆفایلی فەرمانبەر (قۆناغی ١) — بۆ داتابەیسی ئامادەش زیاد دەکرێن
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS dept TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS mobile TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS birthdate TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS workdays TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS empid TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS bloodtype TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS card_issue TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS card_expiry TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS dept_en TEXT DEFAULT ''`);
  await q(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS specialty_en TEXT DEFAULT ''`);
  // دەسەڵاتە نوێیەکانی ئادمین (قۆناغی ٢)
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS allowprofile BOOLEAN NOT NULL DEFAULT FALSE`);
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS allowscan BOOLEAN NOT NULL DEFAULT FALSE`);
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS allowreport BOOLEAN NOT NULL DEFAULT FALSE`);
  // خشتەی تۆماری هاتن/ڕۆیشتن
  await q(`CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    empid TEXT,
    name TEXT,
    day TEXT,
    time TEXT,
    type TEXT,
    by_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_att_day ON attendance(day)`);
  await q(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'morning'`);
  // خشتەی مۆڵەتەکان
  await q(`CREATE TABLE IF NOT EXISTS leaves (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    empid TEXT,
    name TEXT,
    type TEXT,
    from_day TEXT,
    to_day TEXT,
    from_time TEXT,
    to_time TEXT,
    note TEXT,
    by_admin TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  // مێژووی چالاکی
  await q(`CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    at TIMESTAMPTZ DEFAULT now(),
    admin_user TEXT,
    action TEXT,
    details TEXT
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC)`);
  // v3.4: جۆری کردار (زیادکردن/دەستکاری/سڕینەوە/چاپ/هەناردە/چوونەژوورەوە/سیستەم) بۆ فلتەر + وێنە و ڕێکەوتی گۆڕینی پاسۆردی ئادمین
  await q(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT ''`);
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS photo TEXT NOT NULL DEFAULT ''`);
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS pw_changed_at TIMESTAMPTZ`);
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS pw_changed_by TEXT NOT NULL DEFAULT ''`);
  // تۆمارە کۆنەکان (پێش v3.4) جۆریان بۆ دیاری دەکرێت — تەنها ئەوانەی جۆریان بەتاڵە
  await q(`UPDATE audit_log SET kind = CASE
      WHEN action LIKE 'زیادکردن%' THEN 'add'
      WHEN action LIKE 'سڕینەوە%' THEN 'delete'
      WHEN action LIKE 'گواستنەوە%' THEN 'edit'
      ELSE 'system' END WHERE kind IS NULL OR kind=''`);
  // سێشنەکان (لە DB دەمێننەوە — ڕیستارت/خەوتنی Render ئیتر هەمووان دەرناکات)
  await q(`CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(username)`);
  // خشتەی دەوامی کارمەندان (v3.2) — خشتەی هەفتانەی دیاریکراو، بێ بەروار.
  // بە ئەنقەست FOREIGN KEY نییە: گەڕاندنەوەی باکئەپ هەموو فەرمانبەران دەسڕێتەوە و دووبارە دەیانخاتەوە، نابێت خشتەی دەوام لەگەڵیان بسڕێتەوە.
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS allowsheetview BOOLEAN NOT NULL DEFAULT FALSE`);
  await q(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS allowsheetedit BOOLEAN NOT NULL DEFAULT FALSE`);
  await q(`CREATE TABLE IF NOT EXISTS sheet_rows (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    weekday SMALLINT NOT NULL,
    employee_id INTEGER,
    name TEXT NOT NULL DEFAULT '',
    snap TEXT NOT NULL DEFAULT '',
    morning BOOLEAN NOT NULL DEFAULT FALSE,
    evening BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE UNIQUE INDEX IF NOT EXISTS uq_sheet_emp_day ON sheet_rows(employee_id, weekday) WHERE employee_id IS NOT NULL`);
  await q(`CREATE INDEX IF NOT EXISTS idx_sheet_cat ON sheet_rows(category)`);
}
async function logAction(user, action, details, kind){
  try{ await q('INSERT INTO audit_log (admin_user,action,details,kind) VALUES ($1,$2,$3,$4)',
    [user||'?', String(action||'').slice(0,200), String(details||'').slice(0,2000), kind||'system']); }catch(e){}
}
const CAT_LABEL = { contract: 'گرێبەست', permanent: 'هەمیشەیی', service: 'کارگوزار' };
const catL = c => CAT_LABEL[c] || c || '';
const WD_NAMES = ["شەممە","یەکشەممە","دووشەممە","سێشەممە","چوارشەممە","پێنجشەممە","هەینی"];
const dash = v => { const t = String(v == null ? '' : v).trim(); return t || '—'; };
const yn = b => (b ? '✓' : '✗');
// ڕیزی «بوار: کۆن ← نوێ» تەنها بۆ ئەو بوارانەی گۆڕاون. pairs = [[label, old, new], ...]
function diffLines(pairs) {
  return pairs.filter(([, a, b]) => String(a == null ? '' : a) !== String(b == null ? '' : b))
    .map(([l, a, b]) => l + ': ' + dash(a) + ' ← ' + dash(b)).join('\n');
}
const wdList = csv => String(csv || '').split(',').filter(x => x !== '').map(x => WD_NAMES[+x] || '').filter(Boolean).join('، ');
const PERM_LABELS = { allowAdd: 'زیادکردن', allowDelete: 'سڕینەوە', allowEdit: 'دەستکاری', allowPdf: 'خشتە و چاپ', allowProfile: 'پرۆفایل',
  allowScan: 'سکان', allowReport: 'ڕاپۆرت', allowSheetView: 'خشتەی دەوام: بینین و چاپ', allowSheetEdit: 'خشتەی دەوام: دەستکاری' };
const permLines = o => Object.keys(PERM_LABELS).map(k => PERM_LABELS[k] + ' ' + yn(o[k])).join(' · ');
const LEAVE_LABEL = { study: 'مۆڵەتی خوێندن', maternity: 'مۆڵەتی منداڵبوون', sudden: 'مۆڵەتی کتوپڕ' };
const PHOTO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
function iraqNow(){ const d=new Date(Date.now()+3*3600*1000); const s=d.toISOString(); return { day:s.slice(0,10), time:s.slice(11,16) }; }
// دیاریکردنی ڕۆژی هەفتە (0=شەممە ... 6=هەینی) — گونجاو لەگەڵ WDAYSی فرۆنتئێند
function weekdayIdx(dayStr){ const p=String(dayStr).split('-').map(Number); if(p.length<3) return -1; const gd=new Date(Date.UTC(p[0],p[1]-1,p[2])).getUTCDay(); return (gd+1)%7; }

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
// سێشن لە خشتەی `sessions` هەڵدەگیرێت (تەنها hashی تۆکن، نەک خودی تۆکن).
// بەسەردەچێت ئەگەر SESSION_DAYS ڕۆژ (بنەڕەت ٣٠) بەکارنەهێنرابێت، یان لە ٩٠ ڕۆژ تێپەڕێت.
const SESSION_IDLE_DAYS = Math.max(1, parseInt(process.env.SESSION_DAYS, 10) || 30);
const SESSION_MAX_DAYS = 90;
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');
async function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  await q('INSERT INTO sessions (token_hash, username) VALUES ($1,$2)', [hashToken(token), username]);
  return token;
}
async function destroySession(token) { if (token) await q('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]); }
async function destroyUserSessions(username) { await q('DELETE FROM sessions WHERE username=$1', [username]); }
async function purgeSessions() {
  await q(`DELETE FROM sessions WHERE last_seen < now() - make_interval(days => $1::int) OR created_at < now() - make_interval(days => $2::int)`, [SESSION_IDLE_DAYS, SESSION_MAX_DAYS]);
}
async function currentUserFrom(req) {
  const t = req.headers['x-auth-token'];
  if (!t || typeof t !== 'string' || t.length > 200) return null;
  const th = hashToken(t);
  // یەک query: سێشن + ئادمین (دەسەڵاتەکان هەمیشە لە خشتەی admins دەخوێنرێنەوە)
  const rows = await q(`SELECT a.username,a.password,a.issuper,a.allowadd,a.allowdelete,a.allowedit,a.allowpdf,a.allowprofile,a.allowscan,a.allowreport,a.allowsheetview,a.allowsheetedit,
        (a.photo<>'') AS hasphoto, (s.last_seen < now() - interval '1 hour') AS stale
      FROM sessions s JOIN admins a ON a.username = s.username
      WHERE s.token_hash=$1
        AND s.last_seen > now() - make_interval(days => $2::int)
        AND s.created_at > now() - make_interval(days => $3::int)`, [th, SESSION_IDLE_DAYS, SESSION_MAX_DAYS]);
  if (!rows.length) return null;
  if (rows[0].stale) q('UPDATE sessions SET last_seen=now() WHERE token_hash=$1', [th]).catch(() => {});
  const cu = adminToClient(rows[0]); cu.hasPhoto = !!rows[0].hasphoto; delete cu.photo; return cu;
}

// سنووری هەوڵی هەڵەی لۆگین (لە مێمۆری): ٨ هەوڵی هەڵە بۆ هەر (IP + بەکارهێنەر) و ٣٠ بۆ هەر IP لە ١٠ خولەکدا
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_PER_USER = 8, LOGIN_MAX_PER_IP = 30;
const loginFails = new Map(); // key -> { n, first }
const failLogged = new Map(); // لۆگی هەوڵی هەڵە: key -> کاتی دوایین تۆمار
function loginWait(key, max) {   // چەند چرکە ماوە تا بلۆکەکە ڕەت بێت (٠ = بلۆک نییە)
  const r = loginFails.get(key); if (!r) return 0;
  if (Date.now() - r.first > LOGIN_WINDOW_MS) { loginFails.delete(key); return 0; }
  return r.n >= max ? Math.ceil((r.first + LOGIN_WINDOW_MS - Date.now()) / 1000) : 0;
}
function loginFail(key) {
  const r = loginFails.get(key);
  if (!r || Date.now() - r.first > LOGIN_WINDOW_MS) loginFails.set(key, { n: 1, first: Date.now() });
  else r.n++;
}
setInterval(() => { const now = Date.now(); for (const [k, r] of loginFails) if (now - r.first > LOGIN_WINDOW_MS) loginFails.delete(k); for (const [k, t] of failLogged) if (now - t > LOGIN_WINDOW_MS) failLogged.delete(k); }, LOGIN_WINDOW_MS).unref();
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
async function requirePerm(req, res, perm) {
  const u = await requireAuth(req, res); if (!u) return null;
  if (!u.isSuper && !u[perm]) { res.status(403).json({ error: 'دەسەڵاتت بۆ ئەم کردارە نییە.' }); return null; }
  return u;
}
// async wrapper بۆ گرتنی هەڵەکان
const h = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => {
  console.error(e); if (!res.headersSent) res.status(500).json({ error: 'هەڵەی سێرڤەر.' });
});

/* ------------------------------ middleware ------------------------------ */
app.use('/api/restore', express.json({ limit: '80mb' }));   // باکئەپی گەورە (attendance ی چەند ساڵ)
app.use(express.json({ limit: '25mb' }));
// پەڕەی سەرەکی: gzip + ETag (دووبارە بارکردن = 304 بێ ناردنی هیچ)
app.get(['/', '/index.html'], (req, res) => {
  const gz = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  const etag = gz ? INDEX.etagGz : INDEX.etag;
  res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Vary': 'Accept-Encoding', 'ETag': etag });
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  if (gz) { res.set('Content-Encoding', 'gzip'); return res.send(INDEX.gz); }
  res.send(INDEX.raw);
});
// فایلە جێگیرەکان (لۆگۆ...) — cache بۆ ١ ڕۆژ
app.use(express.static(PUBLIC_DIR, { index: false, maxAge: '1d' }));

/* ------------------------------ چوونەژوورەوە ------------------------------ */
app.post('/api/login', h(async (req, res) => {
  const { username, password } = req.body || {};
  const un = String(username || '').trim();
  const ipKey = 'ip|' + req.ip, userKey = 'u|' + req.ip + '|' + un.toLowerCase();
  const wait = Math.max(loginWait(ipKey, LOGIN_MAX_PER_IP), loginWait(userKey, LOGIN_MAX_PER_USER));
  if (wait > 0) {
    res.set('Retry-After', String(wait));
    return res.status(429).json({ error: 'هەوڵی هەڵەی زۆر. دوای ' + Math.ceil(wait / 60) + ' خولەک دووبارە هەوڵبدەوە.' });
  }
  const rows = await q('SELECT * FROM admins WHERE username=$1 AND password=$2', [un, String(password || '').trim()]);
  if (!rows.length) {
    loginFail(ipKey); loginFail(userKey);
    // هەوڵی هەڵە تەنها بۆ بەکارهێنەرێکی ڕاستەقینە تۆمار دەکرێت (و دەمێکی ١٠ خولەکی بۆ هەر ئامێرێک) بۆ ئەوەی مێژووەکە پڕ نەکرێتەوە
    try {
      if ((await q('SELECT 1 FROM admins WHERE username=$1', [un])).length) {
        const tk = 'lf|' + req.ip + '|' + un.toLowerCase(), last = failLogged.get(tk) || 0;
        if (Date.now() - last > LOGIN_WINDOW_MS) { failLogged.set(tk, Date.now()); await logAction(un, 'هەوڵی چوونەژوورەوەی هەڵە', 'پاسۆردی هەڵە · ئامێر: ' + req.ip, 'login'); }
      }
    } catch (e) {}
    return res.status(401).json({ error: 'ناوی بەکارهێنەر یان پاسوۆرد هەڵەیە.' });
  }
  loginFails.delete(userKey);
  const token = await createSession(rows[0].username);
  await logAction(rows[0].username, 'چوونەژوورەوە', 'ئامێر: ' + req.ip, 'login');
  res.json({ token, user: adminToClient(rows[0]), serverVersion: SERVER_VERSION });
}));
app.post('/api/logout', h(async (req, res) => {
  const who = await currentUserFrom(req);
  await destroySession(req.headers['x-auth-token']);
  if (who) await logAction(who.username, 'دەرچوون', '', 'login');
  res.json({ ok: true });
}));
app.get('/api/me', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const r = await q('SELECT photo FROM admins WHERE username=$1', [u.username]);
  u.photo = r.length ? (r[0].photo || '') : ''; delete u.hasPhoto;
  res.json({ user: u, serverVersion: SERVER_VERSION });
}));

/* ------------------------------ ڕێکخستنەکان ------------------------------ */
// پێویستی بە لۆگین نییە (پەڕەی لۆگین ناوی زانکۆ پێویستە)، بەڵام کلیلی ImgBB تەنها بۆ ئەوانەی دەسەڵاتیان هەیە دەگەڕێتەوە.
app.get('/api/settings', h(async (req, res) => { const u = await currentUserFrom(req); res.json(await getSettings(canSeeSecrets(u))); }));
app.put('/api/settings', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const b = req.body || {};
  const before = await getSettings(true);
  if ('uniName' in b || 'instName' in b || 'uniNameEn' in b || 'instNameEn' in b) {
    if (!u.isSuper) return res.status(403).json({ error: 'تەنها بەڕێوەبەری سەرەکی دەتوانێت ناوی فەرمانگە بگۆڕێت.' });
    if ('uniName' in b) await setSetting('uniName', b.uniName);
    if ('instName' in b) await setSetting('instName', b.instName);
    if ('uniNameEn' in b) await setSetting('uniNameEn', b.uniNameEn);
    if ('instNameEn' in b) await setSetting('instNameEn', b.instNameEn);
  }
  if ('title' in b) {
    if (!u.allowEdit) return res.status(403).json({ error: 'دەسەڵاتی دەستکاریت نییە.' });
    await setSetting('title', b.title);
  }
  if ('showBadge' in b) await setSetting('showBadge', b.showBadge ? 'true' : 'false');
  if ('coverTitle' in b || 'coverSubtitle' in b || 'coverNote' in b) {
    if (!u.isSuper) return res.status(403).json({ error: 'تەنها بەڕێوەبەری سەرەکی دەتوانێت تێکستی بەرگ بگۆڕێت.' });
    if ('coverTitle' in b) await setSetting('coverTitle', b.coverTitle);
    if ('coverSubtitle' in b) await setSetting('coverSubtitle', b.coverSubtitle);
    if ('coverNote' in b) await setSetting('coverNote', b.coverNote);
  }
  if ('imgbbKey' in b) {
    if (!u.isSuper) return res.status(403).json({ error: 'تەنها بەڕێوەبەری سەرەکی دەتوانێت کلیلی ImgBB بگۆڕێت.' });
    await setSetting('imgbbKey', String(b.imgbbKey || '').trim());
  }
  const after = await getSettings(true);
  const SET_LABELS = [['title', 'ناونیشانی خشتەی هاتن و ڕۆشتن'], ['uniName', 'ناوی زانکۆ'], ['instName', 'ناوی پەیمانگا'], ['uniNameEn', 'ناوی زانکۆ (English)'],
    ['instNameEn', 'ناوی پەیمانگا (English)'], ['coverTitle', 'ناونیشانی بەرگ'], ['coverSubtitle', 'ژێرناونیشانی بەرگ'], ['coverNote', 'تێبینی بەرگ']];
  const sd = diffLines(SET_LABELS.map(([k, l]) => [l, before[k], after[k]]).concat([['پیشاندانی نیشانەی بەش لەسەر خشتە', yn(before.showBadge), yn(after.showBadge)]]));
  const keyLine = before.imgbbKey !== after.imgbbKey ? '\nکلیلی ImgBB: گۆڕدرا' : '';
  if (sd || keyLine) await logAction(u.username, 'گۆڕینی ڕێکخستنەکان', (sd + keyLine).trim(), 'edit');
  res.json(await getSettings(canSeeSecrets(u)));
}));

/* ------------------------------ فەرمانبەران ------------------------------ */
app.get('/api/employees', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  res.json(await q('SELECT id,category,name,empno AS "empNo" FROM employees'));
}));
// پرۆفایلی تەواو — بەڕێوەبەری سەرەکی یان ئەوانەی دەسەڵاتی پرۆفایلیان هەیە
app.get('/api/staff', h(async (req, res) => {
  const u = await requirePerm(req, res, 'allowProfile'); if (!u) return;
  res.json(await q(`SELECT id,category,name,empno AS "empNo",dept,specialty,mobile,birthdate,workdays,empid,bloodtype,photo,card_issue AS "cardIssue",card_expiry AS "cardExpiry",name_en AS "nameEn",dept_en AS "deptEn",specialty_en AS "specialtyEn" FROM employees ORDER BY category,name`));
}));
app.post('/api/staff', h(async (req, res) => {
  const u = await requirePerm(req, res, 'allowProfile'); if (!u) return;
  const b = req.body || {};
  if (!['contract','permanent','service'].includes(b.category)) return res.status(400).json({ error: 'بەشی هەڵە.' });
  if (!String(b.name||'').trim()) return res.status(400).json({ error: 'ناو پێویستە.' });
  const r = await q(`INSERT INTO employees (category,name,empno,dept,specialty,mobile,birthdate,workdays,empid,bloodtype)
    VALUES ($1,$2,'',$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [b.category, String(b.name).trim(), b.dept||'', b.specialty||'', b.mobile||'', b.birthdate||'', b.workdays||'', b.empid||'', b.bloodtype||'']);
  await logAction(u.username,'زیادکردنی فەرمانبەر (پرۆفایل)', 'ناو: ' + String(b.name).trim() + '\nلیست: ' + catL(b.category) + (b.empid ? '\nID: ' + b.empid : ''), 'add');
  res.json({ id: r[0].id });
}));
app.delete('/api/staff/:id', h(async (req, res) => {
  const u = await requirePerm(req, res, 'allowProfile'); if (!u) return;
  const nm = await q('SELECT name,category,empid FROM employees WHERE id=$1', [req.params.id]);
  await q('DELETE FROM employees WHERE id=$1', [req.params.id]);
  await logAction(u.username,'سڕینەوەی فەرمانبەر', nm.length ? ('ناو: ' + nm[0].name + '\nلیست: ' + catL(nm[0].category) + (nm[0].empid ? '\nID: ' + nm[0].empid : '')) : ('#'+req.params.id), 'delete');
  res.json({ ok: true });
}));
app.put('/api/staff/:id', h(async (req, res) => {
  const u = await requirePerm(req, res, 'allowProfile'); if (!u) return;
  const rows = await q('SELECT * FROM employees WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'نەدۆزرایەوە.' });
  const row = rows[0], b = req.body || {};
  const g = (k, cur) => (b[k] != null ? String(b[k]) : cur);
  const nxt = { name: String(b.name != null ? b.name : row.name).trim() || row.name, dept: g('dept', row.dept), specialty: g('specialty', row.specialty), mobile: g('mobile', row.mobile),
    birthdate: g('birthdate', row.birthdate), workdays: g('workdays', row.workdays), empid: g('empid', row.empid), bloodtype: g('bloodtype', row.bloodtype), photo: g('photo', row.photo),
    cardIssue: g('cardIssue', row.card_issue), cardExpiry: g('cardExpiry', row.card_expiry), nameEn: g('nameEn', row.name_en), deptEn: g('deptEn', row.dept_en), specialtyEn: g('specialtyEn', row.specialty_en) };
  const sdiff = diffLines([['ناو', row.name, nxt.name], ['بەش', row.dept, nxt.dept], ['پسپۆڕی', row.specialty, nxt.specialty], ['مۆبایل', row.mobile, nxt.mobile],
    ['لەدایکبوون', row.birthdate, nxt.birthdate], ['ڕۆژانی کار', wdList(row.workdays), wdList(nxt.workdays)], ['ID', row.empid, nxt.empid], ['گرووپی خوێن', row.bloodtype, nxt.bloodtype],
    ['دەرچوونی کارت', row.card_issue, nxt.cardIssue], ['بەسەرچوونی کارت', row.card_expiry, nxt.cardExpiry],
    ['ناو (English)', row.name_en, nxt.nameEn], ['بەش (English)', row.dept_en, nxt.deptEn], ['پسپۆڕی (English)', row.specialty_en, nxt.specialtyEn]])
    + (String(row.photo || '') !== String(nxt.photo || '') ? '\nوێنە: ' + (nxt.photo ? 'گۆڕدرا' : 'لابرا') : '');
  await q(`UPDATE employees SET name=$1,dept=$2,specialty=$3,mobile=$4,birthdate=$5,workdays=$6,empid=$7,bloodtype=$8,photo=$9,card_issue=$10,card_expiry=$11,name_en=$12,dept_en=$13,specialty_en=$14 WHERE id=$15`,
    [String(b.name != null ? b.name : row.name).trim() || row.name,
     g('dept', row.dept), g('specialty', row.specialty), g('mobile', row.mobile),
     g('birthdate', row.birthdate), g('workdays', row.workdays), g('empid', row.empid), g('bloodtype', row.bloodtype), g('photo', row.photo),
     g('cardIssue', row.card_issue), g('cardExpiry', row.card_expiry),
     g('nameEn', row.name_en), g('deptEn', row.dept_en), g('specialtyEn', row.specialty_en),
     req.params.id]);
  if (sdiff.trim()) await logAction(u.username, 'دەستکاری پرۆفایلی فەرمانبەر', 'فەرمانبەر: ' + row.name + ' (' + catL(row.category) + ')\n' + sdiff.trim(), 'edit');
  res.json({ ok: true });
}));
app.post('/api/employees', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  if (!u.allowAdd) return res.status(403).json({ error: 'دەسەڵاتی زیادکردنت نییە.' });
  const { category, name, empNo } = req.body || {};
  if (!['contract', 'permanent', 'service'].includes(category)) return res.status(400).json({ error: 'بەشی هەڵە.' });
  if (!String(name || '').trim()) return res.status(400).json({ error: 'ناو پێویستە.' });
  const r = await q('INSERT INTO employees (category,name,empno) VALUES ($1,$2,$3) RETURNING id',
    [category, String(name).trim(), String(empNo || '').trim()]);
  await logAction(u.username, 'زیادکردنی ناو', 'ناو: ' + String(name).trim() + '\nلیست: ' + catL(category) + (String(empNo || '').trim() ? '\nژمارە: ' + String(empNo).trim() : ''), 'add');
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
  const ed = diffLines([['ناو', row.name, name], ['ژمارەی فەرمانبەر', row.empno, empNo]]);
  if (ed) await logAction(u.username, 'دەستکاری ناو', 'لیست: ' + catL(row.category) + '\n' + ed, 'edit');
  res.json({ ok: true });
}));
app.delete('/api/employees/:id', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  if (!u.allowDelete) return res.status(403).json({ error: 'دەسەڵاتی سڕینەوەت نییە.' });
  const nm = await q('SELECT name,category FROM employees WHERE id=$1', [req.params.id]);
  await q('DELETE FROM employees WHERE id=$1', [req.params.id]);
  await logAction(u.username,'سڕینەوەی ناو', nm.length ? ('ناو: ' + nm[0].name + '\nلیست: ' + catL(nm[0].category)) : ('#'+req.params.id), 'delete');
  res.json({ ok: true });
}));

/* ------------------------------ سکان + تۆماری ئامادەبوون ------------------------------ */
app.post('/api/scan', h(async (req, res) => {
  const u = await requirePerm(req, res, 'allowScan'); if (!u) return;
  const b = req.body || {};
  const code = String(b.empid || '').trim();
  const type = (b.type === 'out') ? 'out' : 'in';
  const shift = (b.shift === 'evening') ? 'evening' : 'morning';
  if (!code) return res.status(400).json({ error: 'کۆدی بەتاڵ.' });
  const rows = await q('SELECT id,name,category,empid,workdays FROM employees WHERE empid=$1', [code]);
  if (!rows.length) return res.status(404).json({ error: 'کارت نەدۆزرایەوە. ئەم کۆدە بۆ هیچ فەرمانبەرێک نییە.' });
  const emp = rows[0];
  const now = iraqNow();
  // ڕێکەوت و کات هەمیشە لە کاتژمێری سێرڤەرەوە (کاتی عێراق) — کاتژمێری مۆبایلی هەڵە تۆمارەکە ناشێوێنێت
  const day = now.day, time = now.time;
  // ئایا ئەمڕۆ ڕۆژی کاری ئەم فەرمانبەرەیە؟
  const wd = String(emp.workdays || '').split(',').filter(x => x !== '');
  const offday = wd.length > 0 && !wd.includes(String(weekdayIdx(day)));
  // ئایا پێشتر هەمان جۆر/شیفتی ئەمڕۆ تۆمار کراوە؟
  const dup = await q('SELECT COUNT(*)::int AS c FROM attendance WHERE employee_id=$1 AND day=$2 AND type=$3 AND shift=$4', [emp.id, day, type, shift]);
  await q('INSERT INTO attendance (employee_id,empid,name,day,time,type,shift,by_admin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [emp.id, emp.empid, emp.name, day, time, type, shift, u.username]);
  res.json({ ok: true, name: emp.name, category: emp.category, type, shift, day, time, duplicate: dup[0].c > 0, offday });
}));
app.get('/api/attendance', h(async (req, res) => {
  const u = await requirePerm(req, res, 'allowReport'); if (!u) return;
  const from = String(req.query.from || ''), to = String(req.query.to || ''), empid = String(req.query.empid || '');
  const conds = [], vals = []; let i = 1;
  if (from) { conds.push('day>=$' + i++); vals.push(from); }
  if (to) { conds.push('day<=$' + i++); vals.push(to); }
  if (empid) { conds.push('empid=$' + i++); vals.push(empid); }
  const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';
  res.json(await q('SELECT id,employee_id,empid,name,day,time,type,shift,by_admin FROM attendance ' + where + ' ORDER BY day DESC,time DESC', vals));
}));

/* ------------------------------ گواستنەوەی بەش (تەنها سەرەکی) ------------------------------ */
app.post('/api/transfer/:id', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const cat = (req.body || {}).category;
  if (!['contract', 'permanent', 'service'].includes(cat)) return res.status(400).json({ error: 'بەشی هەڵە.' });
  const nm = await q('SELECT name,category FROM employees WHERE id=$1', [req.params.id]);
  await q('UPDATE employees SET category=$1 WHERE id=$2', [cat, req.params.id]);
  await logAction(u.username,'گواستنەوەی بەش', 'ناو: ' + (nm.length?nm[0].name:('#'+req.params.id)) + '\nلیست: ' + (nm.length ? catL(nm[0].category) : '—') + ' ← ' + catL(cat), 'edit');
  res.json({ ok: true });
}));

/* ------------------------------ مۆڵەتەکان (بۆ هەموو ئادمینەکان) ------------------------------ */
app.get('/api/leaves', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const empid = String(req.query.empid || '');
  const conds = [], vals = []; let i = 1;
  if (empid) { conds.push('empid=$' + i++); vals.push(empid); }
  const where = conds.length ? ('WHERE ' + conds.join(' AND ')) : '';
  res.json(await q('SELECT id,employee_id,empid,name,type,from_day AS "fromDay",to_day AS "toDay",from_time AS "fromTime",to_time AS "toTime",note,by_admin FROM leaves ' + where + ' ORDER BY from_day DESC, id DESC', vals));
}));
app.post('/api/leaves', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const b = req.body || {};
  const rows = await q('SELECT id,name,empid FROM employees WHERE id=$1', [b.employeeId]);
  if (!rows.length) return res.status(404).json({ error: 'فەرمانبەر نەدۆزرایەوە.' });
  const e = rows[0];
  if (!['study', 'maternity', 'sudden'].includes(b.type)) return res.status(400).json({ error: 'جۆری مۆڵەت هەڵەیە.' });
  const r = await q(`INSERT INTO leaves (employee_id,empid,name,type,from_day,to_day,from_time,to_time,note,by_admin)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [e.id, e.empid, e.name, b.type, b.fromDay || '', b.toDay || b.fromDay || '', b.fromTime || '', b.toTime || '', b.note || '', u.username]);
  await logAction(u.username, 'زیادکردنی مۆڵەت', 'ناو: ' + e.name + '\nجۆر: ' + (LEAVE_LABEL[b.type] || b.type) + '\nلە: ' + dash(b.fromDay) + ' تا: ' + dash(b.toDay || b.fromDay)
    + ((b.fromTime || b.toTime) ? '\nکات: ' + dash(b.fromTime) + ' - ' + dash(b.toTime) : '') + (b.note ? '\nتێبینی: ' + b.note : ''), 'add');
  res.json({ id: r[0].id });
}));
app.delete('/api/leaves/:id', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const lv = await q('SELECT name,type,from_day,to_day,from_time,to_time,note FROM leaves WHERE id=$1', [req.params.id]);
  await q('DELETE FROM leaves WHERE id=$1', [req.params.id]);
  const l = lv[0];
  await logAction(u.username, 'سڕینەوەی مۆڵەت', l ? ('ناو: ' + l.name + '\nجۆر: ' + (LEAVE_LABEL[l.type] || l.type) + '\nلە: ' + dash(l.from_day) + ' تا: ' + dash(l.to_day)
    + ((l.from_time || l.to_time) ? '\nکات: ' + dash(l.from_time) + ' - ' + dash(l.to_time) : '') + (l.note ? '\nتێبینی: ' + l.note : '')) : ('#' + req.params.id), 'delete');
  res.json({ ok: true });
}));

/* ------------------------------ مێژووی چالاکی (تەنها سەرەکی) ------------------------------ */
// کردارەکانی تەنها لە براوزەر ڕوودەدەن (چاپ، هەناردە، داگرتن) — فرۆنتئێند ڕایدەگەیەنێت. تەنها ئەم کردارانە قبوڵن (وشەی تۆمار لە سێرڤەرەوە دەرمێت).
const AUDIT_EVENTS = {
  print_sheet:    ['چاپکردنی خشتەی هاتن و ڕۆشتن', 'print'],
  print_schedule: ['چاپکردنی خشتەی دەوام', 'print'],
  export_list:    ['هەناردەکردنی لیستی ناوەکان (CSV)', 'export'],
  export_report:  ['هەناردەکردنی ڕاپۆرت (Excel)', 'export'],
  export_leaves:  ['هەناردەکردنی مۆڵەتەکان (Excel)', 'export'],
  export_staff:   ['هەناردەکردنی پرۆفایلی فەرمانبەران (Excel)', 'export'],
  card_images:    ['داگرتنی وێنەی کارتی فەرمانبەر', 'export'],
  card_zip:       ['داگرتنی هەموو کارتەکان (ZIP)', 'export'],
  qr_download:    ['داگرتنی QR', 'export']
};
app.post('/api/audit/event', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const b = req.body || {};
  const ev = Object.prototype.hasOwnProperty.call(AUDIT_EVENTS, b.type) ? AUDIT_EVENTS[b.type] : null;
  if (!ev) return res.status(400).json({ error: 'جۆری کردار نەناسراوە.' });
  await logAction(u.username, ev[0], String(b.details || '').slice(0, 1500), ev[1]);
  res.json({ ok: true });
}));

/* ------------------------------ مێژووی چالاکی (تەنها سەرەکی) ------------------------------ */
const AUDIT_KINDS = ['add', 'edit', 'delete', 'print', 'export', 'login', 'system'];
app.get('/api/audit', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const qq = req.query, conds = [], vals = []; let i = 1;
  const lim = Math.min(500, Math.max(1, parseInt(qq.limit, 10) || 200));
  const before = parseInt(qq.before, 10);
  if (Number.isInteger(before) && before > 0) { conds.push('id < $' + i++); vals.push(before); }
  if (AUDIT_KINDS.includes(String(qq.kind || ''))) { conds.push('kind = $' + i++); vals.push(String(qq.kind)); }
  if (qq.admin) { conds.push('admin_user = $' + i++); vals.push(String(qq.admin).slice(0, 100)); }
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const LOCAL = "((at AT TIME ZONE 'UTC') + interval '3 hour')::date";   // کاتی عێراق
  if (DATE.test(String(qq.from || ''))) { conds.push(LOCAL + ' >= $' + i++ + '::date'); vals.push(String(qq.from)); }
  if (DATE.test(String(qq.to || ''))) { conds.push(LOCAL + ' <= $' + i++ + '::date'); vals.push(String(qq.to)); }
  const term = String(qq.q || '').trim().slice(0, 100);
  if (term) { conds.push('(action ILIKE $' + i + ' OR details ILIKE $' + i + ' OR admin_user ILIKE $' + i + ')'); vals.push('%' + term.replace(/[\\%_]/g, m => '\\' + m) + '%'); i++; }
  vals.push(lim);
  res.json(await q("SELECT id, to_char(at AT TIME ZONE 'UTC' + interval '3 hour','YYYY-MM-DD HH24:MI') AS at, admin_user AS \"adminUser\", action, details, kind FROM audit_log"
    + (conds.length ? ' WHERE ' + conds.join(' AND ') : '') + ' ORDER BY id DESC LIMIT $' + i, vals));
}));
// ناوی ئەو ئادمینانەی لە مێژووەکەدا هەن (بۆ فلتەر؛ ئەوانەشی سڕاونەتەوە)
app.get('/api/audit/admins', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  res.json((await q('SELECT DISTINCT admin_user FROM audit_log ORDER BY admin_user')).map(r => r.admin_user));
}));

/* ------------------------------ کورتەی ڕاپۆرت (Dashboard) ------------------------------ */
app.get('/api/summary', h(async (req, res) => {
  const u = await requirePerm(req, res, 'allowReport'); if (!u) return;
  const from = String(req.query.from || ''), to = String(req.query.to || '');
  const cond = [], vals = []; let i = 1;
  if (from) { cond.push('day>=$' + i++); vals.push(from); }
  if (to) { cond.push('day<=$' + i++); vals.push(to); }
  const where = cond.length ? ('WHERE ' + cond.join(' AND ')) : '';
  // کۆی ڕۆژە جیاوازەکانی ئامادەبوون بۆ هەر فەرمانبەرێک (بەپێی هاتن)
  const att = await q(`SELECT empid, name,
     COUNT(DISTINCT day) FILTER (WHERE type='in') AS present_days,
     COUNT(*) FILTER (WHERE type='in' AND shift='morning') AS morning_in,
     COUNT(*) FILTER (WHERE type='in' AND shift='evening') AS evening_in
     FROM attendance ${where} GROUP BY empid,name`, vals);
  // مۆڵەتەکان لە هەمان ماوە
  const lv = await q(`SELECT empid, COUNT(*)::int AS leaves FROM leaves ${where.replace(/day/g,'from_day')} GROUP BY empid`, vals);
  const lvMap = {}; lv.forEach(r => lvMap[r.empid] = r.leaves);
  const out = att.map(r => ({ empid: r.empid, name: r.name,
    presentDays: Number(r.present_days), morningIn: Number(r.morning_in), eveningIn: Number(r.evening_in),
    leaves: lvMap[r.empid] || 0 }));
  out.sort((a,b)=> b.presentDays - a.presentDays);
  res.json(out);
}));

/* ------------------------------ ئادمینەکان (تەنها سەرەکی) ------------------------------ */
app.get('/api/admins', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  res.json((await q('SELECT * FROM admins ORDER BY issuper DESC, username')).map(adminToListItem));
}));
app.post('/api/admins', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const b = req.body || {};
  const un = String(b.username || '').trim(), pw = String(b.password || '').trim();
  if (!un || !pw) return res.status(400).json({ error: 'بەکارهێنەر و پاسوۆرد پێویستە.' });
  if (await getAdmin(un)) return res.status(409).json({ error: 'ئەم بەکارهێنەرە پێشتر هەیە.' });
  await q('INSERT INTO admins (username,password,issuper,allowadd,allowdelete,allowedit,allowpdf,allowprofile,allowscan,allowreport,allowsheetview,allowsheetedit) VALUES ($1,$2,FALSE,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [un, pw, !!b.allowAdd, !!b.allowDelete, !!b.allowEdit, !!b.allowPdf, !!b.allowProfile, !!b.allowScan, !!b.allowReport, !!b.allowSheetView, !!b.allowSheetEdit]);
  await logAction(u.username,'زیادکردنی ئادمین', 'بەکارهێنەر: ' + un + '\nدەسەڵاتەکان: ' + permLines(b), 'add');
  res.json({ ok: true });
}));
app.put('/api/admins/:username', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const target = await getAdmin(req.params.username);
  if (!target) return res.status(404).json({ error: 'نەدۆزرایەوە.' });
  const b = req.body || {};
  if (target.isSuper && target.username === 'MKA95' && 'password' in b)
    return res.status(403).json({ error: 'ناتوانرێت پاسوۆردی سەرەکی سەرەکی بگۆڕدرێت لێرەوە.' });
  if ('password' in b && !String(b.password).trim()) return res.status(400).json({ error: 'پاسوۆرد نابێت بەتاڵ بێت.' });
  const map = { password: 'password', allowAdd: 'allowadd', allowDelete: 'allowdelete', allowEdit: 'allowedit', allowPdf: 'allowpdf', allowProfile: 'allowprofile', allowScan: 'allowscan', allowReport: 'allowreport', allowSheetView: 'allowsheetview', allowSheetEdit: 'allowsheetedit' };
  const sets = [], vals = []; let i = 1;
  for (const k of Object.keys(map)) {
    if (k in b) {
      if (target.isSuper && k !== 'password') continue; // دەسەڵاتی سەرەکی ناگۆڕدرێت
      sets.push(map[k] + '=$' + i); vals.push(k === 'password' ? String(b[k]).trim() : !!b[k]); i++;
    }
  }
  const pwChange = 'password' in b && String(b.password).trim() !== target.password;
  if (pwChange) { sets.push('pw_changed_at=now()'); sets.push('pw_changed_by=$' + i); vals.push(u.username); i++; }
  if (sets.length) { vals.push(target.username); await q('UPDATE admins SET ' + sets.join(',') + ' WHERE username=$' + i, vals); }
  if ('password' in b) await destroyUserSessions(target.username);   // پاسوۆرد گۆڕدرا → ئامێرەکانی تری ئەو ئادمینە دەردەچن
  // مێژوو: گۆڕینی پاسۆرد (خودی پاسۆرد نانووسرێت) + گۆڕینی دەسەڵاتەکان
  const changedPerms = target.isSuper ? [] : Object.keys(PERM_LABELS).filter(k => k in b && !!b[k] !== !!target[k]);
  const lines = changedPerms.map(k => PERM_LABELS[k] + ': ' + yn(target[k]) + ' ← ' + yn(b[k]));
  if (pwChange) lines.unshift('پاسۆرد: گۆڕدرا');
  if (lines.length) await logAction(u.username, pwChange && !changedPerms.length ? 'گۆڕینی پاسۆردی ئادمین' : 'دەستکاری ئادمین', 'ئادمین: ' + target.username + '\n' + lines.join('\n'), 'edit');
  res.json({ ok: true });
}));
app.delete('/api/admins/:username', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const target = await getAdmin(req.params.username);
  if (!target) return res.status(404).json({ error: 'نەدۆزرایەوە.' });
  if (target.isSuper) return res.status(403).json({ error: 'ناتوانرێت بەڕێوەبەری سەرەکی بسڕدرێتەوە.' });
  await q('DELETE FROM admins WHERE username=$1', [target.username]);
  await destroyUserSessions(target.username);
  await logAction(u.username,'سڕینەوەی ئادمین', 'ئادمین: ' + target.username, 'delete');
  res.json({ ok: true });
}));

/* ------------------------------ پرۆفایلی خۆم: وێنە + پاسۆرد (هەر ئادمینێک بۆ خۆی) ------------------------------
   بەڕێوەبەری سەرەکی هەموو گۆڕانکارییەکان دەبینێت: لیستی ئادمینەکان (پاسۆردی نوێ + وێنە + کێ گۆڕیوێتی) و مێژووی چالاکی. */
app.put('/api/me/password', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  if (u.isSuper && u.username === 'MKA95') return res.status(403).json({ error: 'پاسۆردی بەڕێوەبەری سەرەکی لەم شوێنە ناگۆڕدرێت.' });
  const b = req.body || {};
  const cur = String(b.current || '').trim(), nw = String(b.password || '').trim();
  const key = 'pw|' + u.username, wait = loginWait(key, LOGIN_MAX_PER_USER);
  if (wait > 0) return res.status(429).json({ error: 'هەوڵی هەڵەی زۆر. دوای ' + Math.ceil(wait / 60) + ' خولەک دووبارە هەوڵبدەوە.' });
  const row = (await q('SELECT password FROM admins WHERE username=$1', [u.username]))[0];
  if (!row || row.password !== cur) { loginFail(key); return res.status(400).json({ error: 'پاسۆردی ئێستا هەڵەیە.' }); }
  if (nw.length < 4) return res.status(400).json({ error: 'پاسۆردی نوێ دەبێت لانی کەم ٤ پیت بێت.' });
  if (nw === cur) return res.status(400).json({ error: 'پاسۆردی نوێ هەمان پاسۆردی ئێستایە.' });
  loginFails.delete(key);
  await q('UPDATE admins SET password=$1, pw_changed_at=now(), pw_changed_by=$2 WHERE username=$3', [nw, u.username, u.username]);
  // ئامێرەکانی تر دەردەچن، ئەم ئامێرە نا
  await q('DELETE FROM sessions WHERE username=$1 AND token_hash<>$2', [u.username, hashToken(req.headers['x-auth-token'])]);
  await logAction(u.username, 'گۆڕینی پاسۆردی خۆی', 'ئادمین: ' + u.username + '\nپاسۆرد: گۆڕدرا', 'edit');
  res.json({ ok: true });
}));
app.put('/api/me/photo', h(async (req, res) => {
  const u = await requireAuth(req, res); if (!u) return;
  const ph = String((req.body || {}).photo || '');
  if (ph !== '' && !(ph.length <= 300000 && PHOTO_RE.test(ph))) return res.status(400).json({ error: 'وێنەکە دروست نییە (PNG / JPG / WEBP، بچووکتر لە ٢٠٠ کیلۆبایت).' });
  await q('UPDATE admins SET photo=$1 WHERE username=$2', [ph, u.username]);
  await logAction(u.username, ph ? 'گۆڕینی وێنەی خۆی' : 'لابردنی وێنەی خۆی', 'ئادمین: ' + u.username, 'edit');
  res.json({ ok: true, photo: ph });
}));

/* ------------------------------ خشتەی دەوامی کارمەندان (v3.2) ------------------------------
   خشتەی هەفتانەی دیاریکراو (بێ بەروار): بۆ هەر (فەرمانبەر × ڕۆژی هەفتە) ڕیزێک هەیە کە بەیانی/ئێوارەی تێدایە.
   ڕۆژی هەفتە: ٠=شەممە ... ٦=هەینی (هەمان WDAYS ی فرۆنتئێند و workdays ی پرۆفایل).
   ئەم خشتەیە لە لیستی سەرەکی جیایە: زیادکردن/لابردن/گۆڕینی ناو لێرە هیچ کاریگەرییەکی نییە لەسەر خشتەی employees.
   ڕیزی فەرمانبەری ڕاستەقینە بە employee_id ەوە بەستراوە (نەک بە ناو/بەش)، بۆیە ئەگەر فەرمانبەر لە گرێبەستەوە
   بگوازرێتەوە بۆ هەمیشەیی، ڕۆژ و شەفتەکانی خۆکار لەگەڵی دەگوازرێنەوە. ناوی دەستی (employee_id=NULL) بەشی خۆی هەیە. */
const SHEET_CATS = ['contract', 'permanent', 'service'];
// ناونیشانی بنەڕەتی هەر لیستێک (بەڕێوەبەر دەتوانێت بیگۆڕێت؛ بەتاڵ = ئەم بنەڕەتە)
const SHEET_TITLE_DEFAULTS = {
  contract: 'خشتەی دەوامی فەرمانبەران و مامۆستایانی گرێبەست',
  permanent: 'خشتەی دەوامی فەرمانبەران و مامۆستایانی هەمیشەیی',
  service: 'خشتەی دەوامی کارگوزار'
};
const OLD_SHEET_TITLE = 'خشتەی دەوامی کارمەندان';   // بنەڕەتی v3.2 — ئەگەر هەر ئەمە پاشەکەوت کرابێت وەک «نەگۆڕاو» دادەنرێت
const SHEET_TEXT_DEFAULTS = {
  dayLbl: 'ڕۆژ:',
  hNum: 'ژمارە', hName: 'ناوی کارمەند', hM: 'بەیانی', hE: 'ئێوارە', hNote: 'تێبینی',
  fLead: 'کۆی کارمەندانی دەوامدار', fM: 'ژمارەی بەیانی', fE: 'ژمارەی ئێوارە', fB: 'ژمارەی هەردوو کات',
  pageLbl: 'لاپەڕە', pageOf: 'لە', contLbl: 'بەردەوام دەبێت لە لاپەڕەی دواتر'
};
const sheetDefaultConfig = () => ({ texts: Object.assign({}, SHEET_TEXT_DEFAULTS), titles: { contract: '', permanent: '', service: '' }, days: [1, 2, 3, 4, 5], rowsPerPage: 10, showBuilding: true, logo: '' });
const sheetTitleOf = (cfg, cat) => (cfg.titles && cfg.titles[cat]) || SHEET_TITLE_DEFAULTS[cat] || '';
const SHEET_TXT_LABELS = { dayLbl: 'وشەی «ڕۆژ:»', hNum: 'سەرستوونی ژمارە', hName: 'سەرستوونی ناو', hM: 'سەرستوونی بەیانی', hE: 'سەرستوونی ئێوارە', hNote: 'سەرستوونی تێبینی',
  fLead: 'کۆی کارمەندانی دەوامدار', fM: 'ژمارەی بەیانی', fE: 'ژمارەی ئێوارە', fB: 'ژمارەی هەردوو کات', pageLbl: 'وشەی «لاپەڕە»', pageOf: 'وشەی «لە»', contLbl: 'تێکستی لاپەڕەی بەردەوام' };
// پاککردنەوە + گونجاندنی ڕێکخستنەکان (هەم بۆ PUT هەم بۆ گەڕاندنەوەی باکئەپ)
function cleanSheetConfig(input, cur) {
  const out = { texts: Object.assign({}, cur.texts), titles: Object.assign({ contract: '', permanent: '', service: '' }, cur.titles), days: cur.days.slice(), rowsPerPage: cur.rowsPerPage, showBuilding: cur.showBuilding, logo: cur.logo };
  const b = input && typeof input === 'object' ? input : {};
  if (b.texts && typeof b.texts === 'object')
    for (const k of Object.keys(SHEET_TEXT_DEFAULTS)) if (typeof b.texts[k] === 'string') out.texts[k] = b.texts[k].trim().slice(0, 120);
  if (b.titles && typeof b.titles === 'object') {
    for (const c of SHEET_CATS) if (typeof b.titles[c] === 'string') { const v = b.titles[c].trim().slice(0, 120); out.titles[c] = (v === SHEET_TITLE_DEFAULTS[c] || v === OLD_SHEET_TITLE) ? '' : v; }
  } else if (b.texts && typeof b.texts.title === 'string') {
    // فایل/ڕێکخستنی کۆن (v3.2) کە یەک ناونیشانی هاوبەشی هەبوو: ئەگەر بەکارهێنەر گۆڕیبێتی بۆ هەر سێ لیستەکە دەمێنێتەوە، ئەگەر نا ناونیشانی بنەڕەتی هەر لیستێک
    const t = b.texts.title.trim().slice(0, 120);
    if (t && t !== OLD_SHEET_TITLE) for (const c of SHEET_CATS) out.titles[c] = t;
  }
  if (Array.isArray(b.days)) {
    const d = [...new Set(b.days.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort((x, y) => x - y);
    if (d.length) out.days = d;
  }
  if (b.rowsPerPage != null) { const n = parseInt(b.rowsPerPage, 10); if (Number.isInteger(n)) out.rowsPerPage = Math.min(14, Math.max(6, n)); }
  if (typeof b.showBuilding === 'boolean') out.showBuilding = b.showBuilding;
  if (typeof b.logo === 'string') {
    if (b.logo === '') out.logo = '';
    else if (b.logo.length <= 900000 && /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(b.logo)) out.logo = b.logo;
  }
  return out;
}
async function getSheetConfig() {
  const rows = await q("SELECT value FROM settings WHERE key='sheet_config'");
  let stored = {}; try { stored = rows.length ? JSON.parse(rows[0].value) : {}; } catch (e) {}
  return cleanSheetConfig(stored, sheetDefaultConfig());
}
const sheetCanView = u => !!(u && (u.isSuper || u.allowSheetView || u.allowSheetEdit));
const sheetCanEdit = u => !!(u && (u.isSuper || u.allowSheetEdit));
async function requireSheet(req, res, edit) {
  const u = await requireAuth(req, res); if (!u) return null;
  if (!(edit ? sheetCanEdit(u) : sheetCanView(u))) { res.status(403).json({ error: 'دەسەڵاتی خشتەی دەوامت نییە.' }); return null; }
  return u;
}
const SHEET_USER_ERR = msg => Object.assign(new Error(msg), { userMessage: msg });
const shiftTxt = (m, e) => (m && e ? 'بەیانی + ئێوارە' : m ? 'بەیانی' : e ? 'ئێوارە' : 'هیچ کات');
// لیستی ناوەکان بۆ مێژوو: تا ٣٠ ناو، ئینجا «... و X کەسی تر»
const nameList = arr => arr.length > 30 ? arr.slice(0, 30).join('، ') + ' ... و ' + (arr.length - 30) + ' کەسی تر' : arr.join('، ');
async function sheetRowTitle(row) {   // ناوی ڕاستەقینەی ڕیزێک بۆ مێژوو
  if (row.name) return row.name;
  if (row.employee_id != null) { const e = await q('SELECT name FROM employees WHERE id=$1', [row.employee_id]); if (e.length) return e[0].name; }
  return row.snap || ('#' + row.id);
}
app.get('/api/sheet/config', h(async (req, res) => {
  const u = await requireSheet(req, res, false); if (!u) return;
  const s = await getSettings(false);
  res.json({ config: await getSheetConfig(), defaults: SHEET_TEXT_DEFAULTS, titleDefaults: SHEET_TITLE_DEFAULTS, uniName: s.uniName, instName: s.instName, canEdit: sheetCanEdit(u) });
}));
app.put('/api/sheet/config', h(async (req, res) => {
  const u = await requireSheet(req, res, true); if (!u) return;
  const b = req.body || {};
  const s = await getSettings(false);
  // ناوی زانکۆ/پەیمانگا هەمان ڕێکخستنی سەرەکی پرۆگرامە (لە هەموو شوێنێک دەگۆڕێت) — وەک پێشوو تەنها بەڕێوەبەری سەرەکی
  const uni = b.uniName != null ? String(b.uniName).trim() : s.uniName, inst = b.instName != null ? String(b.instName).trim() : s.instName;
  if ((uni !== s.uniName || inst !== s.instName)) {
    if (!u.isSuper) return res.status(403).json({ error: 'تەنها بەڕێوەبەری سەرەکی دەتوانێت ناوی زانکۆ و پەیمانگا بگۆڕێت.' });
    if (!uni || !inst) return res.status(400).json({ error: 'ناوی زانکۆ و پەیمانگا نابێت بەتاڵ بێت.' });
    await setSetting('uniName', uni); await setSetting('instName', inst);
  }
  const prevCfg = await getSheetConfig();
  const cfg = cleanSheetConfig(b, prevCfg);
  await setSetting('sheet_config', JSON.stringify(cfg));
  const cl = [];
  for (const c of SHEET_CATS) if (sheetTitleOf(prevCfg, c) !== sheetTitleOf(cfg, c)) cl.push('ناونیشان (' + catL(c) + '): ' + sheetTitleOf(prevCfg, c) + ' ← ' + sheetTitleOf(cfg, c));
  for (const k of Object.keys(SHEET_TXT_LABELS)) if (prevCfg.texts[k] !== cfg.texts[k]) cl.push(SHEET_TXT_LABELS[k] + ': ' + dash(prevCfg.texts[k]) + ' ← ' + dash(cfg.texts[k]));
  if (prevCfg.days.join() !== cfg.days.join()) cl.push('ڕۆژەکان: ' + prevCfg.days.map(d => WD_NAMES[d]).join('، ') + ' ← ' + cfg.days.map(d => WD_NAMES[d]).join('، '));
  if (prevCfg.rowsPerPage !== cfg.rowsPerPage) cl.push('ڕیز لە هەر لاپەڕەیەک: ' + prevCfg.rowsPerPage + ' ← ' + cfg.rowsPerPage);
  if (prevCfg.showBuilding !== cfg.showBuilding) cl.push('وێنەی بینا: ' + yn(prevCfg.showBuilding) + ' ← ' + yn(cfg.showBuilding));
  if (prevCfg.logo !== cfg.logo) cl.push('لۆگۆ: ' + (cfg.logo ? 'گۆڕدرا' : 'گەڕایەوە بۆ لۆگۆی EPU'));
  if (uni !== s.uniName) cl.push('ناوی زانکۆ: ' + s.uniName + ' ← ' + uni);
  if (inst !== s.instName) cl.push('ناوی پەیمانگا: ' + s.instName + ' ← ' + inst);
  if (cl.length) await logAction(u.username, 'خشتەی دەوام: گۆڕینی ڕێکخستن', cl.join('\n'), 'edit');
  const s2 = await getSettings(false);
  res.json({ config: cfg, defaults: SHEET_TEXT_DEFAULTS, titleDefaults: SHEET_TITLE_DEFAULTS, uniName: s2.uniName, instName: s2.instName, canEdit: true });
}));
// داتای یەک بەش: فەرمانبەرەکانی ئەو بەشە + هەموو ڕیزەکانی خشتەی دەوامی ئەو بەشە
app.get('/api/sheet/data', h(async (req, res) => {
  const u = await requireSheet(req, res, false); if (!u) return;
  const cat = String(req.query.category || '');
  if (!SHEET_CATS.includes(cat)) return res.status(400).json({ error: 'بەشی هەڵە.' });
  // کۆپییەی ناو (snap) ڕێک دەخرێتەوە: بۆ ئەو کاتەی فەرمانبەرێک لە لیستی سەرەکی دەسڕێتەوە، ناوەکەی لە خشتەکەدا بمێنێت
  await q('UPDATE sheet_rows r SET snap=e.name FROM employees e WHERE r.employee_id=e.id AND e.category=$1 AND r.snap<>e.name', [cat]);
  const employees = await q('SELECT id,name,workdays,empid FROM employees WHERE category=$1 ORDER BY name', [cat]);
  const rows = (await q(`SELECT r.id, r.employee_id, r.weekday, r.morning, r.evening, r.note, r.name AS name_ov, r.snap, e.id AS eid, e.name AS ename
      FROM sheet_rows r LEFT JOIN employees e ON e.id = r.employee_id
      WHERE (e.id IS NOT NULL AND e.category=$1) OR (e.id IS NULL AND r.category=$1) ORDER BY r.id`, [cat])).map(r => ({
    id: r.id, employeeId: r.employee_id, weekday: r.weekday, morning: r.morning, evening: r.evening, note: r.note,
    name: r.name_ov || r.ename || r.snap, realName: r.ename || r.snap, renamed: !!r.name_ov,
    manual: r.employee_id == null, orphan: r.employee_id != null && r.eid == null
  }));
  res.json({ category: cat, employees, rows });
}));
// دیاریکردن/لابردنی چەند فەرمانبەرێکی ڕاستەقینە لە ڕۆژێکدا (upsert): {items:[{employeeId, weekday, morning?, evening?, note?, remove?}]}
app.post('/api/sheet/rows', h(async (req, res) => {
  const u = await requireSheet(req, res, true); if (!u) return;
  const items = Array.isArray((req.body || {}).items) ? req.body.items : [];
  if (!items.length || items.length > 600) return res.status(400).json({ error: 'داواکارییەکە دروست نییە.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = [...new Set(items.map(i => parseInt(i && i.employeeId, 10)).filter(Number.isInteger))];
    const emps = ids.length ? (await client.query('SELECT id,name,category FROM employees WHERE id = ANY($1::int[])', [ids])).rows : [];
    const empMap = new Map(emps.map(e => [e.id, e]));
    const prevRows = ids.length ? (await client.query('SELECT employee_id,weekday,morning,evening FROM sheet_rows WHERE employee_id = ANY($1::int[])', [ids])).rows : [];
    const prevMap = new Map(prevRows.map(r => [r.employee_id + '|' + r.weekday, r]));
    const events = [];   // {cat, wd, name, kind:'add'|'rem'|'chg', text}
    const out = [];
    for (const it of items) {
      const eid = parseInt(it && it.employeeId, 10), wd = parseInt(it && it.weekday, 10);
      if (!empMap.has(eid)) throw SHEET_USER_ERR('فەرمانبەر نەدۆزرایەوە.');
      if (!(wd >= 0 && wd <= 6)) throw SHEET_USER_ERR('ڕۆژی هەفتە هەڵەیە.');
      if (it.remove) {
        await client.query('DELETE FROM sheet_rows WHERE employee_id=$1 AND weekday=$2', [eid, wd]); out.push({ employeeId: eid, weekday: wd, removed: true });
        if (prevMap.has(eid + '|' + wd)) events.push({ cat: empMap.get(eid).category, wd, name: empMap.get(eid).name, kind: 'rem' });
        continue;
      }
      const e = empMap.get(eid);
      const hasM = typeof it.morning === 'boolean', hasE = typeof it.evening === 'boolean', hasN = typeof it.note === 'string';
      const r = await client.query(`INSERT INTO sheet_rows (category,weekday,employee_id,name,snap,morning,evening,note)
          VALUES ($1,$2,$3,COALESCE((SELECT name FROM sheet_rows WHERE employee_id=$3 AND name<>'' LIMIT 1),''),$4,$5,$6,$7)
          ON CONFLICT (employee_id, weekday) WHERE employee_id IS NOT NULL DO UPDATE SET
            morning = CASE WHEN $8::boolean THEN EXCLUDED.morning ELSE sheet_rows.morning END,
            evening = CASE WHEN $9::boolean THEN EXCLUDED.evening ELSE sheet_rows.evening END,
            note = CASE WHEN $10::boolean THEN EXCLUDED.note ELSE sheet_rows.note END,
            category = EXCLUDED.category, snap = EXCLUDED.snap, updated_at = now()
          RETURNING id, morning, evening, note`,
        [e.category, wd, eid, e.name, hasM ? it.morning : false, hasE ? it.evening : false, hasN ? it.note.slice(0, 300) : '', hasM, hasE, hasN]);
      out.push({ id: r.rows[0].id, employeeId: eid, weekday: wd, morning: r.rows[0].morning, evening: r.rows[0].evening, note: r.rows[0].note });
      const pv = prevMap.get(eid + '|' + wd), nm = r.rows[0];
      if (!pv) events.push({ cat: e.category, wd, name: e.name, kind: 'add', text: shiftTxt(nm.morning, nm.evening) });
      else if (pv.morning !== nm.morning || pv.evening !== nm.evening) events.push({ cat: e.category, wd, name: e.name, kind: 'chg', text: shiftTxt(pv.morning, pv.evening) + ' ← ' + shiftTxt(nm.morning, nm.evening) });
    }
    await client.query('COMMIT');
    if (events.length) {
      const groups = new Map();
      for (const ev of events) { const k = ev.cat + '|' + ev.wd; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(ev); }
      const lines = [];
      for (const [k, evs] of groups) {
        const [cat, wd] = k.split('|');
        lines.push('لیست: ' + catL(cat) + ' · ڕۆژ: ' + WD_NAMES[+wd]);
        const add = evs.filter(x => x.kind === 'add'), rem = evs.filter(x => x.kind === 'rem'), chg = evs.filter(x => x.kind === 'chg');
        if (add.length) lines.push('＋ زیادکران (' + add.length + '): ' + nameList(add.map(x => x.name + ' (' + x.text + ')')));
        if (rem.length) lines.push('－ لابران (' + rem.length + '): ' + nameList(rem.map(x => x.name)));
        if (chg.length) lines.push('～ گۆڕدران (' + chg.length + '): ' + nameList(chg.map(x => x.name + ' (' + x.text + ')')));
      }
      const hasAdd = events.some(x => x.kind === 'add'), hasRem = events.some(x => x.kind === 'rem'), hasChg = events.some(x => x.kind === 'chg');
      const onlyAdd = hasAdd && !hasRem && !hasChg, onlyRem = hasRem && !hasAdd && !hasChg;
      await logAction(u.username, onlyAdd ? 'خشتەی دەوام: زیادکردنی ناو' : onlyRem ? 'خشتەی دەوام: لابردنی ناو' : 'خشتەی دەوام: گۆڕانکاری لە ناوەکان', lines.join('\n'), onlyAdd ? 'add' : onlyRem ? 'delete' : 'edit');
    }
    res.json({ rows: out });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (e2) {}
    if (e.userMessage) return res.status(400).json({ error: e.userMessage });
    console.error(e); res.status(500).json({ error: 'هەڵەی سێرڤەر.' });
  } finally { client.release(); }
}));
// ناوی دەستی (کەسێک کە لە لیستی سەرەکیدا نییە) — تەنها لە خشتەی دەوامدا دەمێنێتەوە
app.post('/api/sheet/manual', h(async (req, res) => {
  const u = await requireSheet(req, res, true); if (!u) return;
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 120), wd = parseInt(b.weekday, 10);
  if (!SHEET_CATS.includes(b.category)) return res.status(400).json({ error: 'بەشی هەڵە.' });
  if (!name) return res.status(400).json({ error: 'ناو پێویستە.' });
  if (!(wd >= 0 && wd <= 6)) return res.status(400).json({ error: 'ڕۆژی هەفتە هەڵەیە.' });
  const r = await q('INSERT INTO sheet_rows (category,weekday,employee_id,name,snap,morning,evening,note) VALUES ($1,$2,NULL,$3,$3,$4,$5,$6) RETURNING id',
    [b.category, wd, name, b.morning === true, b.evening === true, String(b.note || '').slice(0, 300)]);
  await logAction(u.username, 'خشتەی دەوام: زیادکردنی ناوی دەستی', 'ناو: ' + name + '\nلیست: ' + catL(b.category) + ' · ڕۆژ: ' + WD_NAMES[wd] + '\nکات: ' + shiftTxt(b.morning === true, b.evening === true) + (b.note ? '\nتێبینی: ' + String(b.note).slice(0, 300) : ''), 'add');
  res.json({ id: r[0].id });
}));
// دەستکاری ڕیزێک بە id: تێبینی، شەفت، ناو (تەنها لە خشتەکەدا)، گواستنەوەی ناوی دەستی بۆ بەشێکی تر
app.put('/api/sheet/row/:id', h(async (req, res) => {
  const u = await requireSheet(req, res, true); if (!u) return;
  const id = parseInt(req.params.id, 10);
  const rows = Number.isInteger(id) ? await q('SELECT * FROM sheet_rows WHERE id=$1', [id]) : [];
  if (!rows.length) return res.status(404).json({ error: 'نەدۆزرایەوە.' });
  const row = rows[0], b = req.body || {};
  const sets = [], vals = []; let i = 1;
  if ('note' in b) { sets.push('note=$' + i++); vals.push(String(b.note || '').slice(0, 300)); }
  if ('morning' in b) { sets.push('morning=$' + i++); vals.push(b.morning === true); }
  if ('evening' in b) { sets.push('evening=$' + i++); vals.push(b.evening === true); }
  if ('category' in b) {
    if (row.employee_id != null) return res.status(400).json({ error: 'بەشی فەرمانبەری ڕاستەقینە لە لیستی سەرەکییەوە دیاری دەکرێت.' });
    if (!SHEET_CATS.includes(b.category)) return res.status(400).json({ error: 'بەشی هەڵە.' });
    sets.push('category=$' + i++); vals.push(b.category);
  }
  if ('name' in b) {
    const nm = String(b.name || '').trim().slice(0, 120);
    if (row.employee_id == null) {
      if (!nm) return res.status(400).json({ error: 'ناو پێویستە.' });
      sets.push('name=$' + i++); vals.push(nm);
    } else {
      // ناوی گۆڕدراو تەنها لەسەر خشتەی دەوامە، بۆ هەموو ڕۆژەکانی ئەو فەرمانبەرە؛ بەتاڵ = گەڕانەوە بۆ ناوی لیستی سەرەکی
      await q('UPDATE sheet_rows SET name=$1, updated_at=now() WHERE employee_id=$2', [nm, row.employee_id]);
    }
  }
  if (sets.length) { vals.push(id); await q('UPDATE sheet_rows SET ' + sets.join(',') + ', updated_at=now() WHERE id=$' + i, vals); }
  const rl = [];
  if ('note' in b && String(b.note || '').slice(0, 300) !== row.note) rl.push('تێبینی: ' + dash(row.note) + ' ← ' + dash(String(b.note || '').slice(0, 300)));
  if ('morning' in b && (b.morning === true) !== row.morning) rl.push('بەیانی: ' + yn(row.morning) + ' ← ' + yn(b.morning === true));
  if ('evening' in b && (b.evening === true) !== row.evening) rl.push('ئێوارە: ' + yn(row.evening) + ' ← ' + yn(b.evening === true));
  if ('category' in b && b.category !== row.category) rl.push('گواستنەوە: ' + catL(row.category) + ' ← ' + catL(b.category));
  if ('name' in b) { const nn = String(b.name || '').trim().slice(0, 120); if (nn !== (row.name || '')) rl.push('ناو لەسەر خشتە: ' + dash(row.name) + ' ← ' + (nn || 'ناوی لیستی سەرەکی')); }
  if (rl.length) await logAction(u.username, 'خشتەی دەوام: دەستکاری ڕیز', 'ناو: ' + await sheetRowTitle(row) + '\nلیست: ' + catL(row.category) + ' · ڕۆژ: ' + WD_NAMES[row.weekday] + '\n' + rl.join('\n'), 'edit');
  res.json({ ok: true });
}));
app.delete('/api/sheet/row/:id', h(async (req, res) => {
  const u = await requireSheet(req, res, true); if (!u) return;
  const id = parseInt(req.params.id, 10);
  if (Number.isInteger(id)) {
    const rw = (await q('SELECT * FROM sheet_rows WHERE id=$1', [id]))[0];
    await q('DELETE FROM sheet_rows WHERE id=$1', [id]);
    if (rw) await logAction(u.username, 'خشتەی دەوام: لابردنی ڕیز', 'ناو: ' + await sheetRowTitle(rw) + '\nلیست: ' + catL(rw.category) + ' · ڕۆژ: ' + WD_NAMES[rw.weekday] + '\nکات: ' + shiftTxt(rw.morning, rw.evening) + (rw.employee_id == null ? '\n(ناوی دەستی)' : ''), 'delete');
  }
  res.json({ ok: true });
}));

/* ------------------------------ باکئەپ / گەڕاندنەوە ------------------------------
   وەشانی ٤: admins + employees + settings + attendance + leaves (+ sheetRows/sheetConfig: خشتەی دەوام، v3.2).
   (مێژووی چالاکی audit_log ناخرێتە باکئەپ و ناگەڕێنرێتەوە — تۆمارێکی بەردەوامە.)
   باکئەپی کۆنی وەشانی ٣ هێشتا دەگەڕێتەوە؛ attendance/leaves دەست لێ نادرێن ئەگەر لە فایلەکەدا نەبن. */
const EMP_COLS = 'category,name,empno,dept,specialty,mobile,birthdate,workdays,empid,bloodtype,photo,card_issue,card_expiry,name_en,dept_en,specialty_en';
const empValues = e => [e.category, e.name, e.empNo || e.empno || '', e.dept||'', e.specialty||'', e.mobile||'', e.birthdate||'', e.workdays||'', e.empid||'', e.bloodtype||'', e.photo||'', e.cardIssue||'', e.cardExpiry||'', e.nameEn||'', e.deptEn||'', e.specialtyEn||''];
app.get('/api/backup', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const payload = {
    version: 4, exportedAt: new Date().toISOString(),
    admins: (await q('SELECT * FROM admins')).map(adminToClient),
    employees: await q('SELECT id,category,name,empno AS "empNo",dept,specialty,mobile,birthdate,workdays,empid,bloodtype,photo,card_issue AS "cardIssue",card_expiry AS "cardExpiry",name_en AS "nameEn",dept_en AS "deptEn",specialty_en AS "specialtyEn" FROM employees'),
    settings: await getSettings(true),
    attendance: await q('SELECT id,employee_id,empid,name,day,time,type,shift,by_admin,created_at FROM attendance ORDER BY id'),
    leaves: await q('SELECT id,employee_id,empid,name,type,from_day,to_day,from_time,to_time,note,by_admin,created_at FROM leaves ORDER BY id'),
    sheetRows: await q('SELECT id,category,weekday,employee_id,name,snap,morning,evening,note FROM sheet_rows ORDER BY id'),
    sheetConfig: await getSheetConfig()
  };
  await setSetting('lastBackup', iraqNow().day);
  await logAction(u.username, 'دروستکردنی باکئەپ', 'فەرمانبەر: ' + payload.employees.length + ' · ئادمین: ' + payload.admins.length + ' · تۆماری ئامادەبوون: ' + payload.attendance.length + ' · مۆڵەت: ' + payload.leaves.length + ' · ڕیزی خشتەی دەوام: ' + payload.sheetRows.length, 'system');
  res.json(payload);
}));
// تۆمارە زۆرەکان (attendance) بە دەستە و بە یەک query بۆ هەر دەستەیەک دەنێردرێن — خێرا لەسەر Neon
async function bulkInsert(client, sql, rows) {
  for (let i = 0; i < rows.length; i += 2000) await client.query(sql, [JSON.stringify(rows.slice(i, i + 2000))]);
}
app.post('/api/restore', h(async (req, res) => {
  const u = await requireSuper(req, res); if (!u) return;
  const data = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (Array.isArray(data.admins)) {
      if (!data.admins.some(a => a && a.isSuper))
        throw Object.assign(new Error('no super admin'), { userMessage: 'فایلی باکئەپ هیچ بەڕێوەبەرێکی سەرەکی تێدا نییە — گەڕاندنەوە ڕاگیرا.' });
      await client.query('DELETE FROM admins');
      for (const a of data.admins) {
        await client.query('INSERT INTO admins (username,password,issuper,allowadd,allowdelete,allowedit,allowpdf,allowprofile,allowscan,allowreport,allowsheetview,allowsheetedit,photo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
          [a.username, a.password, !!a.isSuper, !!a.allowAdd, !!a.allowDelete, !!a.allowEdit, !!a.allowPdf, !!a.allowProfile, !!a.allowScan, !!a.allowReport, !!a.allowSheetView, !!a.allowSheetEdit,
           (typeof a.photo === 'string' && a.photo.length <= 300000 && PHOTO_RE.test(a.photo)) ? a.photo : '']);
      }
    }
    const idMap = new Map();   // ID ی کۆنی فەرمانبەر -> ID ی نوێ
    if (Array.isArray(data.employees)) {
      await client.query('DELETE FROM employees');
      const ids = data.employees.map(e => e && e.id);
      // ئەگەر هەموو فەرمانبەران ID ی دروستیان هەیە، هەمان ID دەپارێزرێت (attendance/leaves بە ID ەوە بەستراون)
      const keepIds = ids.length > 0 && ids.every(x => Number.isInteger(x) && x > 0) && new Set(ids).size === ids.length;
      for (const e of data.employees) {
        const r = keepIds
          ? await client.query('INSERT INTO employees (id,' + EMP_COLS + ') VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id', [e.id, ...empValues(e)])
          : await client.query('INSERT INTO employees (' + EMP_COLS + ') VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id', empValues(e));
        if (Number.isInteger(e.id)) idMap.set(e.id, r.rows[0].id);
      }
      if (keepIds) await client.query("SELECT setval(pg_get_serial_sequence('employees','id'), (SELECT MAX(id) FROM employees))");
    }
    const mapId = id => idMap.has(id) ? idMap.get(id) : (Number.isInteger(id) ? id : null);
    if (Array.isArray(data.attendance)) {
      await client.query('DELETE FROM attendance');
      await bulkInsert(client, `INSERT INTO attendance (employee_id,empid,name,day,time,type,shift,by_admin,created_at)
        SELECT employee_id,empid,name,day,time,type,shift,by_admin,COALESCE(created_at,now())
        FROM jsonb_to_recordset($1::jsonb) AS x(employee_id int,empid text,name text,day text,time text,type text,shift text,by_admin text,created_at timestamptz)`,
        data.attendance.map(r => ({ employee_id: mapId(r.employee_id), empid: r.empid || '', name: r.name || '', day: r.day || '', time: r.time || '',
          type: r.type === 'out' ? 'out' : 'in', shift: r.shift === 'evening' ? 'evening' : 'morning', by_admin: r.by_admin || '', created_at: r.created_at || null })));
    }
    if (Array.isArray(data.leaves)) {
      await client.query('DELETE FROM leaves');
      await bulkInsert(client, `INSERT INTO leaves (employee_id,empid,name,type,from_day,to_day,from_time,to_time,note,by_admin,created_at)
        SELECT employee_id,empid,name,type,from_day,to_day,from_time,to_time,note,by_admin,COALESCE(created_at,now())
        FROM jsonb_to_recordset($1::jsonb) AS x(employee_id int,empid text,name text,type text,from_day text,to_day text,from_time text,to_time text,note text,by_admin text,created_at timestamptz)`,
        data.leaves.map(r => ({ employee_id: mapId(r.employee_id), empid: r.empid || '', name: r.name || '', type: r.type || '',
          from_day: r.from_day || r.fromDay || '', to_day: r.to_day || r.toDay || '', from_time: r.from_time || r.fromTime || '', to_time: r.to_time || r.toTime || '',
          note: r.note || '', by_admin: r.by_admin || '', created_at: r.created_at || null })));
    }
    // خشتەی دەوام: ئەگەر فایلەکە هەیبێت جێگای دەگرێتەوە، ئەگەر نا (باکئەپی کۆن) دەست لێ نادرێت
    if (Array.isArray(data.sheetRows)) {
      await client.query('DELETE FROM sheet_rows');
      const seen = new Set(), srows = [];
      for (const r of data.sheetRows) {
        if (!r || !SHEET_CATS.includes(r.category)) continue;
        const wd = parseInt(r.weekday, 10); if (!(wd >= 0 && wd <= 6)) continue;
        const eid = r.employee_id == null ? null : mapId(r.employee_id);
        if (eid != null) { const k = eid + '|' + wd; if (seen.has(k)) continue; seen.add(k); }
        srows.push({ category: r.category, weekday: wd, employee_id: eid, name: String(r.name || '').slice(0, 120), snap: String(r.snap || r.name || '').slice(0, 120),
          morning: r.morning === true, evening: r.evening === true, note: String(r.note || '').slice(0, 300) });
      }
      await bulkInsert(client, `INSERT INTO sheet_rows (category,weekday,employee_id,name,snap,morning,evening,note)
        SELECT category,weekday,employee_id,name,snap,morning,evening,note
        FROM jsonb_to_recordset($1::jsonb) AS x(category text,weekday int,employee_id int,name text,snap text,morning boolean,evening boolean,note text)`, srows);
    }
    if (data.sheetConfig && typeof data.sheetConfig === 'object')
      await client.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value',
        ['sheet_config', JSON.stringify(cleanSheetConfig(data.sheetConfig, sheetDefaultConfig()))]);
    // فەرمانبەران گۆڕدران بەڵام فایلەکە attendance/leaves ی تێدا نییە (وەشانی ٣): بە empid دووبارە دەیانبەستینەوە
    if (Array.isArray(data.employees)) {
      if (!Array.isArray(data.attendance)) await client.query("UPDATE attendance a SET employee_id=e.id FROM employees e WHERE a.empid<>'' AND a.empid=e.empid");
      if (!Array.isArray(data.leaves)) await client.query("UPDATE leaves l SET employee_id=e.id FROM employees e WHERE l.empid<>'' AND l.empid=e.empid");
    }
    const upsert = (k, v) => client.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', [k, v]);
    if (data.settings) {
      const s = data.settings;
      if (s.title != null) await upsert('title', s.title);
      if (s.uniName != null) await upsert('uniName', s.uniName);
      if (s.instName != null) await upsert('instName', s.instName);
      if (s.showBadge != null) await upsert('showBadge', s.showBadge ? 'true' : 'false');
      for (const k of ['coverTitle', 'coverSubtitle', 'coverNote', 'uniNameEn', 'instNameEn'])
        if (s[k] != null) await upsert(k, String(s[k]));
      if (typeof s.imgbbKey === 'string' && s.imgbbKey.trim()) await upsert('imgbbKey', s.imgbbKey.trim());
    } else if (data.title) { await upsert('title', data.title); }
    await client.query('COMMIT');
    const cnt = x => Array.isArray(x) ? x.length : '—';
    await logAction(u.username, 'گەڕاندنەوەی باکئەپ', 'وەشانی ' + (data.version || '?') + ' · فەرمانبەر: ' + cnt(data.employees) + ' · ئادمین: ' + cnt(data.admins) + ' · تۆماری ئامادەبوون: ' + cnt(data.attendance)
      + ' · مۆڵەت: ' + cnt(data.leaves) + ' · ڕیزی خشتەی دەوام: ' + cnt(data.sheetRows), 'system');
    res.json({ ok: true });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (e2) {}
    console.error('restore failed:', e.message);
    res.status(400).json({ error: e.userMessage || 'فایلی باکئەپ دروست نییە.' });
  } finally { client.release(); }
}));

/* ------------------------------ دەستپێک ------------------------------ */
(async () => {
  try {
    await ensureSchema();
    await seed();
    await purgeSessions();
    setInterval(() => purgeSessions().catch(() => {}), 6 * 3600 * 1000).unref();
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
