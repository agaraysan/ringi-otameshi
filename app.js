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
const guide = h => `<div class="guide"><span class="gi">?</span><div>${h}</div></div>`;

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
const no = r => 'R-' + String(r.id).padStart(4, '0');
const canProxy = () => S.me.is_soumu || S.me.is_boss;
const myBossDepts = () => S.posts.filter(p => p.holder_id === S.me.id && p.is_boss).map(p => p.dept_id);
const proxyTargets = () => S.staff.filter(s => s.id !== S.me.id && (S.me.is_soumu || deptChain(s.dept_id).some(d => myBossDepts().includes(d))));

async function loadAll() {
  const tables = ['staff', 'ringi_types', 'route_steps', 'ringi', 'ringi_route', 'ringi_log', 'notices', 'depts', 'posts'];
  const res = await Promise.all(tables.map(t => sb.from(t).select('*')));
  const err = res.find(r => r.error);
  if (err) throw err.error;
  [S.staff, S.types, S.steps, S.ringi, S.route, S.log, S.notices, S.depts, S.posts] = res.map(r => r.data || []);
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
  $('#bell').innerHTML = `お知らせ${unread ? `<span class="badge">${unread}</span>` : ''}`;
}

// ---------------------------------------------------------------- ログイン
function loginView(msg) {
  $('#bar').hidden = true; $('#navbar').hidden = true; $('#notes').hidden = true;
  $('#view').innerHTML = `<section class="card login"><h1 style="margin-bottom:6px">ログイン</h1>
  <p class="small muted" style="margin:0 0 14px">お試し用に配られたログイン名とパスワードを入れてください。</p>
  ${msg ? `<div class="errnote" style="margin-bottom:12px">${esc(msg)}</div>` : ''}
  <form id="lf">
    <label class="f">ログイン名<input id="lfUser" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="例：nakamura" required></label>
    <label class="f">パスワード<input id="lfPw" type="password" autocomplete="current-password" required></label>
    <button class="btn primary" type="submit">ログインする</button>
  </form></section>`;
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
  if (r.status === 'no') return '<span class="pill bad">却下</span>';
  const c = cur(r);
  return `<span class="pill wait">${esc(c ? c.label : '')}の確認待ち</span>`;
}
function rows(list, empty) {
  if (!list.length) return `<p class="muted" style="margin:0">${empty}</p>`;
  return `<div class="list">${list.map(r => `<div class="li click" data-open="${r.id}"><div class="main"><b>${esc(r.title)}</b>
    <div class="sub">${no(r)}・${esc(r.type_name)}・${esc(P(r.owner_id).name)}（${esc(P(r.owner_id).dept)}）・${fmtDay(r.created_at)}${r.filer_id !== r.owner_id ? `・${esc(P(r.filer_id).name)}が代わりに起案` : ''}</div></div>
    ${r.amount != null && T(r.type_id)?.use_amount ? `<span class="amt num">${yen(r.amount)}</span>` : ''}${pill(r)}</div>`).join('')}</div>`;
}

const NAV = () => {
  const n = [['home', 'ホーム'], ['new', '起案する'], ['wait', '承認待ち'], ['list', '関わった稟議'], ['org', '組織図']];
  if (S.me.is_soumu) n.push(['all', '全体の一覧'], ['admin', '管理画面']);
  return n;
};

function render() {
  if (!S.me) return;
  $('#bar').hidden = false; $('#navbar').hidden = false;
  $('#me').innerHTML = `<b>${esc(S.me.name)}</b>${esc(S.me.dept)}・${esc(titleOf(S.me))}`;
  renderBell();
  const w = waitingForMe().length;
  $('#nav').innerHTML = NAV().map(([k, l]) => `<button type="button" data-nav="${k}" ${S.view === k && !S.open ? 'aria-current="page"' : ''}>${l}${k === 'wait' && w ? `<span class="badge">${w}</span>` : ''}</button>`).join('');
  renderNotes();
  const r = S.open ? R(S.open) : null;
  $('#view').innerHTML = r ? detail(r) : (VIEWS[S.view] || VIEWS.home)();
  if ($('#nf')) updateForm(true);
}

