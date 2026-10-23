/* ===================== 화면 전환 ===================== */
const SCREENS = ["title", "map", "zone", "note", "cert"];
function go(v, opts) {
  if (v !== "title" && !STATE.me) v = "title";
  const zone = ["s1", "s2", "s4"].includes(v) ? v : null;
  const scr = zone ? "zone" : v;
  STATE.view = v; STATE.zone = zone;
  SCREENS.forEach(s => { const el = $("#scr-" + s); if (el) el.hidden = s !== scr; });
  $("#hud").hidden = scr === "title";
  document.body.classList.toggle("world", scr === "title" || scr === "map");
  $$(".hnav button").forEach(b => b.setAttribute("aria-current", b.dataset.go === v ? "page" : "false"));
  try { history.replaceState(null, "", v === "title" ? location.pathname + location.search : "#" + v); } catch (e) {}
  if (scr === "title") renderTitle();
  if (scr === "map") renderMap();
  if (scr === "zone") renderZone(zone);
  if (scr === "note") renderNote();
  if (scr === "cert") renderCert();
  renderHud();
  if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
}
function refreshView() { if (STATE.view === "title") return; go(STATE.view, {keepScroll: true}); }

/* ---------- HUD ---------- */
function renderHud() {
  const m = STATE.me; const el = $("#hMe"); if (!el) return;
  el.innerHTML = m ? `<span style="display:inline-flex;gap:6px;flex-wrap:wrap"><button class="hchip" id="hEdit" type="button" title="이름·조 바꾸기">${esc(m.nick)} · ${esc(m.team)}조</button><span class="hchip st tnum" title="받은 도장">도장 ${doneCount()}/${MISSIONS.length}</span><span class="hchip xp tnum" title="미션 최고 점수 합">XP ${xp()}</span></span>` : "";
  const e = $("#hEdit"); if (e) e.onclick = () => go("title");
}

