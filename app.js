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
  clip: '<path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  yen: '<path d="M6 4l6 8 6-8M12 12v8M8 13h8M8 17h8"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const GRP_ICON = { 'お金・購入': 'yen', '休み・勤務': 'cal', '行事・その他': 'star' };
const GRP_ORDER = ['お金・購入', '休み・勤務', '行事・その他'];
const icon = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ''}</svg>`;
const guide = h => `<div class="guide">${icon('info')}<div>${h}</div></div>`;
const pageHead = (title, sub, actions = '') => `<div class="phead"><div><h1>${title}</h1>${sub ? `<p class="psub">${sub}</p>` : ''}</div>${actions ? `<div class="pact">${actions}</div>` : ''}</div>`;

// ---------------------------------------------------------------- つなぎ先
const configured = CFG.url && /^https?:\/\//.test(CFG.url) && CFG.anonKey && !/ここに/.test(CFG.anonKey);
if (!configured) {
  $('#view').innerHTML = `<section class="card"><h1>つなぎ先がまだ入っていません</h1>
  <p>config.js に Supabase の Project URL と anon（publishable）key を入れてください。手順書の「4」を見てください。</p></section>`;
  return;
}
const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });

// ---------------------------------------------------------------- 状態
const S = {
  me: null, view: 'home', open: null, edit: null, filter: 'all', notesOpen: false,
  adminSel: null, draft: null, showHow: false, busy: false, titleTouched: false,
  staff: [], types: [], steps: [], ringi: [], route: [], log: [], notices: [], depts: [], posts: [],
  orgDraft: [], orgPreview: null, orgPick: null,
  files: [], pick: [], listFilter: 'wait', moreOpen: false, soumuOpen: true,
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
  const tables = ['staff', 'ringi_types', 'route_steps', 'ringi', 'ringi_route', 'ringi_log', 'notices', 'depts', 'posts', 'ringi_files'];
  const res = await Promise.all(tables.map(t => sb.from(t).select('*')));
  // 添付の表は、Supabase に貼り直すまではまだない。そのときも残りは使えるようにする。
  S.filesReady = !res[9].error;
  if (!S.filesReady) res[9] = { data: [] };
  const err = res.find(r => r.error);
  if (err) throw err.error;
  [S.staff, S.types, S.steps, S.ringi, S.route, S.log, S.notices, S.depts, S.posts, S.files] = res.map(r => r.data || []);
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
  S.busy = true;
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
    S.busy = false;
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
  document.body.classList.add('at-login');
  $('#view').innerHTML = `<section class="login">
  <div class="lbrand"><span class="mark">稟</span><div><b>稟議・申請ワークフロー</b><span>お試し版</span></div></div>
  <div class="card"><h1>ログイン</h1>
  <p class="psub">お試し用に配られたログイン名とパスワードを入れてください。</p>
  ${msg ? `<div class="errnote" style="margin-bottom:12px">${esc(msg)}</div>` : ''}
  <form id="lf">
    <label class="f">ログイン名<input id="lfUser" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="例：nakamura" required></label>
    <label class="f">パスワード<input id="lfPw" type="password" autocomplete="current-password" required></label>
    <button class="btn primary lg" type="submit">ログインする</button>
  </form></div>
  <p class="small muted" style="text-align:center">職員も稟議もすべて架空です。</p></section>`;
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
function pill(r) {
  if (r.status === 'ok') return '<span class="pill ok">決裁済み</span>';
  if (r.status === 'back') return '<span class="pill bad">差し戻し中</span>';
  if (r.status === 'no') return '<span class="pill gray">却下</span>';
  const c = cur(r);
  return `<span class="pill wait">${esc(c ? c.label : '')}の決裁待ち</span>`;
}
function rows(list, empty) {
  if (!list.length) return `<div class="emptybox">${empty}</div>`;
  return `<div class="dtable"><table><thead><tr><th>番号</th><th>件名</th><th>種類</th><th>申請者</th><th class="r">金額</th><th>申請日</th><th>決裁日</th><th>状況</th></tr></thead><tbody>
  ${list.map(r => `<tr class="li click" data-open="${r.id}" tabindex="0">
    <td class="c-no num">${no(r)}</td>
    <td class="c-ttl"><b>${esc(r.title)}</b>${r.filer_id !== r.owner_id ? `<span class="sub">${esc(P(r.filer_id).name)}が代わりに起案</span>` : ''}</td>
    <td class="c-type">${esc(r.type_name)}</td>
    <td class="c-who">${esc(P(r.owner_id).name)}<span class="sub">${esc(P(r.owner_id).dept)}</span></td>
    <td class="c-amt r num">${r.amount != null && T(r.type_id)?.use_amount ? yen(r.amount) : '<span class="muted">—</span>'}</td>
    <td class="c-day num"><span class="lb">申請日 </span>${fmtDay(r.created_at)}</td>
    <td class="c-day c-dec num">${decidedAt(r) ? `<span class="lb">決裁日 </span>${fmtDay(decidedAt(r))}` : '<span class="muted">—</span>'}</td>
    <td class="c-st">${pill(r)}${filesOf(r.id).length ? `<span class="fcount" title="添付書類">${icon('clip')}${filesOf(r.id).length}</span>` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

// メニュー。パソコンでは左に縦に、スマホでは下のタブ（よく使うもの）＋「その他」にまとめる。
function navHtml() {
  const w = waitingForMe().length;
  const back = S.ringi.filter(r => isMine(r) && r.status === 'back').length;
  const cur = k => S.view === k && !S.open ? 'aria-current="page"' : '';
  const b = (k, label, ic, badge = '', cls = '', short = '') => `<button type="button" class="${cls} ${short ? 'has-short' : ''}" data-nav="${k}" ${cur(k)}>${icon(ic)}<span class="nl">${label}</span>${short ? `<span class="ns">${short}</span>` : ''}${badge}</button>`;
  const main = `<div class="nmain">
    <button type="button" class="ncreate" data-nav="new" ${cur('new')}>${icon('new')}<span class="nl">起案する</span></button>
    <div class="ngroup">メニュー</div>
    ${b('home', 'ホーム', 'home', '', 'tab')}
    ${b('wait', 'あなたの決裁待ち', 'wait', w ? `<span class="badge">${w}</span>` : '', 'tab', '決裁待ち')}
    ${b('list', '出した稟議', 'list', back ? `<span class="badge warn" title="差し戻し">${back}</span>` : '', 'tab')}
    <button type="button" class="tab nmorebtn" data-a="more" aria-expanded="${S.moreOpen}">${icon('more')}<span class="nl">その他</span></button>
  </div>`;
  const soumu = S.me.is_soumu ? `<button type="button" class="ngroup ntoggle" data-a="soumuToggle" aria-expanded="${S.soumuOpen}">総務${icon('chev')}</button>
    ${S.soumuOpen ? `${b('all', '全体の一覧', 'all')}${b('admin', '管理画面', 'admin')}` : ''}` : '';
  const sub = `<div class="nsub ${S.moreOpen ? 'open' : ''}">
    <div class="ngroup">ほかの画面</div>
    ${b('done', '印を押した稟議', 'done')}
    ${b('org', '組織図', 'org')}
    ${soumu}
  </div>`;
  return main + sub;
}

function render() {
  if (!S.me) return;
  document.body.classList.remove('at-login');
  $('#bar').hidden = false; $('#navbar').hidden = false;
  $('#me').innerHTML = `<span class="av">${esc(S.me.name.slice(0, 1))}</span><span class="nmt"><b>${esc(S.me.name)}</b>${esc(S.me.dept)}・${esc(titleOf(S.me))}</span>`;
  renderBell();
  $('#nav').innerHTML = navHtml();
  document.body.classList.toggle('more-open', S.moreOpen);
  renderNotes();
  const r = S.open ? R(S.open) : null;
  $('#view').innerHTML = r ? detail(r) : (VIEWS[S.view] || VIEWS.home)();
  if ($('#nf')) { updateForm(true); renderPick(); }
}

function renderNotes() {
  const box = $('#notes'); box.hidden = !S.notesOpen;
  if (!S.notesOpen) return;
  const ns = S.notices.slice(0, 30);
  box.innerHTML = `<div class="row between"><h2 style="margin:0">${icon('bell')} お知らせ</h2><div class="row">
    ${S.notices.some(n => !n.is_read) ? '<button class="btn sm" type="button" data-a="readAll">すべて読んだことにする</button>' : ''}
    <button class="btn sm" type="button" data-a="closeNotes">閉じる</button></div></div>
  <p class="small muted" style="margin:2px 0 6px">本番では、スマホにも同じ知らせが届くようにできます（お試し版ではこの画面だけ）。</p>
  <div class="list">${ns.length ? ns.map(n => `<div class="li ${n.ringi_id ? 'click' : ''}" ${n.ringi_id ? `data-open="${n.ringi_id}"` : ''}><div class="main"><b>${esc(n.text)}</b><div class="sub">${fmtAt(n.at)}</div></div>${n.is_read ? '' : '<span class="pill info">新着</span>'}</div>`).join('') : '<p class="muted">お知らせはありません。</p>'}</div>`;
}

// ---------------------------------------------------------------- それぞれの画面
const VIEWS = {};

VIEWS.home = function () {
  const mine = S.ringi.filter(isMine);
  const back = mine.filter(r => r.status === 'back');
  const w = waitingForMe();
  const tile = (n, label, sub, nav, cls) => `<button type="button" class="tile ${cls}" ${nav}><span class="tl">${label}</span><span class="tn num">${n}<small>件</small></span><span class="ts">${sub}</span></button>`;
  const lf = k => `data-nav="list" data-lf="${k}"`;
  return `
  ${pageHead(`${esc(S.me.name)} さん、おつかれさまです`, '自分が出した稟議・申請がいまどこまで進んでいるか、ここで分かります。', `<button class="btn primary" type="button" data-nav="new">${icon('new')}起案する</button>`)}
  <div class="tiles">
    ${tile(w.length, 'あなたの決裁待ち', 'あなたが印を押す番のもの', 'data-nav="wait"', w.length ? 'hot' : '')}
    ${tile(mine.filter(r => r.status === 'wait').length, '出した稟議（回覧中）', 'ほかの人の決裁待ち', lf('wait'), '')}
    ${tile(back.length, '差し戻し（直して出し直し）', '直して出し直してください', lf('back'), back.length ? 'warn' : '')}
    ${tile(mine.filter(r => r.status === 'ok').length, '決裁済み', 'すべての印がそろったもの', lf('ok'), '')}
  </div>
  ${back.map(r => `<section class="card notice-card"><div class="backnote"><b>差し戻されています：</b>${esc(r.title)}<br>${esc(P(r.last_by).name)}さんより「${esc(r.last_comment)}」</div><div class="row" style="margin-top:10px"><button class="btn primary" type="button" data-open="${r.id}">中身を見て直す</button></div></section>`).join('')}
  <section class="card flush"><div class="chead"><h2>出した稟議</h2><span class="muted small">${mine.length}件</span></div>
  ${rows(mine, 'まだありません。「起案する」から出してみてください。')}</section>
  ${howTo()}`;
};

function howTo() {
  const steps = [
    '<b>職員の中村さん</b>（<code>nakamura</code>）で入り、「起案する」から<b>物品購入</b>を出す。金額を10万円より下げると<b>院長の段が外れる</b>のを見る',
    '<b>井上師長</b>（<code>inoue</code>）か<b>鈴木副師長</b>（<code>suzuki</code>）で入り、「あなたの決裁待ち」から印を押す。<b>どちらか1人</b>が押せば次へ進む',
    '<b>森事務長</b>（<code>mori</code>）で入り、コメントを付けて<b>差し戻す</b>',
    'もう一度<b>中村さん</b>で入り、差し戻された稟議を<b>直して出し直す</b>（最初の段から回り直す）',
    '<b>小林さん</b>（<code>kobayashi</code>）で<b>有給休暇</b>や<b>遅刻・早退届</b>を出す。所属長のあと<b>総務の受付</b>（<code>aoki</code>）へ回る',
    '<b>総務の青木さん</b>（<code>aoki</code>）で入り、<b>親睦会（慶弔）を中村さんの代わりに起案</b>する。<b>管理画面</b>で回る順番や金額の条件を変えてみる',
    '<b>総務の青木さん</b>で「組織図」を開き、<b>3階東病棟の井上師長のカードを、1階病棟の看護師長の席へ動かす</b>（2人が入れ替わる）。確定の前に、担当が変わる稟議の一覧を見る。1階病棟の清水さんの「点滴スタンドの購入」が、斎藤師長から井上師長に移るのを見る（<code>inoue</code> で入ると「あなたの決裁待ち」に出る）',
  ];
  return `<section class="card"><div class="row between"><h2 style="margin:0">お試しの進め方（15分ほど）</h2><button class="btn sm" type="button" data-a="how">${S.showHow ? '閉じる' : '開く'}</button></div>
  ${S.showHow ? `<ol class="steps" style="margin-top:12px">${steps.map(s => `<li><div>${s}</div></li>`).join('')}</ol>
  <p class="small muted" style="margin:12px 0 0">人を変えるときは、右上の「ログアウト」から入り直します。何人かで同じ人に入っても大丈夫です。</p>` : ''}</section>`;
}

const LF = [['wait', '回覧中'], ['back', '差し戻し（直して出し直し）'], ['ok', '決裁済み'], ['no', '却下'], ['all', 'すべて']];
VIEWS.list = function () {
  const mine = S.ringi.filter(isMine);
  const f = S.listFilter;
  const m = (r, k) => k === 'all' || r.status === k;
  const list = mine.filter(r => m(r, f));
  return `${pageHead('出した稟議', '自分が出したもの（代わりに出してもらったものも）です。回覧中のものは、ほかの人の決裁待ちです。', `<button class="btn primary" type="button" data-nav="new">${icon('new')}起案する</button>`)}
  <section class="card flush"><div class="chead">
  <div class="filters" role="group" aria-label="絞り込み">${LF.filter(([k]) => k !== 'no' || mine.some(r => r.status === 'no')).map(([k, l]) => `<button type="button" data-lf="${k}" aria-pressed="${f === k}">${l}<span class="fc">${mine.filter(r => m(r, k)).length}</span></button>`).join('')}</div></div>
  ${rows(list, f === 'wait' ? 'いま回覧中のものはありません。' : '当てはまるものはありません。')}</section>`;
};

VIEWS.wait = function () {
  const list = waitingForMe();
  return `${pageHead('あなたの決裁待ち', 'あなたが印を押す番のものです。同じ段に何人かいるときは、どなたか1人が押せば次へ進みます（例：師長か副師長のどちらか）。')}
  <section class="card flush"><div class="chead"><h2>${esc(S.me.name)} さんの決裁待ち</h2><span class="muted small">${list.length}件</span></div>${rows(list, 'いま、あなたの決裁待ちはありません。')}</section>`;
};

VIEWS.done = function () {
  const id = S.me.id;
  const list = S.ringi.filter(r => routeOf(r.id).some(x => x.stamped_by === id || (x.approver_ids.includes(id) && !myTurn(r) && x.step_no > r.stage && r.status === 'wait')));
  return `${pageHead('印を押した稟議', 'あなたが印を押したものと、このあとあなたの番が来るものです。')}
  <section class="card flush"><div class="chead"><h2>一覧</h2><span class="muted small">${list.length}件</span></div>${rows(list, 'まだありません。')}</section>`;
};

VIEWS.all = function () {
  if (!S.me.is_soumu) return VIEWS.home();
  const f = S.filter;
  const match = (r, k) => k === 'all' || (k === 'wait' && r.status === 'wait') || (k === 'ok' && r.status === 'ok') || (k === 'back' && (r.status === 'back' || r.status === 'no'));
  const list = S.ringi.filter(r => match(r, f));
  return `${pageHead('全体の一覧', '病院全体の稟議・申請です。どこで止まっているかが分かるので、催促や台帳づくりの手間が減ります。')}
  <section class="card flush"><div class="chead">
  <div class="filters" role="group" aria-label="絞り込み">${[['all', 'すべて'], ['wait', '回っている途中'], ['ok', '決裁済み'], ['back', '差し戻し・却下']].map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${f === k}">${l}<span class="fc">${S.ringi.filter(r => match(r, k)).length}</span></button>`).join('')}</div></div>
  ${rows(list, '当てはまるものはありません。')}</section>`;
};

function fieldInput(fd, val) {
  const id = `fd_${fd.k}`;
  const req = fd.required ? '<span class="req">必須</span>' : '';
  let input;
  if (fd.kind === 'select') input = `<select id="${id}" data-fd="${esc(fd.k)}">${fd.required ? '' : '<option value=""></option>'}${(fd.options || []).map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (fd.kind === 'date') input = `<input id="${id}" data-fd="${esc(fd.k)}" type="date" value="${esc(val || '')}">`;
  else if (fd.kind === 'time') input = `<input id="${id}" data-fd="${esc(fd.k)}" type="time" step="300" value="${esc(val || '')}">`;
  else input = `<input id="${id}" data-fd="${esc(fd.k)}" value="${esc(val || '')}">`;
  return `<label class="f"><span>${esc(fd.label)}${req}</span>${input}${fd.hint ? `<span class="hint">${esc(fd.hint)}</span>` : ''}</label>`;
}

VIEWS.new = function () {
  const ed = S.edit ? R(S.edit) : null;
  const types = S.types.filter(t => t.in_use || (ed && t.id === ed.type_id));
  if (!types.length) return `<section class="card"><p>いま使える種類がありません。総務の管理画面で「使う」にしてください。</p></section>`;
  const defType = ed ? ed.type_id : (S.newType && T(S.newType) ? S.newType : (types.find(t => t.name === '物品購入') || types[0]).id);
  const t = T(defType);
  const vals = {};
  if (ed) (ed.details || []).forEach(d => vals[d.k] = d.value);
  return `
  ${guide(ed ? '差し戻されたものを直して、もう一度出せます。出し直すと、<b>最初の段から回り直します</b>。'
    : '種類を選ぶと、入れる項目と<b>回る順番</b>がすぐ下に出ます。物品購入で金額を10万円より下げてみてください。院長の段が外れます。')}
  ${pageHead(ed ? '直して出し直す' : '起案する', ed ? '直した内容で出し直すと、最初の段から回り直します。' : '種類を選ぶと、入れる項目と回る順番が出ます。')}
  <section class="card">
  <form class="form" id="nf" novalidate>
    <div class="wide"><div class="flabel">種類</div><input type="hidden" id="nfType" value="${defType}">
      ${ed ? `<div class="typesel one">${typeBtn(t, true, true)}</div>` : typePicker(types, defType)}
      <span class="hint" id="nfDesc"></span></div>
    <label class="f" id="nfAmountWrap">金額（円）<input id="nfAmount" inputmode="numeric" value="${ed && ed.amount != null ? ed.amount : ''}" placeholder="例：98000"><span class="hint">お金がかからない場合は空のままで大丈夫です。</span></label>
    ${!ed && canProxy() ? `<label class="f wide" id="nfProxyWrap">代わりに起案する相手<select id="nfProxy"><option value="">（自分の分として出す）</option>${proxyTargets().map(s => `<option value="${s.id}">${esc(s.staff_no)}　${esc(s.name)}（${esc(s.dept)}）</option>`).join('')}</select><span class="hint">本人が出せないときだけ選びます。代わりに起案できる種類（親睦会など）のときだけ出ます。</span></label>` : ''}
    <div class="wide form" id="nfFields" style="gap:14px">${(t.fields || []).map(fd => fieldInput(fd, vals[fd.k])).join('')}</div>
    <div class="wide"><div class="small" style="font-weight:700;margin-bottom:6px">回る順番</div><div id="nfProxyNote"></div><div class="route" id="nfRoute"></div><div class="small muted" id="nfRouteNote" style="margin-top:6px"></div></div>
    <label class="f wide"><span>件名<span class="req">必須</span></span><input id="nfTitle" value="${esc(ed ? ed.title : '')}" placeholder="例：鉛筆の購入"></label>
    <label class="f wide"><span id="nfBodyLabel">内容</span><textarea id="nfBody" rows="3">${esc(ed ? ed.body : '')}</textarea></label>
    <div class="wide"><div class="flabel">添付書類<span class="opt">なくても大丈夫</span></div>
      ${ed && filesOf(ed.id).length ? `<p class="small muted" style="margin:0 0 6px">今の添付：${filesOf(ed.id).map(f => esc(f.name)).join('、')}（外すときは稟議の画面で）</p>` : ''}
      ${!S.filesReady ? '<p class="small muted" style="margin:0">添付書類は、まだ準備中です（Supabase への貼り直しが終わると使えます）。</p>' : ''}
      <label class="filebtn" ${S.filesReady ? '' : 'hidden'}>${icon('clip')}<span>書類を選ぶ</span><input type="file" id="nfFiles" multiple accept="${ACCEPT}"></label>
      <span class="hint" style="margin-left:8px">${FILE_RULE}</span>
      <ul class="filelist" id="nfPick"></ul></div>
    <div class="wide row"><button class="btn primary" type="submit">${ed ? '直した内容で出し直す' : 'この内容で起案する'}</button>${ed ? `<button class="btn" type="button" data-open="${ed.id}">やめる</button>` : ''}</div>
  </form></section>`;
};

function typeBtn(x, on, static_) {
  const short = (x.description || '').split('。')[0];
  return `<button type="button" class="typebtn" ${static_ ? 'disabled' : `data-type="${x.id}"`} aria-pressed="${on}"><b>${esc(x.name)}</b><span>${esc(short)}</span></button>`;
}
function typePicker(types, sel) {
  const groups = [...new Set([...GRP_ORDER, ...types.map(x => x.grp || 'その他')])].filter(g => types.some(x => (x.grp || 'その他') === g));
  return `<div class="typesel">${groups.map(g => `<div class="tgroup"><div class="tghead">${icon(GRP_ICON[g] || 'list')}${esc(g)}</div>
    <div class="tgrid">${types.filter(x => (x.grp || 'その他') === g).map(x => typeBtn(x, x.id === sel)).join('')}</div></div>`).join('')}</div>`;
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
  if (error || !data) { w?.close(); toast('書類を開けませんでした。見られるのは起案した人・回る先の人・総務だけです'); return; }
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
  if (day) s += ' ' + md(day) + (v('to') && v('to') !== day ? '〜' + md(v('to')) : '');
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
    ? `<div class="proxybox" style="margin-bottom:8px">${esc(P(owner).name)}さん（${esc(P(owner).dept)}）の代わりに起案します。本人にお知らせが届きます。代わりに起案した人は、自分では印を押せません。</div>` : '';
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
async function submitForm() {
  const { ed, t, amount, owner, details } = formState();
  const title = $('#nfTitle').value.trim(), body = $('#nfBody').value.trim();
  const miss = (t.fields || []).filter(fd => fd.required && !details.find(d => d.k === fd.k));
  if (miss.length) { toast(`「${miss[0].label}」を入れてください`); $(`#fd_${miss[0].k}`)?.focus(); return; }
  if (!title) { toast('件名を入れてください'); $('#nfTitle').focus(); return; }
  if (ed) {
    const ok = await rpc('resubmit_ringi', { p_id: ed.id, p_title: title, p_body: body, p_amount: amount, p_details: details }, '出し直しました。最初の段から回り直します');
    if (ok) { S.edit = null; S.open = ed.id; await afterSubmitFiles(ed.id); render(); window.scrollTo({ top: 0 }); }
    return;
  }
  const args = { p_type: t.id, p_title: title, p_body: body, p_amount: amount, p_details: details };
  if (owner !== S.me.id) args.p_owner = owner;
  const ok = await rpc('submit_ringi', args, id => {
    const c = routeOf(id)[0];
    return c ? `起案しました。いま${c.label}（${sanNames(c.approver_ids)}）の決裁待ちです` : '起案しました。回る段がないため、そのまま決裁になりました';
  });
  if (ok) { S.open = ok.data; S.titleTouched = false; await afterSubmitFiles(ok.data); render(); window.scrollTo({ top: 0 }); }
}

// ---- くわしく見る
function filesCard(r) {
  if (!S.filesReady) return '';
  if (!canSeeFiles(r)) return `<section class="card"><h2>${icon('clip')} 添付書類</h2><p class="small muted" style="margin:0">添付書類を見られるのは、起案した人・回る先の人・総務だけです。</p></section>`;
  const fs = filesOf(r.id), can = canChangeFiles(r);
  if (!fs.length && !can) return '';
  return `<section class="card files"><div class="row between" style="margin-bottom:8px"><h2 style="margin:0">${icon('clip')} 添付書類 <span class="muted small">${fs.length}件</span></h2>
    ${can ? `<label class="filebtn sm">${icon('new')}<span>書類を足す</span><input type="file" id="dfFiles" data-id="${r.id}" multiple accept="${ACCEPT}"></label>` : ''}</div>
    ${fs.length ? `<ul class="filelist">${fs.map(f => `<li>${icon(/^image/.test(f.mime) ? 'img' : 'file')}
      <button type="button" class="fn link" data-a="viewFile" data-f="${f.id}">${esc(f.name)}</button>
      <span class="fs num">${kb(f.size)}・${esc(P(f.uploaded_by).name)}・${fmtDay(f.at)}</span>
      ${can && f.uploaded_by === S.me.id ? `<button type="button" class="btn sm" data-a="rmFile" data-f="${f.id}">外す</button>` : ''}</li>`).join('')}</ul>`
      : '<p class="small muted" style="margin:0">まだありません。見積書やカタログ、写真などを付けられます。</p>'}
    ${can ? `<p class="small muted" style="margin:8px 0 0">${FILE_RULE}。付けたり外したりできるのは、まだだれも印を押していない間と、差し戻されている間だけです。</p>` : ''}
  </section>`;
}
function detail(r) {
  const route = routeOf(r.id);
  const c = cur(r);
  const mine = myTurn(r);
  const isOwner = r.owner_id === S.me.id || r.filer_id === S.me.id;
  const t = T(r.type_id);
  let action = '';
  if (mine) {
    action = `<section class="card actcard"><h2>あなたの番です（${esc(c.label)}として）</h2>
    ${c.approver_ids.length > 1 ? `<p class="small muted" style="margin:-4px 0 8px">この段は ${esc(names(c.approver_ids))} のどなたか1人が承認すると次へ進みます。</p>` : ''}
    <label class="f">コメント<span class="hint">承認のときはなくても大丈夫です。差し戻し・却下のときは理由を書いてください。</span><textarea id="cm" rows="2" placeholder="例：見積りを2社分そろえてください"></textarea></label>
    <div class="row" style="margin-top:12px"><button class="btn ok" type="button" data-a="approve" data-id="${r.id}">承認する</button><button class="btn warn" type="button" data-a="back" data-id="${r.id}">差し戻す（直して出し直してもらう）</button><button class="btn bad" type="button" data-a="reject" data-id="${r.id}">却下する</button></div></section>`;
  } else if (c) {
    action = `<section class="card infocard"><p style="margin:0">いま <b>${esc(sanNames(c.approver_ids))}</b>の決裁待ちです（${esc(c.label)}）。${route.some(x => x.approver_ids.includes(S.me.id) && x.step_no > r.stage) ? 'あなたの番はこのあとです。' : ''}</p>
    ${isMine(r) ? `<p class="small muted" style="margin:6px 0 0">${esc(sanNames(c.approver_ids))}の画面の「あなたの決裁待ち」に出ています。お試しで確かめるときは、ログアウトして <code>${c.approver_ids.map(i => esc(P(i).login)).join('</code> か <code>')}</code> で入り直してください。</p>` : ''}</section>`;
  } else if (r.status === 'back' && isOwner) {
    action = `<section class="card"><div class="backnote"><b>${esc(P(r.last_by).name)}さんから差し戻されました。</b><br>「${esc(r.last_comment)}」</div><div class="row" style="margin-top:10px"><button class="btn primary" type="button" data-a="edit" data-id="${r.id}">直して出し直す</button></div></section>`;
  } else if (r.status === 'back') {
    action = `<section class="card"><div class="backnote">起案した人（${esc(P(r.owner_id).name)}さん）が直して出し直すのを待っています。<br>理由：「${esc(r.last_comment)}」</div></section>`;
  } else if (r.status === 'no') {
    action = `<section class="card"><div class="errnote">${esc(P(r.last_by).name)}さんが却下しました。<br>理由：「${esc(r.last_comment)}」</div></section>`;
  }
  const details = r.details || [];
  const owner = P(r.owner_id), filer = P(r.filer_id);
  const kv = [
    ['申請番号', `<span class="num">${no(r)}</span>`],
    ['種類', esc(r.type_name)],
    ['申請者', `${esc(owner.name)}<span class="muted">（${esc(owner.dept)}）</span>${r.filer_id !== r.owner_id ? `<span class="sub">${esc(filer.name)}（${esc(filer.dept)}）が代わりに起案</span>` : ''}`],
    ['申請日', `<span class="num">${fmtAt(r.created_at)}</span>`],
    ['決裁日', decidedAt(r) ? `<span class="num">${fmtAt(decidedAt(r))}</span>` : '<span class="muted">—（まだ決裁されていません）</span>'],
    ...(r.amount != null && t?.use_amount ? [['金額', `<b class="num amtbig">${yen(r.amount)}</b>`]] : []),
    ...details.map(d => [esc(d.label), esc(/^\d{4}-\d{2}-\d{2}$/.test(d.value) ? md(d.value) : d.value)]),
    ...(r.body ? [[esc(t?.body_label || '内容'), `<span class="pre">${esc(r.body)}</span>`]] : []),
  ];
  // 承認の流れ（起案 → 各段）
  const stateOf = i => route[i].stamped_by ? 'done' : (c && i === r.stage) ? 'now' : ((r.status === 'back' || r.status === 'no') && i === r.stage) ? 'stop' : 'todo';
  const stepper = `<ol class="stepper">
    <li class="done"><span class="sd">✓</span><div><div class="sl2">起案</div><div class="sn2">${esc(owner.name)}</div><div class="st2 num">${fmtAt(r.created_at)}</div></div></li>
    ${route.map((s, i) => { const st = stateOf(i); return `<li class="${st}"><span class="sd">${st === 'done' ? '✓' : st === 'stop' ? '!' : i + 1}</span><div>
      <div class="sl2">${esc(s.label)}${st === 'now' ? '<span class="tag now">いまの番</span>' : st === 'stop' ? `<span class="tag stop">${r.status === 'back' ? '差し戻し' : '却下'}</span>` : ''}</div>
      <div class="sn2">${esc(names(s.approver_ids))}${s.approver_ids.length > 1 ? '<span class="muted small">（どなたか1人）</span>' : ''}</div>
      ${s.stamped_by ? `<div class="st2"><span class="num">${fmtAt(s.stamped_at)}</span> ${esc(P(s.stamped_by).name)} が承認</div>` : ''}</div></li>`; }).join('')}
    ${route.length ? `<li class="${r.status === 'ok' ? 'done' : 'todo'} last"><span class="sd">${r.status === 'ok' ? '✓' : '◎'}</span><div><div class="sl2">決裁</div>${decidedAt(r) ? `<div class="st2 num">${fmtAt(decidedAt(r))}</div>` : ''}</div></li>` : ''}
  </ol>`;
  return `
  <div class="crumb"><button class="btn link" type="button" data-a="back2list">${icon('back')}一覧へ戻る</button></div>
  <div class="dhead"><div><div class="dmeta"><span class="num">${no(r)}</span>・${esc(r.type_name)}</div><h1>${esc(r.title)}</h1></div>${pill(r)}</div>
  <div class="dgrid">
    <div class="dmain">
      <section class="card flush"><div class="chead"><h2>申請内容</h2></div>
        <table class="kvt">${kv.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table></section>
      ${filesCard(r)}
      ${action}
      <section class="card"><h2>承認欄</h2>
        ${route.length ? `<div class="stamps">${route.map((s, i) => `<div><div class="hd">${esc(s.label)}</div><div class="bx ${c && i === r.stage ? 'now' : ''}">${s.stamped_by ? `<div class="hanko"><span class="n">${esc(P(s.stamped_by).name.split(' ')[0])}</span><span class="d">${fmtDay(s.stamped_at)}</span><span style="font-size:10px">承認</span></div>` : (c && i === r.stage ? '決裁待ち<br>いまの番' : (r.status === 'back' || r.status === 'no') && i === r.stage ? (r.status === 'back' ? '差し戻し' : '却下') : '順番待ち')}</div><div class="ft">${esc(names(s.approver_ids))}${s.approver_ids.length > 1 ? '<br>（どなたか1人）' : ''}</div></div>`).join('')}</div>` : '<p class="muted" style="margin:0">回る段がないため、出したときにそのまま決裁になりました。</p>'}
      </section>
    </div>
    <aside class="dside">
      <section class="card"><h2>承認の流れ</h2>${stepper}</section>
      <section class="card"><h2>やり取りの記録</h2><div class="timeline">
        ${logOf(r.id).map(l => `<div><span class="muted num small">${fmtAt(l.at)}</span><br>${esc(l.text)}${l.comment ? `<br><span class="c">「${esc(l.comment)}」</span>` : ''}</div>`).join('')}
        ${c ? `<div class="muted">${esc(c.label)}の決裁待ち（${esc(names(c.approver_ids))}）</div>` : ''}
      </div></section>
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
  ${edit && (ops.length || S.orgPick) ? `<section class="card draft">
    ${S.orgPick ? `<div class="pickbar">${esc(P(S.orgPick.person).name)}さんを選んでいます。置きたい席か部署を押してください。<button class="btn sm" type="button" data-a="orgUnpick">選ぶのをやめる</button></div>` : ''}
    ${ops.length ? `<h2>動かした内容（まだ決まっていません）</h2>
    <ol class="draftlist">${S.orgDraft.map(g => `<li>${esc(g.text)}</li>`).join('')}</ol>
    ${warns.map(w => `<div class="backnote small" style="margin-top:8px">${esc(w)}</div>`).join('')}
    <h2 style="margin-top:14px">確定すると変わること</h2>
    ${!pv || pv.loading ? '<p class="muted small">調べています…</p>'
      : pv.error ? `<div class="errnote">${esc(pv.error)}</div>`
      : pv.items.length ? `<p class="small" style="margin:0 0 6px">回っている途中の稟議・申請 <b>${pv.items.length}件</b>の担当が変わります（もう押された印はそのまま残ります）。</p>
        <ul class="affect">${pv.items.map(i => `<li><b>${esc(i.title)}</b>　${esc(i.label)}：${esc(i.from)} → <b>${esc(i.to)}</b>${i.now ? '<span class="pill wait">いまの番</span>' : '<span class="muted small">（このあとの段）</span>'}</li>`).join('')}</ul>`
      : '<p class="small muted" style="margin:0">回っている途中の稟議・申請への影響はありません。これから出すものから新しい組織図で回ります。</p>'}
    <div class="row" style="margin-top:12px"><button class="btn primary" type="button" data-a="orgApply" ${!pv || pv.loading || pv.error ? 'disabled' : ''}>確定する</button><button class="btn" type="button" data-a="orgUndo">1つ戻す</button><button class="btn bad" type="button" data-a="orgClear">全部やめる</button></div>` : ''}
  </section>` : ''}
  <div class="board ${edit ? 'editable' : ''}">
  ${S.depts.filter(d => d.parent_id != null).map(d => {
    const seats = S.posts.filter(p => p.dept_id === d.id);
    const seated = new Set(seats.map(p => sim.holder[p.id]).filter(Boolean));
    const members = S.staff.filter(x => sim.dept[x.id] === d.id && !seated.has(x.id));
    const pickOn = edit && S.orgPick ? 'pickon' : '';
    return `<section class="col"><div class="colhd"><b>${esc(d.name)}</b>${d.is_soumu ? '<span class="pill info">総務</span>' : ''}${deptDepth(d.id) > 1 ? `<div class="small muted">${esc(path(d))}</div>` : ''}</div>
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
  ${pageHead('管理画面', '稟議・申請の種類と、回る順番を決めます。')}
  ${guide('<b>種類ごとに、回る順番を総務が自分で変えられる</b>画面です。規程が変わったときも、業者に頼まずにここで直せます。直した内容は<b>これから出すものから</b>使われ、回っている途中のものは変わりません。')}
  <section class="card"><div class="row between" style="margin-bottom:6px"><h2 style="margin:0">種類と回る順番</h2><button class="btn sm" type="button" data-a="addType">＋ 種類を足す</button></div>
  <div class="tblwrap"><table class="plain"><thead><tr><th>種類の名前</th><th>回る順番</th><th>代わりに起案</th><th>使う</th></tr></thead><tbody>
  ${S.types.map(t => `<tr class="click ${S.adminSel === t.id ? 'sel' : ''}" data-a="selType" data-id="${t.id}"><td><b>${esc(t.name)}</b></td><td>${esc(routeTxt(t))}</td><td>${t.allow_proxy ? 'できる' : '—'}</td><td>${t.in_use ? '使う' : '使わない'}</td></tr>`).join('')}
  </tbody></table></div><p class="small muted" style="margin:8px 0 0">行を押すと中身を直せます。</p></section>
  ${S.draft ? adminEdit(S.draft) : ''}
  <section class="card"><h2>お試しを最初の状態に戻す</h2>
  <p class="small muted" style="margin:0 0 10px">出した稟議・申請と、管理画面で変えた内容を全部消して、見本の状態に戻します。ほかの人が試している途中のものも消えます。</p>
  <button class="btn bad" type="button" data-a="reset">最初の状態に戻す</button></section>`;
};
function adminEdit(d) {
  const seats = S.posts.filter(p => p.is_boss);
  return `<section class="card" id="adm"><h2>${d.id ? `「${esc(d.name)}」を直す` : '新しい種類を足す'}</h2>
  <div class="form">
    <label class="f">種類の名前<input id="adName" value="${esc(d.name)}"></label>
    <label class="f">説明（起案の画面に出ます）<input id="adDesc" value="${esc(d.description)}"></label>
    <label class="f">起案の画面でのまとまり<select id="adGrp">${[...new Set([...GRP_ORDER, 'その他', d.grp || 'その他'])].map(g => `<option ${g === (d.grp || 'その他') ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
    <div class="checks wide"><label><input type="checkbox" id="adProxy" ${d.allow_proxy ? 'checked' : ''}> 代わりに起案できる（親睦会など）</label><label><input type="checkbox" id="adUse" ${d.in_use ? 'checked' : ''}> 使う（使わなくなった種類は消さずにここを外します）</label></div>
  </div>
  <h2 style="margin-top:16px">回る段</h2>
  <div style="display:flex;flex-direction:column;gap:10px">
  ${d.steps.map((s, i) => `<div class="stage" data-st="${i}">
    <div class="top"><span class="no">${i + 1}</span><input type="text" aria-label="段の名前" data-f="label" value="${esc(s.label)}">
      <span style="margin-left:auto" class="row"><button class="btn sm" type="button" data-a="stUp" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="上へ">↑</button><button class="btn sm" type="button" data-a="stDown" data-i="${i}" ${i === d.steps.length - 1 ? 'disabled' : ''} aria-label="下へ">↓</button><button class="btn sm bad" type="button" data-a="stDel" data-i="${i}">この段を消す</button></span></div>
    <div class="small muted">この段で印を押せる人（どなたか1人が押せば次へ）</div>
    <div class="checks"><label><input type="checkbox" data-f="boss" ${s.use_boss ? 'checked' : ''}> 起案した人の部署の上長</label><label><input type="checkbox" data-f="soumu" ${s.use_soumu ? 'checked' : ''}> 総務のだれか</label>
    </div>
    <details ${s.posts.length ? 'open' : ''}><summary class="small">決まった席を選ぶ（事務長・院長など）${s.posts.length ? `：${esc(S.posts.filter(p => s.posts.includes(p.id)).map(postLabel).join('、'))}` : ''}</summary>
    <div class="checks" style="margin-top:6px">${seats.map(p => `<label><input type="checkbox" data-f="p" value="${p.id}" ${s.posts.includes(p.id) ? 'checked' : ''}> ${esc(postLabel(p))}<span class="muted small">（${p.holder_id ? esc(P(p.holder_id).name) : '空席'}）</span></label>`).join('')}</div></details>
    <div class="row small"><span class="muted">金額の条件：</span><input inputmode="numeric" data-f="min" value="${s.min_amount ?? ''}" placeholder="空ならいつも"> 円以上のときだけ回る</div>
  </div>`).join('')}
  </div>
  <div class="row" style="margin-top:12px"><button class="btn sm" type="button" data-a="stAdd">＋ 段を足す</button></div>
  <div class="row" style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px"><button class="btn primary" type="button" data-a="saveType">保存する</button><button class="btn" type="button" data-a="cancelType">やめる</button></div>
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
function go(v) { if (v !== 'new' || S.view !== 'new') S.pick = []; S.view = v; S.open = null; S.edit = null; S.notesOpen = false; S.titleTouched = false; S.moreOpen = false; render(); window.scrollTo({ top: 0 }); }
function openR(id) {
  S.open = +id; S.edit = null; S.notesOpen = false; S.moreOpen = false;
  if (S.notices.some(n => n.ringi_id === +id && !n.is_read)) {
    S.notices.forEach(n => { if (n.ringi_id === +id) n.is_read = true; });
    sb.rpc('read_notices', { p_ringi: +id }).then(() => {});
  }
  render(); window.scrollTo({ top: 0 });
}

document.addEventListener('click', async e => {
  if (S.moreOpen && !e.target.closest('.nsub,[data-a=more]')) { S.moreOpen = false; document.body.classList.remove('more-open'); $('.nsub')?.classList.remove('open'); }
  if (S.orgPick && !e.target.closest('.pcard')) {
    const spot = e.target.closest('[data-drop]');
    if (spot) { orgDrop(S.orgPick.person, parseSpot(S.orgPick.from), parseSpot(spot.dataset.drop)); return; }
  }
  const t = e.target.closest('button,[data-open],[data-a],[data-nav]'); if (!t || t.disabled) return;
  const d = t.dataset;
  if (t.id === 'logout') { await sb.auth.signOut(); S.me = null; loginView(); return; }
  if (t.id === 'bell') { S.notesOpen = !S.notesOpen; renderNotes(); return; }
  if (d.nav) { if (d.lf) S.listFilter = d.lf; S.moreOpen = false; go(d.nav); return; }
  if (d.lf) { S.listFilter = d.lf; render(); return; }
  if (d.type && $('#nf')) { S.newType = +d.type; S.titleTouched = false; const keepBody = $('#nfBody').value; render(); $('#nfBody').value = keepBody; return; }
  if (d.filter) { S.filter = d.filter; render(); return; }
  if (d.open) { openR(d.open); return; }
  const a = d.a; const r = d.id && !['selType'].includes(a) ? R(+d.id) : null;
  if (a === 'how') { S.showHow = !S.showHow; render(); return; }
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
        if (nr.status === 'ok') return 'すべての印がそろい、決裁されました。起案した人にお知らせが届きます';
        const nc = cur(nr); return `印を押しました。${nc.label}（${names(nc.approver_ids)}）へ回りました`;
      }
      return a === 'back' ? `${label}として差し戻しました。起案した人に理由つきで知らせます` : '却下しました。起案した人に知らせます';
    });
    return;
  }
  if (a === 'edit') { S.pick = []; S.edit = r.id; S.open = null; S.view = 'new'; S.titleTouched = true; render(); window.scrollTo({ top: 0 }); return; }
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

sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.me = null; loginView(); } });
start();
})();