function renderNotes() {
  const box = $('#notes'); box.hidden = !S.notesOpen;
  if (!S.notesOpen) return;
  const ns = S.notices.slice(0, 30);
  box.innerHTML = `<div class="row between"><h2 style="margin:0">お知らせ</h2><div class="row">
    ${S.notices.some(n => !n.is_read) ? '<button class="btn sm" type="button" data-a="readAll">すべて読んだことにする</button>' : ''}
    <button class="btn sm" type="button" data-a="closeNotes">閉じる</button></div></div>
  <p class="small muted" style="margin:2px 0 6px">本番では、スマホにも同じ知らせが届くようにできます（お試し版ではこの画面だけ）。</p>
  <div class="list">${ns.length ? ns.map(n => `<div class="li ${n.ringi_id ? 'click' : ''}" ${n.ringi_id ? `data-open="${n.ringi_id}"` : ''}><div class="main"><b>${esc(n.text)}</b><div class="sub">${fmtAt(n.at)}</div></div>${n.is_read ? '' : '<span class="pill info">新着</span>'}</div>`).join('') : '<p class="muted">お知らせはありません。</p>'}</div>`;
}

// ---------------------------------------------------------------- それぞれの画面
const VIEWS = {};

VIEWS.home = function () {
  const mine = S.ringi.filter(r => r.owner_id === S.me.id || r.filer_id === S.me.id);
  const back = mine.filter(r => r.status === 'back');
  const w = waitingForMe();
  return `
  ${guide(`スマホやパソコンで開く最初の画面です。<b>自分が出した稟議・申請がいまどこまで進んでいるか</b>が一目で分かります。紙のように「いま誰の机にあるか」を探す必要がなくなります。`)}
  ${w.length ? `<section class="card"><div class="row between"><div><b>あなたの印を待っている稟議・申請が ${w.length}件 あります。</b></div><button class="btn primary" type="button" data-nav="wait">承認待ちを見る</button></div></section>` : ''}
  ${back.map(r => `<section class="card"><div class="backnote"><b>差し戻されています：</b>${esc(r.title)}<br>${esc(P(r.last_by).name)}さんより「${esc(r.last_comment)}」</div><div class="row" style="margin-top:10px"><button class="btn primary" type="button" data-open="${r.id}">中身を見て直す</button></div></section>`).join('')}
  <section class="card"><div class="row between" style="margin-bottom:6px"><h2 style="margin:0">自分の稟議・申請</h2><button class="btn primary" type="button" data-nav="new">＋ 起案する</button></div>
  ${rows(mine, 'まだありません。「起案する」から出してみてください。')}</section>
  ${howTo()}`;
};

function howTo() {
  const steps = [
    '<b>職員の中村さん</b>（<code>nakamura</code>）で入り、「起案する」から<b>物品購入</b>を出す。金額を10万円より下げると<b>院長の段が外れる</b>のを見る',
    '<b>井上師長</b>（<code>inoue</code>）か<b>鈴木副師長</b>（<code>suzuki</code>）で入り、承認待ちから印を押す。<b>どちらか1人</b>が押せば次へ進む',
    '<b>森事務長</b>（<code>mori</code>）で入り、コメントを付けて<b>差し戻す</b>',
    'もう一度<b>中村さん</b>で入り、差し戻された稟議を<b>直して出し直す</b>（最初の段から回り直す）',
    '<b>小林さん</b>（<code>kobayashi</code>）で<b>有給休暇</b>や<b>遅刻・早退届</b>を出す。所属長のあと<b>総務の受付</b>（<code>aoki</code>）へ回る',
    '<b>総務の青木さん</b>（<code>aoki</code>）で入り、<b>親睦会（慶弔）を中村さんの代わりに起案</b>する。<b>管理画面</b>で回る順番や金額の条件を変えてみる',
    '<b>総務の青木さん</b>で「組織図」を開き、<b>3階東病棟の井上師長のカードを、1階病棟の看護師長の席へ動かす</b>（2人が入れ替わる）。確定の前に、担当が変わる稟議の一覧を見る。1階病棟の清水さんの「点滴スタンドの購入」が、斎藤師長から井上師長に移るのを見る（<code>inoue</code> で入ると承認待ちに出る）',
  ];
  return `<section class="card"><div class="row between"><h2 style="margin:0">試し方の例（15分ほど）</h2><button class="btn sm" type="button" data-a="how">${S.showHow ? '閉じる' : '開く'}</button></div>
  ${S.showHow ? `<ol class="steps" style="margin-top:12px">${steps.map(s => `<li><div>${s}</div></li>`).join('')}</ol>
  <p class="small muted" style="margin:12px 0 0">人を変えるときは、右上の「ログアウト」から入り直します。何人かで同じ人に入っても大丈夫です。</p>` : ''}</section>`;
}