/* ---------- 타이틀 ---------- */
function renderTitle() {
  const m = STATE.me || {nick: "", team: ""};
  $("#tNick").value = m.nick || "";
  let team = m.team || "";
  $("#tTeam").innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button type="button" data-t="${n}" aria-pressed="${String(team) === String(n)}">${n}조</button>`).join("");
  $$("#tTeam button").forEach(b => b.onclick = () => { team = b.dataset.t; $$("#tTeam button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); });
  const d = doneCount();
  $("#tProg").textContent = STATE.me ? `이어서 하기 · 도장 ${d}/${MISSIONS.length}` : "";
  $("#tGo").textContent = STATE.me ? "이어서 출동" : "출동하기";
  $("#tForm").onsubmit = (ev) => {
    ev.preventDefault();
    const nick = $("#tNick").value.trim();
    if (!nick) { $("#tMsg").textContent = "튜터 이름을 적어 주세요."; $("#tNick").focus(); return; }
    if (!team) { $("#tMsg").textContent = "우리 조를 골라 주세요."; return; }
    STATE.me = {nick, team: String(team)}; store.set("me", STATE.me);
    $("#tMsg").textContent = "";
    go("map");
  };
}

/* ---------- 지도 ---------- */
function renderMap() {
  const pins = Object.entries(ZONES).map(([sid, z]) => {
    const n = MISSIONS.filter(m => m.s === sid).length, d = doneCount(sid);
    return `<button class="pin ${d === n ? "done" : ""}" type="button" data-go="${sid}" style="left:${z.x}%;top:${z.y}%" aria-label="${z.no}차시 ${esc(z.name)} — 도장 ${d}/${n}">
      <span class="lab"><span class="no">${z.no}</span><span class="nm">${esc(z.name)}</span><span class="pr tnum">${d}/${n}</span></span><span class="tail"></span><span class="dot"></span></button>`;
  }).join("") + Object.entries(PLACES).map(([k, p]) => `<button class="pin alt" type="button" data-go="${k}" style="left:${p.x}%;top:${p.y}%" aria-label="${esc(p.name)}">
      <span class="lab"><span class="no">${k === "note" ? "광" : "★"}</span><span class="nm">${esc(p.name)}</span></span><span class="tail"></span><span class="dot"></span></button>`).join("");
  $("#worldMap").innerHTML = pins;
  const total = doneCount(), all = MISSIONS.length;
  const nextZone = ["s1", "s2", "s4"].find(s => doneCount(s) < MISSIONS.filter(m => m.s === s).length);
  $("#mapBubble").innerHTML = total === 0
    ? `반가워요, <b>${esc(STATE.me.nick)}</b> 튜터님! 저는 선배 튜터 나래예요. 오늘 차시의 구역을 눌러 출동해 볼까요? 미션마다 도장이 찍히고, <b>21개</b>를 모으면 수료 무대가 열려요.`
    : total === all
      ? `도장 <b>${all}개</b> 완성! 이제 <b>수료 무대</b>에서 수료증을 받으세요. 정말 수고 많았어요!`
      : `지금까지 도장 <b>${total}개</b>! ${nextZone ? `다음은 <b>${ZONES[nextZone].no}차시 ${esc(ZONES[nextZone].name)}</b>에서 기다릴게요.` : ""} 만든 산출물은 <b>공유 광장</b>에서 패들렛으로 나눠요.`;
  $("#zcards").innerHTML = Object.entries(ZONES).map(([sid, z]) => {
    const S = SESSIONS[sid]; const n = MISSIONS.filter(m => m.s === sid).length, d = doneCount(sid);
    return `<button class="zcard" type="button" data-go="${sid}" style="background-image:url('${z.bg}')"><span class="k">${z.no}차시 · ${esc(z.name)}</span><h3>${esc(S.title)}</h3><p>미션 ${n}개 · 도장 ${d}/${n}</p><span class="bar"><i style="width:${Math.round(d / n * 100)}%"></i></span></button>`;
  }).join("") + `<button class="zcard" type="button" data-go="note" style="background-image:url('assets/bg/plaza.webp')"><span class="k">공유 광장</span><h3>산출물 모아 보기 · 패들렛 공유</h3><p>체크인 단어, 사명 선언, 지원 계획, 좋은 대응 문장</p></button>`;
}

/* ---------- 구역 ---------- */
function renderZone(sid) {
  const S = SESSIONS[sid], Z = ZONES[sid];
  const list = MISSIONS.filter(m => m.s === sid);
  const d = list.filter(m => STATE.progress[m.id] && STATE.progress[m.id].done).length;
  const el = $("#scr-zone");
  el.innerHTML = `<div class="z-hero" style="background-image:url('${Z.bg}')"><div class="z-in">
      <div>
        <button class="z-back" type="button" data-go="map">← 스마트스쿨 지도</button>
        <div class="z-kick">${Z.no}차시 · ${esc(Z.name)}</div>
        <h1 class="z-title">${esc(S.title)}</h1>
        <div class="z-flow">${S.flow.map((f, i) => `<span>${esc(f)}</span>${i < S.flow.length - 1 ? '<i aria-hidden="true">→</i>' : ""}`).join("")}</div>
        <div class="z-q"><div class="lab">오늘의 질문</div><p>${esc(S.question)}</p><div class="out">핵심 산출물 · <b>${esc(S.output)}</b></div></div>
      </div>
      <div class="z-side"><div class="bubble">${Z.line}</div><img src="${naraeImg(Z.guide)}" alt="나래 튜터"></div>
    </div></div>
    <div class="z-body">
      <div class="z-prog"><h2>미션 도장 ${d} / ${list.length}</h2><span class="stamps" aria-hidden="true">${list.map(m => `<i class="${STATE.progress[m.id] && STATE.progress[m.id].done ? "on" : ""}"></i>`).join("")}</span></div>
      <div class="stations">${list.map(stationHTML).join("")}</div>
    </div>
    <footer class="gfoot"><span>미션 기록은 이 기기의 브라우저에만 저장돼요. 산출물은 공유 광장에서 패들렛으로 나눠요.</span><span style="flex:1"></span><button class="gbtn sm ghost" type="button" id="zSos" style="color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)">SOS 브리핑 다시 보기</button></footer>`;
  $("#zSos").onclick = () => showSOS(sid);
  if (!store.get("sos." + sid, false)) setTimeout(() => showSOS(sid), 250);
}
function showSOS(sid) {
  const Z = ZONES[sid], S = SESSIONS[sid];
  const ps = PERSONAS.filter(p => p.s === sid);
  const ov = document.createElement("div"); ov.className = "sos"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "SOS 브리핑");
  ov.innerHTML = `<div class="sos-card pop">
    <div class="sos-top"><span class="siren" aria-hidden="true"></span><div><div class="sos-k">SOS 신호 ${ps.length}건 접수 · ${Z.no}차시 ${esc(Z.name)}</div><h2>교실에서 도움 요청이 왔어요!</h2></div></div>
    <div class="sos-list">${ps.map((p, i) => `<div class="sos-item" style="animation-delay:${.15 + i * .18}s">${avatarIMG(p, 0, 64)}<div style="min-width:0"><b>${esc(p.name)}</b> <span class="muted" style="font-size:12.5px">${esc(p.role)}</span><p>“${esc(p.opening)}”</p></div></div>`).join("")}</div>
    <div class="sos-foot"><img src="${naraeImg("narae_thumb")}" alt=""><div class="bubble">이 친구들을 도우려면 먼저 미션으로 감각을 깨워야 해요. <b>${esc(S.flow.join(" → "))}</b> 순서로 출동!</div></div>
    <div class="row" style="justify-content:flex-end;margin-top:6px"><button class="gbtn" type="button" id="sosGo">출동 준비 완료!</button></div>
  </div>`;
  document.body.appendChild(ov); document.body.style.overflow = "hidden";
  const close = () => { store.set("sos." + sid, true); ov.remove(); document.body.style.overflow = ""; };
  $("#sosGo", ov).onclick = close; ov.addEventListener("click", e => { if (e.target === ov) close(); });
  document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
  setTimeout(() => $("#sosGo", ov).focus(), 50);
}
function stationHTML(m) {
  const p = STATE.progress[m.id]; const done = p && p.done;
  const icon = `<img class="ico" src="${iconImg(m.kind)}" alt="" onerror="this.outerHTML='<span class=&quot;ico-fb&quot;>${esc(m.code.replace("M", ""))}</span>'">`;
  const stamp = done ? `<span class="stamp" aria-label="완료"><span>완료<small>${p.best}점</small></span></span>` : "";
  if (m.kind === "eduone") {
    return `<article class="st feature ${done ? "done" : ""}">${stamp}${icon}<div class="meta"><span class="mcode">${m.code}</span><span class="ty">${esc(m.type)}</span></div>
      <h3>${esc(m.title)}</h3><p>${esc(m.desc)}</p>
      <div class="foot"><span class="time">${esc(m.time)}</span><a class="ext" href="${esc(CFG.eduoneUrl)}" target="_blank" rel="noopener">에듀원 열기 ↗</a><button class="gbtn sm" data-m="${m.id}" type="button">체크</button></div></article>`;
  }
  return `<article class="st ${done ? "done" : ""}">${stamp}${icon}<div class="meta"><span class="mcode">${m.code}</span><span class="ty">${esc(m.type)}</span></div>
    <h3>${esc(m.title)}</h3><p>${esc(m.desc)}</p>
    <div class="foot"><span class="time">${esc(m.time)}</span><button class="gbtn sm ${done ? "sky" : ""}" data-m="${m.id}" type="button">${done ? "다시 도전" : "출동"}</button></div></article>`;
}

/* ---------- 수료 무대 ---------- */
function renderCert() {
  const all = MISSIONS.length, total = doneCount();
  const zoneDone = (sid) => doneCount(sid) === MISSIONS.filter(m => m.s === sid).length;
  const allDone = total === all;
  const oath = STATE.posts.find(p => p.kind === "oath" && !p.example);
  const date = new Date(); const ds = `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  const el = $("#scr-cert");
  el.innerHTML = `<div class="page-hero" style="background-image:url('assets/bg/stage.webp')"><div class="z-in">
      <div><button class="z-back" type="button" data-go="map">← 스마트스쿨 지도</button><div class="z-kick">FINALE · 수료 무대</div><h1 class="z-title">도장 ${total} / ${all}</h1>
      <p style="margin:0;color:#DDE3FF;max-width:560px">세 구역의 도장을 모두 모으면 수료증이 열려요. 차시가 다른 날에 있다면, 같은 기기·같은 브라우저로 이어서 하면 기록이 남아 있어요.</p></div>
      <div class="z-side"><img src="${naraeImg(allDone ? "narae_thumb" : "narae_wave")}" alt=""></div></div></div>
    <div class="note-body"><div class="cert-stage">
      <div class="zone-stamps"><h3>구역별 도장판</h3>
        ${Object.entries(ZONES).map(([sid, z]) => `<div class="zrow"><span class="zn">${z.no}차시 ${esc(z.name)}</span><span class="zslots">${MISSIONS.filter(m => m.s === sid).map(m => `<span class="${STATE.progress[m.id] && STATE.progress[m.id].done ? "on" : ""}" title="${esc(m.code + " " + m.title)}"><img src="${iconImg(m.kind)}" alt=""></span>`).join("")}</span><span class="zbadge ${zoneDone(sid) ? "on" : ""}">${zoneDone(sid) ? "구역 완성" : doneCount(sid) + "/" + MISSIONS.filter(m => m.s === sid).length}</span></div>`).join("")}
        <div class="row" style="margin-top:12px"><button class="btn" type="button" data-go="map">지도에서 이어 하기</button><button class="btn" type="button" data-go="note">공유 광장</button></div>
      </div>
      <div>
        <div class="certcard ${allDone ? "" : "locked"}" id="certCard">
          <div class="seal">튜터<br>출동<br>완료</div>
          <div class="body"><div class="ck">CERTIFICATE · 체험 수료</div><h2>스마트교실 구조대</h2>
          <div class="who">${esc(STATE.me ? STATE.me.nick : "")} 튜터 <span style="font-size:18px;color:#5A6287">${esc(STATE.me ? STATE.me.team + "조" : "")}</span></div>
          <p>위 튜터는 ${esc(CFG.courseName)}의 1·2·3차시 체험 미션 ${all}개를 해결하여, 학생 곁에서 <b>배움의 접속을 지키는 디지털튜터</b>로 출동할 준비를 마쳤기에 이 증서를 드립니다.</p>
          ${oath ? `<p style="margin-top:10px;font-size:14px;color:#5A6287">나의 사명 · “${esc(oath.text)}”</p>` : ""}
          <div class="meta"><span>XP ${xp()}</span><span>${ds}</span><span>선배 튜터 나래 · 로봇 코비</span></div></div>
        </div>
        <div class="row" style="margin-top:12px">${allDone ? `<button class="btn primary" type="button" id="certSave">수료증 그림 저장</button>` : `<span class="muted">도장 ${all - total}개가 더 필요해요.</span>`}</div>
      </div>
    </div></div>
    <footer class="gfoot"><span>부산 명진초등학교 최일훈</span></footer>`;
  const b = $("#certSave"); if (b) b.onclick = () => saveCertPNG(ds, oath);
}

