/**
 * 乙女島 完全実装版
 */

// --- データ定義 ---
const GIRLS_INIT = [
  { id: "sakuma",  name: "佐久間さくら", skill: "housework", max: 6, atk: "left",  img: "メイド" },
  { id: "edomon",  name: "エドモン子",   skill: "power",     max: 4, atk: "left",  img: "メスゴリラ" },
  { id: "tamago",  name: "黒谷たまご",   skill: "hunting",   max: 5, atk: "right", img: "ギャル" },
  { id: "osanai",  name: "小山内真澄",   skill: "hunting",   max: 5, atk: "left",  img: "ゴスロリ" },
  { id: "tomioka", name: "富岡静子",     skill: "housework", max: 6, atk: "right", img: "OL" }
];

const CHIP_DATA = {
  wood:      { color: "green",  label: "木" },
  vine:      { color: "green",  label: "蔦" },
  saw:       { color: "green",  label: "のこぎり" },
  berry:     { color: "pink",   label: "木の実" },
  storm:     { color: "yellow", label: "嵐" },
  hunting:   { color: "blue",   label: "狩り" },
  housework: { color: "gray",   label: "家事" },
  power:     { color: "gray",   label: "力仕事" }
};

// --- ゲーム状態 ---
let state = {
  round: 1,
  food: 2,
  phase: "event",
  girls: [],
  puzzle: [],
  flags: { berry: false, storm: false, housework: false, power: false },
  pendingChip: null,
  isMuted: false
};

// --- 初期化 ---
function init() {
  state.girls = GIRLS_INIT.map(g => ({ ...g, stress: g.max }));
  startRound();
}

function startRound() {
  state.flags = { berry: false, storm: false, housework: false, power: false };
  initPuzzle();
  setPhase("event");
}

function initPuzzle() {
  const chips = Object.keys(CHIP_DATA);
  do {
    state.puzzle = chips.sort(() => Math.random() - 0.5).concat([null]);
  } while (isPuzzleClear()); // 初期状態で揃っていたらやり直し
}

// --- フェイズ制御 ---
function setPhase(p) {
  state.phase = p;
  document.querySelectorAll('.phase').forEach(el => el.classList.remove('active'));
  document.getElementById(p + 'Phase').classList.add('active');

  if (p === "dinner") runDinner();
  if (p === "date") renderDate();
  if (p === "kill") runKill();
  render();
}

// --- イベントフェイズ (パズル) ---
function moveTile(idx) {
  if (state.phase !== "event") return;
  const emptyIdx = state.puzzle.indexOf(null);
  const diff = Math.abs(idx - emptyIdx);
  if (diff === 1 || diff === 3) {
    [state.puzzle[idx], state.puzzle[emptyIdx]] = [state.puzzle[emptyIdx], state.puzzle[idx]];
    applyChipEffect(state.puzzle[emptyIdx]);
    render();
    if (isPuzzleClear()) {
      setTimeout(() => setPhase("dinner"), 800);
    }
  }
}

function applyChipEffect(chip) {
  if (!chip) return;

  // 動かすたびに何度でも：狩り
  if (chip === "hunting") {
    state.pendingChip = "hunting";
    openGirlModal("作業する女の子を選択してください");
    return;
  }

  // 1回だけ：木の実、嵐、家事、力仕事
  if (state.flags[chip] === true) return; // 使用済みなら無視

  if (chip === "berry") {
    state.food += 1;
    state.flags.berry = true;
  } else if (chip === "storm") {
    state.girls.forEach(g => g.stress--);
    state.flags.storm = true;
  } else if (chip === "housework" || chip === "power") {
    state.pendingChip = chip;
    openGirlModal(`${CHIP_DATA[chip].label}をする女の子を選択`);
  }
}

function openGirlModal(title) {
  document.getElementById("modalTitle").textContent = title;
  const grid = document.getElementById("modalButtons");
  grid.innerHTML = "";

  state.girls.forEach((g, i) => {
    const card = createGirlCard(g);
    if (g.skill === state.pendingChip) card.classList.add("match");
    card.onclick = () => selectGirlForWork(i);
    grid.appendChild(card);
  });
  document.getElementById("girlModal").classList.remove("hidden");
}

function selectGirlForWork(idx) {
  const girl = state.girls[idx];
  const cost = (girl.skill === state.pendingChip) ? 1 : 2;
  girl.stress -= cost;

  if (state.pendingChip === "hunting") {
    state.food += 2;
  } else {
    state.flags[state.pendingChip] = true;
  }

  state.pendingChip = null;
  document.getElementById("girlModal").classList.add("hidden");
  render();
}

function isPuzzleClear() {
  const p = state.puzzle;
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]];
  const targets = ["wood", "vine", "saw"];
  return wins.some(line => targets.every(t => line.map(i => p[i]).includes(t)));
}

// --- ディナーフェイズ ---
function runDinner() {
  state.food -= 3;
  const msg = document.getElementById("dinnerMessage");
  if (state.food < 0) {
    state.girls.forEach(g => g.stress--);
    state.food = 0;
    msg.innerHTML = "🍴 食料が足りない！<br><small>全員のストレスが1減少しました</small>";
  } else {
    msg.textContent = "🍴 穏やかな夕食をとった。";
  }
  render();
  setTimeout(() => setPhase("date"), 1500);
}

