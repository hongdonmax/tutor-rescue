/* ===================== 페르소나 롤플레이 ===================== */
function personaCardHTML(p) {
  return `<button class="pcard" type="button" data-p="${p.id}">${avatarIMG(p, p.start, 56)}
    <span style="min-width:0"><span class="tag">${esc(p.role)}</span><span class="who" style="display:block">${esc(p.name)}</span><span class="sit">${esc(p.sit)}</span></span></button>`;
}

GAMES.persona = (root, api, m) => {
  const mine = PERSONAS.filter(p => p.s === m.s), others = PERSONAS.filter(p => p.s !== m.s);
  root.innerHTML = `${howto(BE.ai
      ? `<b>AI 페르소나 연결됨.</b> 인물에게 직접 말을 걸어 보세요. 말 한마디마다 게이지가 움직이고 선배 튜터 코치가 한 줄 피드백을 줘요.`
      : `<b>세 갈래 대응 중 하나</b>를 골라 대화를 이어 가요. 좋은 대응이면 게이지가 오르고 표정이 밝아져요. 고를 때마다 선배 튜터 코치가 한 줄 피드백을 줘요.`)}
    <div class="plist">${mine.map(personaCardHTML).join("")}</div>
    <details style="margin-top:16px"><summary class="muted" style="cursor:pointer;font-weight:700">다른 차시 페르소나도 만나 보기</summary><div class="plist" style="margin-top:10px">${others.map(personaCardHTML).join("")}</div></details>`;
  root.onclick = e => { const c = e.target.closest(".pcard"); if (c) { root.onclick = null; startPersona(PERSONAS.find(x => x.id === c.dataset.p), root, api, m); } };
};

