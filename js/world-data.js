/* ===================== 게임 세계 데이터 ===================== */
// 지도 위 구역 (x, y = 지도 그림 기준 % 위치)
const ZONES = {
  s1: {no: "1", name: "튜터 본부", x: 19, y: 52, bg: "assets/bg/hq.webp", guide: "narae_wave",
       line: "튜터는 <b>대신 해 주는 사람</b>이 아니라 <b>배움의 접속을 지켜 주는 사람</b>이에요. 오늘은 우리의 사명을 세워요!"},
  s2: {no: "2", name: "보안 관제탑", x: 53, y: 27, bg: "assets/bg/security.webp", guide: "narae_wow",
       line: "빠른 해결보다 <b>안전한 해결</b>! 개인정보를 지키고, 막히면 <b>테크센터</b>에 정확히 알리는 법을 익혀요."},
  s4: {no: "4", name: "에듀원 클라우드 섬", x: 86, y: 40, bg: "assets/bg/eduone.webp", guide: "narae_thumb",
       line: "<b>클래스 → 과목 → 단원 → 자료</b>. 에듀원 2.0 구조를 알고, 무한 로딩에도 수업이 멈추지 않게 준비해요."}
};
const PLACES = {
  note: {name: "공유 광장", x: 59, y: 60, sub: "산출물 모아 보기 · 패들렛 공유"},
  cert: {name: "수료 무대", x: 18, y: 27, sub: "도장 21개 · 수료증"}
};

// 미션 종류 → 스티커 그림
const ICONS = {
  word: "talk", scan: "magnifier", sort: "boxes", persona: "headset", speed: "stopwatch", oath: "scroll", quiz: "question",
  hidden: "eye", ox: "ox", ticket: "ticket", plan: "blueprint", eduone: "wifi", memory: "cards", stack: "blocks",
  timesync: "clock", crisis: "siren", classpost: "medal"
};

// 페르소나 얼굴 [곤란, 밝음]
const PEOPLE_ART = {
  minjun: ["minjun_sad", "minjun_ok"], seoa: ["seoa_sad", "seoa_ok"], jihu: ["jihu_sad", "jihu_ok"],
  doyun: ["doyun_sad", "doyun_ok"], yuna: ["yuna_sad", "yuna_ok"], harin: ["harin_sad", "harin_ok"], taeo: ["taeo_sad", "taeo_ok"],
  teacherkim: ["teacherkim", "teacherkim"], park: ["park", "park"], han: ["han", "han"]
};

// 나래 튜터 한마디 (점수별)
const NARAE_SAY = {
  great: ["완벽해요! 현장에 바로 투입해도 되겠어요.", "이게 바로 튜터의 감각이죠!", "코비가 하트 눈이 됐어요!"],
  good: ["좋아요, 감 잡았어요!", "한두 개만 다듬으면 완벽해요.", "학생들이 든든해할 거예요."],
  retry: ["괜찮아요, 한 번 더 가 볼까요?", "틀린 자리가 오늘의 배움이에요.", "해설을 읽고 다시 도전!"]
};