// --- デートフェイズ ---
function renderDate() {
  if (state.girls.length <= 1) {
    setTimeout(() => setPhase("kill"), 800);
    return;
  }
  const list = document.getElementById("dateGirlList");
  list.innerHTML = "";
  state.girls.forEach((g, i) => {
    const card = createGirlCard(g);
    card.onclick = () => processDate(i);
    list.appendChild(card);
  });
}

function processDate(idx) {
  const girl = state.girls[idx];
  const recovery = girl.max - girl.stress;
  girl.stress = girl.max;

  const others = state.girls.filter((_, i) => i !== idx);
  const perPerson = Math.floor(recovery / others.length);
  let remainder = recovery % others.length;

  others.forEach(g => g.stress -= perPerson);

  if (remainder > 0) {
    askRemainder(others, remainder);
  } else {
    setPhase("kill");
  }
}

function skipDate() { setPhase("kill"); }

function askRemainder(candidates, amount) {
  document.getElementById("modalTitle").textContent = `残りの不満(${amount})を誰に割り振りますか？`;
  const grid = document.getElementById("modalButtons");
  grid.innerHTML = "";
  candidates.forEach(g => {
    const card = createGirlCard(g);
    card.onclick = () => {
      g.stress--;
      amount--;
      if (amount > 0) askRemainder(candidates, amount);
      else {
        document.getElementById("girlModal").classList.add("hidden");
        setPhase("kill");
      }
    };
    grid.appendChild(card);
  });
  document.getElementById("girlModal").classList.remove("hidden");
}

// --- 殺戮フェイズ ---
async function runKill() {
  const detail = document.getElementById("killDetail");
  let i = 0;
  while (i < state.girls.length) {
    renderKillVisuals();
    let girl = state.girls[i];
    
    if (girl.stress < 0) {
      detail.textContent = `${girl.name}のストレスが限界だ！`;
      await sleep(1000);
      
      let targetIdx = (girl.atk === "left") ? i - 1 : i + 1;
      
      if (targetIdx >= 0 && targetIdx < state.girls.length) {
        detail.textContent = `${girl.name}は隣の${state.girls[targetIdx].name}を殺害した...`;
        state.girls.splice(targetIdx, 1);
        girl.stress += 2;
        if (targetIdx < i) i--; // 自分が詰まった場合
        continue; // ストレス再チェック
      } else {
        detail.textContent = `${girl.name}は誰にもぶつけられず自滅した...`;
        state.girls.splice(i, 1);
        continue;
      }
    }
    i++;
  }
  
  detail.textContent = "殺戮は終わった。";
  await sleep(1000);
  
  if (state.girls.length === 0) endGame(false);
  else if (state.round >= 7) endGame(true);
  else {
    state.round++;
    startRound();
  }
}

function renderKillVisuals() {
  const v = document.getElementById("killVisuals");
  v.innerHTML = "";
  state.girls.forEach(g => v.appendChild(createGirlCard(g)));
}

// --- 共通描画 ---
function render() {
  document.getElementById("round").textContent = state.round;
  document.getElementById("food").textContent = state.food;
  document.getElementById("phaseLabel").textContent = state.phase.toUpperCase();

  if (state.phase === "event") {
    const p = document.getElementById("puzzle");
    p.innerHTML = "";
    state.puzzle.forEach((chip, i) => {
      const d = document.createElement("div");
      d.className = `cell ${chip ? CHIP_DATA[chip].color : 'empty'}`;
      if (chip) d.textContent = CHIP_DATA[chip].label;
      d.onclick = () => moveTile(i);
      p.appendChild(d);
    });

    const l = document.getElementById("girlsList");
    l.innerHTML = "";
    state.girls.forEach(g => l.appendChild(createGirlCard(g)));
  }
}

function createGirlCard(g) {
  const d = document.createElement("div");
  d.className = "girl-card";
  const skillNames = { hunting: "狩り", housework: "家事", power: "力仕事" };
  const arrow = g.atk === "left" ? "←" : "→";
  
  d.innerHTML = `
    <div class="atk-dir">${arrow}</div>
    <img src="assets/girls/${g.id}.png" alt="${g.img}">
    <div class="girl-name">${g.name}</div>
    <div class="girl-skill">${skillNames[g.skill]}</div>
    <div class="girl-stress" style="color:${g.stress < 0 ? 'var(--red)' : '#fff'}">
      ${g.stress}/${g.max}
    </div>
  `;
  return d;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toggleMute() {
  state.isMuted = !state.isMuted;
  document.getElementById("muteBtn").textContent = state.isMuted ? "🎵 OFF" : "🎵 ON";
}

function endGame(win) {
  setPhase("result");
  document.getElementById("resultTitle").textContent = win ? "SURVIVED" : "DEAD END";
  document.getElementById("resultTitle").style.color = win ? "var(--green)" : "var(--red)";
  document.getElementById("resultStat").textContent = win ? `${state.girls.length}人の女の子と生き残った！` : "全滅してしまった...";
  
  document.getElementById("shareBtn").onclick = () => {
    const txt = encodeURIComponent(`乙女島：${state.round}ラウンド目に${state.girls.length}人で${win ? '生還！':'全滅...'}`);
    window.open(`https://twitter.com/intent/tweet?text=${txt}`);
  };
}

// 開始
init();