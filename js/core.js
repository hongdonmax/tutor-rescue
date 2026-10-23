/* ===================== 공통 유틸 ===================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function josa(w, withFinal, noFinal) {
  const c = String(w).trim().slice(-1).charCodeAt(0);
  if (!(c >= 0xAC00 && c <= 0xD7A3)) return withFinal + "(" + noFinal + ")";
  return (c - 0xAC00) % 28 ? withFinal : noFinal;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CFG = Object.assign({padletUrl: "", eduoneUrl: "https://eduone.busanedu.net", teacherCode: "2026", courseName: "2026 부산 디지털튜터 양성센터 지역특화과정"}, window.TR_CONFIG || {});

// 진행 기록은 이 브라우저(localStorage)에만 저장 — 막힌 브라우저에서도 게임은 계속된다
const store = {
  get(k, d) { try { const v = localStorage.getItem("tr." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("tr." + k, JSON.stringify(v)); } catch (e) {} }
};

function toast(msg, ms = 2400) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("복사했어요. 패들렛에 붙여 넣으세요"); return true; }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {}
    ta.remove(); toast(ok ? "복사했어요. 패들렛에 붙여 넣으세요" : "복사가 막혀 있어요. 글을 길게 눌러 직접 복사해 주세요"); return ok;
  }
}

/* ---------- 얼굴 ---------- */
function avatarSVG(color, gauge, size = 56) {
  const g = gauge == null ? 50 : gauge;
  const curve = g >= 70 ? 7 : g >= 40 ? 1 : -6;
  const brow = g < 40 ? `<path d="M19 21 l7 2 M45 21 l-7 2" stroke="#1b1b2f" stroke-width="2.4" stroke-linecap="round"/>` : "";
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="31" fill="${color}"/><circle cx="32" cy="34" r="20" fill="#FFE1C7"/>
    <path d="M12 30 Q32 4 52 30 Q44 18 32 18 Q20 18 12 30Z" fill="#2b2140"/>${brow}
    <circle cx="25" cy="31" r="2.6" fill="#1b1b2f"/><circle cx="39" cy="31" r="2.6" fill="#1b1b2f"/>
    <path d="M24 ${43 - curve / 2} Q32 ${43 + curve} 40 ${43 - curve / 2}" stroke="#1b1b2f" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
}
function avatarIMG(p, gauge, size = 56) {
  const a = PEOPLE_ART[p.id];
  if (!a) return avatarSVG(p.color || "#6FD3FF", gauge, size);
  const g = gauge == null ? p.start : gauge;
  return `<span class="ava" style="--s:${size}px;--c:${p.color || "#6FD3FF"}"><img src="assets/people/${g >= 60 ? a[1] : a[0]}.webp" alt="${esc(p.name)}" loading="lazy"></span>`;
}
const naraeImg = (k) => `assets/char/${k || "narae_wave"}.webp`;
const iconImg = (kind) => `assets/icons/${ICONS[kind] || "question"}.webp`;

/* ===================== 상태 ===================== */
const STATE = {
  me: store.get("me", null),
  clientId: store.get("cid", null) || (() => { const c = uid(); store.set("cid", c); return c; })(),
  progress: store.get("progress", {}),
  view: "title",
  zone: null,
  posts: [],
  scores: [],
  liked: store.get("liked", {}),
  myRates: store.get("rates", {}),
  admin: false,
  boardFilter: "all",
  proj: false
};
function saveProgress() { store.set("progress", STATE.progress); }
function xp() { return Object.values(STATE.progress).reduce((s, p) => s + (p.best || 0), 0); }
function doneCount(sid) { return MISSIONS.filter(m => (!sid || m.s === sid) && STATE.progress[m.id] && STATE.progress[m.id].done).length; }
function padletUrl() { return store.get("padlet", "") || CFG.padletUrl; }

/* ===================== 저장소 (백엔드 없음) =====================
   모든 산출물은 ‘내 튜터 수첩’(이 브라우저)에 모이고,
   공유는 복사 → 패들렛 붙여넣기로 한다.                         */
