/* ===================== 미션 구현 ===================== */
const GAMES = {};
const howto = (html) => `<div class="howto"><span class="display" style="font-size:20px;color:var(--orange-ink);line-height:1.2">HOW</span><div>${html}</div></div>`;
function sessionOf(m) { return m.s; }

/* ---------- 체크인 (한 단어) ---------- */
GAMES.word = (root, api, m) => {
  const mine = () => STATE.posts.filter(p => p.mission === m.id);
  root.innerHTML = `${howto(`<b>${esc(m.prompt)}</b> — 떠오르는 말을 짧게 적어 보내요. 같은 말이 많을수록 구름에서 커져요. 보낸 뒤 <b>공유 글 복사</b>로 패들렛에도 올려요.`)}
    <div class="panel">
      <div class="compose"><input class="input" id="wIn" maxlength="20" placeholder="${esc(m.ph)}"><button class="btn primary" id="wSend" type="button">보내기</button></div>
      <div id="wCloud"></div>
    </div>`;
  const draw = () => { $("#wCloud", root) && ($("#wCloud", root).innerHTML = cloudHTML(mine())); };
  draw(); api.onPosts(draw);
  const send = async () => {
    const v = $("#wIn", root).value.trim(); if (!v) { $("#wIn", root).focus(); return; }
    $("#wSend", root).disabled = true;
    try { await BE.addPost({session: m.s, mission: m.id, kind: "word", text: v}); toast("구름에 담았어요"); api.later(() => api.finish(100, `<p>‘${esc(v)}’를 구름에 담았어요. 패들렛에 올리면 모두의 단어가 한 화면에 모여요.</p>`), 700); }
    catch (e) { toast("보내지 못했어요: " + e.message); $("#wSend", root).disabled = false; }
  };
  $("#wSend", root).onclick = send;
  $("#wIn", root).onkeydown = e => { if (e.key === "Enter") send(); };
  $("#wIn", root).focus();
};
function cloudHTML(posts) {
  if (!posts.length) return `<div class="empty"><b>첫 단어를 기다려요</b>보낸 단어가 여기 구름으로 모여요.</div>`;
  const cnt = {};
  posts.forEach(p => { const k = String(p.text).trim(); if (k) cnt[k] = (cnt[k] || 0) + 1 + (p.likes || 0) * 0; });
  const arr = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 60);
  const max = arr[0][1];
  const cols = ["var(--navy)", "var(--orange-ink)", "var(--ink)", "var(--navy-2)", "var(--ok)"];
  return `<div class="cloud">${shuffle(arr).map(([w, n], i) => `<span style="font-size:${Math.round(18 + (n / max) * 34)}px;color:${cols[i % cols.length]}" title="${n}명">${esc(w)}</span>`).join("")}</div>`;
}

/* ---------- M1-1 교실 스캔 ---------- */
GAMES.scan = (root, api) => {
  const targets = shuffle(SCAN_TARGETS).slice(0, 7).map(t => Object.assign({target: true}, t));
  const fine = shuffle(SCAN_FINE).slice(0, 17).map(t => Object.assign({target: false}, t));
  const seats = shuffle(targets.concat(fine));
  let time = 60, found = 0, miss = 0, running = false, over = false;
  root.innerHTML = `${howto(`교실 24자리를 훑어 <b>배움에서 조용히 빠져나가는 학생 7명</b>을 찾아 누르세요. 잘못 누르면 2초가 줄어요. LOOK이 먼저, HELP는 그다음!`)}
    <div class="hud"><span class="stat timer">남은 시간<b class="tnum" id="sT">60</b></span><span class="stat">찾음<b class="tnum" id="sF">0/7</b></span><span class="stat">헛짚음<b class="tnum" id="sM">0</b></span>
      <button class="btn primary" id="sGo" type="button" style="margin-left:auto">스캔 시작</button></div>
    <div class="room" id="room" aria-label="교실 자리 배치"><div class="board-front">교 탁 · 칠 판</div>
      ${seats.map((s, i) => `<button class="desk" type="button" data-i="${i}" disabled><span class="scr ${s.scr}">${esc(s.txt).replace(/\n/g, "<br>")}</span><span class="lbl">${esc(s.lbl)}</span><span class="no">${String(i + 1).padStart(2, "0")}번</span></button>`).join("")}
    </div>
    <div id="sLog"></div>`;
  const upd = () => { $("#sT", root).textContent = time; $("#sF", root).textContent = found + "/7"; $("#sM", root).textContent = miss; };
  const end = () => {
    if (over) return; over = true; running = false; api.clear();
    $$(".desk", root).forEach((d, i) => { d.disabled = true; if (seats[i].target && !d.classList.contains("found")) d.classList.add("reveal"); });
    const score = found / 7 * 80 + time / 60 * 20 - miss * 3;
    const list = targets.map(t => `<li><b>${esc(t.lbl)}</b> — ${esc(t.why)}</li>`).join("");
    $("#sLog", root).innerHTML = `<div class="feedback info"><b>${found === 7 ? "모두 찾았어요!" : "시간 종료!"}</b> 주황 점선 자리는 놓친 학생이에요.</div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="sDone" type="button">결과 받기</button></div>`;
    $("#sDone", root).onclick = () => api.finish(score, `<p><b>이탈 신호와 HELP 한 줄</b></p><ul class="list-tight">${list}</ul><p class="muted">튜터의 우선순위: 가장 먼저 이탈하는 학생을 가장 먼저 발견한다.</p>`);
  };
  $("#sGo", root).onclick = () => {
    if (running) return; running = true; $("#sGo", root).disabled = true;
    $$(".desk", root).forEach(d => d.disabled = false);
    api.timer(() => { time--; upd(); if (time <= 0) { time = 0; upd(); end(); } }, 1000);
  };
  $("#room", root).addEventListener("click", e => {
    const d = e.target.closest(".desk"); if (!d || !running || over) return;
    const s = seats[+d.dataset.i];
    if (d.classList.contains("found")) return;
    if (s.target) { d.classList.add("found", "pop"); found++; $("#sLog", root).innerHTML = `<div class="feedback ok"><b>LOOK!</b> ${esc(s.why)}</div>`; if (found === 7) end(); }
    else { miss++; time = Math.max(0, time - 2); d.classList.add("miss", "shake"); setTimeout(() => d.classList.remove("miss", "shake"), 420); $("#sLog", root).innerHTML = `<div class="feedback bad">이 학생은 배움에 잘 연결되어 있어요. (−2초)</div>`; }
    upd();
  });
};

/* ---------- M1-2 격차 분류소 ---------- */
GAMES.sort = (root, api) => {
  const cards = shuffle(GAP_CARDS); let i = 0, right = 0; const placed = {};
  root.innerHTML = `${howto(`카드를 읽고 알맞은 <b>격차 상자</b>를 누르세요. 격차는 ‘기기 보유’만의 문제가 아니라 수업 참여 과정에서 드러나요.`)}
    <div class="deck"><div class="card-big" id="gc"></div></div>
    <div class="bins" id="bins">${GAP_BINS.map(b => `<button class="bin" type="button" data-b="${b.id}"><span class="bh">${b.name}</span><span class="bd">${b.d}</span><span class="pl" data-pl="${b.id}"></span></button>`).join("")}</div>
    <div id="gFb"></div>`;
  const show = () => { const c = cards[i]; $("#gc", root).innerHTML = `<span class="cnt tnum">카드 ${i + 1} / ${cards.length}</span>${esc(c.t)}`; };
  show();
  let lock = false;
  $("#bins", root).addEventListener("click", e => {
    const b = e.target.closest(".bin"); if (!b || lock || i >= cards.length) return;
    const c = cards[i]; const ok = b.dataset.b === c.a;
    if (ok) right++;
    const bin = GAP_BINS.find(x => x.id === c.a);
    $("#gFb", root).innerHTML = `<div class="feedback ${ok ? "ok" : "bad"}"><b>${ok ? "정답" : "아쉬워요 · 정답은 " + bin.name}</b> ${esc(c.w)}</div>`;
    const pl = $(`[data-pl="${c.a}"]`, root); const tag = document.createElement("span"); tag.className = "placed"; tag.textContent = c.t.slice(0, 18) + "…"; pl.appendChild(tag);
    b.classList.add(ok ? "pop" : "shake"); setTimeout(() => b.classList.remove("pop", "shake"), 400);
    lock = true; i++;
    setTimeout(() => {
      lock = false;
      if (i < cards.length) show();
      else api.finish(right / cards.length * 100, `<p>12장 중 <b>${right}장</b>을 바르게 분류했어요.</p><ul class="list-tight"><li><b>접근</b> 기기·계정·네트워크 → 공용 기기, 사전 로그인, 대체 경로</li><li><b>활용</b> 제출·공유·협업 → 짧은 단계 안내, 옆자리 코칭</li><li><b>이해</b> AI 결과·데이터 → 질문으로 바꿔 읽기, 교사 피드백 연결</li><li><b>참여</b> 조용한 이탈 → 조용한 근접 지원, 작은 성공 경험</li></ul>`);
    }, ok ? 900 : 1700);
  });
};