function startPersona(p, root, api, m) {
  const S = {g: p.start, turns: [], round: 0, mode: BE.ai ? "ai" : "choice", busy: false, picks: [], ended: false};
  root.onclick = null;
  root.innerHTML = `<div class="chatwrap">
    <aside class="pside">
      <div class="panel p-who" style="display:flex;gap:12px;align-items:center;padding:14px"><span id="pAv">${avatarIMG(p, S.g, 84)}</span>
        <div style="min-width:0"><div class="tag" style="font-size:12px;font-weight:700;color:var(--orange-ink)">${esc(p.role)}</div><div class="display" style="font-size:26px">${esc(p.name)}</div></div></div>
      <div class="gauge"><div class="gl"><span>${esc(p.gaugeName)}</span><span class="gv tnum" id="pGv">${S.g}</span></div><div class="track"><i id="pGb" style="width:${S.g}%"></i></div></div>
      <div class="panel p-sit" style="padding:12px 14px;font-size:14px"><b>상황</b><p style="margin:4px 0 8px">${esc(p.sit)}</p><b>목표</b><p style="margin:4px 0 0">${esc(p.goal)}</p></div>
      ${BE.ai ? `<div class="modeswitch" role="group" aria-label="대화 방식"><button type="button" data-mode="ai" aria-pressed="${S.mode === "ai"}">자유 대화</button><button type="button" data-mode="choice" aria-pressed="${S.mode === "choice"}">선택지</button></div>` : ""}
      <button class="btn p-btn" id="pEnd" type="button">대화 마치고 코칭 받기</button>
      <button class="btn sm p-btn" id="pBack" type="button">다른 인물 고르기</button>
    </aside>
    <section class="chat"><div class="msgs" id="pMsgs" aria-live="polite"></div><div class="composer" id="pComp"></div></section>
  </div>`;
  const msgs = $("#pMsgs", root);
  const add = (cls, text, who) => {
    const d = document.createElement("div"); d.className = cls === "coach" ? "coach" : "msg " + cls;
    if (cls === "coach") d.innerHTML = `<b>COACH</b>${esc(text)}`; else d.textContent = text;
    if (cls === "stu") { const row = document.createElement("div"); row.className = "msgrow"; row.innerHTML = avatarIMG(p, S.g, 38); row.appendChild(d); msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight; return row; }
    if (cls === "tut") { const row = document.createElement("div"); row.className = "msgrow me"; row.appendChild(d); row.insertAdjacentHTML("beforeend", `<span class="ava me" style="--s:38px"><img src="assets/people/narae_face.webp" alt="" onerror="this.parentNode.remove()"></span>`); msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight; return row; }
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  };
  const setG = (v) => { S.g = clamp(Math.round(v), 0, 100); $("#pGv", root).textContent = S.g; $("#pGb", root).style.width = S.g + "%"; $("#pAv", root).innerHTML = avatarIMG(p, S.g, 84); };
  add("sys", `${p.name}와(과)의 대화를 시작해요`);
  add("stu", p.opening); S.turns.push({who: "student", text: p.opening});

  const comp = $("#pComp", root);
  const renderComposer = () => {
    if (S.ended) { comp.innerHTML = ""; return; }
    if (S.mode === "choice") {
      const r = p.rounds[S.round];
      if (!r) { comp.innerHTML = `<button class="btn primary" type="button" id="pFin">코칭 받기</button>`; $("#pFin", root).onclick = debrief; return; }
      comp.innerHTML = `<div class="opts">${shuffle(r.o.map((o, i) => Object.assign({i}, o))).map(o => `<button class="opt" type="button" data-i="${o.i}">${esc(o.t)}</button>`).join("")}</div>`;
      $$(".opt", comp).forEach(b => b.onclick = () => pickChoice(+b.dataset.i));
    } else {
      comp.innerHTML = `<div class="row" style="align-items:stretch"><textarea class="input" id="pIn" rows="2" maxlength="300" placeholder="${esc(p.name)}에게 할 말을 적어 보세요 (Enter 보내기, Shift+Enter 줄바꿈)" style="flex:1;min-width:200px"></textarea><button class="btn primary" id="pSend" type="button">보내기</button></div><span class="typing" id="pTyping"></span>`;
      const send = () => { const v = $("#pIn", root).value.trim(); if (v && !S.busy) { $("#pIn", root).value = ""; sendAI(v); } };
      $("#pSend", root).onclick = send;
      $("#pIn", root).onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
      $("#pIn", root).focus();
    }
  };
  const pickChoice = (i) => {
    const r = p.rounds[S.round], o = r.o[i];
    add("tut", o.t); S.turns.push({who: "tutor", text: o.t});
    setG(S.g + o.d); S.picks.push({o, best: Math.max(...r.o.map(x => x.d)) === o.d, bestLine: r.o.reduce((a, b) => b.d > a.d ? b : a).t});
    comp.innerHTML = "";
    setTimeout(() => {
      add("stu", o.r); S.turns.push({who: "student", text: o.r}); add("coach", o.c);
      S.round++;
      const nx = p.rounds[S.round];
      if (nx) setTimeout(() => { add("stu", nx.s); S.turns.push({who: "student", text: nx.s}); renderComposer(); }, 700);
      else renderComposer();
    }, 450);
  };
  const transcript = () => S.turns.map(t => (t.who === "tutor" ? "튜터: " : p.name + ": ") + t.text).join("\n");
  const sendAI = async (text) => {
    S.busy = true; const tutEl = add("tut", text); S.turns.push({who: "tutor", text});
    $("#pTyping", root).textContent = `${p.name}이(가) 생각하는 중…`;
    const nTutor = S.turns.filter(t => t.who === "tutor").length;
    const prompt = `너는 디지털튜터 양성 연수의 롤플레이에서 ‘${p.name}(${p.role})’ 역할을 맡는다.
인물 설정: ${p.brief}
상황: ${p.sit}
연수생(디지털튜터)이 ${p.name}에게 말을 건다. ${p.name}으로서 자연스러운 한국어 구어체로 1~2문장만 답하라. 학생이면 그 나이 아이의 말투를 쓰고 괄호로 짧은 행동 묘사를 넣어도 된다. 인물에서 벗어나 튜터를 가르치거나 칭찬하지 마라.
튜터의 목표: ${p.goal}
평가 기준(교안 원칙): ${p.criteria}
현재 ${p.gaugeName}: ${S.g} (0~100)
지금까지의 대화:
${transcript()}
규칙: 튜터의 마지막 말이 평가 기준에 맞으면 ${p.gaugeName}를 5~25 올리고, 어긋나면(대신 해 주기, 재촉·비교, 공개 지적, 개인정보 노출, 수업 흐름 방해, 교사 역할 침범 등) 5~25 내린다. 애매하면 -5~+5. 목표가 달성되었거나 튜터 발화가 ${nTutor >= 6 ? "이미 6번을 넘었으면" : "6번을 넘으면"} done을 true로.
반드시 JSON 하나만 출력: {"reply":"${p.name}의 대답","gauge":0~100 정수,"coach":"선배 튜터의 한 줄 코칭(40자 안팎, 교안 원칙 이름 포함)","done":false}`;
    try {
      const o = parseJSON(await BE.ask(prompt));
      if (!o || !o.reply) throw new Error("응답을 읽지 못했어요");
      $("#pTyping", root).textContent = "";
      add("stu", o.reply); S.turns.push({who: "student", text: o.reply});
      if (typeof o.gauge === "number") setG(o.gauge);
      if (o.coach) add("coach", o.coach);
      if (o.done || nTutor >= 7) { add("sys", "목표에 도달했어요. ‘대화 마치고 코칭 받기’를 눌러 보세요."); }
    } catch (e) {
      $("#pTyping", root).textContent = "";
      S.turns.pop(); tutEl.remove();
      add("sys", "AI 응답을 받지 못했어요. 잠시 후 다시 보내 주세요." + (e && e.message ? " (" + e.message + ")" : ""));
      const inp = $("#pIn", root); if (inp && !inp.value) inp.value = text;
    }
    S.busy = false;
  };
  const debrief = async () => {
    if (S.ended) return; S.ended = true; renderComposer();
    const box = document.createElement("div"); box.className = "panel pop"; box.style.marginTop = "14px";
    root.appendChild(box); box.scrollIntoView({behavior: "smooth", block: "start"});
    let good = [], better = [], bestLine = "", modelLine = "", stars = Math.max(1, Math.round(S.g / 20));
    const tutorLines = S.turns.filter(t => t.who === "tutor").map(t => t.text);
    if (S.mode === "ai" && tutorLines.length && BE.ai) {
      box.innerHTML = `<p class="typing">선배 튜터 코치가 대화를 읽고 있어요…</p>`;
      const prompt = `디지털튜터 연수 롤플레이 대화를 교안 원칙으로 평가하라.
인물: ${p.name}(${p.role}) / 목표: ${p.goal}
평가 기준: ${p.criteria}
대화:
${transcript()}
최종 ${p.gaugeName}: ${S.g}
JSON 하나만 출력: {"stars":1~5 정수,"good":["잘한 점(최대 2개, 각 40자 이내)"],"better":["바꾸면 좋을 점(최대 2개, 각 40자 이내)"],"best_line":"튜터가 실제로 한 말 중 가장 좋은 문장 그대로(없으면 빈 문자열)","model_line":"이 상황의 모범 튜터 문장 한 개"}`;
      try { const o = parseJSON(await BE.ask(prompt)) || {}; good = o.good || []; better = o.better || []; bestLine = o.best_line || ""; modelLine = o.model_line || ""; if (o.stars) stars = clamp(+o.stars, 1, 5); } catch (e) {}
    } else {
      S.picks.forEach(k => { (k.best ? good : better).push(k.o.c); });
      const top = S.picks.filter(k => k.best).map(k => k.o.t); bestLine = top[0] || "";
      const miss = S.picks.find(k => !k.best); modelLine = miss ? miss.bestLine : "";
    }
    if (!bestLine && tutorLines.length) bestLine = tutorLines[tutorLines.length - 1];
    box.innerHTML = `<div class="row"><span class="display" style="font-size:26px">코칭 리포트</span><span class="display" style="font-size:24px;color:var(--orange);margin-left:auto">${"★".repeat(stars)}<span style="color:var(--line)">${"★".repeat(5 - stars)}</span></span></div>
      <div class="two" style="margin-top:10px">
        <div><b style="color:var(--ok)">잘한 점</b><ul class="list-tight">${(good.length ? good : ["대화를 끝까지 이어 갔어요."]).slice(0, 3).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><b style="color:var(--bad)">바꾸면 좋을 점</b><ul class="list-tight">${(better.length ? better : ["다음엔 더 짧고 구체적인 한 문장으로!"]).slice(0, 3).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
      ${modelLine ? `<div class="feedback info"><b>모범 문장</b> “${esc(modelLine)}”</div>` : ""}
      <div class="field" style="margin-top:12px"><label for="pShare">공유 광장에 담을 나의 좋은 대응 문장</label><textarea class="input" id="pShare" rows="2" maxlength="200">${esc(bestLine)}</textarea></div>
      <div class="row" style="margin-top:10px"><button class="btn" id="pPost" type="button">공유 광장에 담기</button><button class="btn primary" id="pDone" type="button">미션 완료 (${S.g}점)</button><button class="btn sm" id="pRetry" type="button">같은 인물 다시</button></div>`;
    $("#pPost", root).onclick = async () => {
      const v = $("#pShare", root).value.trim(); if (!v) return;
      try { await BE.addPost({session: m.s, mission: m.id, kind: "line", text: v, extra: {persona: p.name, role: p.role, gauge: S.g}}); toast("공유 광장에 담았어요"); $("#pPost", root).disabled = true; } catch (e) { toast("올리지 못했어요"); }
    };
    $("#pDone", root).onclick = () => api.finish(S.g, `<p><b>${esc(p.name)}</b>의 ${esc(p.gaugeName)} <b>${p.start} → ${S.g}</b></p><p class="muted">원칙: “대신 가르치기”가 아니라 “배움의 접속을 보장하기”.</p>`);
    $("#pRetry", root).onclick = () => startPersona(p, root, api, m);
  };
  $$(".modeswitch button", root).forEach(b => b.onclick = () => {
    if (S.turns.some(t => t.who === "tutor")) { toast("대화를 시작한 뒤에는 방식을 바꿀 수 없어요"); return; }
    S.mode = b.dataset.mode; $$(".modeswitch button", root).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    if (S.mode === "choice" && S.round === 0) { /* 첫 학생 대사는 이미 표시됨 */ }
    renderComposer();
  });
  $("#pEnd", root).onclick = () => { if (!S.turns.some(t => t.who === "tutor")) { toast("먼저 한마디 건네 보세요"); return; } debrief(); };
  $("#pBack", root).onclick = () => { if (m.kind === "crisis") openMission(m.id); else GAMES.persona(root, api, m); };
  renderComposer();
}