const BE = {
  mode: "local", ai: false, listeners: [],
  emit() { this.listeners.forEach(f => { try { f(STATE.posts); } catch (e) {} }); },
  onPosts(f) { this.listeners.push(f); },
  offPosts(f) { this.listeners = this.listeners.filter(x => x !== f); },
  load() { const posts = store.get("posts", null); STATE.posts = (posts || []).concat(EXAMPLE_POSTS.map(p => Object.assign({}, p))); this.emit(); },
  save() { store.set("posts", STATE.posts.filter(p => !p.example)); },
  async addPost(p) {
    const post = Object.assign({id: uid(), ts: Date.now(), nick: STATE.me ? STATE.me.nick : "튜터", team: STATE.me ? STATE.me.team : "0", cid: STATE.clientId, likes: 0, rateN: 0, rateSum: {a: 0, b: 0, c: 0, d: 0, e: 0}}, p);
    STATE.posts.unshift(post); this.save(); this.emit();
    if (CUR) CUR.post = post;
    return post;
  },
  async like(post) { if (STATE.liked[post.id]) return; STATE.liked[post.id] = 1; store.set("liked", STATE.liked); post.likes = (post.likes || 0) + 1; this.save(); this.emit(); },
  async rate(post, scores) {
    const prev = STATE.myRates[post.id]; STATE.myRates[post.id] = scores; store.set("rates", STATE.myRates);
    if (!prev) post.rateN = (post.rateN || 0) + 1;
    RUBRIC.forEach(k => { post.rateSum[k.k] = (post.rateSum[k.k] || 0) - (prev ? prev[k.k] || 0 : 0) + (scores[k.k] || 0); });
    this.save(); this.emit();
  },
  async remove(post) { STATE.posts = STATE.posts.filter(p => p.id !== post.id); this.save(); this.emit(); },
  async addScore() {},
  async ask() { throw new Error("이 버전은 선택지 대화로 연습해요"); }
};

function parseJSON(text) {
  if (!text) return null;
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; }
}

const EXAMPLE_POSTS = [
  {id: "ex1", example: true, ts: Date.now() - 600000, session: "s1", mission: "m1-0", kind: "word", nick: "예시", team: "0", text: "통역사", likes: 3},
  {id: "ex1b", example: true, ts: Date.now() - 590000, session: "s1", mission: "m1-0", kind: "word", nick: "예시", team: "0", text: "안전망", likes: 2},
  {id: "ex1c", example: true, ts: Date.now() - 580000, session: "s1", mission: "m1-0", kind: "word", nick: "예시", team: "0", text: "페이스메이커", likes: 1},
  {id: "ex2", example: true, ts: Date.now() - 500000, session: "s1", mission: "m1-5", kind: "oath", nick: "예시", team: "0", text: "나는 로그인 실패 상황에서 학생이 교사 설명을 놓치지 않는지를 먼저 확인하고, 학생 대신 비밀번호를 입력하지 않겠습니다.", extra: {role: "연결자"}, likes: 5},
  {id: "ex3", example: true, ts: Date.now() - 400000, session: "s2", mission: "m2-5", kind: "plan", nick: "예시", team: "0", text: "초등 24학급 · 1인 1태블릿", extra: {env: "초등 24학급, 3~6학년 1인 1태블릿, 교실 무선망, 주 사용: 패들렛·에듀원", risk: "저학년 계정 로그인, 제출 단계 미숙, 도움 요청을 못 하는 학생", strategy: "수업 전 5분 로그인 테스트, 조용한 근접 지원, 수업 후 5문장 기록", team: "담임과 수업 전 협의, 정보부장 주간 공유, 반복 장애는 테크센터", result: "이탈 학생 수·접속 지연 시간·도움 요청·반복 오류를 주간 기록"}, likes: 2, rateN: 0, rateSum: {a: 0, b: 0, c: 0, d: 0, e: 0}}
];

