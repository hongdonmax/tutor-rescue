/* ===================== 공유 광장 (내 튜터 수첩) ===================== */
const KIND_LABEL = {word: "체크인", oath: "사명 선언", plan: "지원 계획", ticket: "장애 접수 티켓", line: "좋은 대응 문장", class: "에듀원 클래스", free: "자유 메모"};

function renderNote() {
  const el = $("#scr-note");
  const pad = padletUrl();
  const mineN = STATE.posts.filter(p => !p.example).length;
  el.innerHTML = `<div class="page-hero" style="background-image:url('assets/bg/plaza.webp')"><div class="z-in">
      <div><button class="z-back" type="button" data-go="map">← 스마트스쿨 지도</button>
        <div class="z-kick">SHARE PLAZA · 공유 광장</div><h1 class="z-title">내 산출물 ${mineN}개</h1>
        <p style="margin:0;color:#DDE3FF;max-width:600px">미션에서 만든 체크인 단어·사명 선언·지원 계획·장애 티켓·좋은 대응 문장·에듀원 클래스가 여기 모여요. <b style="color:var(--gold)">공유 글 복사 → 패들렛에 붙여 넣기</b>로 동료와 나눠요.</p>
        <div class="share-tools">${pad ? `<a class="gbtn" href="${esc(pad)}" target="_blank" rel="noopener">오늘의 패들렛 열기 ↗</a>` : `<span class="hchip">강사님이 패들렛 주소를 알려 주면 여기 버튼이 생겨요</span>`}<a class="gbtn sky" href="${esc(CFG.eduoneUrl)}" target="_blank" rel="noopener">에듀원 2.0 열기 ↗</a><button class="gbtn ghost" type="button" id="nCopyAll">내 산출물 전체 복사</button></div>
      </div>
      <div class="z-side"><div class="bubble">좋은 문장은 <b>복사해서 패들렛</b>에! 동료의 글에는 하트와 댓글로 응원해 주세요.</div><img src="${naraeImg("narae_wave")}" alt=""></div>
    </div></div>
    <div class="note-body">
      <div class="boardbar"><h2 class="display" style="font-size:26px;margin:0">튜터 수첩</h2>
        <div class="seg" role="group" aria-label="차시 거르기">${[["all", "전체"], ["s1", "1차시"], ["s2", "2차시"], ["s4", "4차시"]].map(([k, n]) => `<button type="button" data-f="${k}" aria-pressed="${STATE.boardFilter === k}">${n}</button>`).join("")}</div>
        <button class="btn sm" id="bProj" type="button" aria-pressed="${STATE.proj}">${STATE.proj ? "크게 보기 끄기" : "크게 보기"}</button></div>
      <div class="compose" id="bCompose"><input class="input" id="bText" maxlength="300" placeholder="자유 메모: 체험해 본 사이트, 현장 팁, 질문 (링크는 https:// 로)"><button class="btn primary" id="bSend" type="button">수첩에 적기</button></div>
      <div id="bCloud"></div><div id="bWall"></div>
    </div>
    <footer class="gfoot"><span>수첩은 이 기기의 브라우저에만 저장돼요. 예시 카드는 연습용이에요.</span></footer>`;
  $$(".seg button", el).forEach(b => b.onclick = () => { STATE.boardFilter = b.dataset.f; $$(".seg button", el).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); renderBoardWall(); });
  $("#bProj", el).onclick = () => { STATE.proj = !STATE.proj; renderNote(); };
  const send = async () => {
    const v = $("#bText", el).value.trim(); if (!v) return;
    await BE.addPost({session: STATE.boardFilter === "all" ? "all" : STATE.boardFilter, mission: "free", kind: "free", text: v});
    $("#bText", el).value = ""; toast("수첩에 적었어요"); renderNote();
  };
  $("#bSend", el).onclick = send; $("#bText", el).onkeydown = e => { if (e.key === "Enter" && !e.isComposing) send(); };
  $("#nCopyAll", el).onclick = () => { const mine = STATE.posts.filter(p => !p.example); if (!mine.length) { toast("아직 내 산출물이 없어요"); return; } copyText(mine.map(postShareText).join("\n\n")); };
  $(".note-body", el).classList.toggle("proj", STATE.proj);
  $("#bWall", el).addEventListener("click", onWallClick);
  renderBoardWall();
}