/* ---------- M1-4 5초 판단 ---------- */
GAMES.speed = (root, api) => {
  const items = shuffle(SPEED_ITEMS); let i = 0, pts = 0, right = 0; let t0 = 0, raf = 0, answered = false;
  root.innerHTML = `${howto(`상황이 뜨면 <b>5초 안에</b> 고르세요. 기준은 교안의 ‘수업 중 5초 판단’ — 스스로 해결 가능한가? 교사 설명을 놓치는가? 전체 흐름에 영향이 있는가?`)}
    <div class="hud"><span class="stat">문제<b class="tnum" id="pQ">1/10</b></span><span class="stat">점수<b class="tnum" id="pS">0</b></span><button class="btn primary" id="pGo" type="button" style="margin-left:auto">시작</button></div>
    <div class="panel"><div class="tbar"><i id="pBar"></i></div><div class="speed-q" id="pT">준비되면 시작을 누르세요.</div>
      <div class="choice3" id="pC">${Object.entries(SPEED_LABELS).map(([k, v]) => `<button class="cbtn" type="button" data-k="${k}" disabled>${v[0]}<small>${v[1]}</small></button>`).join("")}</div>
      <div id="pFb" style="min-height:58px"></div></div>`;
  const ask = () => {
    answered = false; const it = items[i];
    $("#pQ", root).textContent = (i + 1) + "/10"; $("#pT", root).textContent = it.t; $("#pFb", root).innerHTML = "";
    $$(".cbtn", root).forEach(b => { b.disabled = false; b.classList.remove("right", "wrong"); });
    t0 = performance.now();
    cancelAnimationFrame(raf);
    const loop = (now) => { const left = clamp(1 - (now - t0) / 5000, 0, 1); $("#pBar", root).style.width = (left * 100) + "%"; if (!answered) { if (left <= 0) answer(null); else raf = requestAnimationFrame(loop); } };
    raf = requestAnimationFrame(loop);
  };
  const answer = (k) => {
    if (answered) return; answered = true; cancelAnimationFrame(raf);
    const it = items[i]; const left = clamp(5 - (performance.now() - t0) / 1000, 0, 5);
    const ok = k === it.a; if (ok) { right++; pts += 8 + Math.round(left / 5 * 2); }
    $$(".cbtn", root).forEach(b => { b.disabled = true; if (b.dataset.k === it.a) b.classList.add("right"); else if (b.dataset.k === k) b.classList.add("wrong"); });
    $("#pS", root).textContent = pts;
    $("#pFb", root).innerHTML = `<div class="feedback ${ok ? "ok" : "bad"}"><b>${k == null ? "시간 초과" : ok ? "정답" : "다시 생각해 봐요"}</b> ${esc(it.w)}</div>`;
    api.later(() => { i++; if (i < items.length) ask(); else api.finish(pts, `<p>10문제 중 <b>${right}개</b> 정답. 빠르고 정확할수록 점수가 커요.</p><ul class="list-tight"><li><b>즉시 지원</b> 한두 명의 접속·이해 문제 — 조용한 근접 지원</li><li><b>기록</b> 지금 수업은 굴러가는 반복·기기 문제 — 시간·기기번호·증상</li><li><b>교사 공유</b> 전체 흐름·권한·개인정보에 영향 — 바로 알림</li></ul>`); }, ok ? 1300 : 2400);
  };
  $("#pGo", root).onclick = () => { $("#pGo", root).disabled = true; ask(); };
  $("#pC", root).addEventListener("click", e => { const b = e.target.closest(".cbtn"); if (b && !b.disabled) answer(b.dataset.k); });
};

/* ---------- M1-5 사명 선언 카드 ---------- */
GAMES.oath = (root, api, m) => {
  const sits = ["로그인 실패", "조용한 이탈", "제출 실패", "AI 피드백이 어려운 학생", "반복 장애", "개인정보가 보이는 화면", "교사와 사전 협의"];
  const checks = ["학생이 교사 설명을 놓치지 않는지", "학생 손으로 해결할 수 있는지", "기기·계정·네트워크 접속 가능 여부", "도움을 요청하지 못하는 학생", "오류 시간·기기번호·화면", "개인정보 노출 여부", "교사의 수업 의도"];
  const donts = ["학생 대신 과제를 수행하는 일", "학생 비밀번호를 대신 입력하는 일", "공개적으로 지적하는 일", "AI 답을 정답처럼 단정하는 일", "교사 의도 없이 활동을 바꾸는 일", "개인 휴대폰으로 학생 화면을 찍는 일"];
  const roles = [["연결자", "기술과 수업, 교사와 학생, 학교와 지원체계를 연결"], ["관찰자", "조용한 이탈·반복 오류·병목을 발견"], ["지원자", "교사를 대신하지 않고 필요한 순간에 개입"]];
  let role = "연결자";
  root.innerHTML = `${howto(`완성 문장 <b>“나는 ○○ 상황에서 ○○을 먼저 확인하고, ○○을 하지 않겠습니다.”</b> 칩을 눌러 채우거나 직접 써도 돼요.`)}
  <div class="two">
    <div class="panel" style="display:flex;flex-direction:column;gap:12px">
      <div class="field"><label>나의 역할</label><div class="chips" id="oRole">${roles.map(r => `<button class="schip" type="button" data-r="${r[0]}" aria-pressed="${r[0] === role}">${r[0]}</button>`).join("")}</div></div>
      <div class="field"><label for="oS">○○ 상황에서</label><input class="input" id="oS" maxlength="40" value="로그인 실패"><div class="chips">${sits.map(s => `<button class="schip" type="button" data-f="oS">${esc(s)}</button>`).join("")}</div></div>
      <div class="field"><label for="oC">○○을 먼저 확인하고</label><input class="input" id="oC" maxlength="50" value="학생이 교사 설명을 놓치지 않는지"><div class="chips">${checks.map(s => `<button class="schip" type="button" data-f="oC">${esc(s)}</button>`).join("")}</div></div>
      <div class="field"><label for="oD">○○을 하지 않겠습니다</label><input class="input" id="oD" maxlength="50" value="학생 대신 과제를 수행하는 일"><div class="chips">${donts.map(s => `<button class="schip" type="button" data-f="oD">${esc(s)}</button>`).join("")}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="oath" id="oCard"></div>
      <button class="btn primary" id="oPost" type="button">선언 카드 완성하기</button>
      <p class="muted" style="font-size:13px;margin:0">올린 카드에는 동료들이 하트를 눌러 줄 수 있어요.</p>
    </div>
  </div>`;
  const text = () => { const S = $("#oS", root).value.trim() || "○○", C = $("#oC", root).value.trim() || "○○", D = $("#oD", root).value.trim() || "○○"; return `나는 ${S} 상황에서 ${C}${josa(C, "을", "를")} 먼저 확인하고, ${D}${josa(D, "은", "는")} 하지 않겠습니다.`; };
  const draw = () => { const r = roles.find(x => x[0] === role); $("#oCard", root).innerHTML = `<div class="ol">DIGITAL TUTOR OATH</div><div class="or">나는 ${role}입니다</div><div class="ot">${esc(text())}</div><div class="on">${esc(r[1])} · ${esc(STATE.me.nick)} (${esc(STATE.me.team)}조)</div>`; };
  draw();
  root.addEventListener("input", draw);
  root.addEventListener("click", e => {
    const c = e.target.closest(".schip"); if (!c) return;
    if (c.dataset.r) { role = c.dataset.r; $$("#oRole .schip", root).forEach(x => x.setAttribute("aria-pressed", x === c ? "true" : "false")); }
    if (c.dataset.f) { $("#" + c.dataset.f, root).value = c.textContent; }
    draw();
  });
  $("#oPost", root).onclick = async () => {
    $("#oPost", root).disabled = true;
    try { await BE.addPost({session: m.s, mission: m.id, kind: "oath", text: text(), extra: {role}}); api.finish(100, `<div class="oath" style="margin-top:6px">${$("#oCard", root).innerHTML}</div>`); }
    catch (e) { toast("올리지 못했어요: " + e.message); $("#oPost", root).disabled = false; }
  };
};