/* ===================== 미션 시트 ===================== */
let CUR = null;
function freshBody() { const old = $("#sheetBody"); const body = old.cloneNode(false); old.replaceWith(body); return body; }
function runCleanups() { if (CUR) { (CUR.timers || []).forEach(t => { clearInterval(t); clearTimeout(t); }); (CUR.cleanups || []).forEach(f => { try { f(); } catch (e) {} }); } }
function openMission(id) {
  const m = MISSIONS.find(x => x.id === id); if (!m) return;
  runCleanups();
  CUR = {m, timers: [], cleanups: [], post: null};
  $("#sheetCode").textContent = m.code;
  $("#sheetTitle").textContent = m.title;
  const body = freshBody(); body.scrollTop = 0;
  $("#sheet").hidden = false; document.body.style.overflow = "hidden";
  const api = {
    finish: (score, summary) => finishMission(m, score, summary),
    timer: (fn, ms) => { const t = setInterval(fn, ms); CUR.timers.push(t); return t; },
    later: (fn, ms) => { const t = setTimeout(fn, ms); CUR.timers.push(t); return t; },
    clear: () => { CUR.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); CUR.timers = []; },
    onPosts: (f) => { BE.onPosts(f); CUR.cleanups.push(() => BE.offPosts(f)); },
    onClose: (f) => { CUR.cleanups.push(f); }
  };
  const fn = GAMES[m.kind];
  try { fn(body, api, m); } catch (e) { body.innerHTML = `<div class="feedback bad">미션을 여는 중 문제가 생겼어요: ${esc(e.message)}</div>`; }
  setTimeout(() => $("#sheetClose").focus(), 30);
}
function closeMission() {
  runCleanups(); CUR = null;
  $("#sheet").hidden = true; document.body.style.overflow = "";
  refreshView();
}

function postShareText(p) {
  const x = p.extra || {};
  const who = `[${p.team && p.team !== "0" ? p.team + "조 " : ""}${p.nick}]`;
  if (p.kind === "plan") return `${who} 지원 계획 · ${p.text}${x.level ? " (" + x.level + ")" : ""}\n` + PLAN_SECTIONS.map(s => x[s.k] ? `- ${s.n}: ${x[s.k]}` : "").filter(Boolean).join("\n");
  if (p.kind === "oath") return `${who} 사명 선언 · 나는 ${x.role || "연결자"}입니다\n${p.text}`;
  if (p.kind === "ticket") return `${who} 장애 접수 티켓 ${x.tno || ""} (${x.type || ""})\n${p.text}`;
  if (p.kind === "line") return `${who} ${x.persona || ""}에게 한 좋은 대응 문장\n“${p.text}”`;
  if (p.kind === "class") return `${who} 에듀원 클래스 인증 · ${x.name || ""}\n자료: ${(x.types || []).join(", ") || "-"}\n${p.text || ""}`;
  if (p.kind === "word") { const m = MISSIONS.find(q => q.id === p.mission); return `${who} ${m ? m.prompt : "체크인"} → ${p.text}`; }
  return `${who} ${p.text}`;
}
// 패들렛 칸 번호 (튜터 출동! 공유 광장 패들렛의 섹션 순서)
function padletSlot(p) {
  if (p.kind === "word") return p.session === "s2" ? "④ 수업이 멈추는 순간" : "① 디지털 튜터는 ○○이다";
  if (p.kind === "line") return p.session === "s1" ? "② 좋은 대응 문장" : "⑨ 자유 공유";
  return {oath: "③ 나의 사명 선언", ticket: "⑤ 장애 접수 티켓", plan: "⑥ 우리 학교 지원 계획", class: "⑧ 나의 첫 클래스 인증"}[p.kind] || "⑨ 자유 공유";
}
function shareStripHTML(p) {
  const pad = padletUrl();
  return `<div class="share-strip"><button class="btn" type="button" data-copy="${esc(p.id)}">공유 글 복사</button>${pad ? `<a class="btn navy" href="${esc(pad)}" target="_blank" rel="noopener">패들렛 열기 ↗</a>` : ""}</div><p class="muted" style="text-align:center;margin:6px 0 0;font-size:13px">패들렛 <b style="color:var(--orange-ink)">${esc(padletSlot(p))}</b> 칸의 ＋를 눌러 붙여 넣어요.</p>`;
}
document.addEventListener("click", e => {
  const c = e.target.closest("[data-copy]"); if (!c) return;
  const p = STATE.posts.find(x => x.id === c.dataset.copy); if (p) copyText(postShareText(p));
});