VIEWS.list = function () {
  const id = S.me.id;
  const list = S.ringi.filter(r => r.owner_id === id || r.filer_id === id || routeOf(r.id).some(x => x.approver_ids.includes(id) || x.stamped_by === id));
  return `${guide('自分が出したものと、自分が印を押す順番に入っているものの一覧です。押すと承認印の様子と、やり取りの記録が見られます。')}
  <section class="card"><h2>関わった稟議・申請</h2>${rows(list, 'まだありません。')}</section>`;
};

VIEWS.wait = function () {
  const list = waitingForMe();
  return `${guide('あなたの印を待っているものだけが並びます。<b>同じ段に何人かいるときは、どなたか1人</b>が押せば次へ進みます（例：師長か副師長のどちらか）。')}
  <section class="card"><h2>${esc(S.me.name)} さんの承認待ち（${list.length}件）</h2>${rows(list, 'いま承認待ちはありません。')}</section>`;
};

VIEWS.all = function () {
  if (!S.me.is_soumu) return VIEWS.home();
  const f = S.filter;
  const match = (r, k) => k === 'all' || (k === 'wait' && r.status === 'wait') || (k === 'ok' && r.status === 'ok') || (k === 'back' && (r.status === 'back' || r.status === 'no'));
  const list = S.ringi.filter(r => match(r, f));
  return `${guide('総務は<b>病院全体の稟議・申請</b>を見られます。どこで止まっているかが分かるので、催促や台帳づくりの手間が減ります。')}
  <section class="card"><div class="row between" style="margin-bottom:8px"><h2 style="margin:0">全体の一覧</h2>
  <div class="filters">${[['all', 'すべて'], ['wait', '回っている途中'], ['ok', '決裁済み'], ['back', '差し戻し・却下']].map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${f === k}">${l}（${S.ringi.filter(r => match(r, k)).length}）</button>`).join('')}</div></div>
  ${rows(list, '当てはまるものはありません。')}</section>`;
};

// ---- 起案・出し直し
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
  <section class="card"><h1 style="margin-bottom:12px">${ed ? '直して出し直す' : '起案する'}</h1>
  <form class="form" id="nf" novalidate>
    <label class="f">種類<select id="nfType" ${ed ? 'disabled' : ''}>${types.map(x => `<option value="${x.id}" ${x.id === defType ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><span class="hint" id="nfDesc"></span></label>
    <label class="f" id="nfAmountWrap">金額（円）<input id="nfAmount" inputmode="numeric" value="${ed && ed.amount != null ? ed.amount : ''}" placeholder="例：98000"><span class="hint">お金がかからない場合は空のままで大丈夫です。</span></label>
    ${!ed && canProxy() ? `<label class="f wide" id="nfProxyWrap">代わりに起案する相手<select id="nfProxy"><option value="">（自分の分として出す）</option>${proxyTargets().map(s => `<option value="${s.id}">${esc(s.staff_no)}　${esc(s.name)}（${esc(s.dept)}）</option>`).join('')}</select><span class="hint">本人が出せないときだけ選びます。代わりに起案できる種類（親睦会など）のときだけ出ます。</span></label>` : ''}
    <div class="wide form" id="nfFields" style="gap:14px">${(t.fields || []).map(fd => fieldInput(fd, vals[fd.k])).join('')}</div>
    <div class="wide"><div class="small" style="font-weight:700;margin-bottom:6px">回る順番</div><div id="nfProxyNote"></div><div class="route" id="nfRoute"></div><div class="small muted" id="nfRouteNote" style="margin-top:6px"></div></div>
    <label class="f wide"><span>件名<span class="req">必須</span></span><input id="nfTitle" value="${esc(ed ? ed.title : '')}" placeholder="例：鉛筆の購入"></label>
    <label class="f wide"><span id="nfBodyLabel">内容</span><textarea id="nfBody" rows="3">${esc(ed ? ed.body : '')}</textarea></label>
    <div class="wide row"><button class="btn primary" type="submit">${ed ? '直した内容で出し直す' : 'この内容で起案する'}</button>${ed ? `<button class="btn" type="button" data-open="${ed.id}">やめる</button>` : ''}</div>
  </form></section>`;
};

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

async function submitForm() {
  const { ed, t, amount, owner, details } = formState();
  const title = $('#nfTitle').value.trim(), body = $('#nfBody').value.trim();
  const miss = (t.fields || []).filter(fd => fd.required && !details.find(d => d.k === fd.k));
  if (miss.length) { toast(`「${miss[0].label}」を入れてください`); $(`#fd_${miss[0].k}`)?.focus(); return; }
  if (!title) { toast('件名を入れてください'); $('#nfTitle').focus(); return; }
  if (ed) {
    const ok = await rpc('resubmit_ringi', { p_id: ed.id, p_title: title, p_body: body, p_amount: amount, p_details: details }, '出し直しました。最初の段から回り直します');
    if (ok) { S.edit = null; S.open = ed.id; render(); window.scrollTo({ top: 0 }); }
    return;
  }
  const args = { p_type: t.id, p_title: title, p_body: body, p_amount: amount, p_details: details };
  if (owner !== S.me.id) args.p_owner = owner;
  const ok = await rpc('submit_ringi', args, id => {
    const c = routeOf(id)[0];
    return c ? `起案しました。${c.label}（${names(c.approver_ids)}）にお知らせが届きます` : '起案しました。回る段がないため、そのまま決裁になりました';
  });
  if (ok) { S.open = ok.data; S.titleTouched = false; render(); window.scrollTo({ top: 0 }); }
}