/* ---------- 퀴즈 ---------- */
GAMES.quiz = (root, api, m) => {
  const qs = QUIZZES[m.quiz]; let i = 0, right = 0; const wrongs = [];
  root.innerHTML = `<div class="hud"><span class="stat">문제<b class="tnum" id="qN"></b></span><span class="stat">정답<b class="tnum" id="qR">0</b></span></div><div class="panel" id="qBox"></div>`;
  const show = () => {
    const q = qs[i]; $("#qN", root).textContent = (i + 1) + "/" + qs.length;
    $("#qBox", root).innerHTML = `<div class="qtitle">${esc(q.q)}</div>${q.o.map((o, k) => `<button class="qopt" type="button" data-k="${k}">${"①②③④"[k]} ${esc(o)}</button>`).join("")}<div id="qFb"></div>`;
    $$(".qopt", root).forEach(b => b.onclick = () => {
      const k = +b.dataset.k; const ok = k === q.a; if (ok) right++; else wrongs.push(q);
      $$(".qopt", root).forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); });
      $("#qR", root).textContent = right;
      $("#qFb", root).innerHTML = `<div class="feedback ${ok ? "ok" : "bad"}"><b>${ok ? "정답" : "정답은 " + "①②③④"[q.a]}</b> ${esc(q.w)}</div><div class="row" style="margin-top:10px"><button class="btn primary" id="qNext" type="button">${i < qs.length - 1 ? "다음 문제" : "결과 보기"}</button></div>`;
      $("#qNext", root).onclick = () => { i++; if (i < qs.length) show(); else api.finish(right / qs.length * 100, `<p>${qs.length}문제 중 <b>${right}문제</b> 정답.</p>${wrongs.length ? `<p><b>다시 볼 문제</b></p><ul class="list-tight">${wrongs.map(w => `<li>${esc(w.q)} → <b>${esc(w.o[w.a])}</b></li>`).join("")}</ul>` : ""}`); };
      $("#qNext", root).focus();
    });
  };
  show();
};

