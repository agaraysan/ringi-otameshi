// 稟議・申請 お試し版（画面）
// データは Supabase に置き、書き込みはすべて決まった手続き（rpc）を通す。だれの番かなどの決まりはデータの側で確かめる。
(function () {
'use strict';

const CFG = window.RINGI_CONFIG || {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yen = n => (n == null ? '' : Number(n).toLocaleString('ja-JP') + '円');
const TZ = 'Asia/Tokyo';
const fmtAt = iso => new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const fmtDay = iso => new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, month: 'numeric', day: 'numeric' }).format(new Date(iso));
const md = ymd => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || ''); return m ? `${+m[2]}/${+m[3]}` : ymd; };
const todayYmd = (plus = 0) => { const d = new Date(Date.now() + plus * 864e5); return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(d); };

let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 3200); }
const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  new: '<path d="M12 5v14M5 12h14"/>',
  wait: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  org: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-2h12v2"/>',
  all: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  admin: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  done: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  chevr: '<path d="M9 6l6 6-6 6"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  hist: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  clip: '<path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  yen: '<path d="M6 4l6 8 6-8M12 12v8M8 13h8M8 17h8"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  stamp: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
};
const AV_COLORS = ['#2f6fdf', '#0f8a7e', '#b4541a', '#7a4fc9', '#c23b6b', '#2f7d32', '#a2700b', '#33658a'];
function avatar(id, cls = '') {
  const x = P(id); let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<span class="avt ${cls}" style="--av:${AV_COLORS[h % AV_COLORS.length]}" aria-hidden="true">${esc((x.name || '？').slice(0, 1))}</span>`;
}
// 空のときの絵（書類の箱）
const emptyArt = (msg, sub = '') => `<div class="emptybox"><svg viewBox="0 0 120 84" width="120" height="84" aria-hidden="true">
  <rect x="22" y="10" width="54" height="40" rx="5" class="ea-p2"/><rect x="34" y="4" width="54" height="40" rx="5" class="ea-p1"/>
  <path d="M42 16h30M42 24h38M42 32h22" class="ea-ln"/>
  <path d="M10 46h28l6 10h32l6-10h28v24a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6z" class="ea-box"/>
  <circle cx="98" cy="18" r="3" class="ea-dot"/><circle cx="16" cy="28" r="2" class="ea-dot"/></svg>
  <b>${msg}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
function todayLabel() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;
}
function greet() {
  const h = +new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date()) % 24;
  return h < 10 ? 'おはようございます' : h < 18 ? 'こんにちは' : 'おつかれさまです';
}
const GRP_ICON = { 'お金・購入': 'yen', '休み・勤務': 'cal', '行事・その他': 'star' };
const GRP_ORDER = ['お金・購入', '休み・勤務', '行事・その他'];
const icon = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ''}</svg>`;
const guide = h => `<div class="note">${icon('info')}<div>${h}</div></div>`;
const pageHead = (title, sub, actions = '') => `<div class="phead"><div><h1>${title}</h1>${sub ? `<p class="psub">${sub}</p>` : ''}</div>${actions ? `<div class="pact">${actions}</div>` : ''}</div>`;

// ---------------------------------------------------------------- つなぎ先
const configured = CFG.url && /^https?:\/\//.test(CFG.url) && CFG.anonKey && !/ここに/.test(CFG.anonKey);
if (!configured) {
  $('#view').innerHTML = `<section class="panel"><h1>つなぎ先がまだ入っていません</h1>
  <p>config.js に Supabase の Project URL と anon（publishable）key を入れてください。手順書の「4」を見てください。</p></section>`;
  return;
}
const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });

// ---------------------------------------------------------------- 状態
const S = {
  me: null, view: 'home', open: null, edit: null, filter: 'all', notesOpen: false,
  adminSel: null, draft: null, showHow: false, busy: false, titleTouched: false,
  staff: [], types: [], shifts: [], work: [], workMonth: null, teamDept: null, teamWho: null, prefill: null, steps: [], ringi: [], route: [], log: [], notices: [], depts: [], posts: [],
  orgDraft: [], orgPreview: null, orgPick: null,
  files: [], pick: [], listFilter: 'wait', moreOpen: false, soumuOpen: true,
  step: 1, sel: new Set(), inboxTab: 'all',
};
const P = id => S.staff.find(s => s.id === id) || { name: '（不明）', dept: '', title: '', login: '', post_title: '' };
const titleOf = s => s.post_title || s.title;
const deptById = id => S.depts.find(d => d.id === id);
const postLabel = p => `${deptById(p.dept_id)?.name || ''} ${p.name}`;
// 部署とその上の部署（近い順）
function deptChain(id) { const out = []; let d = deptById(id); while (d && out.length < 20) { out.push(d.id); d = deptById(d.parent_id); } return out; }
const deptDepth = id => deptChain(id).length - 1;
const T = id => S.types.find(t => t.id === id);
const stepsOf = typeId => S.steps.filter(s => s.type_id === typeId).sort((a, b) => a.step_no - b.step_no);
const routeOf = rid => S.route.filter(x => x.ringi_id === rid).sort((a, b) => a.step_no - b.step_no);
const logOf = rid => S.log.filter(x => x.ringi_id === rid).sort((a, b) => a.id - b.id);
const R = id => S.ringi.find(r => r.id === id);
const cur = r => r.status === 'wait' ? routeOf(r.id)[r.stage] : null;
const myTurn = r => { const c = cur(r); return !!c && c.approver_ids.includes(S.me.id); };
const waitingForMe = () => S.ringi.filter(myTurn);
const names = ids => ids.map(i => P(i).name).join('・');
const sanNames = ids => ids.map(i => P(i).name + 'さん').join('・');
const filesOf = rid => S.files.filter(f => f.ringi_id === rid).sort((a, b) => a.id - b.id);
const stampedAny = r => routeOf(r.id).some(x => x.stamped_by);
const isMine = r => r.owner_id === S.me.id || r.filer_id === S.me.id;
const canChangeFiles = r => isMine(r) && (r.status === 'back' || (r.status === 'wait' && !stampedAny(r)));
const canSeeFiles = r => isMine(r) || S.me.is_soumu || routeOf(r.id).some(x => x.approver_ids.includes(S.me.id) || x.stamped_by === S.me.id);
const decidedAt = r => r.status === 'ok' ? r.updated_at : null;
const no = r => 'R-' + String(r.id).padStart(4, '0');
const canProxy = () => S.me.is_soumu || S.me.is_boss;
const myBossDepts = () => S.posts.filter(p => p.holder_id === S.me.id && p.is_boss).map(p => p.dept_id);
const proxyTargets = () => S.staff.filter(s => s.id !== S.me.id && (S.me.is_soumu || deptChain(s.dept_id).some(d => myBossDepts().includes(d))));

async function loadAll() {
  const tables = ['staff', 'ringi_types', 'route_steps', 'ringi', 'ringi_route', 'ringi_log', 'notices', 'depts', 'posts', 'ringi_files', 'shifts', 'work'];
  const res = await Promise.all(tables.map(t => sb.from(t).select('*')));
  // 添付の表は、Supabase に貼り直すまではまだない。そのときも残りは使えるようにする。
  S.filesReady = !res[9].error;
  if (!S.filesReady) res[9] = { data: [] };
  // 勤怠の表も、貼り直すまではない
  S.workReady = !res[10].error && !res[11].error;
  if (!S.workReady) { res[10] = { data: [] }; res[11] = { data: [] }; }
  const err = res.find(r => r.error);
  if (err) throw err.error;
  [S.staff, S.types, S.steps, S.ringi, S.route, S.log, S.notices, S.depts, S.posts, S.files, S.shifts, S.work] = res.map(r => r.data || []);
  S.shifts.sort((a, b) => a.sort - b.sort);
  S.depts.sort((a, b) => a.sort - b.sort || a.id - b.id);
  S.posts.sort((a, b) => a.sort - b.sort || a.id - b.id);
  const D = Object.fromEntries(S.depts.map(d => [d.id, d]));
  S.staff.forEach(s => {
    s.dept = D[s.dept_id]?.name || '';
    s.is_soumu = !!D[s.dept_id]?.is_soumu;
    const held = S.posts.filter(p => p.holder_id === s.id);
    s.is_boss = held.some(p => p.is_boss);
    s.post_title = held.map(p => p.name).join('・');
  });
  if (S.me) S.me = S.staff.find(s => s.id === S.me.id) || S.me;
  S.staff.sort((a, b) => a.sort - b.sort);
  S.types.sort((a, b) => a.sort - b.sort || a.id - b.id);
  S.ringi.sort((a, b) => b.id - a.id);
  S.notices.sort((a, b) => b.id - a.id);
}

async function rpc(fn, args, okMsg) {
  // うまくいかなかったときは画面を描き直さない（入れかけの内容を消さないため）
  if (S.busy) return null;
  S.busy = true; document.body.classList.add('busy');
  const btns = [...document.querySelectorAll('button:not([disabled])')];
  btns.forEach(b => b.disabled = true);
  let ok = false;
  try {
    const { data, error } = await sb.rpc(fn, args);
    if (error) { toast(error.message || 'うまくいきませんでした'); return null; }
    await loadAll();
    ok = true;
    if (okMsg) toast(typeof okMsg === 'function' ? okMsg(data) : okMsg);
    return { data };
  } catch (e) {
    toast('つながりませんでした。少し待ってからもう一度お試しください');
    return null;
  } finally {
    S.busy = false; document.body.classList.remove('busy');
    if (ok) render(); else btns.forEach(b => b.disabled = false);
  }
}
function renderBell() {
  const unread = S.notices.filter(n => !n.is_read).length;
  $('#bell').innerHTML = `${icon('bell')}<span class="bl">お知らせ</span>${unread ? `<span class="badge">${unread}</span>` : ''}`;
}

// ---------------------------------------------------------------- ログイン
function loginView(msg) {
  $('#bar').hidden = true; $('#navbar').hidden = true; $('#notes').hidden = true;
  document.body.classList.add('at-login'); document.body.classList.remove('booting');
  $('#view').innerHTML = `<section class="login">
  <div class="lside"><div class="lbrand"><span class="mark">稟</span><b>稟議・申請</b></div>
    <h2>申請から決裁まで、<br>紙を回さずに。</h2>
    <ul><li>${icon('doc')}スマホから有給や物品購入を申請</li><li>${icon('inbox')}上長は決裁待ちをまとめて確認</li><li>${icon('org')}組織図どおりに、正しい人へ自動で回る</li></ul>
    <p class="lnote">お試し版です。職員も申請もすべて架空です。</p></div>
  <div class="lform"><h1>ログイン</h1>
  <p class="sub">お試し用に配られたログイン名とパスワードを入れてください。</p>
  ${msg ? `<div class="alert back slim" role="alert"><span class="ai">${icon('info')}</span><div class="ax"><b>${esc(msg)}</b></div></div>` : ''}
  <form id="lf">
    <label class="f"><span class="fl">ログイン名</span><input id="lfUser" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="例：nakamura" required></label>
    <label class="f"><span class="fl">パスワード</span><input id="lfPw" type="password" autocomplete="current-password" required></label>
    <button class="btn primary full" type="submit">ログインする</button>
  </form></div></section>`;
}
async function doLogin(user, pw) {
  const u = user.trim().toLowerCase();
  const email = u.includes('@') ? u : `${u}@${CFG.loginDomain || 'trial.example'}`;
  const { error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) { loginView('ログイン名かパスワードがちがいます。'); return; }
  await start();
}
async function start() {
  const { data } = await sb.auth.getSession();
  if (!data.session) { loginView(); return; }
  try { await loadAll(); } catch (e) { loginView('データを読み込めませんでした。もう一度ログインしてください。'); return; }
  S.me = S.staff.find(s => s.id === data.session.user.id);
  if (!S.me) { await sb.auth.signOut(); loginView('この人は職員として登録されていません。'); return; }
  S.view = 'home'; S.open = null;
  render();
}

// ---------------------------------------------------------------- 回る順番（見込み）
// データの側（build_route）と同じ考え方で、起案の前に見せる。
function resolveStep(st, ownerId, filerId) {
  let ids = [];
  if (st.use_boss) {
    for (const d of deptChain(P(ownerId).dept_id)) {
      const mine = S.posts.filter(p => p.dept_id === d && p.is_boss && (p.holder_id === ownerId || p.holder_id === filerId));
      const lim = mine.length ? Math.min(...mine.map(p => p.rank)) : null;
      const got = S.posts.filter(p => p.dept_id === d && p.is_boss && p.holder_id && p.holder_id !== ownerId && p.holder_id !== filerId && (lim == null || p.rank < lim)).map(p => p.holder_id);
      if (got.length) { ids.push(...got); break; }
    }
  }
  if (st.use_soumu) ids.push(...S.staff.filter(s => s.is_soumu && s.id !== ownerId && s.id !== filerId).map(s => s.id));
  ids.push(...S.posts.filter(p => (st.posts || []).includes(p.id) && p.holder_id && p.holder_id !== ownerId && p.holder_id !== filerId).map(p => p.holder_id));
  ids = [...new Set(ids)];
  return S.staff.filter(s => ids.includes(s.id)).map(s => s.id);
}
function previewRoute(typeId, amount, ownerId, filerId) {
  let prev = null;
  return stepsOf(typeId).map(st => {
    const on = st.min_amount == null || (amount || 0) >= st.min_amount;
    let ids = resolveStep(st, ownerId, filerId);
    if (on && ids.length) {
      if (prev && prev.length === ids.length && ids.every(x => prev.includes(x))) ids = [];
      else prev = ids;
    }
    return { label: st.label, ids, on, min: st.min_amount };
  });
}

// ---------------------------------------------------------------- 画面の部品
// 状況のラベル。色の意味は全画面で同じ（青＝あなたの番、黄＝回覧中、赤＝差し戻し、緑＝決裁済み、灰＝却下）。
function pill(r) {
  if (r.status === 'ok') return `<span class="lbl ok">${icon('check')}決裁済み</span>`;
  if (r.status === 'back') return `<span class="lbl back">${icon('undo')}差し戻し</span>`;
  if (r.status === 'no') return `<span class="lbl no">${icon('ban')}却下</span>`;
  if (myTurn(r)) return `<span class="lbl turn">${icon('inbox')}あなたの番</span>`;
  return `<span class="lbl wait">${icon('clock')}回覧中</span>`;
}
const DAY = 864e5;
const waitDays = r => Math.max(0, Math.floor((Date.now() - new Date(r.updated_at).getTime()) / DAY));
const isApprover = () => S.me.is_soumu || S.posts.some(p => p.holder_id === S.me.id) || S.route.some(x => x.approver_ids.includes(S.me.id));
const curText = r => { const c = cur(r); return c ? `いま ${sanNames(c.approver_ids)}の決裁待ち（${waitDays(r)}日）` : ''; };
const amountOf = r => r.amount != null && T(r.type_id)?.use_amount ? yen(r.amount) : '';
const canBulk = r => myTurn(r) && !T(r.type_id)?.use_amount;

// 一覧の表。opts: wait（待ちの日数）, bulk（まとめて承認のチェック）, dec（決裁日）
function rows(list, empty, opts = {}) {
  if (!list.length) return emptyArt(empty);
  const col = (k, h, cls = '') => opts[k] === false ? '' : `<th class="${cls}">${h}</th>`;
  return `<div class="dtable"><table><thead><tr>
    ${opts.bulk ? `<th class="c-ck"><span class="vh">選ぶ</span></th>` : ''}${opts.wait ? '<th>待ち</th>' : ''}<th>申請者</th><th>件名</th><th class="r">金額</th><th>申請日</th>${opts.dec ? '<th>決裁日</th>' : ''}<th>状況</th></tr></thead><tbody>
  ${list.map(r => { const nf = filesOf(r.id).length; const wd = waitDays(r); return `<tr class="li click ${opts.bulk && S.sel.has(r.id) ? 'sel' : ''}" data-open="${r.id}" tabindex="0">
    ${opts.bulk ? `<td class="c-ck">${canBulk(r) ? `<input type="checkbox" class="bk" data-id="${r.id}" ${S.sel.has(r.id) ? 'checked' : ''} aria-label="${esc(r.title)} を選ぶ">` : `<input type="checkbox" disabled title="お金のかかる申請は、1件ずつ中身を見て承認します" aria-label="まとめて承認できません">`}</td>` : ''}
    ${opts.wait ? `<td class="c-wait num ${r.status === 'wait' && wd >= 3 ? 'late' : ''}">${r.status === 'wait' ? wd + '日' : '—'}</td>` : ''}
    <td class="c-who"><span class="whowrap">${avatar(r.owner_id, 'sm')}<span>${esc(P(r.owner_id).name)}<span class="sub">${esc(P(r.owner_id).dept)}</span></span></span></td>
    <td class="c-ttl"><span class="tlink">${esc(r.title)}</span><span class="sub">${esc(r.type_name)}${nf ? `<span class="fcount">${icon('clip')}添付 ${nf}</span>` : ''}${r.filer_id !== r.owner_id ? `・${esc(P(r.filer_id).name)}が代わりに申請` : ''}</span></td>
    <td class="c-amt r num">${amountOf(r) || '<span class="muted">—</span>'}</td>
    <td class="c-day num"><span class="lb">申請日 </span>${fmtDay(r.created_at)}</td>
    ${opts.dec ? `<td class="c-day c-dec num">${decidedAt(r) ? `<span class="lb">決裁日 </span>${fmtDay(decidedAt(r))}` : '<span class="muted">—</span>'}</td>` : ''}
    <td class="c-st">${pill(r)}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
const tabs = (items, curK, attr) => `<div class="tabs" role="tablist">${items.map(([k, l, n]) => `<button type="button" role="tab" ${attr}="${k}" aria-selected="${curK === k}">${l}${n != null ? `<span class="tc num">${n}</span>` : ''}</button>`).join('')}</div>`;
const summary = items => `<div class="sums">${items.map(([ic, cls, label, n, nav, unit = '件']) => `<button type="button" class="sumc" ${nav}><span class="si ${cls}">${icon(ic)}</span><span><span class="sl">${label}</span><span class="sv num">${typeof n === 'string' ? n : `${n}<small>${unit}</small>`}</span></span></button>`).join('')}</div>`;

// メニュー。パソコンでは左に縦に、スマホでは下のタブ（よく使うもの）＋「その他」。
function navHtml() {
  const w = waitingForMe().length;
  const back = S.ringi.filter(r => isMine(r) && r.status === 'back').length;
  const ap = isApprover();
  const todo = myTodo();
  const cur = k => S.view === k && !S.open ? 'aria-current="page"' : '';
  const b = (k, label, ic, badge = '', cls = '') => `<button type="button" class="${cls}" data-nav="${k}" ${cur(k)}>${icon(ic)}<span class="nl">${label}</span>${badge}</button>`;
  const main = `<div class="nmain">
    <button type="button" class="ncreate" data-nav="new" ${cur('new')}>${icon('new')}<span class="nl">申請する</span></button>
    ${ap ? b('home', '決裁待ち', 'inbox', w ? `<span class="badge">${w}</span>` : '', 'tab') : b('home', 'ホーム', 'home', '', 'tab')}
    ${b('list', 'わたしの申請', 'doc', back ? `<span class="badge warn" title="差し戻し">${back}</span>` : '', 'tab')}
    ${S.workReady ? b('work', 'わたしの勤務', 'clock', todo ? `<span class="badge warn" title="確かめること">${todo}</span>` : '', 'tab') : ''}
    <button type="button" class="tab nmorebtn" data-a="more" aria-expanded="${S.moreOpen}">${icon('more')}<span class="nl">その他</span></button>
  </div>`;
  const sub = `<div class="nsub ${S.moreOpen ? 'open' : ''}">
    ${ap ? b('done', '決裁した履歴', 'hist') : ''}
    ${S.workReady && canTeam() ? b('team', '部署の勤務', 'cal') : ''}
    ${b('org', '組織図', 'org')}
    ${S.me.is_soumu ? `<div class="ngroup">総務</div>${b('all', '全体の一覧', 'all')}${b('admin', '種類と回る順番', 'admin')}` : ''}
    <div class="ngroup">使い方</div>${b('howto', 'お試しの進め方', 'info')}
  </div>`;
  return main + sub;
}

let lastKey = '';
function render() {
  if (!S.me) return;
  document.body.classList.remove('at-login', 'booting');
  $('#bar').hidden = false; $('#navbar').hidden = false;
  $('#me').innerHTML = `${avatar(S.me.id)}<span class="nmt"><b>${esc(S.me.name)}</b><span>${esc(S.me.dept)}・${esc(titleOf(S.me))}</span></span>`;
  renderBell();
  $('#nav').innerHTML = navHtml();
  document.body.classList.toggle('more-open', S.moreOpen);
  renderNotes();
  const r = S.open ? R(S.open) : null;
  const key = r ? 'r' + r.id : S.view + (S.edit || '') + (S.view === 'new' ? S.step : '');
  $('#view').innerHTML = r ? detail(r) : (VIEWS[S.view] || VIEWS.home)();
  if (key !== lastKey) { const v = $('#view'); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); lastKey = key; }
  if ($('#nf')) { updateForm(true); renderPick(); }
}

function renderNotes() {
  const box = $('#notes'); box.hidden = !S.notesOpen;
  $('#bell').setAttribute('aria-expanded', S.notesOpen);
  if (!S.notesOpen) return;
  const ns = S.notices.slice(0, 30);
  box.innerHTML = `<div class="nhead"><h2>お知らせ</h2><div class="row">
    ${S.notices.some(n => !n.is_read) ? '<button class="btn text sm" type="button" data-a="readAll">すべて読んだことにする</button>' : ''}
    <button class="btn sm" type="button" data-a="closeNotes">閉じる</button></div></div>
  <div class="list">${ns.length ? ns.map(n => `<div class="li ${n.ringi_id ? 'click' : ''} ${n.is_read ? '' : 'unread'}" ${n.ringi_id ? `data-open="${n.ringi_id}"` : ''}><span class="ndot" aria-hidden="true"></span><div class="main"><b>${esc(n.text)}</b><div class="sub num">${fmtAt(n.at)}</div></div>${n.is_read ? '' : '<span class="lbl turn">新着</span>'}</div>`).join('') : emptyArt('お知らせはありません')}</div>
  <p class="nfoot">本番では、スマホにも同じ知らせが届くようにできます（お試し版ではこの画面だけ）。</p>`;
}

// ---------------------------------------------------------------- それぞれの画面
const VIEWS = {};

// ホーム：決裁する人は「決裁待ち」、職員は「わたしの申請」の進み具合
VIEWS.home = function () { return isApprover() ? inbox(true) : staffHome(); };
VIEWS.wait = function () { return inbox(false); };

function inbox(withMinis) {
  const all = waitingForMe().sort((a, b) => waitDays(b) - waitDays(a) || a.id - b.id);
  const grp = r => T(r.type_id)?.grp || 'その他';
  const groups = [...new Set([...GRP_ORDER, ...all.map(grp)])];
  if (S.inboxTab !== 'all' && !groups.includes(S.inboxTab)) S.inboxTab = 'all';
  const list = all.filter(r => S.inboxTab === 'all' || grp(r) === S.inboxTab);
  [...S.sel].forEach(id => { if (!list.some(r => r.id === id && canBulk(r))) S.sel.delete(id); });
  const late = all.filter(r => waitDays(r) >= 3).length;
  const month = todayYmd().slice(0, 7);
  const doneMonth = S.route.filter(x => x.stamped_by === S.me.id && x.stamped_at && new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(x.stamped_at)).startsWith(month)).length;
  const myPost = S.posts.filter(p => p.holder_id === S.me.id).map(postLabel).join('・') || `${S.me.dept}`;
  const mine = S.ringi.filter(isMine).slice(0, 3);
  const stuck = S.me.is_soumu ? S.ringi.filter(r => r.status === 'wait' && waitDays(r) >= 3) : [];
  return `
  ${pageHead('決裁待ち', `あなた（${esc(myPost)}）の承認を待っている申請です。待っている日数が長い順に並んでいます。`)}
  ${withMinis ? punchCard(true) : ''}
  ${summary([['inbox', 'turn', '決裁待ち', all.length, 'data-a="noop"'], ['clock', 'back', '3日以上待っている', late, 'data-a="noop"'], ['check', 'ok', '今月 決裁した', doneMonth, isApprover() ? 'data-nav="done"' : '']])}
  <section class="panel flush">
    ${tabs([['all', 'すべて', all.length], ...groups.filter(g => g !== 'その他' || all.some(r => grp(r) === g)).map(g => [g, g, all.filter(r => grp(r) === g).length])], S.inboxTab, 'data-ibt')}
    ${rows(list, 'いま、あなたの決裁を待っている申請はありません', { wait: true, bulk: true })}
    ${S.sel.size ? `<div class="bulk"><span><b class="num">${S.sel.size}件</b>を選んでいます（休み・勤務の申請は、まとめて承認できます）</span><span class="sp"></span>
      <button class="btn text" type="button" data-a="clearSel">選ぶのをやめる</button><button class="btn primary" type="button" data-a="bulkApprove">${icon('check')}選んだ${S.sel.size}件を承認する</button></div>`
      : list.some(canBulk) ? `<p class="bulkhint">${icon('info')}休み・勤務の申請は、左のチェックを付けるとまとめて承認できます。お金のかかる申請は、1件ずつ中身を見て承認します。</p>` : ''}
  </section>
  ${stuck.length ? `<section class="panel flush"><div class="panel-h"><h2>止まっている申請（3日以上）</h2><span class="sub">総務から声をかけるときの目安です</span></div>${rows(stuck, '', { wait: true })}</section>` : ''}
  ${withMinis ? `<div class="two">
    <section class="panel flush"><div class="panel-h"><h2>わたしの申請</h2><button class="btn text sm" type="button" data-nav="list">すべて見る</button></div>
      ${mine.length ? `<ul class="mini">${mine.map(r => `<li class="click" data-open="${r.id}">${pill(r)}<div class="x"><b>${esc(r.title)}</b><span>${esc(r.type_name)}・${r.status === 'wait' ? esc(curText(r)) : r.status === 'ok' ? fmtDay(decidedAt(r)) + ' 決裁' : '申請日 ' + fmtDay(r.created_at)}</span></div>${icon('chevr')}</li>`).join('')}</ul>` : emptyArt('まだ申請していません')}</section>
    <section class="panel flush"><div class="panel-h"><h2>お知らせ</h2><button class="btn text sm" type="button" data-a="openNotes">すべて見る</button></div>
      ${S.notices.length ? `<ul class="mini">${S.notices.slice(0, 3).map(n => `<li class="${n.ringi_id ? 'click' : ''}" ${n.ringi_id ? `data-open="${n.ringi_id}"` : ''}><span class="ndot ${n.is_read ? 'read' : ''}"></span><div class="x"><b>${esc(n.text)}</b><span class="num">${fmtAt(n.at)}</span></div></li>`).join('')}</ul>` : emptyArt('お知らせはありません')}</section>
  </div>` : ''}`;
}

function staffHome() {
  const mine = S.ringi.filter(isMine);
  const back = mine.filter(r => r.status === 'back');
  const going = mine.filter(r => r.status === 'wait');
  const done = mine.filter(r => r.status === 'ok').slice(0, 3);
  const dots = r => { const rt = routeOf(r.id); return `<span class="dots">${rt.map((x, i) => `<i class="${x.stamped_by ? 'on' : i === r.stage ? 'now' : ''}"></i>`).join('')}</span>`; };
  return `
  ${pageHead(`${esc(S.me.name)} さん`, `${todayLabel()}　自分が出した申請がいまどこまで進んでいるかが分かります。`, `<button class="btn primary" type="button" data-nav="new">${icon('new')}申請する</button>`)}
  ${punchCard(true)}
  ${back.map(r => `<section class="alert back"><span class="ai">${icon('undo')}</span><div class="ax"><b>差し戻されています：${esc(r.title)}</b>
    <p>${esc(P(r.last_by).name)}さんより「${esc(r.last_comment)}」</p></div><button class="btn primary" type="button" data-open="${r.id}">直して出し直す</button></section>`).join('')}
  ${summary([['clock', 'wait', '回覧中', going.length, 'data-nav="list" data-lf="wait"'], ['undo', 'back', '差し戻し', back.length, 'data-nav="list" data-lf="back"'], ['check', 'ok', '決裁済み', mine.filter(r => r.status === 'ok').length, 'data-nav="list" data-lf="ok"']])}
  <section class="panel flush"><div class="panel-h"><h2>回覧中の申請</h2><button class="btn text sm" type="button" data-nav="list">わたしの申請をすべて見る</button></div>
    ${going.length ? `<ul class="cards">${going.map(r => `<li class="click" data-open="${r.id}"><div class="ct">${pill(r)}<span class="sub">${esc(r.type_name)}・申請日 ${fmtDay(r.created_at)}</span></div>
      <b>${esc(r.title)}</b>${dots(r)}<span class="sub">${esc(curText(r))}</span></li>`).join('')}</ul>`
      : emptyArt('回覧中の申請はありません', '「申請する」から、有給休暇や物品購入などを出せます。')}</section>
  ${done.length ? `<section class="panel flush"><div class="panel-h"><h2>最近 決裁されたもの</h2></div><ul class="mini">${done.map(r => `<li class="click" data-open="${r.id}">${pill(r)}<div class="x"><b>${esc(r.title)}</b><span>${esc(r.type_name)}・${fmtDay(decidedAt(r))} 決裁</span></div>${icon('chevr')}</li>`).join('')}</ul></section>` : ''}
  <section class="panel tip"><span class="ai">${icon('info')}</span><div><b>はじめての方へ</b><p class="sub" style="margin:2px 0 0">お試しの進め方（20分ほど）を見ながら、何人かの立場で試してみてください。</p></div><button class="btn" type="button" data-nav="howto">進め方を見る</button></section>`;
}

VIEWS.howto = function () {
  const steps = [
    '<b>職員の中村さん</b>（<code>nakamura</code>）で入り、「申請する」から<b>物品購入</b>を出す。金額を10万円より下げると<b>院長の段が外れる</b>のを見る',
    '<b>井上師長</b>（<code>inoue</code>）か<b>鈴木副師長</b>（<code>suzuki</code>）で入り、「決裁待ち」から承認する。<b>どちらか1人</b>が押せば次へ進む',
    '<b>森事務長</b>（<code>mori</code>）で入り、コメントを付けて<b>差し戻す</b>',
    'もう一度<b>中村さん</b>で入り、差し戻された申請を<b>直して出し直す</b>（最初の段から回り直す）',
    '<b>小林さん</b>（<code>kobayashi</code>）で<b>有給休暇</b>や<b>遅刻・早退届</b>を出す。<b>井上師長</b>で入ると、チェックを付けて<b>まとめて承認</b>できる。そのあと<b>総務の受付</b>（<code>aoki</code>）へ回る',
    '<b>総務の青木さん</b>（<code>aoki</code>）で入り、<b>親睦会（慶弔）を中村さんの代わりに申請</b>する。「種類と回る順番」で回る順番や金額の条件を変えてみる',
    '<b>中村さん</b>で「わたしの勤務」を開き、<b>出勤する</b>を押す。3日前の<b>退勤が遅い日（ずれ）</b>の「時間外の事後の申請」から申請を出す（日にちや時刻は入った状態で開く）',
    '<b>井上師長</b>で「その他」の<b>部署の勤務</b>を開き、確かめることがある人を見る。中村さんの事後の申請を承認し、<b>総務の青木さん</b>が受け付けると、中村さんの勤務の記録に「時間外」と出る',
    '<b>清水さん</b>（<code>shimizu</code>）で「わたしの勤務」を開き、<b>退勤の打刻もれ</b>から「打刻の修正」を申請する。<b>小林さん</b>はいま勤務中なので、<b>退勤する</b>を押せる',
    '<b>総務の青木さん</b>で「組織図」を開き、<b>3階東病棟の井上師長のカードを、1階病棟の看護師長の席へ動かす</b>（2人が入れ替わる）。確定の前に、担当が変わる申請の一覧を見る',
  ];
  return `${pageHead('お試しの進め方', '20分ほどで、申請から決裁と勤怠までの流れを一通り試せます。人を変えるときは、右上の「ログアウト」から入り直します。')}
  <section class="panel"><ol class="steps">${steps.map(s => `<li><div>${s}</div></li>`).join('')}</ol>
  <p class="sub" style="margin:16px 0 0">何人かで同じ人に入っても大丈夫です。総務の人で入ると「種類と回る順番」の下から、見本の状態に戻せます。</p></section>`;
};

// ---------------------------------------------------------------- 勤怠（軽め）
// 打刻と、決裁された申請（有給・欠勤・遅刻早退・時間外・打刻の修正）を合わせて、1日ごとの勤務の記録にする。
// 退勤が予定（時間外が認められていればその終わり）より遅いときは、切り捨てずに「ずれ」として出す。
const GAP_MIN = 15;   // これ以上のずれを「確かめること」にする（仮の値）
const SH = id => S.shifts.find(x => x.id === id);
const ymdOf = ms => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(ms));
const hmOf = ms => new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
const atOf = (ymd, t, plusDay = 0) => new Date(`${ymd}T${String(t).slice(0, 5)}:00+09:00`).getTime() + plusDay * DAY;
const addDays = (ymd, n) => ymdOf(atOf(ymd, '12:00') + n * DAY);
const dval = (r, k) => ((r.details || []).find(d => d.k === k) || {}).value || '';
const hmLen = m => m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + '分' : ''}` : `${m}分`;
const hmShort = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const shiftTime = sh => `${sh.start_t.slice(0, 5)}〜${sh.next_day ? '翌' : ''}${sh.end_t.slice(0, 5)}`;
// 申請の種類を勤怠の見方で分ける
function wkind(r) {
  const n = r.type_name || '';
  if (n.startsWith('有給')) return 'leave';
  if (n.startsWith('欠勤')) return 'absent';
  if (n.startsWith('遅刻')) return 'late';
  if (n.startsWith('時間外')) return 'ot';
  if (n.startsWith('打刻の修正')) return 'fix';
  return null;
}
function reqDays(r) {
  const k = wkind(r); if (!k) return [];
  if (k === 'leave' || k === 'absent') {
    const f = dval(r, 'from'); if (!f) return [];
    const t = dval(r, 'to') || f; const out = [];
    for (let x = f; x <= t && out.length < 62; x = addDays(x, 1)) out.push(x);
    return out;
  }
  const d = dval(r, 'date'); return d ? [d] : [];
}
const otLen = r => { const f = dval(r, 'from'), t = dval(r, 'to'); if (!f || !t) return 0; let m = (atOf('2000-01-01', t) - atOf('2000-01-01', f)) / 6e4; if (m <= 0) m += 1440; return Math.round(m); };
const typeByName = n => S.types.find(t => t.name === n && t.in_use) || S.types.find(t => t.name === n);

// 1人の1日分。打刻・勤務の種類・申請・確かめること。
function dayInfo(sid, ymd) {
  const w = S.work.find(x => x.staff_id === sid && x.day === ymd);
  const reqs = S.ringi.filter(r => r.owner_id === sid && (r.status === 'ok' || r.status === 'wait') && reqDays(r).includes(ymd)).sort((a, b) => a.id - b.id);
  const ok = k => reqs.filter(r => wkind(r) === k && r.status === 'ok');
  const wait = k => reqs.filter(r => wkind(r) === k && r.status === 'wait');
  const sh = w ? SH(w.shift_id) : null;
  let inAt = w ? Date.parse(w.in_at) : null, outAt = w && w.out_at ? Date.parse(w.out_at) : null;
  const fix = ok('fix').pop();
  if (fix) {
    const fi = dval(fix, 'in'), fo = dval(fix, 'out');
    if (fi) inAt = atOf(ymd, fi);
    if (fo) { let o = atOf(ymd, fo); if (inAt && o <= inAt) o += DAY; outAt = o; }
  }
  const start = sh ? atOf(ymd, sh.start_t) : null, end = sh ? atOf(ymd, sh.end_t, sh.next_day ? 1 : 0) : null;
  const worked = inAt && outAt && sh ? Math.max(0, Math.round((outAt - inAt) / 6e4) - sh.break_min) : null;
  const otOk = ok('ot').reduce((a, r) => a + otLen(r), 0);
  const otWait = wait('ot').reduce((a, r) => a + otLen(r), 0);
  const over = outAt && end ? Math.max(0, Math.round((outAt - end) / 6e4)) : 0;
  const late = inAt && start ? Math.max(0, Math.round((inAt - start) / 6e4)) : 0;
  const open = !!w && !outAt;
  const missing = open && Date.now() - inAt > 20 * 36e5;
  const issues = [];
  if (missing) issues.push(wait('fix').length ? { k: 'fixwait', t: '打刻の修正を申請中' } : { k: 'miss', t: '退勤の打刻もれ' });
  if (over - otOk >= GAP_MIN) issues.push(otWait ? { k: 'otwait', t: `時間外 ${hmLen(over - otOk)} を申請中` } : { k: 'gap', t: `退勤が予定より ${hmLen(over - otOk)} 遅い`, mins: over - otOk });
  if (late > 0 && !ok('late').length) issues.push(wait('late').length ? { k: 'latewait', t: '遅刻届を申請中' } : { k: 'late', t: `出勤が ${hmLen(late)} 遅い`, mins: late });
  return { ymd, w, sh, reqs, fix, inAt, outAt, start, end, worked, otOk, over, late, open, missing,
    leave: ok('leave')[0], leaveWait: wait('leave')[0], absent: ok('absent')[0], absentWait: wait('absent')[0],
    lateOk: ok('late')[0], issues, todo: issues.filter(i => ['miss', 'gap', 'late'].includes(i.k)) };
}
function monthDays(ym) {
  const [y, m] = ym.split('-').map(Number); const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
}
const curMonth = () => S.workMonth || todayYmd().slice(0, 7);
const monthLabel = ym => `${+ym.slice(0, 4)}年${+ym.slice(5)}月`;
function monthSum(sid, ym) {
  const today = todayYmd();
  const days = monthDays(ym).filter(d => d <= today).map(d => dayInfo(sid, d));
  return {
    days,
    workDays: days.filter(x => x.w).length,
    leave: days.filter(x => x.leave).reduce((a, x) => a + (dval(x.leave, 'how') && dval(x.leave, 'how') !== '1日' ? 0.5 : 1), 0),
    absent: days.filter(x => x.absent).length,
    late: days.filter(x => x.lateOk).length,
    ot: days.reduce((a, x) => a + x.otOk, 0),
    todo: days.reduce((a, x) => a + x.todo.length, 0),
  };
}
const myTodo = () => S.workReady ? monthSum(S.me.id, todayYmd().slice(0, 7)).todo + monthSum(S.me.id, addDays(todayYmd().slice(0, 7) + '-01', -1).slice(0, 7)).todo : 0;
const canTeam = () => S.me.is_soumu || myBossDepts().length > 0;
const teamDepts = () => S.depts.filter(d => d.parent_id != null && S.staff.some(s => s.dept_id === d.id)
  && (S.me.is_soumu || deptChain(d.id).some(x => myBossDepts().includes(x))));

// 今日の打刻（いちばん新しい勤務）
function myOpenWork() {
  const mine = S.work.filter(x => x.staff_id === S.me.id).sort((a, b) => Date.parse(b.in_at) - Date.parse(a.in_at));
  const last = mine[0];
  if (last && !last.out_at && Date.now() - Date.parse(last.in_at) < 20 * 36e5) return { state: 'in', w: last };
  const today = mine.find(x => x.day === todayYmd());
  if (today) return { state: 'done', w: today };
  return { state: 'none' };
}
function guessShift() {
  const now = Date.now(), d = todayYmd();
  return S.shifts.slice().sort((a, b) => Math.abs(now - atOf(d, a.start_t)) - Math.abs(now - atOf(d, b.start_t)))[0];
}
function punchCard(compact) {
  if (!S.workReady) return '';
  const st = myOpenWork();
  const nowTxt = hmOf(Date.now());
  let status, ctl;
  if (st.state === 'in') {
    const sh = SH(st.w.shift_id);
    status = `<b>勤務中</b>：${st.w.day !== todayYmd() ? md(st.w.day) + ' ' : ''}${hmOf(Date.parse(st.w.in_at))} に出勤（${esc(sh?.name || '')} ${sh ? shiftTime(sh) : ''}）`;
    ctl = `<button class="btn primary punchbtn out" type="button" data-a="punch">${icon('clock')}退勤する</button>`;
  } else if (st.state === 'done') {
    status = `今日は ${hmOf(Date.parse(st.w.in_at))} 出勤、${hmOf(Date.parse(st.w.out_at))} 退勤。おつかれさまでした`;
    ctl = `<button class="btn punchbtn" type="button" disabled>今日の打刻は終わりました</button>`;
  } else {
    const g = guessShift();
    status = 'まだ出勤していません';
    ctl = `<label class="f pcshift"><span class="fl">勤務の種類</span><select id="pcShift">${S.shifts.map(s => `<option value="${s.id}" ${s.id === g?.id ? 'selected' : ''}>${esc(s.name)}（${shiftTime(s)}）</option>`).join('')}</select></label>
      <button class="btn primary punchbtn" type="button" data-a="punch">${icon('clock')}出勤する</button>`;
  }
  return `<section class="panel punch ${compact ? 'compact' : ''}">
    <div class="pcl"><span class="pct">今日の打刻</span><b class="pcclock num" id="pcClock">${nowTxt}</b><span class="pcs">${status}</span></div>
    <div class="pcr">${ctl}</div>
    ${compact ? '' : '<p class="pcnote">本番では、社員証に貼ったICシールを打刻用のタブレットにかざします。お試し版ではこのボタンで打刻します。</p>'}
  </section>`;
}

// 1か月の勤務の表（本人も所属長も同じ表）。mine=true なら直すためのボタンを出す。
function monthTable(sid, ym, mine) {
  const today = todayYmd();
  const rowsH = monthDays(ym).map(d => {
    const x = dayInfo(sid, d);
    const wd = new Date(`${d}T12:00:00+09:00`).getDay();
    const fut = d > today;
    const tags = [];
    if (x.leave) tags.push(`<span class="lbl ok">有給 ${esc(dval(x.leave, 'how') || '1日')}</span>`);
    if (x.leaveWait) tags.push(`<span class="lbl wait">有給（申請中）</span>`);
    if (x.absent) tags.push(`<span class="lbl no">欠勤</span>`);
    if (x.absentWait) tags.push(`<span class="lbl wait">欠勤届（申請中）</span>`);
    if (x.lateOk) tags.push(`<span class="lbl ok">${esc(dval(x.lateOk, 'kind') || '遅刻')}届 ${esc(dval(x.lateOk, 'time'))}</span>`);
    x.reqs.filter(r => wkind(r) === 'ot' && r.status === 'ok').forEach(r => tags.push(`<span class="lbl ok">時間外 ${esc(dval(r, 'from'))}〜${esc(dval(r, 'to'))}</span>`));
    if (x.fix) tags.push(`<span class="lbl ok">打刻を修正</span>`);
    if (x.open && !x.missing) tags.push(`<span class="lbl turn">勤務中</span>`);
    x.issues.forEach(i => tags.push(`<span class="lbl ${['miss', 'gap', 'late'].includes(i.k) ? 'back' : 'wait'}">${esc(i.t)}</span>`));
    const acts = mine ? x.issues.map(i =>
      i.k === 'gap' ? `<button class="btn sm" type="button" data-a="wreq" data-kind="ot" data-day="${d}">時間外の事後の申請</button>`
      : i.k === 'miss' ? `<button class="btn sm" type="button" data-a="wreq" data-kind="fix" data-day="${d}">打刻の修正を申請</button>`
      : i.k === 'late' ? `<button class="btn sm" type="button" data-a="wreq" data-kind="late" data-day="${d}">遅刻届を出す</button>` : '').join('') : '';
    const orig = (v, ms) => x.fix && x.w && v && ms !== v ? `<s class="muted">${hmOf(v)}</s> ` : '';
    const tIn = x.inAt ? `${orig(x.w ? Date.parse(x.w.in_at) : null, x.inAt)}${hmOf(x.inAt)}` : '';
    const tOut = x.outAt ? `${orig(x.w && x.w.out_at ? Date.parse(x.w.out_at) : null, x.outAt)}${ymdOf(x.outAt) !== d ? '翌' : ''}${hmOf(x.outAt)}` : x.missing ? '<span class="miss">なし</span>' : '';
    return `<tr class="${fut ? 'fut' : ''} ${d === today ? 'today' : ''} ${x.todo.length ? 'todo' : ''}">
      <td class="w-day num ${wd === 0 ? 'sun' : wd === 6 ? 'sat' : ''}">${+d.slice(8)}<small>（${WEEK[wd]}）</small></td>
      <td class="w-sh">${x.sh ? esc(x.sh.name) : (x.leave || x.absent) ? '' : '<span class="muted">—</span>'}</td>
      <td class="w-in num">${tIn}</td><td class="w-out num">${tOut}</td>
      <td class="w-hrs num">${x.worked != null ? hmShort(x.worked) : ''}</td>
      <td class="w-ot num">${x.otOk ? hmShort(x.otOk) : ''}</td>
      <td class="w-note"><div class="tags">${tags.join('')}</div>${acts ? `<div class="wacts">${acts}</div>` : ''}</td></tr>`;
  }).join('');
  return `<div class="wtable"><table><thead><tr><th>日</th><th>勤務</th><th>出勤</th><th>退勤</th><th>働いた時間</th><th>時間外</th><th>申請・確かめること</th></tr></thead><tbody>${rowsH}</tbody></table></div>`;
}
const monthNav = ym => `<div class="mnav"><button class="btn sm" type="button" data-a="mprev" aria-label="前の月">${icon('back')}前の月</button><b class="num">${monthLabel(ym)}</b><button class="btn sm" type="button" data-a="mnext" ${ym >= todayYmd().slice(0, 7) ? 'disabled' : ''} aria-label="次の月">次の月${icon('chevr')}</button></div>`;
const hmHtml = m => m >= 60 ? `${Math.floor(m / 60)}<small>時間</small>${m % 60 ? (m % 60) + '<small>分</small>' : ''}` : `${m}<small>分</small>`;
const workSums = sm => summary([['cal', 'turn', '出勤した日', sm.workDays, 'data-a="noop"', '日'], ['clock', 'ok', '認められた時間外', hmHtml(sm.ot), 'data-a="noop"'], ['info', 'back', '確かめること', sm.todo, 'data-a="noop"']]);

VIEWS.work = function () {
  if (!S.workReady) return `${pageHead('わたしの勤務', '')}<section class="panel"><p>勤怠は、まだ準備中です（Supabase への貼り直しが終わると使えます）。</p></section>`;
  const ym = curMonth(); const sm = monthSum(S.me.id, ym);
  return `${pageHead('わたしの勤務', '出勤・退勤の打刻と、1か月の勤務の記録です。有給・遅刻早退・時間外などの申請が決裁されると、その日に出ます。')}
  ${punchCard(false)}
  ${sm.todo ? guide(`<b>確かめることが ${sm.todo}件あります。</b>退勤が予定より遅い日は「時間外の事後の申請」を、打刻を忘れた日は「打刻の修正」を出してください。上長が中身を見て決めます（切り捨てはしません）。`) : ''}
  ${workSums(sm)}
  <section class="panel flush"><div class="panel-h"><h2>勤務の記録</h2>${monthNav(ym)}</div>${monthTable(S.me.id, ym, true)}
  <p class="small muted pfoot">働いた時間は、休憩（日勤など60分・夜勤120分、仮の値）を差し引いた時間です。予定より ${GAP_MIN}分以上遅い退勤を「確かめること」にしています（仮の値）。</p></section>`;
};

VIEWS.team = function () {
  if (!S.workReady || !canTeam()) return VIEWS.home();
  const ds = teamDepts();
  if (!ds.some(d => d.id === S.teamDept)) S.teamDept = ds[0]?.id;
  const ym = curMonth();
  const people = S.staff.filter(s => s.dept_id === S.teamDept);
  const sums = people.map(p => [p, monthSum(p.id, ym)]);
  const who = S.teamWho && people.some(p => p.id === S.teamWho) ? S.teamWho : null;
  return `${pageHead('部署の勤務', '部署の人の1か月の勤務です。ずれや打刻もれのある人には、事後の申請や打刻の修正を出してもらい、申請の画面で判断します。')}
  <section class="panel flush"><div class="panel-h"><div class="teamsel">${ds.length > 1 ? `<label class="f"><span class="vh">部署</span><select id="tmDept">${ds.map(d => `<option value="${d.id}" ${d.id === S.teamDept ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` : `<h2>${esc(ds[0]?.name || '')}</h2>`}</div>${monthNav(ym)}</div>
  ${sums.length ? `<div class="ttable"><table class="teamt"><thead><tr><th>氏名</th><th class="r">出勤した日</th><th class="r">有給</th><th class="r">欠勤</th><th class="r">遅刻・早退</th><th class="r">認められた時間外</th><th>確かめること</th></tr></thead><tbody>
    ${sums.map(([p, s]) => `<tr class="click ${who === p.id ? 'sel' : ''}" data-who="${p.id}" tabindex="0">
      <td class="t-who"><span class="whowrap">${avatar(p.id, 'sm')}<span><span class="tlink">${esc(p.name)}</span><span class="sub">${esc(titleOf(p))}</span></span></span></td>
      <td class="r num">${s.workDays}日</td><td class="r num">${s.leave ? s.leave + '日' : '—'}</td><td class="r num">${s.absent ? s.absent + '日' : '—'}</td><td class="r num">${s.late ? s.late + '回' : '—'}</td>
      <td class="r num">${s.ot ? hmShort(s.ot) : '—'}</td>
      <td>${s.todo ? `<span class="lbl back">${icon('info')}${s.todo}件</span>` : '<span class="muted">—</span>'}</td></tr>`).join('')}
  </tbody></table></div>` : emptyArt('この部署の勤務の記録はまだありません')}</section>
  ${who ? `<section class="panel flush" id="teamWho"><div class="panel-h"><h2>${esc(P(who).name)}さんの勤務（${monthLabel(ym)}）</h2><button class="btn text sm" type="button" data-a="closeWho">閉じる</button></div>${monthTable(who, ym, who === S.me.id)}</section>` : guide('名前を押すと、その人の1日ごとの記録が見られます。')}`;
};

// 勤務の記録から、申請の画面を中身を入れた状態で開く
function openWorkReq(kind, day) {
  const x = dayInfo(S.me.id, day);
  let t, vals = {}, body = '';
  if (kind === 'ot') {
    t = typeByName('時間外勤務（事後の申請）');
    const from = x.end ? hmOf(x.end + x.otOk * 6e4) : '';
    vals = { date: day, kind: '残業', from, to: x.outAt ? hmOf(x.outAt) : '' };
    body = `打刻では ${x.outAt ? hmOf(x.outAt) : ''} に退勤しています（予定の終わりは ${x.end ? hmOf(x.end) : ''}）。`;
  } else if (kind === 'fix') {
    t = typeByName('打刻の修正');
    vals = { date: day, in: x.inAt ? hmOf(x.inAt) : '' };
    body = '退勤の打刻を忘れました。';
  } else {
    t = typeByName('遅刻・早退届');
    vals = { date: day, kind: '遅刻', time: x.inAt ? hmOf(x.inAt) : '' };
  }
  if (!t) { toast('この申請の種類が見つかりません。総務の「種類と回る順番」で「使う」にしてください'); return; }
  S.prefill = { type: t.id, vals, body };
  S.view = 'new'; S.open = null; S.edit = null; S.step = 2; S.newType = t.id; S.pick = []; S.titleTouched = false; S.notesOpen = false;
  render(); window.scrollTo({ top: 0 });
}

const LF = [['wait', '回覧中'], ['back', '差し戻し'], ['ok', '決裁済み'], ['no', '却下'], ['all', 'すべて']];
VIEWS.list = function () {
  const mine = S.ringi.filter(isMine);
  const m = (r, k) => k === 'all' || r.status === k;
  const items = LF.filter(([k]) => k !== 'no' || mine.some(r => r.status === 'no'));
  if (!items.some(([k]) => k === S.listFilter)) S.listFilter = 'all';
  const list = mine.filter(r => m(r, S.listFilter));
  return `${pageHead('わたしの申請', '自分が出したもの（代わりに出してもらったものも）です。回覧中のものは、ほかの人の決裁を待っています。', `<button class="btn primary" type="button" data-nav="new">${icon('new')}申請する</button>`)}
  <section class="panel flush">${tabs(items.map(([k, l]) => [k, l, mine.filter(r => m(r, k)).length]), S.listFilter, 'data-lf')}
  ${rows(list, S.listFilter === 'wait' ? 'いま回覧中の申請はありません' : '当てはまる申請はありません', { wait: true, dec: true })}</section>`;
};

VIEWS.done = function () {
  const id = S.me.id;
  const list = S.ringi.filter(r => routeOf(r.id).some(x => x.stamped_by === id));
  return `${pageHead('決裁した履歴', 'あなたが承認した申請です。そのあとの進み具合もここで分かります。')}
  <section class="panel flush">${rows(list, 'まだ承認した申請はありません', { dec: true })}</section>`;
};

VIEWS.all = function () {
  if (!S.me.is_soumu) return VIEWS.home();
  const f = S.filter;
  const match = (r, k) => k === 'all' || (k === 'wait' && r.status === 'wait') || (k === 'ok' && r.status === 'ok') || (k === 'back' && (r.status === 'back' || r.status === 'no'));
  const list = S.ringi.filter(r => match(r, f));
  return `${pageHead('全体の一覧', '病院全体の申請です。どこで止まっているかが分かるので、催促や台帳づくりの手間が減ります。')}
  <section class="panel flush">${tabs([['all', 'すべて'], ['wait', '回覧中'], ['ok', '決裁済み'], ['back', '差し戻し・却下']].map(([k, l]) => [k, l, S.ringi.filter(r => match(r, k)).length]), f, 'data-filter')}
  ${rows(list, '当てはまる申請はありません', { wait: true, dec: true })}</section>`;
};

function fieldInput(fd, val) {
  const id = `fd_${fd.k}`;
  const req = fd.required ? '<span class="req">※必須</span>' : '';
  let input;
  if (fd.kind === 'select') input = `<select id="${id}" data-fd="${esc(fd.k)}">${fd.required ? '' : '<option value=""></option>'}${(fd.options || []).map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (fd.kind === 'date') input = `<input id="${id}" data-fd="${esc(fd.k)}" type="date" value="${esc(val || '')}">`;
  else if (fd.kind === 'time') input = `<input id="${id}" data-fd="${esc(fd.k)}" type="time" step="300" value="${esc(val || '')}">`;
  else input = `<input id="${id}" data-fd="${esc(fd.k)}" value="${esc(val || '')}">`;
  return `<label class="f"><span class="fl">${esc(fd.label)}${req}</span>${input}${fd.hint ? `<span class="hint">${esc(fd.hint)}</span>` : ''}</label>`;
}

const stepBar = n => `<ol class="stepbar">${['種類', '内容', '確かめて出す'].map((l, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''}"><i></i><span>${l}</span></li>`).join('')}</ol>`;

// 申請する：種類 → 内容 → 確かめて出す
VIEWS.new = function () {
  const ed = S.edit ? R(S.edit) : null;
  const types = S.types.filter(t => t.in_use || (ed && t.id === ed.type_id));
  if (!types.length) return `<section class="panel"><p>いま使える種類がありません。総務の「種類と回る順番」で「使う」にしてください。</p></section>`;
  if (!ed && (S.step === 1 || !S.newType || !T(S.newType))) return typeStep(types);
  const t = T(ed ? ed.type_id : S.newType);
  const vals = {};
  if (ed) (ed.details || []).forEach(d => vals[d.k] = d.value);
  const pf = !ed && S.prefill && S.prefill.type === t.id ? S.prefill : null;
  if (pf) Object.assign(vals, pf.vals);
  return `
  ${pageHead(ed ? '直して出し直す' : esc(t.name), ed ? '直した内容で出し直すと、最初の段から回り直します。' : '入れ終わったら「確かめる画面へ進む」を押してください。まだ出されません。')}
  ${stepBar(2)}
  <form id="nf" novalidate>
  <input type="hidden" id="nfType" value="${t.id}">
  <div id="nfEdit" class="formcols">
   <section class="panel">
    <div class="typehead">${icon(GRP_ICON[t.grp] || 'doc')}<div><b>${esc(t.name)}</b><span class="sub" id="nfDesc"></span></div>${ed ? '' : '<button class="btn text sm" type="button" data-a="chgType">種類を変える</button>'}</div>
    <div class="form">
    ${!ed && canProxy() ? `<label class="f wide" id="nfProxyWrap"><span class="fl">代わりに申請する相手</span><select id="nfProxy"><option value="">（自分の分として出す）</option>${proxyTargets().map(s => `<option value="${s.id}">${esc(s.staff_no)}　${esc(s.name)}（${esc(s.dept)}）</option>`).join('')}</select><span class="hint">本人が出せないときだけ選びます。</span></label>` : ''}
    <div class="wide form" id="nfFields">${(t.fields || []).map(fd => fieldInput(fd, vals[fd.k])).join('')}</div>
    <label class="f" id="nfAmountWrap"><span class="fl">金額（円）</span><input id="nfAmount" inputmode="numeric" value="${ed && ed.amount != null ? ed.amount : ''}" placeholder="例：98000"><span class="hint">お金がかからない場合は空のままで大丈夫です。</span></label>
    <label class="f wide"><span class="fl">件名<span class="req">※必須</span></span><input id="nfTitle" value="${esc(ed ? ed.title : '')}" placeholder="例：鉛筆の購入"></label>
    <label class="f wide"><span class="fl" id="nfBodyLabel">内容</span><textarea id="nfBody" rows="4">${esc(ed ? ed.body : pf ? pf.body : '')}</textarea></label>
    <div class="f wide"><span class="fl">添付書類<span class="opt">なくても大丈夫</span></span>
      ${ed && filesOf(ed.id).length ? `<p class="hint" style="margin:0 0 6px">今の添付：${filesOf(ed.id).map(f => esc(f.name)).join('、')}（外すときは申請の画面で）</p>` : ''}
      ${!S.filesReady ? '<p class="hint" style="margin:0">添付書類は、まだ準備中です（Supabase への貼り直しが終わると使えます）。</p>' : ''}
      <label class="filebtn" ${S.filesReady ? '' : 'hidden'}>${icon('clip')}<span>書類・写真を付ける</span><input type="file" id="nfFiles" multiple accept="${ACCEPT}"></label>
      <span class="hint">${FILE_RULE}</span>
      <ul class="filelist" id="nfPick"></ul></div>
    </div>
   </section>
   <aside class="panel routebox"><h2>この順番で回ります</h2><div id="nfProxyNote"></div><div class="route" id="nfRoute"></div><p class="hint" id="nfRouteNote"></p></aside>
  </div>
  <div id="nfConfirm" hidden></div>
  <div class="actbar" id="nfActEdit">${ed ? `<button class="btn" type="button" data-open="${ed.id}">やめる</button>` : `<button class="btn" type="button" data-a="chgType">${icon('back')}種類を選び直す</button>`}<span class="sp"></span><button class="btn primary" type="button" data-a="toConfirm">確かめる画面へ進む${icon('chevr')}</button></div>
  <div class="actbar" id="nfActConfirm" hidden><button class="btn" type="button" data-a="backToEdit">${icon('back')}戻って直す</button><span class="sp"></span><button class="btn primary" type="submit">${icon('send')}${ed ? 'この内容で出し直す' : 'この内容で申請する'}</button></div>
  </form>`;
};
function typeStep(types) {
  const groups = [...new Set([...GRP_ORDER, ...types.map(x => x.grp || 'その他')])].filter(g => types.some(x => (x.grp || 'その他') === g));
  return `${pageHead('申請する', '出したい申請の種類を選んでください。')}
  ${stepBar(1)}
  <div class="typecols">${groups.map(g => `<section class="tgroup"><h2 class="tgh">${icon(GRP_ICON[g] || 'doc')}${esc(g)}</h2>
    <ul class="typelist">${types.filter(x => (x.grp || 'その他') === g).map(x => `<li><button type="button" class="typeitem" data-type="${x.id}"><span class="x"><b>${esc(x.name)}</b><span>${esc((x.description || '').split('。')[0])}</span></span>${icon('chevr')}</button></li>`).join('')}</ul></section>`).join('')}</div>`;
}
// 確かめる画面（出す前に、入れた内容と回る順番をまとめて見せる）
function confirmHtml() {
  const { ed, t, amount, owner, filer, details } = formState();
  const pr = previewRoute(t.id, amount, owner, filer).filter(s => s.on && s.ids.length);
  const rowsKv = [
    ['種類', esc(t.name)],
    ['申請者', `${esc(P(owner).name)}（${esc(P(owner).dept)}）${owner !== filer ? `<span class="sub">${esc(P(filer).name)}が代わりに申請</span>` : ''}`],
    ...details.map(d => [esc(d.label), esc(/^\d{4}-\d{2}-\d{2}$/.test(d.value) ? md(d.value) : d.value)]),
    ...(t.use_amount ? [['金額', amount != null ? `<b class="num">${yen(amount)}</b>` : '<span class="muted">なし</span>']] : []),
    ['件名', `<b>${esc($('#nfTitle').value.trim())}</b>`],
    ...($('#nfBody').value.trim() ? [[esc(t.body_label || '内容'), `<span class="pre">${esc($('#nfBody').value.trim())}</span>`]] : []),
    ['添付書類', S.pick.length ? S.pick.map(f => esc(f.name)).join('<br>') : (ed && filesOf(ed.id).length ? filesOf(ed.id).map(f => esc(f.name)).join('<br>') : '<span class="muted">なし</span>')],
  ];
  return `<div class="formcols"><section class="panel flush"><div class="panel-h"><h2>この内容で出します</h2></div>
    <table class="kvt">${rowsKv.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table></section>
    <aside class="panel routebox"><h2>この順番で回ります</h2>${pr.length ? `<ol class="vflow">${pr.map(s => `<li><span class="vd"></span><div><span class="sub">${esc(s.label)}</span><b>${esc(names(s.ids))}</b></div></li>`).join('')}</ol>
    <p class="hint">${pr.length}つの段すべてで承認されると決裁です。出すと、最初の段の人にお知らせが届きます。</p>` : '<p class="hint">回る段がないため、出すとそのまま決裁になります。</p>'}</aside></div>`;
}

// ---- 添付書類
const BUCKET = 'ringi-files';
const MAX_FILE = 10 * 1024 * 1024, MAX_FILES = 10;
const EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword' };
const ACCEPT = Object.keys(EXT).map(e => '.' + e).join(',') + ',image/*';
const FILE_RULE = 'PDF・写真・Excel・Word、1つ10MBまで、10個まで';
const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB';
function fileKind(f) {
  let ext = ((f.name || '').split('.').pop() || '').toLowerCase();
  if (!EXT[ext]) ext = Object.keys(EXT).find(k => EXT[k] === f.type) || '';
  return ext ? { ext: ext === 'jpeg' ? 'jpg' : ext, mime: EXT[ext] } : null;
}
// 選んだ書類を確かめて足す。だめなものは理由を出す。
function acceptFiles(list, already) {
  const ok = [], bad = [];
  for (const f of list) {
    if (!fileKind(f)) bad.push(`「${f.name}」はこの形の書類は付けられません（PDF・写真・Excel・Word）`);
    else if (f.size > MAX_FILE) bad.push(`「${f.name}」は大きすぎます（1つ10MBまで）`);
    else if (already + ok.length >= MAX_FILES) bad.push('添付は1件に10個までです');
    else ok.push(f);
  }
  if (bad.length) toast(bad[0]);
  return ok;
}
function renderPick() {
  const ul = $('#nfPick'); if (!ul) return;
  ul.innerHTML = S.pick.map((f, i) => `<li>${icon(/^image/.test(fileKind(f)?.mime) ? 'img' : 'file')}<span class="fn">${esc(f.name)}</span><span class="fs num">${kb(f.size)}</span><button type="button" class="btn sm" data-a="unpick" data-i="${i}">外す</button></li>`).join('');
}
async function uploadFiles(rid, files) {
  let done = 0; const fails = [];
  for (const f of files) {
    const k = fileKind(f);
    const path = `${rid}/${crypto.randomUUID()}.${k.ext}`;
    try {
      const up = await sb.storage.from(BUCKET).upload(path, await f.arrayBuffer(), { contentType: k.mime, upsert: false });
      if (up.error) throw up.error;
      const { error } = await sb.rpc('add_file', { p_ringi: rid, p_path: path, p_name: f.name });
      if (error) { await sb.storage.from(BUCKET).remove([path]); throw error; }
      done++;
    } catch (e) { fails.push(`「${f.name}」を付けられませんでした（${e.message || 'つながりませんでした'}）`); }
  }
  return { done, fails };
}
async function openFile(f) {
  const w = window.open('', '_blank');   // 先に窓を開いておく（あとから開くと止められることがあるため）
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(f.path, 300);
  if (error || !data) { w?.close(); toast('書類を開けませんでした。見られるのは申請した人・回る先の人・総務だけです'); return; }
  if (w) w.location.href = data.signedUrl; else location.href = data.signedUrl;
}

function formState() {
  const ed = S.edit ? R(S.edit) : null;
  const t = T(ed ? ed.type_id : +$('#nfType').value);
  const amount = t.use_amount ? (parseInt(($('#nfAmount').value || '').replace(/[^0-9]/g, ''), 10)) : null;
  const px = $('#nfProxy');
  let owner = S.me.id, filer = S.me.id;
  if (ed) { owner = ed.owner_id; filer = ed.filer_id; }
  else if (px && t.allow_proxy && px.value) owner = px.value;
  const details = (t.fields || []).map(fd => ({ k: fd.k, label: fd.label, value: ($(`#fd_${fd.k}`)?.value || '').trim() })).filter(d => d.value);
  return { ed, t, amount: Number.isFinite(amount) ? amount : null, owner, filer, details };
}

function autoTitle(t, details) {
  const v = k => (details.find(d => d.k === k) || {}).value;
  const day = v('date') || v('from');
  if (t.use_amount) return '';
  let s = t.name.replace(/（.*?）/g, '').replace(/届$/, '');
  if (t.name.startsWith('遅刻')) s = v('kind') || '遅刻・早退';
  const isDay = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '');
  if (isDay(day)) s += ' ' + md(day) + (isDay(v('to')) && v('to') !== day ? '〜' + md(v('to')) : '');
  if (t.name.startsWith('時間外') && v('kind')) s += ' ' + v('kind');
  return s;
}

function updateForm(first) {
  const { ed, t, amount, owner, filer, details } = formState();
  $('#nfDesc').textContent = t.description;
  $('#nfAmountWrap').hidden = !t.use_amount;
  $('#nfBodyLabel').textContent = t.body_label || '内容';
  const pw = $('#nfProxyWrap'); if (pw) pw.hidden = !t.allow_proxy;
  if (!first && !S.titleTouched && !ed) { const at = autoTitle(t, details); $('#nfTitle').value = at; }
  if (first && !ed && !$('#nfTitle').value) $('#nfTitle').value = autoTitle(t, details);
  $('#nfProxyNote').innerHTML = owner !== filer && !ed
    ? `<div class="proxybox" style="margin-bottom:8px">${esc(P(owner).name)}さん（${esc(P(owner).dept)}）の代わりに申請します。本人にお知らせが届きます。代わりに申請した人は、自分では印を押せません。</div>` : '';
  const pr = previewRoute(t.id, amount, owner, filer);
  const chips = pr.filter(s => !(s.on && !s.ids.length)).map(s => {
    const cond = s.min != null ? `（${yen(s.min)}以上のとき）` : '';
    return `<div class="chip ${s.on ? '' : 'skip'}"><span class="l">${esc(s.label)}${cond}</span><b>${s.ids.length ? esc(names(s.ids)) : '—'}</b></div>`;
  });
  $('#nfRoute').innerHTML = chips.length ? chips.join('<span class="arrow">→</span>') : '<span class="muted">回る段がありません（出すとそのまま決裁になります）</span>';
  const n = pr.filter(s => s.on && s.ids.length).length;
  $('#nfRouteNote').innerHTML = `この順番で1段ずつ回り、${n}つの段すべてで承認されると決裁です。1つの段に何人かいるときは、どなたか1人が承認すれば次へ進みます。${pr.some(s => !s.on) ? '<br><b>点線の段は、今の金額では回りません。</b>' : ''}`;
}

async function afterSubmitFiles(rid) {
  if (!S.pick.length) return;
  const files = S.pick; S.pick = [];
  const { done, fails } = await uploadFiles(rid, files);
  try { await loadAll(); } catch (_) {}
  const c = routeOf(rid)[R(rid)?.stage ?? 0];
  const head = c && R(rid)?.status === 'wait' ? `いま${c.label}（${sanNames(c.approver_ids)}）の決裁待ちです。` : '';
  toast(fails.length ? fails[0] : `${head}添付書類を${done}つ付けました`);
}
function validateForm() {
  const { t, details } = formState();
  const miss = (t.fields || []).filter(fd => fd.required && !details.find(d => d.k === fd.k));
  if (miss.length) { toast(`「${miss[0].label}」を入れてください`); $(`#fd_${miss[0].k}`)?.focus(); return false; }
  if (!$('#nfTitle').value.trim()) { toast('件名を入れてください'); $('#nfTitle').focus(); return false; }
  return true;
}
function showConfirm(on) {
  if (on) $('#nfConfirm').innerHTML = confirmHtml();
  $('#nfEdit').hidden = on; $('#nfActEdit').hidden = on; $('#nfConfirm').hidden = !on; $('#nfActConfirm').hidden = !on;
  $('.stepbar').outerHTML = stepBar(on ? 3 : 2);
  const ps = $('.phead .psub'); if (ps) { ps.dataset.edit ??= ps.textContent; ps.textContent = on ? 'この内容でよければ、下の青いボタンで出してください。直すときは「戻って直す」を押します。' : ps.dataset.edit; }
  window.scrollTo({ top: 0 });
}
async function submitForm() {
  const { ed, t, amount, owner, details } = formState();
  const title = $('#nfTitle').value.trim(), body = $('#nfBody').value.trim();
  if (!validateForm()) { showConfirm(false); return; }
  if (ed) {
    const ok = await rpc('resubmit_ringi', { p_id: ed.id, p_title: title, p_body: body, p_amount: amount, p_details: details }, '出し直しました。最初の段から回り直します');
    if (ok) { S.edit = null; S.open = ed.id; await afterSubmitFiles(ed.id); render(); window.scrollTo({ top: 0 }); }
    return;
  }
  const args = { p_type: t.id, p_title: title, p_body: body, p_amount: amount, p_details: details };
  if (owner !== S.me.id) args.p_owner = owner;
  const ok = await rpc('submit_ringi', args, id => {
    const c = routeOf(id)[0];
    return c ? `申請しました。いま${c.label}（${sanNames(c.approver_ids)}）の決裁待ちです` : '申請しました。回る段がないため、そのまま決裁になりました';
  });
  if (ok) { S.open = ok.data; S.titleTouched = false; await afterSubmitFiles(ok.data); render(); window.scrollTo({ top: 0 }); }
}

// ---- 申請の中身
function filesCard(r) {
  if (!S.filesReady) return '';
  if (!canSeeFiles(r)) return `<section class="panel"><h2>添付書類</h2><p class="sub" style="margin:8px 0 0">添付書類を見られるのは、申請した人・回る先の人・総務だけです。</p></section>`;
  const fs = filesOf(r.id), can = canChangeFiles(r);
  if (!fs.length && !can) return '';
  return `<section class="panel files"><div class="ph2"><h2>添付書類 <span class="sub">${fs.length}件</span></h2>
    ${can ? `<label class="filebtn sm">${icon('new')}<span>書類を足す</span><input type="file" id="dfFiles" data-id="${r.id}" multiple accept="${ACCEPT}"></label>` : ''}</div>
    ${fs.length ? `<ul class="filelist">${fs.map(f => `<li>${icon(/^image/.test(f.mime) ? 'img' : 'file')}
      <button type="button" class="fn link" data-a="viewFile" data-f="${f.id}">${esc(f.name)}</button>
      <span class="fs num">${kb(f.size)}・${esc(P(f.uploaded_by).name)}・${fmtDay(f.at)}</span>
      ${can && f.uploaded_by === S.me.id ? `<button type="button" class="btn sm" data-a="rmFile" data-f="${f.id}">外す</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="sub" style="margin:0">まだありません。見積書やカタログ、写真などを付けられます。</p>'}
    ${can ? `<p class="hint" style="margin:10px 0 0">${FILE_RULE}。付けたり外したりできるのは、まだだれも承認していない間と、差し戻されている間だけです。</p>` : ''}
  </section>`;
}
function detail(r) {
  const route = routeOf(r.id);
  const c = cur(r);
  const mine = myTurn(r);
  const isOwner = isMine(r);
  const t = T(r.type_id);
  const owner = P(r.owner_id), filer = P(r.filer_id);
  let action = '';
  if (mine) {
    action = `<section class="panel actcard"><h2>あなたの番です（${esc(c.label)}として）</h2>
    ${c.approver_ids.length > 1 ? `<p class="sub" style="margin:4px 0 0">この段は ${esc(names(c.approver_ids))} のどなたか1人が承認すると次へ進みます。</p>` : ''}
    <label class="f" style="margin-top:14px"><span class="fl">コメント</span><textarea id="cm" rows="2" placeholder="例：見積りを2社分そろえてください"></textarea><span class="hint">承認のときはなくても大丈夫です。差し戻し・却下のときは理由を書いてください。</span></label>
    <div class="actbar inpanel"><button class="btn primary" type="button" data-a="approve" data-id="${r.id}">${icon('check')}承認する</button><button class="btn" type="button" data-a="back" data-id="${r.id}">${icon('undo')}差し戻す</button><span class="sp"></span><button class="btn text danger" type="button" data-a="reject" data-id="${r.id}">却下する</button></div></section>`;
  } else if (c) {
    action = `<section class="panel infocard"><p style="margin:0"><b>いま ${esc(sanNames(c.approver_ids))}の決裁待ちです</b>（${esc(c.label)}・${waitDays(r)}日）。${route.some(x => x.approver_ids.includes(S.me.id) && x.step_no > r.stage) ? 'あなたの番はこのあとです。' : ''}</p>
    ${isOwner ? `<p class="sub" style="margin:6px 0 0">${esc(sanNames(c.approver_ids))}の画面の「決裁待ち」に出ています。お試しで確かめるときは、ログアウトして <code>${c.approver_ids.map(i => esc(P(i).login)).join('</code> か <code>')}</code> で入り直してください。</p>` : ''}</section>`;
  } else if (r.status === 'back' && isOwner) {
    action = `<section class="alert back"><span class="ai">${icon('undo')}</span><div class="ax"><b>${esc(P(r.last_by).name)}さんから差し戻されました</b><p>「${esc(r.last_comment)}」</p></div><button class="btn primary" type="button" data-a="edit" data-id="${r.id}">直して出し直す</button></section>`;
  } else if (r.status === 'back') {
    action = `<section class="alert back"><span class="ai">${icon('undo')}</span><div class="ax"><b>申請した人（${esc(owner.name)}さん）が直して出し直すのを待っています</b><p>理由：「${esc(r.last_comment)}」</p></div></section>`;
  } else if (r.status === 'no') {
    action = `<section class="alert no"><span class="ai">${icon('ban')}</span><div class="ax"><b>${esc(P(r.last_by).name)}さんが却下しました</b><p>理由：「${esc(r.last_comment)}」</p></div></section>`;
  }
  const details = r.details || [];
  const kv = [
    ['申請番号', `<span class="num">${no(r)}</span>`],
    ['種類', esc(r.type_name)],
    ['申請者', `${esc(owner.name)}（${esc(owner.dept)}）${r.filer_id !== r.owner_id ? `<span class="sub">${esc(filer.name)}（${esc(filer.dept)}）が代わりに申請</span>` : ''}`],
    ['申請日', `<span class="num">${fmtAt(r.created_at)}</span>`],
    ['決裁日', decidedAt(r) ? `<span class="num">${fmtAt(decidedAt(r))}</span>` : '<span class="muted">—（まだ決裁されていません）</span>'],
    ...(r.amount != null && t?.use_amount ? [['金額', `<b class="num">${yen(r.amount)}</b>`]] : []),
    ...details.map(d => [esc(d.label), esc(/^\d{4}-\d{2}-\d{2}$/.test(d.value) ? md(d.value) : d.value)]),
    ...(r.body ? [[esc(t?.body_label || '内容'), `<span class="pre">${esc(r.body)}</span>`]] : []),
  ];
  // 承認の流れ（申請 → 各段 → 決裁）を横に並べた図
  const stateOf = i => route[i].stamped_by ? 'done' : (c && i === r.stage) ? 'now' : ((r.status === 'back' || r.status === 'no') && i === r.stage) ? 'stop' : 'todo';
  const node = (st, mark, label, who, when, tag = '') => `<li class="${st}"><span class="fd">${mark}</span><div class="fb"><div class="fl">${label}${tag}</div><div class="fw">${who}</div>${when ? `<div class="ft num">${when}</div>` : ''}</div></li>`;
  const flow = `<ol class="flow">
    ${node('done', icon('send'), '申請', esc(owner.name), fmtAt(r.created_at))}
    ${route.map((s, i) => { const st = stateOf(i); return node(st, st === 'done' ? icon('check') : st === 'stop' ? '!' : i + 1,
      esc(s.label), `${esc(names(s.approver_ids))}${s.approver_ids.length > 1 ? '<span class="muted">（どなたか1人）</span>' : ''}`,
      s.stamped_by ? `${fmtAt(s.stamped_at)} ${esc(P(s.stamped_by).name)}` : st === 'now' ? `${waitDays(r)}日待っています` : '',
      st === 'now' ? '<span class="lbl wait">いまの番</span>' : st === 'stop' ? `<span class="lbl back">${r.status === 'back' ? '差し戻し' : '却下'}</span>` : ''); }).join('')}
    ${node(r.status === 'ok' ? 'done fin' : 'todo fin', icon('flag'), '決裁', r.status === 'ok' ? '決裁されました' : 'すべて承認されると決裁', decidedAt(r) ? fmtAt(decidedAt(r)) : '')}
  </ol>`;
  return `
  <div class="crumb"><button class="btn text sm" type="button" data-a="back2list">${icon('back')}一覧へ戻る</button></div>
  <section class="dhead">
    <div class="dmeta"><span class="num">${no(r)}</span>・${esc(r.type_name)}</div>
    <div class="dtitle"><h1>${esc(r.title)}</h1>${pill(r)}</div>
    <dl class="dfacts">
      <div><dt>申請者</dt><dd class="whowrap">${avatar(r.owner_id, 'sm')}${esc(owner.name)}<span class="sub">${esc(owner.dept)}</span></dd></div>
      <div><dt>申請日</dt><dd class="num">${fmtDay(r.created_at)}</dd></div>
      <div><dt>決裁日</dt><dd class="num">${decidedAt(r) ? fmtDay(decidedAt(r)) : '—'}</dd></div>
      ${r.amount != null && t?.use_amount ? `<div><dt>金額</dt><dd class="num big">${yen(r.amount)}</dd></div>` : ''}
    </dl>
  </section>
  <section class="panel"><h2>承認の流れ</h2>${flow}</section>
  <div class="dgrid">
    <div class="dmain">
      ${action}
      <section class="panel flush"><div class="panel-h"><h2>申請の内容</h2></div>
        <table class="kvt">${kv.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table></section>
      ${filesCard(r)}
      <section class="panel"><h2>承認欄</h2>
        ${route.length ? `<div class="stamps">${route.map((s, i) => `<div><div class="hd">${esc(s.label)}</div><div class="bx ${c && i === r.stage ? 'now' : ''}">${s.stamped_by ? `<div class="hanko"><span class="n">${esc(P(s.stamped_by).name.split(' ')[0])}</span><span class="d">${fmtDay(s.stamped_at)}</span><span style="font-size:10px">承認</span></div>` : (c && i === r.stage ? '決裁待ち<br>いまの番' : (r.status === 'back' || r.status === 'no') && i === r.stage ? (r.status === 'back' ? '差し戻し' : '却下') : '順番待ち')}</div><div class="ft">${esc(names(s.approver_ids))}${s.approver_ids.length > 1 ? '<br>（どなたか1人）' : ''}</div></div>`).join('')}</div>` : '<p class="sub" style="margin:0">回る段がないため、出したときにそのまま決裁になりました。</p>'}
      </section>
    </div>
    <aside class="dside">
      <section class="panel"><h2>やり取りの記録</h2><ul class="timeline">
        ${logOf(r.id).map(l => `<li>${l.actor_id ? avatar(l.actor_id, 'sm') : `<span class="avt sm sys">${icon('org')}</span>`}<div><div>${esc(l.text)}</div>${l.comment ? `<div class="c">「${esc(l.comment)}」</div>` : ''}<div class="tt num">${fmtAt(l.at)}</div></div></li>`).join('')}
        ${c ? `<li class="pending"><span class="avt sm sys">${icon('clock')}</span><div><div class="sub">${esc(c.label)}の決裁待ち（${esc(names(c.approver_ids))}）</div></div></li>` : ''}
      </ul></section>
    </aside>
  </div>`;
}

// ---- 組織図（カードを動かす看板の形）
// 動かした内容はすぐには決まらず「下書き」になる。確定する前に、回っている途中のどの稟議の担当が変わるかを見せる。
function orgSim() {
  const holder = Object.fromEntries(S.posts.map(p => [p.id, p.holder_id]));
  const dept = Object.fromEntries(S.staff.map(x => [x.id, x.dept_id]));
  for (const g of S.orgDraft) for (const o of g.ops) {
    if (o.op === 'seat') {
      holder[o.post] = o.staff;
      const ps = S.posts.find(p => p.id === o.post);
      if (o.staff && ps.is_boss) dept[o.staff] = ps.dept_id;
    } else if (o.op === 'move') dept[o.staff] = o.dept;
  }
  return { holder, dept };
}
function orgDrop(person, from, target) {
  const sim = orgSim();
  const nm = id => P(id).name + 'さん';
  const ops = []; let text = '';
  if (target.type === 'seat') {
    const B = S.posts.find(p => p.id === target.id);
    if (sim.holder[B.id] === person) return;
    const Y = sim.holder[B.id];
    ops.push({ op: 'seat', post: B.id, staff: person });
    text = `${nm(person)}を ${postLabel(B)} に`;
    if (from.type === 'seat' && from.id !== B.id) {
      const A = S.posts.find(p => p.id === from.id);
      ops.push({ op: 'seat', post: A.id, staff: Y || null });
      text += Y ? `（${nm(Y)}は ${postLabel(A)} へ）` : `（${postLabel(A)} は空席に）`;
    } else if (Y) text += `（${nm(Y)}は席からはずれます）`;
  } else {
    const D = deptById(target.id);
    if (from.type === 'seat') {
      const A = S.posts.find(p => p.id === from.id);
      ops.push({ op: 'seat', post: A.id, staff: null });
      text = `${nm(person)}を ${D.name} の所属に（${postLabel(A)} は空席に）`;
    } else {
      if (sim.dept[person] === D.id) return;
      text = `${nm(person)}を ${D.name} の所属に`;
    }
    ops.push({ op: 'move', staff: person, dept: D.id });
  }
  S.orgDraft.push({ ops, text });
  S.orgPick = null;
  orgChanged();
}
let previewSeq = 0;
async function orgChanged() {
  const ops = S.orgDraft.flatMap(g => g.ops);
  S.orgPreview = ops.length ? { loading: true } : null;
  render();
  if (!ops.length) return;
  const seq = ++previewSeq;
  const { data, error } = await sb.rpc('org_preview', { p_ops: ops });
  if (seq !== previewSeq) return;
  S.orgPreview = error ? { error: error.message } : { items: data || [] };
  if (S.view === 'org' && !S.open) render();
}
function orgWarnings(sim) {
  // 所属長の席がある部署で、所属長の席がすべて空になるところ
  return S.depts.filter(d => {
    const seats = S.posts.filter(p => p.dept_id === d.id && p.is_boss);
    return seats.length && seats.every(p => !sim.holder[p.id]) && seats.some(p => p.holder_id);
  }).map(d => `${d.name}の所属長の席が空になります。${d.name}の稟議・申請は、一つ上の部署の長へ回ります。`);
}

VIEWS.org = function () {
  const edit = S.me.is_soumu;
  const sim = orgSim();
  const touched = new Set(S.orgDraft.flatMap(g => g.ops.map(o => o.staff)).filter(Boolean));
  const card = (id, from) => {
    const x = P(id);
    const picked = S.orgPick && S.orgPick.person === id && S.orgPick.from === from;
    return `<div class="pcard ${edit ? 'can' : ''} ${touched.has(id) ? 'moved' : ''} ${picked ? 'picked' : ''}" ${edit ? `data-person="${id}" data-from="${from}" role="button" tabindex="0" aria-label="${esc(x.name)}さんを動かす"` : ''}><b>${esc(x.name)}</b><span>${esc(x.title)}</span></div>`;
  };
  const path = d => deptChain(d.id).slice().reverse().map(id => deptById(id).name).filter(n => n !== '病院').join(' ＞ ');
  const ops = S.orgDraft.flatMap(g => g.ops);
  const pv = S.orgPreview;
  const warns = orgWarnings(sim);
  return `
  ${pageHead('組織図', edit ? '職員のカードを動かして、席や所属を変えられます。' : '稟議・申請の「所属長」は、ここで決まった席に座っている人へ回ります。')}
  ${guide(edit
    ? '職員のカードを<b>マウスや指で動かして</b>、席に置いたり、ほかの部署へ移したりできます（カードを押して選び、置きたい所を押す動かし方もできます）。動かしただけではまだ決まりません。下に出る<b>「確定すると変わること」</b>を見てから「確定する」を押してください。'
    : '病院の組織図です。稟議・申請の「所属長」は、ここで決まった席に座っている人へ回ります。所属長がいないときは、一つ上の部署の長へ回ります。')}
  ${edit && (ops.length || S.orgPick) ? `<section class="panel draft">
    ${S.orgPick ? `<div class="pickbar">${esc(P(S.orgPick.person).name)}さんを選んでいます。置きたい席か部署を押してください。<button class="btn sm" type="button" data-a="orgUnpick">選ぶのをやめる</button></div>` : ''}
    ${ops.length ? `<h3>動かした内容（まだ決まっていません）</h3>
    <ol class="draftlist">${S.orgDraft.map(g => `<li>${esc(g.text)}</li>`).join('')}</ol>
    ${warns.map(w => `<div class="backnote small" style="margin-top:8px">${esc(w)}</div>`).join('')}
    <h3 class="sect">確定すると変わること</h3>
    ${!pv || pv.loading ? '<p class="muted small">調べています…</p>'
      : pv.error ? `<div class="errnote">${esc(pv.error)}</div>`
      : pv.items.length ? `<p class="small" style="margin:0 0 6px">回っている途中の稟議・申請 <b>${pv.items.length}件</b>の担当が変わります（もう押された印はそのまま残ります）。</p>
        <ul class="affect">${pv.items.map(i => `<li><b>${esc(i.title)}</b>　${esc(i.label)}：${esc(i.from)} → <b>${esc(i.to)}</b>${i.now ? '<span class="lbl wait">いまの番</span>' : '<span class="muted small">（このあとの段）</span>'}</li>`).join('')}</ul>`
      : '<p class="small muted" style="margin:0">回っている途中の稟議・申請への影響はありません。これから出すものから新しい組織図で回ります。</p>'}
    <div class="row" style="margin-top:12px"><button class="btn primary" type="button" data-a="orgApply" ${!pv || pv.loading || pv.error ? 'disabled' : ''}>確定する</button><button class="btn" type="button" data-a="orgUndo">1つ戻す</button><button class="btn danger" type="button" data-a="orgClear">全部やめる</button></div>` : ''}
  </section>` : ''}
  <div class="board ${edit ? 'editable' : ''}">
  ${S.depts.filter(d => d.parent_id != null).map(d => {
    const seats = S.posts.filter(p => p.dept_id === d.id);
    const seated = new Set(seats.map(p => sim.holder[p.id]).filter(Boolean));
    const members = S.staff.filter(x => sim.dept[x.id] === d.id && !seated.has(x.id));
    const pickOn = edit && S.orgPick ? 'pickon' : '';
    return `<section class="col"><div class="colhd"><b>${esc(d.name)}</b>${d.is_soumu ? '<span class="lbl line">総務</span>' : ''}${deptDepth(d.id) > 1 ? `<div class="small muted">${esc(path(d))}</div>` : ''}</div>
      ${seats.map(p => `<div class="slot ${pickOn}" ${edit ? `data-drop="seat:${p.id}"` : ''}><span class="sl">${esc(p.name)}</span>${sim.holder[p.id] ? card(sim.holder[p.id], 'seat:' + p.id) : '<div class="empty">空席</div>'}</div>`).join('')}
      <div class="zone ${pickOn}" ${edit ? `data-drop="dept:${d.id}"` : ''}><span class="sl">所属</span>${members.map(x => card(x.id, 'dept:' + d.id)).join('') || '<div class="empty small">（だれもいません）</div>'}</div>
    </section>`;
  }).join('')}
  </div>`;
};

// ---- カードを動かす（マウス・指どちらも）
let drag = null;
const parseSpot = v => { const [type, id] = String(v).split(':'); return { type: type === 'seat' ? 'seat' : 'dept', id: +id }; };
document.addEventListener('pointerdown', e => {
  const c = e.target.closest('.pcard.can'); if (!c || e.button > 0) return;
  drag = { el: c, person: c.dataset.person, from: c.dataset.from, x: e.clientX, y: e.clientY, moved: false, ghost: null, over: null };
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.moved = true;
    const r = drag.el.getBoundingClientRect();
    drag.dx = drag.x - r.left; drag.dy = drag.y - r.top;
    drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('ghost'); drag.ghost.style.width = r.width + 'px';
    document.body.appendChild(drag.ghost); drag.el.classList.add('dragging'); document.body.classList.add('is-dragging');
  }
  e.preventDefault();
  drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
  const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
  if (under !== drag.over) { drag.over?.classList.remove('over'); under?.classList.add('over'); drag.over = under; }
  if (e.clientY < 70) window.scrollBy(0, -12); else if (e.clientY > innerHeight - 70) window.scrollBy(0, 12);
}, { passive: false });
function endDrag(e, cancel) {
  if (!drag) return;
  const d = drag; drag = null;
  d.ghost?.remove(); d.el.classList.remove('dragging'); document.body.classList.remove('is-dragging'); d.over?.classList.remove('over');
  if (cancel) return;
  if (d.moved) { if (d.over) orgDrop(d.person, parseSpot(d.from), parseSpot(d.over.dataset.drop)); return; }
  // 動かさずに離した：ほかの人を選んでいるなら、このカードのある所へ置く。そうでなければ押して選ぶ
  if (S.orgPick && S.orgPick.person !== d.person) {
    const spot = d.el.closest('[data-drop]');
    if (spot) { orgDrop(S.orgPick.person, parseSpot(S.orgPick.from), parseSpot(spot.dataset.drop)); return; }
  }
  const same = S.orgPick && S.orgPick.person === d.person && S.orgPick.from === d.from;
  S.orgPick = same ? null : { person: d.person, from: d.from };
  render();
}
document.addEventListener('pointerup', e => endDrag(e, false));
document.addEventListener('pointercancel', e => endDrag(e, true));
document.addEventListener('keydown', e => {
  const c = e.target.closest && e.target.closest('.pcard.can');
  if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const same = S.orgPick && S.orgPick.person === c.dataset.person; S.orgPick = same ? null : { person: c.dataset.person, from: c.dataset.from }; render(); }
});

// ---- 管理画面
VIEWS.admin = function () {
  if (!S.me.is_soumu) return VIEWS.home();
  const routeTxt = t => stepsOf(t.id).map(s => s.label + (s.min_amount != null ? `（${yen(s.min_amount)}以上）` : '')).join(' → ');
  return `
  ${pageHead('種類と回る順番', '申請の種類と、だれの順に回るかを総務が決めます。')}
  ${guide('<b>種類ごとに、回る順番を総務が自分で変えられる</b>画面です。規程が変わったときも、業者に頼まずにここで直せます。直した内容は<b>これから出すものから</b>使われ、回っている途中のものは変わりません。')}
  <section class="panel flush"><div class="panel-h"><h2>種類の一覧</h2><button class="btn sm" type="button" data-a="addType">${icon('new')}種類を足す</button></div>
  <div class="dtable"><table class="plain"><thead><tr><th>種類の名前</th><th>回る順番</th><th>代わりに申請</th><th>使う</th></tr></thead><tbody>
  ${S.types.map(t => `<tr class="click ${S.adminSel === t.id ? 'sel' : ''}" data-a="selType" data-id="${t.id}"><td><b>${esc(t.name)}</b></td><td>${esc(routeTxt(t))}</td><td>${t.allow_proxy ? 'できる' : '—'}</td><td>${t.in_use ? '使う' : '使わない'}</td></tr>`).join('')}
  </tbody></table></div><p class="small muted pfoot">行を押すと中身を直せます。</p></section>
  ${S.draft ? adminEdit(S.draft) : ''}
  <section class="panel"><h2>お試しを最初の状態に戻す</h2>
  <p class="small muted" style="margin:8px 0 12px">出した稟議・申請と、管理画面で変えた内容を全部消して、見本の状態に戻します。ほかの人が試している途中のものも消えます。</p>
  <button class="btn danger" type="button" data-a="reset">最初の状態に戻す</button></section>`;
};
function adminEdit(d) {
  const seats = S.posts.filter(p => p.is_boss);
  return `<section class="panel" id="adm"><h2>${d.id ? `「${esc(d.name)}」を直す` : '新しい種類を足す'}</h2>
  <div class="form">
    <label class="f"><span class="fl">種類の名前</span><input id="adName" value="${esc(d.name)}"></label>
    <label class="f"><span class="fl">説明（申請の画面に出ます）</span><input id="adDesc" value="${esc(d.description)}"></label>
    <label class="f"><span class="fl">申請の画面でのまとまり</span><select id="adGrp">${[...new Set([...GRP_ORDER, 'その他', d.grp || 'その他'])].map(g => `<option ${g === (d.grp || 'その他') ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
    <div class="checks wide"><label><input type="checkbox" id="adProxy" ${d.allow_proxy ? 'checked' : ''}> 代わりに申請できる（親睦会など）</label><label><input type="checkbox" id="adUse" ${d.in_use ? 'checked' : ''}> 使う（使わなくなった種類は消さずにここを外します）</label></div>
  </div>
  <h3 class="sect">回る段</h3>
  <div class="stages">
  ${d.steps.map((s, i) => `<div class="stage" data-st="${i}">
    <div class="top"><span class="no">${i + 1}</span><input type="text" aria-label="段の名前" data-f="label" value="${esc(s.label)}">
      <span style="margin-left:auto" class="row"><button class="btn sm" type="button" data-a="stUp" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="上へ">↑</button><button class="btn sm" type="button" data-a="stDown" data-i="${i}" ${i === d.steps.length - 1 ? 'disabled' : ''} aria-label="下へ">↓</button><button class="btn sm danger" type="button" data-a="stDel" data-i="${i}">この段を消す</button></span></div>
    <div class="small muted">この段で印を押せる人（どなたか1人が押せば次へ）</div>
    <div class="checks"><label><input type="checkbox" data-f="boss" ${s.use_boss ? 'checked' : ''}> 申請した人の部署の上長</label><label><input type="checkbox" data-f="soumu" ${s.use_soumu ? 'checked' : ''}> 総務のだれか</label>
    </div>
    <details ${s.posts.length ? 'open' : ''}><summary class="small">決まった席を選ぶ（事務長・院長など）${s.posts.length ? `：${esc(S.posts.filter(p => s.posts.includes(p.id)).map(postLabel).join('、'))}` : ''}</summary>
    <div class="checks" style="margin-top:6px">${seats.map(p => `<label><input type="checkbox" data-f="p" value="${p.id}" ${s.posts.includes(p.id) ? 'checked' : ''}> ${esc(postLabel(p))}<span class="muted small">（${p.holder_id ? esc(P(p.holder_id).name) : '空席'}）</span></label>`).join('')}</div></details>
    <div class="row small"><span class="muted">金額の条件：</span><input inputmode="numeric" data-f="min" value="${s.min_amount ?? ''}" placeholder="空ならいつも"> 円以上のときだけ回る</div>
  </div>`).join('')}
  </div>
  <div class="row" style="margin-top:12px"><button class="btn sm" type="button" data-a="stAdd">${icon('new')}段を足す</button></div>
  <div class="row foot"><button class="btn primary" type="button" data-a="saveType">保存する</button><button class="btn" type="button" data-a="cancelType">やめる</button></div>
  </section>`;
}
function draftFrom(t) {
  return { id: t.id, name: t.name, description: t.description, allow_proxy: t.allow_proxy, in_use: t.in_use, grp: t.grp,
    steps: stepsOf(t.id).map(s => ({ label: s.label, use_boss: s.use_boss, use_soumu: s.use_soumu, posts: [...s.posts], min_amount: s.min_amount })) };
}
function readDraft() {
  const d = S.draft; if (!d || !$('#adm')) return;
  d.name = $('#adName').value; d.description = $('#adDesc').value; d.grp = $('#adGrp').value; d.allow_proxy = $('#adProxy').checked; d.in_use = $('#adUse').checked;
  document.querySelectorAll('#adm .stage').forEach(el => {
    const s = d.steps[+el.dataset.st];
    s.label = el.querySelector('[data-f=label]').value;
    s.use_boss = el.querySelector('[data-f=boss]').checked;
    s.use_soumu = el.querySelector('[data-f=soumu]').checked;
    s.posts = [...el.querySelectorAll('[data-f=p]:checked')].map(x => +x.value);
    const mv = (el.querySelector('[data-f=min]').value || '').replace(/[^0-9]/g, '');
    s.min_amount = mv ? +mv : null;
  });
}

// ---------------------------------------------------------------- 操作
function go(v) { S.prefill = null; S.teamWho = null; if (v !== 'new' || S.view !== 'new') S.pick = []; if (v === 'new') S.step = 1; S.view = v; S.open = null; S.edit = null; S.notesOpen = false; S.titleTouched = false; S.moreOpen = false; render(); window.scrollTo({ top: 0 }); }
function openR(id) {
  S.open = +id; S.edit = null; S.notesOpen = false; S.moreOpen = false;
  if (S.notices.some(n => n.ringi_id === +id && !n.is_read)) {
    S.notices.forEach(n => { if (n.ringi_id === +id) n.is_read = true; });
    sb.rpc('read_notices', { p_ringi: +id }).then(() => {});
  }
  render(); window.scrollTo({ top: 0 });
}

document.addEventListener('click', async e => {
  if (e.target.closest('td.c-ck')) return;   // まとめて承認のチェック（行を開かない）
  if (S.moreOpen && !e.target.closest('.nsub,[data-a=more]')) { S.moreOpen = false; document.body.classList.remove('more-open'); $('.nsub')?.classList.remove('open'); }
  if (S.orgPick && !e.target.closest('.pcard')) {
    const spot = e.target.closest('[data-drop]');
    if (spot) { orgDrop(S.orgPick.person, parseSpot(S.orgPick.from), parseSpot(spot.dataset.drop)); return; }
  }
  const t = e.target.closest('button,[data-open],[data-a],[data-nav],[data-who]'); if (!t || t.disabled) return;
  const d = t.dataset;
  if (t.id === 'logout') { await sb.auth.signOut(); S.me = null; loginView(); return; }
  if (t.id === 'bell') { S.notesOpen = !S.notesOpen; renderNotes(); return; }
  if (d.nav) { if (d.lf) S.listFilter = d.lf; S.moreOpen = false; go(d.nav); return; }
  if (d.lf) { S.listFilter = d.lf; render(); return; }
  if (d.type) { S.newType = +d.type; S.step = 2; S.titleTouched = false; S.pick = []; render(); window.scrollTo({ top: 0 }); return; }
  if (d.ibt) { S.inboxTab = d.ibt; S.sel.clear(); render(); return; }
  if (d.filter) { S.filter = d.filter; render(); return; }
  if (d.who) { S.teamWho = S.teamWho === d.who ? null : d.who; render(); if (S.teamWho) setTimeout(() => $('#teamWho')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); return; }
  if (d.open) { openR(d.open); return; }
  const a = d.a; const r = d.id && !['selType'].includes(a) ? R(+d.id) : null;
  if (a === 'how') { S.showHow = !S.showHow; render(); return; }
  if (a === 'noop') return;
  if (a === 'punch') {
    const sh = +($('#pcShift')?.value || 0) || null;
    await rpc('punch', { p_shift: sh }, x => x && x.kind === 'out' ? `退勤しました（${hmOf(Date.parse(x.at))}）。おつかれさまでした` : `出勤しました（${hmOf(Date.parse(x.at))}）`);
    return;
  }
  if (a === 'mprev' || a === 'mnext') { const ym = curMonth(); S.workMonth = addDays(`${ym}-01`, a === 'mprev' ? -1 : 32).slice(0, 7); render(); return; }
  if (a === 'wreq') { openWorkReq(d.kind, d.day); return; }
  if (a === 'closeWho') { S.teamWho = null; render(); return; }
  if (a === 'chgType') { S.step = 1; S.pick = []; render(); window.scrollTo({ top: 0 }); return; }
  if (a === 'toConfirm') { if (validateForm()) showConfirm(true); return; }
  if (a === 'backToEdit') { showConfirm(false); return; }
  if (a === 'openNotes') { S.notesOpen = true; renderNotes(); window.scrollTo({ top: 0 }); return; }
  if (a === 'clearSel') { S.sel.clear(); render(); return; }
  if (a === 'bulkApprove') {
    if (S.busy) return;
    const ids = [...S.sel]; S.busy = true; document.body.classList.add('busy');
    let okN = 0; const errs = [];
    try {
      for (const id of ids) { const { error } = await sb.rpc('decide_ringi', { p_id: id, p_action: 'approve', p_comment: null }); if (error) errs.push(error.message); else okN++; }
      await loadAll();
    } finally { S.busy = false; document.body.classList.remove('busy'); S.sel.clear(); render(); }
    toast(errs.length ? `${okN}件を承認しました。${errs.length}件はできませんでした（${errs[0]}）` : `${okN}件をまとめて承認しました。次の段の人にお知らせが届きます`);
    return;
  }
  if (a === 'more') { S.moreOpen = !S.moreOpen; render(); return; }
  if (a === 'soumuToggle') { S.soumuOpen = !S.soumuOpen; render(); return; }
  if (a === 'unpick') { S.pick.splice(+d.i, 1); renderPick(); return; }
  if (a === 'viewFile') { const f = S.files.find(x => x.id === +d.f); if (f) openFile(f); return; }
  if (a === 'rmFile') {
    const f = S.files.find(x => x.id === +d.f); if (!f) return;
    const ok = await rpc('remove_file', { p_id: f.id }, `「${f.name}」を外しました`);
    if (ok && ok.data) sb.storage.from(BUCKET).remove([ok.data]).then(() => {});
    return;
  }
  if (a === 'closeNotes') { S.notesOpen = false; renderNotes(); return; }
  if (a === 'readAll') {
    // 入力の途中でも消えないよう、お知らせの部分だけ描き直す
    const { error } = await sb.rpc('read_notices', { p_ringi: null });
    if (error) { toast(error.message); return; }
    S.notices.forEach(n => n.is_read = true); renderNotes(); renderBell(); return;
  }
  if (a === 'back2list') { go(S.view === 'new' ? 'home' : S.view); return; }
  if (a === 'approve' || a === 'back' || a === 'reject') {
    const c = ($('#cm')?.value || '').trim();
    if (a !== 'approve' && !c) { toast('理由をコメント欄に書いてください'); $('#cm').focus(); return; }
    const label = cur(r)?.label;
    await rpc('decide_ringi', { p_id: r.id, p_action: a, p_comment: c || null }, () => {
      const nr = R(r.id);
      if (a === 'approve') {
        if (nr.status === 'ok') return 'すべての印がそろい、決裁されました。申請した人にお知らせが届きます';
        const nc = cur(nr); return `印を押しました。${nc.label}（${names(nc.approver_ids)}）へ回りました`;
      }
      return a === 'back' ? `${label}として差し戻しました。申請した人に理由つきで知らせます` : '却下しました。申請した人に知らせます';
    });
    return;
  }
  if (a === 'edit') { S.pick = []; S.step = 2; S.edit = r.id; S.open = null; S.view = 'new'; S.titleTouched = true; render(); window.scrollTo({ top: 0 }); return; }
  // 管理画面
  if (a === 'selType') { S.adminSel = +d.id; S.draft = draftFrom(T(+d.id)); render(); setTimeout(() => $('#adm')?.scrollIntoView({ behavior: 'smooth' }), 0); return; }
  if (a === 'addType') { S.adminSel = null; S.draft = { id: null, name: '新しい種類', description: '', allow_proxy: false, in_use: true, grp: 'その他', steps: [{ label: '所属長', use_boss: true, use_soumu: false, posts: [], min_amount: null }, { label: '事務長', use_boss: false, use_soumu: false, posts: S.posts.filter(p => p.name === '事務長').map(p => p.id), min_amount: null }] }; render(); setTimeout(() => $('#adm')?.scrollIntoView({ behavior: 'smooth' }), 0); return; }
  if (['stUp', 'stDown', 'stDel', 'stAdd'].includes(a)) {
    readDraft(); const st = S.draft.steps, i = +d.i;
    if (a === 'stUp') [st[i - 1], st[i]] = [st[i], st[i - 1]];
    if (a === 'stDown') [st[i + 1], st[i]] = [st[i], st[i + 1]];
    if (a === 'stDel') { if (st.length <= 1) { toast('段は1つ以上必要です'); return; } st.splice(i, 1); }
    if (a === 'stAdd') st.push({ label: '新しい段', use_boss: false, use_soumu: false, posts: [], min_amount: null });
    render(); return;
  }
  if (a === 'saveType') {
    readDraft(); const dr = S.draft;
    const ok = await rpc('save_type', { p_id: dr.id, p_name: dr.name, p_description: dr.description, p_allow_proxy: dr.allow_proxy, p_in_use: dr.in_use, p_steps: dr.steps, p_grp: dr.grp || null }, '保存しました。これから出すものから新しい順番で回ります');
    if (ok) { S.adminSel = null; S.draft = null; render(); }
    return;
  }
  if (a === 'cancelType') { S.adminSel = null; S.draft = null; render(); return; }
  if (a === 'orgUnpick') { S.orgPick = null; render(); return; }
  if (a === 'orgUndo') { S.orgDraft.pop(); S.orgPick = null; orgChanged(); return; }
  if (a === 'orgClear') { S.orgDraft = []; S.orgPick = null; orgChanged(); return; }
  if (a === 'orgApply') {
    const ops = S.orgDraft.flatMap(g => g.ops);
    const ok = await rpc('org_apply', { p_ops: ops }, items => `組織図を変えました。${items.length ? `回っている途中の${items.length}件の担当が変わりました` : '回っている途中の稟議への影響はありません'}`);
    if (ok) { S.orgDraft = []; S.orgPreview = null; S.orgPick = null; render(); }
    return;
  }
  if (a === 'reset') {
    if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'もう一度押すと、本当に最初に戻します'; return; }
    await rpc('reset_demo', {}, '最初の状態に戻しました');
    S.draft = null; S.adminSel = null; render();
  }
});

document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'lf') { doLogin($('#lfUser').value, $('#lfPw').value); return; }
  if (e.target.id === 'nf') submitForm();
});
document.addEventListener('input', e => {
  if (e.target.id === 'nfTitle') { S.titleTouched = true; return; }
  if ($('#nf') && (e.target.id === 'nfAmount' || e.target.dataset.fd)) updateForm(false);
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.classList.contains('bk')) { const id = +el.dataset.id; if (el.checked) S.sel.add(id); else S.sel.delete(id); render(); return; }
  if (el.id === 'nfFiles') { S.pick.push(...acceptFiles([...el.files], S.pick.length + (S.edit ? filesOf(S.edit).length : 0))); el.value = ''; renderPick(); return; }
  if (el.id === 'dfFiles') {
    const rid = +el.dataset.id; const files = acceptFiles([...el.files], filesOf(rid).length); el.value = '';
    if (!files.length || S.busy) return;
    S.busy = true; toast('書類を付けています…');
    try {
      const { done, fails } = await uploadFiles(rid, files);
      await loadAll();
      toast(fails.length ? fails[0] : `添付書類を${done}つ付けました`);
    } finally { S.busy = false; render(); }
    return;
  }
  if ($('#nf') && (e.target.id === 'nfProxy' || e.target.dataset.fd)) updateForm(false);
  if (el.id === 'tmDept') { S.teamDept = +el.value; S.teamWho = null; render(); }
});

// ほかの人が印を押したときなどに備えて、ときどき読み直す（入力の途中は画面を描き直さない）
setInterval(async () => {
  if (!S.me || S.busy || document.hidden || drag) return;
  try {
    await loadAll();
    const typing = $('#nf') || $('#adm') || (document.activeElement && ['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement.tagName));
    if (typing) renderBell(); else render();
  } catch (_) { /* つながらないときは次の回に */ }
}, 30000);

// 打刻の時計を進める
setInterval(() => { const c = $('#pcClock'); if (c) c.textContent = hmOf(Date.now()); }, 15000);

sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.me = null; loginView(); } });
start();
})();