// ---- くわしく見る
function detail(r) {
  const route = routeOf(r.id);
  const c = cur(r);
  const mine = myTurn(r);
  const isOwner = r.owner_id === S.me.id || r.filer_id === S.me.id;
  const t = T(r.type_id);
  let action = '';
  if (mine) {
    action = `<section class="card"><h2>あなたの番です（${esc(c.label)}として）</h2>
    ${c.approver_ids.length > 1 ? `<p class="small muted" style="margin:-4px 0 8px">この段は ${esc(names(c.approver_ids))} のどなたか1人が承認すると次へ進みます。</p>` : ''}
    <label class="f">コメント<span class="hint">承認のときはなくても大丈夫です。差し戻し・却下のときは理由を書いてください。</span><textarea id="cm" rows="2" placeholder="例：見積りを2社分そろえてください"></textarea></label>
    <div class="row" style="margin-top:10px"><button class="btn ok" type="button" data-a="approve" data-id="${r.id}">承認する</button><button class="btn warn" type="button" data-a="back" data-id="${r.id}">差し戻す（直して出し直してもらう）</button><button class="btn bad" type="button" data-a="reject" data-id="${r.id}">却下する</button></div></section>`;
  } else if (c) {
    action = `<section class="card"><p style="margin:0">いまは<b>${esc(c.label)}</b>（${esc(names(c.approver_ids))}）の番です。${route.some(x => x.approver_ids.includes(S.me.id) && x.step_no > r.stage) ? 'あなたの番はこのあとです。' : ''}</p></section>`;
  } else if (r.status === 'back' && isOwner) {
    action = `<section class="card"><div class="backnote"><b>${esc(P(r.last_by).name)}さんから差し戻されました。</b><br>「${esc(r.last_comment)}」</div><div class="row" style="margin-top:10px"><button class="btn primary" type="button" data-a="edit" data-id="${r.id}">直して出し直す</button></div></section>`;
  } else if (r.status === 'back') {
    action = `<section class="card"><div class="backnote">起案した人（${esc(P(r.owner_id).name)}さん）が直して出し直すのを待っています。<br>理由：「${esc(r.last_comment)}」</div></section>`;
  } else if (r.status === 'no') {
    action = `<section class="card"><div class="errnote">${esc(P(r.last_by).name)}さんが却下しました。<br>理由：「${esc(r.last_comment)}」</div></section>`;
  }
  const details = r.details || [];
  return `
  <div><button class="btn link" type="button" data-a="back2list">← 戻る</button></div>
  ${guide(r.status === 'ok' ? 'すべての印がそろい、決裁が終わったものです。<b>やり取りの記録</b>に、誰がいつ押したかが残ります。' : c ? '紙の稟議書と同じ承認欄です。印が押されると、次の人に<b>自動でお知らせが届きます</b>。' : '差し戻されたものは、起案した人が直して出し直すと<b>最初の段から回り直します</b>。')}
  <section class="card">
    <div class="row between"><h1>${esc(r.title)}</h1>${pill(r)}</div>
    <div class="small muted" style="margin-top:4px">${no(r)}・${esc(r.type_name)}・起案 ${esc(P(r.owner_id).name)}（${esc(P(r.owner_id).dept)}）・${fmtAt(r.created_at)}${r.filer_id !== r.owner_id ? `<br>${esc(P(r.filer_id).name)}（${esc(P(r.filer_id).dept)}${P(r.filer_id).post_title ? '・' + esc(P(r.filer_id).post_title) : ''}）が代わりに起案` : ''}</div>
    ${r.amount != null && t?.use_amount ? `<div style="font-size:22px;font-weight:700;margin:8px 0" class="num">${yen(r.amount)}</div>` : '<div style="height:8px"></div>'}
    ${details.length ? `<dl class="kv">${details.map(d => `<dt>${esc(d.label)}</dt><dd>${esc(/^\d{4}-\d{2}-\d{2}$/.test(d.value) ? md(d.value) : d.value)}</dd>`).join('')}</dl>` : ''}
    ${r.body ? `<p style="margin:8px 0 0;white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.body)}</p>` : ''}
  </section>
  <section class="card"><h2>承認欄</h2>
    ${route.length ? `<div class="stamps">${route.map((s, i) => `<div><div class="hd">${esc(s.label)}</div><div class="bx ${c && i === r.stage ? 'now' : ''}">${s.stamped_by ? `<div class="hanko"><span class="n">${esc(P(s.stamped_by).name.split(' ')[0])}</span><span class="d">${fmtDay(s.stamped_at)}</span><span style="font-size:10px">承認</span></div>` : (c && i === r.stage ? '承認待ち<br>いまの番' : (r.status === 'back' || r.status === 'no') && i === r.stage ? (r.status === 'back' ? '差し戻し' : '却下') : '順番待ち')}</div><div class="ft">${esc(names(s.approver_ids))}${s.approver_ids.length > 1 ? '<br>（どなたか1人）' : ''}</div></div>`).join('')}</div>` : '<p class="muted" style="margin:0">回る段がないため、出したときにそのまま決裁になりました。</p>'}
  </section>
  ${action}
  <section class="card"><h2>やり取りの記録</h2><div class="timeline">
    ${logOf(r.id).map(l => `<div><span class="muted num">${fmtAt(l.at)}</span>　${esc(l.text)}${l.comment ? `<br><span class="c">「${esc(l.comment)}」</span>` : ''}</div>`).join('')}
    ${c ? `<div class="muted">${esc(c.label)}の確認待ち（${esc(names(c.approver_ids))}）</div>` : ''}
  </div></section>`;
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
  return { id: t.id, name: t.name, description: t.description, allow_proxy: t.allow_proxy, in_use: t.in_use,
    steps: stepsOf(t.id).map(s => ({ label: s.label, use_boss: s.use_boss, use_soumu: s.use_soumu, posts: [...s.posts], min_amount: s.min_amount })) };
}
function readDraft() {
  const d = S.draft; if (!d || !$('#adm')) return;
  d.name = $('#adName').value; d.description = $('#adDesc').value; d.allow_proxy = $('#adProxy').checked; d.in_use = $('#adUse').checked;
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
function go(v) { S.view = v; S.open = null; S.edit = null; S.notesOpen = false; S.titleTouched = false; render(); window.scrollTo({ top: 0 }); }
function openR(id) {
  S.open = +id; S.edit = null; S.notesOpen = false;
  if (S.notices.some(n => n.ringi_id === +id && !n.is_read)) {
    S.notices.forEach(n => { if (n.ringi_id === +id) n.is_read = true; });
    sb.rpc('read_notices', { p_ringi: +id }).then(() => {});
  }
  render(); window.scrollTo({ top: 0 });
}

document.addEventListener('click', async e => {
  if (S.orgPick && !e.target.closest('.pcard')) {
    const spot = e.target.closest('[data-drop]');
    if (spot) { orgDrop(S.orgPick.person, parseSpot(S.orgPick.from), parseSpot(spot.dataset.drop)); return; }
  }
  const t = e.target.closest('button,[data-open],[data-a],[data-nav]'); if (!t || t.disabled) return;
  const d = t.dataset;
  if (t.id === 'logout') { await sb.auth.signOut(); S.me = null; loginView(); return; }
  if (t.id === 'bell') { S.notesOpen = !S.notesOpen; renderNotes(); return; }
  if (d.nav) { go(d.nav); return; }
  if (d.filter) { S.filter = d.filter; render(); return; }
  if (d.open) { openR(d.open); return; }
  const a = d.a; const r = d.id && !['selType'].includes(a) ? R(+d.id) : null;
  if (a === 'how') { S.showHow = !S.showHow; render(); return; }
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
  if (a === 'edit') { S.edit = r.id; S.open = null; S.view = 'new'; S.titleTouched = true; render(); window.scrollTo({ top: 0 }); return; }
  // 管理画面
  if (a === 'selType') { S.adminSel = +d.id; S.draft = draftFrom(T(+d.id)); render(); setTimeout(() => $('#adm')?.scrollIntoView({ behavior: 'smooth' }), 0); return; }
  if (a === 'addType') { S.adminSel = null; S.draft = { id: null, name: '新しい種類', description: '', allow_proxy: false, in_use: true, steps: [{ label: '所属長', use_boss: true, use_soumu: false, posts: [], min_amount: null }, { label: '事務長', use_boss: false, use_soumu: false, posts: S.posts.filter(p => p.name === '事務長').map(p => p.id), min_amount: null }] }; render(); setTimeout(() => $('#adm')?.scrollIntoView({ behavior: 'smooth' }), 0); return; }
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
    const ok = await rpc('save_type', { p_id: dr.id, p_name: dr.name, p_description: dr.description, p_allow_proxy: dr.allow_proxy, p_in_use: dr.in_use, p_steps: dr.steps }, '保存しました。これから出すものから新しい順番で回ります');
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
  if (e.target.id === 'nfType') { S.newType = +e.target.value; S.titleTouched = false; const keepBody = $('#nfBody').value; render(); $('#nfBody').value = keepBody; return; }
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