/* ---------- M2-1 개인정보 숨은그림찾기 ---------- */
GAMES.hidden = (root, api) => {
  let time = 75, found = 0, wrong = 0, running = false, over = false; const total = 7;
  root.innerHTML = `${howto(`3교시 5학년 3반, AI 코스웨어 오류 화면을 캡처해 담당자에게 보내려는 순간! 화면 속 <b>노출된 개인정보 7곳</b>을 찾아 누르세요. 기록해도 되는 정보를 누르면 3초가 줄어요.`)}
  <div class="hud"><span class="stat timer">남은 시간<b class="tnum" id="hT">75</b></span><span class="stat">찾음<b class="tnum" id="hF">0/7</b></span><button class="btn primary" id="hGo" type="button" style="margin-left:auto">찾기 시작</button></div>
  <div class="mock" id="mock" aria-label="가상의 수업 플랫폼 화면">
    <div class="chrome"><span class="dots"><i></i><i></i><i></i></span>
      <span class="url hot pii" data-h="url">https://class.example.kr/report?sid=20231234&amp;name=김하늘</span>
      <span class="live">화면 공유 중</span></div>
    <div class="app">
      <aside class="side"><h4>5학년 <span class="hot decoy" data-d="cls">3반</span> 명단</h4>
        <ul class="hot pii" data-h="roster"><li>김하늘</li><li>박서준</li><li>이도윤</li><li>최유나</li><li>정민재</li></ul></aside>
      <section class="main">
        <div class="prof"><span class="face hot pii" data-h="face" role="img" aria-label="학생 얼굴 사진"></span>
          <div><b style="font-size:14px">김하늘</b><div style="font-size:12px;color:#6a7299">학번 <span class="hot pii" data-h="sid">20231234</span> · 기기 <span class="hot decoy" data-d="dev">T-15</span></div></div>
          <div style="margin-left:auto;text-align:right"><div style="font-size:11px;color:#6a7299">단원평가</div><div class="hot pii" data-h="score" style="font-size:22px;font-weight:800;color:#c0392b">62점</div></div></div>
        <div class="work">[활동 2] 식물이 자라는 조건 실험 결과
물 O / 빛 X → 잎이 노랗게 변함
결론: _</div>
        <div class="err">⚠ <span class="hot decoy" data-d="err">ERR_CONNECTION_TIMED_OUT</span> · <span class="hot decoy" data-d="time">10:42</span> 코스웨어 응답 없음</div>
      </section>
    </div>
    <div class="msgr hot pii" data-h="chat"><b>메신저</b><br>하늘 어머니 010-2345-6789<br>“오늘 하늘이 조퇴합니다”</div>
    <div class="note hot pii" data-h="memo">하늘 PW: haneul0412!</div>
  </div>
  <div id="hFb"></div>`;
  const mock = $("#mock", root);
  const upd = () => { $("#hT", root).textContent = time; $("#hF", root).textContent = found + "/" + total; };
  const end = () => {
    if (over) return; over = true; running = false; api.clear();
    const missed = $$(".hot.pii:not(.got)", root).map(h => PII_EXPLAIN[h.dataset.h]);
    $("#hFb", root).innerHTML = `<div class="feedback info"><b>${found === total ? "모두 찾았어요!" : "시간 종료"}</b> 아래 버튼으로 ‘안전하게 가린 캡처’를 확인해 보세요.</div>
      <div class="row" style="margin-top:10px"><button class="btn navy" id="hRed" type="button">가린 캡처 보기</button><button class="btn primary" id="hDone" type="button">결과 받기</button></div>`;
    $("#hRed", root).onclick = () => { mock.classList.toggle("redact"); $("#hRed", root).textContent = mock.classList.contains("redact") ? "원본 보기" : "가린 캡처 보기"; };
    $("#hDone", root).onclick = () => api.finish(found / total * 85 + time / 75 * 15 - wrong * 3,
      `<p><b>증거 관리 원칙</b> 오류를 기록할 땐 학생 이름·얼굴·ID는 가리고, <b>기기번호·오류 메시지·시간</b>만 남겨요.</p>${missed.length ? `<p>놓친 곳</p><ul class="list-tight">${missed.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<p class="muted">화면 공유 중이라면 공유 전에 명단·메신저 창부터 닫기!</p>`);
  };
  $("#hGo", root).onclick = () => { if (running) return; running = true; $("#hGo", root).disabled = true; api.timer(() => { time--; upd(); if (time <= 0) { time = 0; upd(); end(); } }, 1000); };
  mock.addEventListener("click", e => {
    if (!running || over) return;
    const h = e.target.closest(".hot"); if (!h) return;
    if (h.classList.contains("pii")) {
      if (h.classList.contains("got")) return;
      h.classList.add("got"); found++; $("#hFb", root).innerHTML = `<div class="feedback ok"><b>찾았다!</b> ${esc(PII_EXPLAIN[h.dataset.h])}</div>`;
      if (found === total) end();
    } else {
      wrong++; time = Math.max(0, time - 3); h.classList.add("decoy-hit"); setTimeout(() => h.classList.remove("decoy-hit"), 700);
      $("#hFb", root).innerHTML = `<div class="feedback bad"><b>이건 남겨도 돼요 (−3초)</b> ${esc(DECOY_EXPLAIN[h.dataset.d])}</div>`;
    }
    upd();
  });
};

/* ---------- M2-2 OX 스피드런 ---------- */
GAMES.ox = (root, api) => {
  const items = shuffle(OX_ITEMS); let i = 0, right = 0, answered = false, t0 = 0, raf = 0; const wrongs = [];
  root.innerHTML = `${howto(`문장을 읽고 <b>6초 안에</b> O 또는 X. 키보드 O·X 키도 돼요. 기준: “빠른 해결”보다 “안전한 해결”.`)}
  <div class="hud"><span class="stat">문제<b class="tnum" id="xQ">1/12</b></span><span class="stat">정답<b class="tnum" id="xR">0</b></span><button class="btn primary" id="xGo" type="button" style="margin-left:auto">시작</button></div>
  <div class="panel"><div class="tbar"><i id="xBar"></i></div><div class="speed-q" id="xT">준비되면 시작!</div>
    <div class="ox"><button class="oxbtn o" type="button" data-v="1" disabled aria-label="O">O</button><button class="oxbtn x" type="button" data-v="0" disabled aria-label="X">X</button></div><div id="xFb" style="min-height:58px"></div></div>`;
  const ask = () => {
    answered = false; const it = items[i]; $("#xQ", root).textContent = (i + 1) + "/12"; $("#xT", root).textContent = it.t; $("#xFb", root).innerHTML = "";
    $$(".oxbtn", root).forEach(b => b.disabled = false);
    t0 = performance.now(); cancelAnimationFrame(raf);
    const loop = (now) => { const left = clamp(1 - (now - t0) / 6000, 0, 1); $("#xBar", root).style.width = left * 100 + "%"; if (!answered) { if (left <= 0) ans(null); else raf = requestAnimationFrame(loop); } };
    raf = requestAnimationFrame(loop);
  };
  const ans = (v) => {
    if (answered) return; answered = true; cancelAnimationFrame(raf);
    const it = items[i]; const ok = v === it.a; if (ok) right++; else wrongs.push(it);
    $$(".oxbtn", root).forEach(b => b.disabled = true);
    $("#xR", root).textContent = right;
    $("#xFb", root).innerHTML = `<div class="feedback ${ok ? "ok" : "bad"}"><b>${v == null ? "시간 초과 · " : ""}${it.a ? "O" : "X"}</b> ${esc(it.w)}</div>`;
    api.later(() => { i++; if (i < items.length) ask(); else { document.removeEventListener("keydown", key); api.finish(right / items.length * 100, `<p>12문제 중 <b>${right}개</b> 정답.</p>${wrongs.length ? `<ul class="list-tight">${wrongs.map(w => `<li>${esc(w.t)} → <b>${w.a ? "O" : "X"}</b></li>`).join("")}</ul>` : ""}<p class="muted">실천 문장: 학생 개인정보가 보이는 상황에서는 해결 속도보다 보호 절차를 먼저 지키겠습니다.</p>`); } }, ok ? 1200 : 2300);
  };
  const key = (e) => { if (!CUR || !CUR.m || CUR.m.kind !== "ox") { document.removeEventListener("keydown", key); return; } const k = e.key.toLowerCase(); if (!answered && $$(".oxbtn", root)[0] && !$$(".oxbtn", root)[0].disabled) { if (k === "o") ans(true); if (k === "x") ans(false); } };
  document.addEventListener("keydown", key); api.onClose(() => document.removeEventListener("keydown", key));
  $("#xGo", root).onclick = () => { $("#xGo", root).disabled = true; ask(); };
  $$(".oxbtn", root).forEach(b => b.onclick = () => ans(b.dataset.v === "1"));
};

/* ---------- M2-3 장애 접수 티켓 ---------- */
GAMES.ticket = (root, api, m) => {
  const sc = TICKET_SCENARIOS[Math.floor(Math.random() * TICKET_SCENARIOS.length)];
  const tno = "BTC-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + String(Math.floor(Math.random() * 900) + 100);
  let typeOk = null, step = 1;
  root.innerHTML = `${howto(`<b>관찰 → 분류 → 기록 → 보고</b> 순서로 진행해요. 문제 해결의 속도는 정확한 전달에서 시작됩니다.`)}
  <div class="scenario"><div class="lab">교실 상황 · 시나리오 ${sc.id}</div>${esc(sc.text)}</div>
  <div class="panel" style="margin-top:12px"><b>1단계 · 장애 유형 분류</b><p class="muted" style="margin:4px 0 10px;font-size:14px">사용 미숙 / 계정 / 네트워크 / 기기 / 플랫폼 중 가장 가까운 것은?</p>
    <div class="typebtns" id="tType">${TICKET_TYPES.map(t => `<button class="tbtn" type="button" data-t="${t}">${t}</button>`).join("")}</div><div id="tTypeFb"></div></div>
  <div class="panel ticket" id="tForm" style="margin-top:12px" hidden>
    <div class="row"><span class="tno">${tno}</span><span class="muted" style="font-size:13px">2단계 · 연계할 때 남겨야 할 5가지</span></div>
    <div class="tgrid">${TICKET_FIELDS.map(f => `<div class="field"><label for="tf-${f.k}">${f.n} <span style="font-weight:500">${f.h}</span></label><textarea class="input" id="tf-${f.k}" rows="2"></textarea></div>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="btn navy" id="tCheck" type="button">티켓 점검</button><button class="btn primary" id="tSend" type="button" disabled>테크센터에 접수</button></div>
    <div id="tCheckFb"></div>
  </div>
  <div id="tReply"></div>`;
  $("#tType", root).addEventListener("click", e => {
    const b = e.target.closest(".tbtn"); if (!b || typeOk !== null) return;
    typeOk = b.dataset.t === sc.type;
    $$(".tbtn", root).forEach(x => { if (x.dataset.t === sc.type) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); x.disabled = true; });
    $("#tTypeFb", root).innerHTML = `<div class="feedback ${typeOk ? "ok" : "bad"}"><b>${typeOk ? "정확해요" : "정답은 " + sc.type}</b> ${esc(sc.why)}</div>`;
    $("#tForm", root).hidden = false; $("#tf-when", root).focus();
  });
  let result = null;
  const check = () => {
    const vals = {}; TICKET_FIELDS.forEach(f => vals[f.k] = $("#tf-" + f.k, root).value.trim());
    const all = Object.values(vals).join(" ");
    const okF = TICKET_FIELDS.map(f => ({f, ok: vals[f.k].length >= 3 && f.need.test(vals[f.k])}));
    const piiHit = sc.pii.filter(w => all.includes(w)).concat(PII_PATTERNS.some(p => p.test(all)) && !sc.pii.some(w => all.includes(w)) ? ["민감 정보"] : []);
    result = {vals, okF, piiHit, typeOk};
    $("#tCheckFb", root).innerHTML = `<div class="feedback ${okF.every(x => x.ok) && !piiHit.length ? "ok" : "info"}">
      <ul class="list-tight" style="margin:0">${okF.map(x => `<li>${x.ok ? "✓" : "✗"} <b>${x.f.n}</b> ${x.ok ? "" : "— " + esc(x.f.h) + " 를 구체적으로"}</li>`).join("")}
      <li>${piiHit.length ? "✗ <b>개인정보</b> — ‘" + esc(piiHit.join(", ")) + "’ 는 연계에 필요 없는 정보예요. 지워 주세요." : "✓ <b>개인정보</b> 불필요한 학생 정보 없음"}</li></ul></div>`;
    $("#tSend", root).disabled = false;
    return result;
  };
  $("#tCheck", root).onclick = check;
  $("#tSend", root).onclick = async () => {
    const r = check(); $("#tSend", root).disabled = true; $("#tCheck", root).disabled = true;
    const nOk = r.okF.filter(x => x.ok).length;
    const score = (r.typeOk ? 30 : 10) + nOk * 10 + (r.piiHit.length ? 0 : 20);
    const box = $("#tReply", root);
    box.innerHTML = `<div class="panel" style="margin-top:12px"><b>테크센터 접수 담당</b><p class="typing">답변을 작성하고 있어요…</p></div>`;
    let reply = "";
    if (BE.ai) {
      const prompt = `너는 부산광역시교육청 테크센터의 친절한 장애 접수 담당자 ‘한 주무관’이다. 디지털튜터가 보낸 접수 티켓을 읽고, 실제 접수 담당자처럼 2~4문장의 한국어로 답하라.
- 5가지 정보(언제·어디서·무엇이·얼마나·어떻게) 중 빠지거나 모호한 것이 있으면 그것을 구체적으로 되묻는다.
- 학생 실명·성적·가정환경 등 불필요한 개인정보가 있으면 정중히 삭제를 요청한다.
- 정보가 충분하면 접수번호 ${tno}로 접수했다고 알리고, 예상 조치(원격 점검/방문 등)와 수업 전에 튜터가 해 둘 일 한 가지를 안내한다.
튜터가 분류한 장애 유형: ${r.typeOk ? sc.type : "(잘못 분류됨, 실제는 " + sc.type + ")"}
티켓 내용:
${TICKET_FIELDS.map(f => f.n + ": " + (r.vals[f.k] || "(비어 있음)")).join("\n")}
JSON 하나만 출력: {"reply":"답변"}`;
      try { const o = parseJSON(await BE.ask(prompt)); reply = o && o.reply ? o.reply : ""; } catch (e) { reply = ""; }
    }
    if (!reply) {
      const miss = r.okF.filter(x => !x.ok).map(x => x.f.n.replace(/^[^ ]+ /, ""));
      reply = miss.length
        ? `접수 확인 중입니다. ${miss.join(", ")} 정보를 조금 더 구체적으로 알려 주시면 바로 조치 경로를 잡을 수 있어요.${r.piiHit.length ? " 그리고 학생 이름·성적 같은 정보는 접수에 필요하지 않으니 빼 주세요." : ""}`
        : `${tno}로 접수했습니다. ${sc.type === "네트워크" ? "교실 공유기 원격 점검 후 필요하면 방문하겠습니다." : sc.type === "계정" ? "학교 담당자와 계정 등록 상태를 확인하겠습니다." : "해당 기기 원격 점검을 진행하겠습니다."} 다음 수업 전에 같은 기기로 로그인 테스트를 한 번 해 주세요.${r.piiHit.length ? " 다만 학생 실명·성적 정보는 다음부터 빼 주세요." : ""}`;
    }
    box.innerHTML = `<div class="panel" style="margin-top:12px"><div class="row" style="align-items:center">${avatarIMG({id:"han",name:"한 주무관",color:"#6FD3FF",start:80},80,52)}<span class="mcode">${tno}</span><b>테크센터 접수 담당 한 주무관</b></div><p style="margin:8px 0 0;white-space:pre-wrap">${esc(reply)}</p>
      <div class="row" style="margin-top:12px"><button class="btn" id="tShare" type="button">익명 티켓을 공유 광장에 담기</button><button class="btn primary" id="tDone" type="button">결과 받기</button></div></div>`;
    $("#tShare", root).onclick = async () => {
      try { await BE.addPost({session: m.s, mission: m.id, kind: "ticket", text: TICKET_FIELDS.map(f => f.n + " " + (r.vals[f.k] || "-")).join("\n"), extra: {tno, type: sc.type}}); toast("공유 광장에 담았어요"); $("#tShare", root).disabled = true; } catch (e) { toast("공유하지 못했어요"); }
    };
    $("#tDone", root).onclick = () => api.finish(score, `<ul class="list-tight"><li>장애 유형 분류: <b>${r.typeOk ? "정확" : "다시 확인 (" + sc.type + ")"}</b></li><li>5가지 정보: <b>${nOk}/5</b></li><li>개인정보: <b>${r.piiHit.length ? "불필요한 정보 포함" : "깔끔"}</b></li></ul><p class="muted">협업의 품질은 ‘문제를 직접 다 해결했는가’보다 ‘필요한 사람이 정확히 알게 되었는가’로 판단해요.</p>`);
  };
};

/* ---------- M2-5 지원 계획 빌더 ---------- */
GAMES.plan = (root, api, m) => {
  root.innerHTML = `${howto(`작성 원칙 <b>목표는 크게, 행동은 작게, 담당자는 명확하게, 기록은 간단하게.</b> 칩을 누르면 문장에 더해져요.`)}
  <div class="panel" style="display:flex;flex-direction:column;gap:14px">
    <div class="row"><div class="field" style="flex:1;min-width:200px"><label for="plTitle">계획 이름</label><input class="input" id="plTitle" maxlength="40" placeholder="예: ○○초 1학기 디지털튜터 지원 계획"></div>
      <div class="field"><label for="plLevel">학교급</label><select class="input" id="plLevel"><option>초등</option><option>중학교</option><option>고등학교</option><option>특수</option></select></div></div>
    ${PLAN_SECTIONS.map(s => `<div class="field"><label for="pl-${s.k}">${s.n} <span style="font-weight:500">${s.h}</span></label><textarea class="input" id="pl-${s.k}" rows="2"></textarea><div class="chips">${s.chips.map(c => `<button class="schip" type="button" data-k="${s.k}">${esc(c)}</button>`).join("")}</div></div>`).join("")}
    <div class="row"><button class="btn navy" id="plAI" type="button" ${BE.ai ? "" : "hidden"}>AI 코치 피드백</button><button class="btn primary" id="plPost" type="button">계획 카드 완성하기</button></div>
    <div id="plFb"></div>
  </div>`;
  root.addEventListener("click", e => {
    const c = e.target.closest(".schip[data-k]"); if (!c) return;
    const ta = $("#pl-" + c.dataset.k, root); ta.value = ta.value.trim() ? ta.value.trim() + ", " + c.textContent : c.textContent;
  });
  const vals = () => { const o = {}; PLAN_SECTIONS.forEach(s => o[s.k] = $("#pl-" + s.k, root).value.trim()); return o; };
  $("#plAI", root).onclick = async () => {
    const v = vals(); $("#plFb", root).innerHTML = `<p class="typing">AI 코치가 루브릭으로 읽는 중…</p>`;
    const prompt = `너는 부산 디지털튜터 양성 연수의 선배 튜터 코치다. 연수생이 쓴 ‘배치 학교 맞춤형 지원 계획 초안’을 5개 루브릭(현장성·실행성·협업성·보안성·포용성)으로 짧게 피드백하라. 칭찬 1개, 보완 2개, 각 40자 이내의 한국어.
학교급: ${$("#plLevel", root).value}
${PLAN_SECTIONS.map(s => s.n + ": " + (v[s.k] || "(비어 있음)")).join("\n")}
JSON 하나만: {"good":"칭찬","fix":["보완1","보완2"],"weak":"가장 약한 루브릭 이름"}`;
    try { const o = parseJSON(await BE.ask(prompt)); if (!o) throw new Error("응답을 읽지 못했어요");
      $("#plFb", root).innerHTML = `<div class="feedback info"><b>잘한 점</b> ${esc(o.good || "")}<br><b>보완</b> ${esc((o.fix || []).join(" / "))}<br><b>가장 약한 루브릭</b> ${esc(o.weak || "")}</div>`;
    } catch (e) { $("#plFb", root).innerHTML = `<div class="feedback bad">AI 피드백을 받지 못했어요. 패들렛에서 동료 피드백을 받아 보세요.</div>`; }
  };
  $("#plPost", root).onclick = async () => {
    const v = vals(); const filled = Object.values(v).filter(x => x.length >= 4).length;
    if (filled < 3) { $("#plFb", root).innerHTML = `<div class="feedback bad">최소 3칸 이상 채워 주세요. (지금 ${filled}칸)</div>`; return; }
    $("#plPost", root).disabled = true;
    try {
      await BE.addPost({session: m.s, mission: m.id, kind: "plan", text: ($("#plTitle", root).value.trim() || $("#plLevel", root).value + " 지원 계획"), extra: Object.assign({level: $("#plLevel", root).value}, v)});
      api.finish(60 + filled * 8, `<p>계획 카드를 공유 광장에 담았어요. 패들렛에 올리고 동료 계획에 <b>현장성·실행성·협업성·보안성·포용성</b> 별점·댓글을 남겨 주세요.</p><p class="muted">공유 방식: 1분 발표 → 1분 피드백 → 계획서 1줄 수정</p>`);
    } catch (e) { toast("올리지 못했어요: " + e.message); $("#plPost", root).disabled = false; }
  };
};

/* ---------- M3-0 에듀원 접속 체크 ---------- */
GAMES.eduone = (root, api) => {
  const steps = ["eduone.busanedu.net 접속", "부여된 계정(이메일·구글 연동)으로 로그인", "클래스 / 과목 화면 확인", "엔트리 실습 화면 열어 보기 (선택)"];
  root.innerHTML = `<div class="panel" style="display:flex;flex-direction:column;gap:12px">
    <div class="row"><a class="btn primary" href="https://eduone.busanedu.net" target="_blank" rel="noopener">에듀원 2.0 새 탭으로 열기 ↗</a><span class="mono muted">eduone.busanedu.net</span></div>
    <p class="muted" style="margin:0">부산시교육청이 운영하는 웹 기반 코딩 학습 플랫폼(2023~). 개발도구 설치 없이 코딩 학습이 가능해요.</p>
    ${steps.map((s, i) => `<label class="row" style="gap:10px;font-size:16px"><input type="checkbox" id="eo${i}" style="width:20px;height:20px;accent-color:var(--orange)"> ${esc(s)}</label>`).join("")}
    <div class="feedback info"><b>접속이 안 되면?</b> ① 브라우저 캐시 삭제 → ② 크롬 시크릿 모드 → ③ 같은 공유기의 영상 시청 등 불필요한 사용 중지. 시험 전에는 기기 시간이 ‘자동 설정’인지 확인!</div>
    <div class="row"><button class="btn primary" id="eoDone" type="button">체크 완료</button></div>
  </div>`;
  $("#eoDone", root).onclick = () => {
    const n = steps.filter((_, i) => $("#eo" + i, root).checked).length;
    if (n < 2) { toast("접속과 로그인까지는 체크해 주세요"); return; }
    api.finish(n / steps.length * 100, `<p>체크 ${n}/4. 접속 문제가 있었다면 그것도 소중한 현장 데이터예요. 공유 광장 메모나 패들렛에 증상을 남겨 주세요.</p>`);
  };
};

/* ---------- M3-1 기능 카드 뒤집기 ---------- */
GAMES.memory = (root, api) => {
  const cards = shuffle(MEM_PAIRS.flatMap(p => [{k: p.k, t: p.f, feat: true}, {k: p.k, t: p.d, feat: false}]));
  let open = [], matched = 0, moves = 0, lock = false;
  root.innerHTML = `${howto(`카드 두 장을 뒤집어 <b>기능 이름</b>과 <b>설명</b>을 짝지어요. 적게 뒤집을수록 점수가 높아요.`)}
    <div class="hud"><span class="stat">뒤집기<b class="tnum" id="mmM">0</b></span><span class="stat">짝<b class="tnum" id="mmP">0/4</b></span></div>
    <div class="mem" id="mem">${cards.map((c, i) => `<button class="mcell" type="button" data-i="${i}" aria-label="카드 ${i + 1}"><span class="in"><span class="f">?</span><span class="b ${c.feat ? "feat" : ""}">${esc(c.t)}</span></span></button>`).join("")}</div><div id="mmFb"></div>`;
  $("#mem", root).addEventListener("click", e => {
    const b = e.target.closest(".mcell"); if (!b || lock || b.classList.contains("open")) return;
    b.classList.add("open"); open.push(b);
    if (open.length === 2) {
      moves++; $("#mmM", root).textContent = moves;
      const [a, c] = open.map(x => cards[+x.dataset.i]);
      if (a.k === c.k && a.feat !== c.feat) {
        open.forEach(x => x.classList.add("matched")); open = []; matched++; $("#mmP", root).textContent = matched + "/4";
        const p = MEM_PAIRS.find(x => x.k === a.k); $("#mmFb", root).innerHTML = `<div class="feedback ok"><b>${esc(p.f)}</b> ${esc(p.d)}</div>`;
        if (matched === 4) api.later(() => api.finish(clamp(100 - (moves - 4) * 7, 40, 100), `<p>${moves}번 만에 4쌍 완성!</p><ul class="list-tight">${MEM_PAIRS.map(p => `<li><b>${esc(p.f)}</b> — ${esc(p.d)}</li>`).join("")}</ul>`), 900);
      } else { lock = true; setTimeout(() => { open.forEach(x => x.classList.remove("open")); open = []; lock = false; }, 900); }
    }
  });
};

/* ---------- M3-2 구조 쌓기 ---------- */
GAMES.stack = (root, api) => {
  let next = 0, mistakes = 0;
  const order = STACK_LEVELS.map((l, i) => Object.assign({i}, l));
  root.innerHTML = `${howto(`<b>1단계</b> 가장 큰 단위부터 블록을 차례로 누르세요. <b>2단계</b> 문장을 기존 방식과 새 방식으로 나눠요. 비유: 클래스는 <b>플레이리스트</b>, 과목은 거기 담는 <b>앨범</b>이에요.`)}
  <div class="two"><div class="panel"><b>블록</b><div class="blocks" id="stB" style="margin-top:10px">${shuffle(order).map(l => `<button class="blk" type="button" data-i="${l.i}">${esc(l.n)}</button>`).join("")}</div><div id="stFb"></div></div>
    <div class="panel"><b>구조 시각화</b><div id="stNest" style="margin-top:10px"><p class="muted">블록을 누르면 여기에 쌓여요.</p></div></div></div>
  <div class="panel" id="stPart2" style="margin-top:12px" hidden></div>`;
  const drawNest = () => {
    const levels = STACK_LEVELS.slice(0, next);
    const build = (k) => k >= levels.length ? "" : `<div class="layer l${k + 1}"><div class="ln">Level ${k + 1} · ${esc(levels[k].n)}</div><div class="ld">${esc(levels[k].d)}</div>${build(k + 1)}</div>`;
    $("#stNest", root).innerHTML = levels.length ? `<div class="nest">${build(0)}</div>` : "";
  };
  $("#stB", root).addEventListener("click", e => {
    const b = e.target.closest(".blk"); if (!b || b.disabled) return;
    if (+b.dataset.i === next) { b.disabled = true; next++; drawNest(); $("#stFb", root).innerHTML = ""; if (next === 4) part2(); }
    else { mistakes++; b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 350); $("#stFb", root).innerHTML = `<div class="feedback bad">더 큰 단위가 먼저예요.</div>`; }
  });
  const part2 = () => {
    const items = shuffle(MODEL_ITEMS); let k = 0, right = 0;
    const p = $("#stPart2", root); p.hidden = false;
    const show = () => {
      if (k >= items.length) {
        const score = Math.max(10, 50 - mistakes * 10) + right / items.length * 50;
        api.later(() => api.finish(score, `<p><b>클래스 → 과목 → 단원(차시) → 수업 자료</b></p><p>기존 과목 중심은 과목에 학생을 배정해 융합 지도가 어렵고 과목이 중복 생성됐어요. 새 클래스 중심은 콘텐츠 풀에서 과목을 골라 클래스에 담아, 여러 과목 콘텐츠를 자유롭게 섞어요.</p>`), 800);
        return;
      }
      p.innerHTML = `<b>2단계 · 어느 방식일까?</b> <span class="muted tnum">${k + 1}/${items.length}</span><div class="card-big" style="margin:10px 0">${esc(items[k].t)}</div>
        <div class="row"><button class="btn" type="button" data-a="old">기존 · 과목 중심</button><button class="btn navy" type="button" data-a="new">새 · 클래스 중심</button></div><div id="st2Fb"></div>`;
      $$("[data-a]", p).forEach(b => b.onclick = () => {
        const ok = b.dataset.a === items[k].a; if (ok) right++;
        $("#st2Fb", p).innerHTML = `<div class="feedback ${ok ? "ok" : "bad"}">${ok ? "정답!" : "반대예요."}</div>`;
        $$("[data-a]", p).forEach(x => x.disabled = true); k++; setTimeout(show, ok ? 700 : 1300);
      });
    };
    show();
  };
};

/* ---------- M3-3 타임싱크 실험실 ---------- */
GAMES.timesync = (root, api) => {
  const OPEN = 600, CLOSE = 620; // 10:00 ~ 10:20 (분 단위)
  const tried = new Set(); let running = false; let qDone = false; let qOk = false;
  const fmt = (min) => { let t = Math.round(min * 60); t = ((t % 86400) + 86400) % 86400; const h = Math.floor(t / 3600), mm = Math.floor(t % 3600 / 60), ss = t % 60; return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0"); };
  root.innerHTML = `${howto(`시험 응시 기간은 <b>서버 시간 10:00~10:20</b>. 학생 기기 시계를 앞뒤로 틀어 놓고 실행해 보세요. <b>빠른 시계와 느린 시계</b>를 모두 실험하면 질문이 열려요.`)}
  <div class="panel">
    <div class="field"><label for="tsOff">학생 기기 시계 차이: <b id="tsOffV" class="tnum">+5분 빠름</b></label><input type="range" id="tsOff" min="-10" max="10" step="1" value="5"></div>
    <div class="clocks" style="margin-top:12px"><div class="clock"><div class="cl">에듀원 서버 시간</div><div class="ct tnum" id="tsSrv">09:58:00</div></div><div class="clock"><div class="cl">학생 기기 시간</div><div class="ct tnum" id="tsDev">10:03:00</div></div></div>
    <div class="timeline" id="tsTL" aria-hidden="true"></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="tsRun" type="button">시험 시뮬레이션 실행</button><span class="muted" style="font-size:13px">학생은 자기 화면 기준 10:19에 제출 버튼을 눌러요.</span></div>
    <div id="tsLog"></div>
  </div>
  <div class="panel" id="tsQ" style="margin-top:12px" hidden></div>`;
  const off = () => +$("#tsOff", root).value;
  const pos = (min) => ((min - 590) / 40 * 100);
  const drawTL = (now) => {
    const o = off();
    $("#tsTL", root).innerHTML = `
      <div class="tl srv" style="left:${pos(OPEN)}%;width:${pos(CLOSE) - pos(OPEN)}%">서버 응시 기간</div>
      <div class="tl dev" style="left:${clamp(pos(OPEN - o), 0, 100)}%;width:${Math.max(0, Math.min(pos(CLOSE - o), 100) - clamp(pos(OPEN - o), 0, 100))}%">학생 화면이 믿는 기간</div>
      ${now != null ? `<div class="now" style="left:${pos(now)}%"></div>` : ""}
      ${[595, 600, 605, 610, 615, 620, 625].map(t => `<span class="tick" style="left:${pos(t)}%">${fmt(t).slice(0, 5)}</span>`).join("")}`;
  };
  const updOff = () => { const o = off(); $("#tsOffV", root).textContent = o === 0 ? "정확히 일치" : (o > 0 ? "+" + o + "분 빠름" : o + "분 느림"); $("#tsSrv", root).textContent = fmt(598); $("#tsDev", root).textContent = fmt(598 + o); drawTL(null); };
  $("#tsOff", root).oninput = updOff; updOff();
  $("#tsRun", root).onclick = () => {
    if (running) return; running = true; $("#tsRun", root).disabled = true; $("#tsOff", root).disabled = true;
    const o = off(); let srv = 598; const log = [];
    const submitAtSrv = 619 - o; // 학생 화면 10:19 = 서버 10:19 - o
    const forceAtSrv = CLOSE - o; // 학생 화면이 10:20이라 믿는 순간
    let submitted = false, forced = false;
    const t = api.timer(() => {
      srv += 0.25; // 0.08초마다 15초
      $("#tsSrv", root).textContent = fmt(srv); $("#tsDev", root).textContent = fmt(srv + o); drawTL(srv);
      if (!forced && o > 0 && srv >= forceAtSrv && srv < CLOSE) { forced = true; log.push(`<b>${fmt(srv).slice(0, 5)}</b> 학생 화면: ‘응시 시간이 끝났습니다’ → <b>시험 강제 종료</b>. 서버 기준으로는 아직 ${Math.round(CLOSE - srv)}분 남았어요.`); }
      if (!submitted && srv >= submitAtSrv) {
        submitted = true;
        if (o > 0) log.push(`학생은 화면 기준 10:19에 제출하려 했지만 이미 ${o}분 일찍 시험이 닫혔어요. <b>${o}분을 잃었어요.</b>`);
        else if (o < 0) log.push(`<b>${fmt(srv).slice(0, 5)}</b> 학생 화면 10:19에 제출 → 서버는 이미 10:20을 넘김 → <b>‘응시 기간이 아닙니다’ 제출 오류</b>.`);
        else log.push(`<b>${fmt(srv).slice(0, 5)}</b> 화면과 서버가 같은 시간 → <b>정상 제출</b>.`);
      }
      $("#tsLog", root).innerHTML = log.length ? `<div class="feedback ${o === 0 ? "ok" : "bad"}">${log.join("<br>")}</div>` : "";
      if (srv >= 624) {
        clearInterval(t); running = false; $("#tsRun", root).disabled = false; $("#tsOff", root).disabled = false;
        tried.add(o > 0 ? "+" : o < 0 ? "-" : "0");
        if (tried.has("+") && tried.has("-")) showQ(); else $("#tsLog", root).insertAdjacentHTML("beforeend", `<p class="muted" style="font-size:13px">이번엔 ${o >= 0 ? "느린 시계(왼쪽)" : "빠른 시계(오른쪽)"}로도 실험해 보세요.</p>`);
      }
    }, 80);
  };
  const showQ = () => {
    const q = $("#tsQ", root); if (!q.hidden) return; q.hidden = false;
    const opts = ["시험 직전에 화면 밝기를 최대로 맞춘다", "수업 전에 학생 기기의 날짜·시간이 ‘자동 설정’으로 서버 시간과 일치하는지 확인한다", "시험 중 시계가 틀리면 튜터가 대신 제출한다", "시험 시간을 넉넉히 30분 늘려 달라고 한다"];
    q.innerHTML = `<div class="qtitle">그래서 디지털 튜터는 수업 전에 무엇을 해야 할까?</div>${opts.map((o, k) => `<button class="qopt" type="button" data-k="${k}">${esc(o)}</button>`).join("")}<div id="tsQFb"></div>`;
    $$(".qopt", q).forEach(b => b.onclick = () => {
      if (qDone) return; qDone = true; qOk = +b.dataset.k === 1;
      $$(".qopt", q).forEach(x => { if (+x.dataset.k === 1) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); x.disabled = true; });
      $("#tsQFb", q).innerHTML = `<div class="feedback ${qOk ? "ok" : "bad"}"><b>Time Sync – Critical</b> 기기 시간이 서버와 다르면 시험 강제 종료·과제 제출 오류가 생길 수 있어요.</div><div class="row" style="margin-top:10px"><button class="btn primary" id="tsDone" type="button">결과 받기</button></div>`;
      $("#tsDone", q).onclick = () => api.finish(50 + (qOk ? 50 : 15), `<ul class="list-tight"><li><b>기기 시계가 빠르면</b> 학생 화면에서 시험이 일찍 강제 종료돼요.</li><li><b>기기 시계가 느리면</b> 서버 마감 뒤에 제출해 ‘응시 기간이 아닙니다’ 오류가 나요.</li><li><b>수업 전 조치</b> 계정·권한 점검, 네트워크 점검, 서버 시간 동기화 점검.</li></ul>`);
    });
  };
};

/* ---------- M3-4 위기 대응 시뮬레이터 ---------- */
GAMES.crisis = (root, api, m) => {
  const st = {}; CRISIS.forEach(c => st[c.id] = {picked: [], checked: false, firstOk: null});
  let cur = CRISIS[0].id;
  root.innerHTML = `${howto(`IF 카드를 고르고, 아래 조치 카드를 <b>해야 할 순서대로</b> 눌러 칸을 채운 뒤 확인하세요. 엉뚱한 카드도 섞여 있어요.`)}
    <div class="ifcard" id="crTabs">${CRISIS.map(c => `<button class="tbtn" type="button" data-c="${c.id}">${esc(c.name)}</button>`).join("")}</div>
    <div class="panel" id="crBox"></div>
    <div class="panel" style="margin-top:12px"><b>실전 연습: 패닉에 빠진 AI 학생</b><p class="muted" style="margin:4px 0 10px;font-size:14px">매뉴얼을 말로 옮겨 보는 시간. 학생의 게이지를 올려 보세요.</p>
      <div class="plist">${PERSONAS.filter(p => p.s === "s4").map(personaCardHTML).join("")}</div></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="crDone" type="button">위기 대응 결과 받기</button></div>`;
  const draw = () => {
    const c = CRISIS.find(x => x.id === cur), s = st[cur];
    $$("#crTabs .tbtn", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.c === cur ? "true" : "false"));
    if (!s.pool) s.pool = shuffle(c.steps.concat(c.decoys));
    $("#crBox", root).innerHTML = `<b class="display" style="font-size:22px">${esc(c.name)}</b>
      <div class="slots">${c.steps.map((_, i) => { const v = s.picked[i]; const cls = s.checked ? (v === c.steps[i] ? "right" : "wrong") : v ? "filled" : ""; return `<div class="slot ${cls}"><span class="sn">${i + 1}차</span><span>${v ? esc(v) : '<span class="muted">조치 카드를 누르세요</span>'}</span></div>`; }).join("")}</div>
      <div class="pool">${s.pool.map(p => `<button class="pbtn" type="button" ${s.picked.includes(p) || s.checked ? "disabled" : ""}>${esc(p)}</button>`).join("")}</div>
      <div class="row" style="margin-top:10px"><button class="btn navy" id="crCheck" type="button" ${s.picked.length === c.steps.length && !s.checked ? "" : "disabled"}>확인</button><button class="btn" id="crReset" type="button">다시 놓기</button></div>
      ${s.checked ? `<div class="feedback ${s.picked.every((v, i) => v === c.steps[i]) ? "ok" : "bad"}"><b>${s.picked.every((v, i) => v === c.steps[i]) ? "매뉴얼 그대로!" : "정답 순서"}</b> ${c.steps.map((x, i) => (i + 1) + ". " + esc(x)).join(" → ")}<br><span style="font-size:13px">${esc(c.tip)}</span></div>` : ""}`;
    $$(".pbtn", root).forEach(b => b.onclick = () => { if (s.picked.length < c.steps.length) { s.picked.push(b.textContent); draw(); } });
    $("#crCheck", root).onclick = () => { s.checked = true; const ok = s.picked.every((v, i) => v === c.steps[i]); if (s.firstOk === null) s.firstOk = s.picked.filter((v, i) => v === c.steps[i]).length / c.steps.length; draw(); if (ok) toast("정확해요!"); };
    $("#crReset", root).onclick = () => { s.picked = []; s.checked = false; draw(); };
  };
  $("#crTabs", root).addEventListener("click", e => { const b = e.target.closest(".tbtn"); if (b) { cur = b.dataset.c; draw(); } });
  draw();
  root.addEventListener("click", e => { const p = e.target.closest(".pcard"); if (p) startPersona(PERSONAS.find(x => x.id === p.dataset.p), root, api, m); });
  $("#crDone", root).onclick = () => {
    const done = CRISIS.filter(c => st[c.id].firstOk !== null);
    if (done.length < CRISIS.length) { toast("IF 카드 3개를 모두 확인해 주세요"); return; }
    const avg = done.reduce((a, c) => a + st[c.id].firstOk, 0) / done.length;
    api.finish(avg * 100, `<ul class="list-tight">${CRISIS.map(c => `<li><b>${esc(c.name)}</b> ${c.steps.map(esc).join(" → ")}</li>`).join("")}</ul><p class="muted">점수는 첫 시도의 정확도예요.</p>`);
  };
};

/* ---------- M3-5 나의 첫 클래스 인증 ---------- */
GAMES.classpost = (root, api, m) => {
  const steps = ["새로만들기로 과목(또는 시험·챌린지) 개설", "단원 설정: 제목·소개·날짜 입력 후 만들기", "수업 자료 추가 (프로그래밍 실습 등)", "클래스를 만들어 과목과 학생 등록"];
  const picked = new Set();
  root.innerHTML = `${howto(`<a href="https://eduone.busanedu.net" target="_blank" rel="noopener"><b>에듀원 2.0</b></a>에서 직접 만들어 보고, 만든 구성을 인증해요. 시험은 <b>응시 기간 설정이 필수</b>!`)}
  <div class="two">
    <div class="panel" style="display:flex;flex-direction:column;gap:10px"><b>제작 체크</b>
      ${steps.map((s, i) => `<label class="row" style="gap:10px"><input type="checkbox" id="cp${i}" style="width:20px;height:20px;accent-color:var(--orange)"> ${esc(s)}</label>`).join("")}
      <p class="muted" style="font-size:13px;margin:4px 0 0">구조: 클래스 → 과목 → 단원(차시) → 수업 자료</p></div>
    <div class="panel" style="display:flex;flex-direction:column;gap:12px">
      <div class="field"><label for="cpName">클래스 이름</label><input class="input" id="cpName" maxlength="40" placeholder="예: 5학년 엔트리 첫걸음"></div>
      <div class="field"><label>담은 자료 유형</label><div class="chips" id="cpTypes">${EDUONE_TYPES.map(t => `<button class="schip" type="button" aria-pressed="false">${esc(t)}</button>`).join("")}</div></div>
      <div class="field"><label for="cpMemo">한 줄 소감 · 막힌 점</label><textarea class="input" id="cpMemo" rows="3" placeholder="예: 단원 날짜를 안 넣어서 만들기가 안 눌렸어요"></textarea></div>
      <button class="btn primary" id="cpPost" type="button">클래스 인증 카드 만들기</button>
    </div></div>`;
  $("#cpTypes", root).addEventListener("click", e => { const c = e.target.closest(".schip"); if (!c) return; const on = c.getAttribute("aria-pressed") !== "true"; c.setAttribute("aria-pressed", String(on)); on ? picked.add(c.textContent) : picked.delete(c.textContent); });
  $("#cpPost", root).onclick = async () => {
    const name = $("#cpName", root).value.trim(); const memo = $("#cpMemo", root).value.trim();
    const n = steps.filter((_, i) => $("#cp" + i, root).checked).length;
    if (!name) { toast("클래스 이름을 적어 주세요"); $("#cpName", root).focus(); return; }
    $("#cpPost", root).disabled = true;
    try {
      await BE.addPost({session: m.s, mission: m.id, kind: "class", text: memo, extra: {name, types: Array.from(picked), steps: n}});
      api.finish(40 + n * 15, `<p><b>${esc(name)}</b> 인증 완료! 제작 체크 ${n}/4.</p><p class="muted">막힌 점은 다음 연수생에게 가장 좋은 튜터링 자료가 돼요.</p>`);
    } catch (e) { toast("올리지 못했어요: " + e.message); $("#cpPost", root).disabled = false; }
  };
};