function filteredPosts() {
  const f = STATE.boardFilter;
  return STATE.posts.filter(p => f === "all" || p.session === f || p.session === "all").sort((a, b) => (a.example ? 1 : 0) - (b.example ? 1 : 0) || b.ts - a.ts);
}

function renderBoardWall() {
  const wall = $("#bWall"), cloud = $("#bCloud"); if (!wall) return;
  const ps = filteredPosts();
  const words = ps.filter(p => p.kind === "word");
  const rest = ps.filter(p => p.kind !== "word");
  if (words.length) {
    const groups = {};
    words.forEach(w => (groups[w.mission] = groups[w.mission] || []).push(w));
    cloud.innerHTML = Object.entries(groups).map(([mid, arr]) => { const m = MISSIONS.find(x => x.id === mid); const mine = arr.filter(a => !a.example); return `<div class="panel" style="margin-bottom:12px"><div class="row" style="align-items:center"><b>${esc(m ? m.prompt : "체크인")}</b>${mine.length ? `<button class="btn sm" type="button" data-copy="${esc(mine[0].id)}" style="margin-left:auto">내 단어 복사</button>` : ""}</div>${cloudHTML(arr)}</div>`; }).join("");
  } else cloud.innerHTML = "";
  if (!rest.length) { wall.innerHTML = words.length ? "" : `<div class="empty"><b>아직 담긴 산출물이 없어요</b>미션을 하면 결과가 여기 카드로 모여요.</div>`; return; }
  wall.innerHTML = `<div class="wall">${rest.map(postHTML).join("")}</div>`;
}

function postHTML(p) {
  const x = p.extra || {};
  const head = `<div class="ph"><span class="who">${esc(p.nick)}</span>${p.team && p.team !== "0" ? `<span class="team">${esc(p.team)}조</span>` : ""}${p.example ? '<span class="ex">예시</span>' : ""}<span class="kind">${esc(KIND_LABEL[p.kind] || p.kind)}${p.session && p.session !== "all" && SESSIONS[p.session] ? " · " + SESSIONS[p.session].no + "차시" : ""}</span></div>`;
  const foot = `<div class="pf"><button class="like" type="button" data-like="${esc(p.id)}" aria-pressed="${!!STATE.liked[p.id]}">♥ <span class="tnum">${p.likes || 0}</span></button>
    <button class="btn sm" type="button" data-copy="${esc(p.id)}">공유 글 복사</button>${!p.example ? `<button class="btn sm" type="button" data-del="${esc(p.id)}" style="margin-left:auto">지우기</button>` : ""}</div>`;
  let body = "";
  if (p.kind === "oath") return `<article class="post oathpost ${p.example ? "example" : ""}">${head}<div class="mono" style="font-size:11px;letter-spacing:.14em;color:var(--orange)">나는 ${esc(x.role || "연결자")}입니다</div><div class="pt" style="font-size:16.5px;font-weight:500">${esc(p.text)}</div>${foot}</article>`;
  if (p.kind === "plan") {
    body = `<div class="display" style="font-size:21px">${esc(p.text)}</div>${x.level ? `<span class="muted" style="font-size:12px">${esc(x.level)}</span>` : ""}
      ${PLAN_SECTIONS.map(s => x[s.k] ? `<div class="sec"><b>${esc(s.n)}</b>${esc(x[s.k])}</div>` : "").join("")}
      ${rateHTML(p)}`;
  } else if (p.kind === "ticket") {
    body = `<div class="row" style="gap:6px"><span class="mcode">${esc(x.tno || "TICKET")}</span><span class="team" style="background:var(--navy-soft);color:var(--navy)">${esc(x.type || "")}</span></div><div class="pt mono" style="font-size:13px;margin-top:6px">${esc(p.text)}</div>`;
  } else if (p.kind === "line") {
    const per = PERSONAS.find(q => q.name === x.persona);
    body = `<div class="row" style="gap:8px;align-items:center">${per ? avatarIMG(per, 80, 40) : ""}<span class="muted" style="font-size:12.5px;font-weight:700">${esc(x.persona || "")}${x.role ? " (" + esc(x.role) + ")" : ""}에게</span></div><div class="pt" style="font-size:16.5px;border-left:3px solid var(--orange);padding-left:10px;margin-top:6px">“${esc(p.text)}”</div>${x.gauge != null ? `<div class="muted" style="font-size:12px;margin-top:4px">게이지 ${esc(x.gauge)}</div>` : ""}`;
  } else if (p.kind === "class") {
    body = `<div class="display" style="font-size:21px">${esc(x.name || "")}</div>${(x.types || []).length ? `<div class="chips" style="margin-top:6px">${x.types.map(t => `<span class="schip" style="cursor:default">${esc(t)}</span>`).join("")}</div>` : ""}${p.text ? `<div class="pt" style="margin-top:8px">${esc(p.text)}</div>` : ""}<div class="muted" style="font-size:12px;margin-top:4px">제작 체크 ${esc(x.steps || 0)}/4</div>`;
  } else {
    body = `<div class="pt">${linkify(p.text)}</div>`;
  }
  return `<article class="post ${p.example ? "example" : ""}">${head}${body}${foot}</article>`;
}