function finishMission(m, score, summary) {
  const post = CUR && CUR.post;
  runCleanups(); CUR = {m, timers: [], cleanups: [], post: null};
  score = Math.round(clamp(score, 0, 100));
  const p = STATE.progress[m.id] || {best: 0, plays: 0};
  const first = !p.done;
  p.done = true; p.plays = (p.plays || 0) + 1; p.best = Math.max(p.best || 0, score);
  STATE.progress[m.id] = p; saveProgress();
  renderHud();
  const list = MISSIONS.filter(x => x.s === m.s);
  const idx = list.indexOf(m);
  const next = list.slice(idx + 1).find(x => !(STATE.progress[x.id] && STATE.progress[x.id].done)) || list.find(x => !(STATE.progress[x.id] && STATE.progress[x.id].done));
  const tier = score >= 90 ? "great" : score >= 60 ? "good" : "retry";
  const zoneDone = doneCount(m.s) === list.length;
  const body = freshBody();
  const res = document.createElement("div");
  res.className = "panel result pop";
  res.innerHTML = `<img class="narae" src="${naraeImg(tier === "retry" ? "narae_wow" : "narae_thumb")}" alt="">
    <div class="big tnum">${score}<small>점</small></div><h3>${esc(pick(NARAE_SAY[tier]))}</h3>
    <p class="muted">${first ? "미션 완료 도장이 찍혔어요!" : "최고 점수 " + p.best + "점"}${zoneDone ? ` · <b style="color:var(--ok)">${esc(ZONES[m.s].name)} 구역 도장 완성!</b>` : ""}</p>
    ${summary ? `<div class="sum">${summary}</div>` : ""}
    ${post ? `<div class="feedback info" style="text-align:left"><b>공유 광장에 담았어요.</b> 패들렛에 올려 동료와 나눠요.</div>${shareStripHTML(post)}` : ""}
    <div class="row" style="justify-content:center;margin-top:16px">
      <button class="btn" type="button" id="rAgain">다시 하기</button>
      ${next && next.id !== m.id ? `<button class="btn primary" type="button" id="rNext">다음 미션: ${esc(next.title)}</button>` : `<button class="btn primary" type="button" id="rCert">수료 무대 보기</button>`}
    </div>`;
  body.appendChild(res); body.scrollTop = 0;
  $("#rAgain").onclick = () => openMission(m.id);
  const n = $("#rNext"); if (n) n.onclick = () => openMission(next.id);
  const c = $("#rCert"); if (c) c.onclick = () => { closeMission(); go("cert"); };
  if (score >= 70) confetti();
}

function confetti() {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:200;width:100%;height:100%";
  document.body.appendChild(c);
  const ctx = c.getContext("2d"); const W = c.width = innerWidth, H = c.height = innerHeight;
  const cols = ["#F47B20", "#1F2A6B", "#6FD3FF", "#17845A", "#FFC94D"];
  const ps = Array.from({length: 130}, () => ({x: W / 2 + (Math.random() - .5) * 220, y: H * .35, vx: (Math.random() - .5) * 13, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 3, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6}));
  let f = 0;
  (function step() {
    ctx.clearRect(0, 0, W, H);
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
    if (++f < 110) requestAnimationFrame(step); else c.remove();
  })();
}

function openPlainSheet(code, title, html) {
  runCleanups(); CUR = {m: null, timers: [], cleanups: [], post: null};
  $("#sheetCode").textContent = code; $("#sheetTitle").textContent = title;
  const b = freshBody(); b.innerHTML = html; $("#sheet").hidden = false; document.body.style.overflow = "hidden";
  return b;
}