function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function wrapText(ctx, text, x, y, maxW, lh) {
  let line = ""; const words = text.split("");
  for (const ch of words) { const t = line + ch; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = ch; } else line = t; }
  if (line) ctx.fillText(line, x, y); return y + lh;
}
async function saveCertPNG(ds, oath) {
  const W = 1600, H = 1000, c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
  try { await document.fonts.ready; } catch (e) {}
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#FFFDF6"); g.addColorStop(1, "#FFF2D6"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#E7C77A"; ctx.lineWidth = 10; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.strokeStyle = "#1F2A6B"; ctx.lineWidth = 3; ctx.strokeRect(52, 52, W - 104, H - 104);
  try { const k = await loadImg("assets/char/narae_thumb.webp"); const h = 640; ctx.drawImage(k, W - 120 - k.width * h / k.height, H - 70 - h, k.width * h / k.height, h); } catch (e) {}
  try { const k = await loadImg("assets/char/kobi.webp"); ctx.drawImage(k, 90, H - 250, 260, 260 * k.height / k.width); } catch (e) {}
  ctx.fillStyle = "#B9530A"; ctx.font = "800 26px 'Noto Sans KR', sans-serif"; ctx.fillText("CERTIFICATE · 체험 수료", 110, 150);
  ctx.fillStyle = "#1F2A6B"; ctx.font = "72px Jua, 'Noto Sans KR', sans-serif"; ctx.fillText("튜터 출동! 스마트교실 구조대", 110, 245);
  ctx.fillStyle = "#141A3C"; ctx.font = "64px Jua, 'Noto Sans KR', sans-serif"; ctx.fillText(`${STATE.me.nick} 튜터`, 110, 370);
  ctx.fillStyle = "#5A6287"; ctx.font = "700 30px 'Noto Sans KR', sans-serif"; ctx.fillText(`${STATE.me.team}조`, 110 + ctx.measureText(`${STATE.me.nick} 튜터`).width * 1.9 + 30, 370);
  ctx.fillStyle = "#2B3466"; ctx.font = "500 30px 'Noto Sans KR', sans-serif";
  let y = wrapText(ctx, `위 튜터는 ${CFG.courseName}의 1·2·3차시 체험 미션 ${MISSIONS.length}개를 해결하여, 학생 곁에서 배움의 접속을 지키는 디지털튜터로 출동할 준비를 마쳤기에 이 증서를 드립니다.`, 110, 450, 900, 48);
  if (oath) { ctx.fillStyle = "#5A6287"; ctx.font = "500 24px 'Noto Sans KR', sans-serif"; y = wrapText(ctx, `나의 사명 · “${oath.text}”`, 110, y + 20, 900, 36); }
  ctx.fillStyle = "#1F2A6B"; ctx.font = "800 26px 'Noto Sans KR', sans-serif"; ctx.fillText(`XP ${xp()}   ·   ${ds}   ·   선배 튜터 나래`, 400, H - 110);
  ctx.save(); ctx.translate(W - 200, 170); ctx.rotate(-0.17); ctx.fillStyle = "#F47B20"; ctx.beginPath(); ctx.arc(0, 0, 86, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "30px Jua, sans-serif"; ctx.textAlign = "center"; ctx.fillText("튜터", 0, -18); ctx.fillText("출동 완료", 0, 22); ctx.restore();
  try {
    const url = c.toDataURL("image/png"); const a = document.createElement("a"); a.href = url; a.download = `수료증_${STATE.me.nick}.png`; document.body.appendChild(a); a.click(); a.remove(); toast("수료증 그림을 내려받았어요");
  } catch (e) { toast("이 브라우저에서는 저장이 막혀 있어요. 화면을 캡처해 주세요"); }
}

/* ---------- 강사 메뉴 ---------- */
function showTeacher() {
  const base = location.origin + location.pathname;
  const pad = padletUrl();
  const b = openPlainSheet("강사", "강사 메뉴 · 참여 QR", `<div class="two">
    <div class="panel">
      <h3 class="display" style="font-size:22px">참여 QR 만들기</h3>
      <p class="muted" style="margin-top:4px">연수생이 휴대폰·태블릿으로 찍으면 바로 출동 화면이 열려요. 패들렛 주소를 넣으면 QR에 함께 실려서, 연수생의 ‘패들렛 열기’ 버튼이 그 주소로 연결돼요.</p>
      <div class="field" style="margin-top:10px"><label for="qPad">오늘 쓸 패들렛 주소 (선택)</label><input class="input" id="qPad" placeholder="https://padlet.com/…" value="${esc(pad)}"></div>
      <div class="row" style="margin-top:10px"><button class="btn primary" id="qMake" type="button">QR 만들기</button><button class="btn" id="qCopy" type="button">주소 복사</button></div>
      <p class="mono" id="qUrl" style="font-size:12.5px;word-break:break-all;margin:10px 0 0"></p>
      <div class="qrbox" id="qBox" hidden></div>
    </div>
    <div class="panel">
      <h3 class="display" style="font-size:22px">진행 도우미</h3>
      <ul class="list-tight">
        <li>1차시 → <b>튜터 본부</b>, 2차시 → <b>보안 관제탑</b>, 3차시 → <b>에듀원 클라우드 섬</b>.</li>
        <li>미션 기록은 연수생 각자의 브라우저에만 저장돼요(서버 없음). 같은 기기로 이어 하면 다음 차시에도 도장이 남아요.</li>
        <li>공유 활동: 미션 결과 화면의 <b>공유 글 복사</b> → 패들렛의 안내된 번호 칸에 붙여 넣기. 기본 패들렛은 <b>padlet.com/oneteacher/tutor_rescue_2026</b>(9칸)이에요.</li>
        <li>롤플레이는 세 갈래 선택지 대화예요. 고를 때마다 게이지가 움직이고, 표정이 바뀌어요.</li>
      </ul>
      <div class="field" style="margin-top:12px"><label for="tCode">강사 코드</label><input class="input" id="tCode" type="password" inputmode="numeric" placeholder="config.js의 teacherCode"></div>
      <div class="row" style="margin-top:10px"><button class="btn navy" id="tDemo" type="button">시연용: 도장 모두 찍기</button><button class="btn" id="tReset" type="button">이 기기 기록 지우기</button></div>
      <p class="muted" id="tMsg2" style="font-size:13px;min-height:1.3em"></p>
    </div></div>`);
  const url = () => { const v = $("#qPad", b).value.trim(); return base + (v ? "?padlet=" + encodeURIComponent(v) : ""); };
  const make = () => {
    const u = url(); $("#qUrl", b).textContent = u;
    const v = $("#qPad", b).value.trim(); if (v) store.set("padlet", v);
    const box = $("#qBox", b); box.hidden = false; box.innerHTML = "";
    if (window.QRCode) new QRCode(box, {text: u, width: 300, height: 300, correctLevel: QRCode.CorrectLevel.M}); else box.innerHTML = `<p class="mono" style="color:#1d2340">${esc(u)}</p>`;
  };
  $("#qMake", b).onclick = make; $("#qCopy", b).onclick = () => copyText(url());
  make();
  const ok = () => $("#tCode", b).value.trim() === String(CFG.teacherCode);
  $("#tDemo", b).onclick = () => { if (!ok()) { $("#tMsg2", b).textContent = "강사 코드가 맞지 않아요."; return; } MISSIONS.forEach(m => { const p = STATE.progress[m.id] || {best: 0, plays: 0}; p.done = true; p.best = Math.max(p.best || 0, 90); STATE.progress[m.id] = p; }); saveProgress(); renderHud(); $("#tMsg2", b).textContent = "모든 도장을 찍었어요. 수료 무대를 보여 주세요."; };
  $("#tReset", b).onclick = () => { if (!ok()) { $("#tMsg2", b).textContent = "강사 코드가 맞지 않아요."; return; } if (!$("#tReset", b).dataset.sure) { $("#tReset", b).dataset.sure = "1"; $("#tReset", b).textContent = "한 번 더 누르면 지워요"; return; } STATE.progress = {}; saveProgress(); store.set("posts", []); BE.load(); renderHud(); $("#tMsg2", b).textContent = "이 기기의 기록을 지웠어요."; };
}

/* ===================== 부팅 ===================== */
function boot() {
  // 강사가 만든 QR(?padlet=…)로 들어오면 패들렛 주소를 기억
  try { const q = new URLSearchParams(location.search).get("padlet"); if (q && /^https:\/\//.test(q)) store.set("padlet", q); } catch (e) {}
  BE.load();
  document.addEventListener("click", e => {
    const g = e.target.closest("[data-go]"); if (g) { e.preventDefault(); go(g.dataset.go); return; }
    const m = e.target.closest("[data-m]"); if (m && !m.closest(".sheet")) { openMission(m.dataset.m); }
  });
  $("#hLogo").onclick = () => go("title");
  $("#sheetClose").onclick = closeMission;
  $("#btnTeacher").onclick = showTeacher;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheet").hidden) closeMission(); });
  const h = (location.hash || "").replace("#", "");
  const start = ["map", "s1", "s2", "s4", "note", "cert"].includes(h) ? h : (STATE.me ? "title" : "title");
  go(STATE.me ? start : "title");
}