function linkify(t) { return esc(t).replace(/(https:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`); }

function rateHTML(p) {
  const my = RATE_DRAFT[p.id] || STATE.myRates[p.id] || {};
  return `<div class="stars" data-rate="${esc(p.id)}"><div class="muted" style="font-size:12.5px;font-weight:700;margin-bottom:4px">루브릭 셀프 점검 (패들렛에서는 동료가 별점·댓글)</div>${RUBRIC.map(r => `<div class="sr"><span>${r.n}</span>${[1, 2, 3, 4, 5].map(v => `<button class="star ${my[r.k] >= v ? "on" : ""}" type="button" data-k="${r.k}" data-v="${v}" aria-label="${r.n} ${v}점">★</button>`).join("")}</div>`).join("")}
    <div class="row" style="gap:8px"><button class="btn sm" type="button" data-send="${esc(p.id)}">점검 저장</button></div></div>`;
}

const RATE_DRAFT = {};
function onWallClick(e) {
  const like = e.target.closest("[data-like]");
  if (like) { const p = STATE.posts.find(x => x.id === like.dataset.like); if (p && !STATE.liked[p.id]) { BE.like(p); like.setAttribute("aria-pressed", "true"); like.querySelector("span").textContent = p.likes || 0; } return; }
  const del = e.target.closest("[data-del]");
  if (del) {
    if (!del.dataset.sure) { del.dataset.sure = "1"; del.textContent = "한 번 더 누르면 지워요"; return; }
    const p = STATE.posts.find(x => x.id === del.dataset.del); if (p) { BE.remove(p); renderBoardWall(); } return;
  }
  const star = e.target.closest(".star");
  if (star) {
    const box = star.closest("[data-rate]"); const id = box.dataset.rate;
    const d = RATE_DRAFT[id] || (RATE_DRAFT[id] = Object.assign({}, STATE.myRates[id] || {}));
    d[star.dataset.k] = +star.dataset.v;
    $$(".star", box).forEach(s => s.classList.toggle("on", (d[s.dataset.k] || 0) >= +s.dataset.v));
    return;
  }
  const send = e.target.closest("[data-send]");
  if (send) {
    const id = send.dataset.send; const d = RATE_DRAFT[id];
    if (!d || RUBRIC.some(r => !d[r.k])) { toast("5개 루브릭을 모두 골라 주세요"); return; }
    const p = STATE.posts.find(x => x.id === id); if (!p) return;
    BE.rate(p, Object.assign({}, d)).then(() => toast("셀프 점검을 저장했어요"));
  }
}
