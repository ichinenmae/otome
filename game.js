/**
 * 乙女島 - game.js (SE実装・モーダル横一列版)
 */

// --- マスターデータ ---
const GIRLS_INIT = [
  { id: "sakuma",  name: "佐久間さくら", skill: "housework", max: 6, atk: "left",  img: "メイド" },
  { id: "edomon",  name: "エドモン子",   skill: "power",     max: 4, atk: "left",  img: "メスゴリラ" },
  { id: "tamago",  name: "黒谷たまご",   skill: "hunting",   max: 5, atk: "right", img: "ギャル" },
  { id: "osanai",  name: "小山内真澄",   skill: "hunting",   max: 5, atk: "left",  img: "ゴスロリ" },
  { id: "tomioka", name: "富岡静子",     skill: "housework", max: 6, atk: "right", img: "OL" }
];

const CHIP_DATA = {
  wood: { color: "green", label: "木" },
  vine: { color: "green", label: "蔦" },
  saw:  { color: "green", label: "鋸" },
  berry: { color: "pink", label: "実" },
  storm: { color: "yellow", label: "嵐" },
  hunting: { color: "blue", label: "狩" },
  housework: { color: "gray", label: "家" },
  power: { color: "gray", label: "力" }
};

// --- 効果音の定義 ---
const se = {
  slide: new Audio('assets/sounds/se_slide.wav'),
  clear: new Audio('assets/sounds/se_clear.wav'),
  select: new Audio('assets/sounds/se_select.wav'),
  food_up: new Audio('assets/sounds/se_food_up.wav'),
  storm: new Audio('assets/sounds/se_storm.wav'),
  attack: new Audio('assets/sounds/se_attack.wav'),
  death: new Audio('assets/sounds/se_death.wav')
};

function playSE(key) {
  if (state.isMuted) return;
  if (se[key]) {
    se[key].currentTime = 0; // 連続再生に対応
    se[key].play().catch(() => {}); // ブラウザの自動再生制限対策
  }
}

let state = {
  round: 1, food: 2, phase: "event",
  girls: [], puzzle: [],
  flags: { berry: false, storm: false, housework: false, power: false },
  pendingChip: null,
  dateRemainderTargets: [],
  isMuted: false
};

// --- ユーティリティ ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function init() {
  const randomizedGirls = shuffleArray([...GIRLS_INIT]);
  state.girls = randomizedGirls.map(g => ({ ...g, stress: g.max }));
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
  } while (isPuzzleClear());
}

function setPhase(p) {
  state.phase = p;
  document.querySelectorAll('.phase').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(p + 'Phase');
  if(target) target.classList.add('active');

  if (p === "dinner") runDinner();
  if (p === "date") renderDate();
  if (p === "kill") runKill();
  render();
}

function notify(elementId, text, color = "#fff") {
  const parent = document.getElementById(elementId);
  if(!parent) return;
  const el = document.createElement("div");
  el.className = "floating-num";
  el.textContent = text;
  el.style.color = color;
  parent.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// --- パズルロジック ---
function moveTile(idx) {
  if (state.phase !== "event") return;
  const emptyIdx = state.puzzle.indexOf(null);
  const diff = Math.abs(idx - emptyIdx);
  if (diff === 1 || diff === 3) {
    [state.puzzle[idx], state.puzzle[emptyIdx]] = [state.puzzle[emptyIdx], state.puzzle[idx]];
    playSE('slide'); // SE: スライド
    applyChipEffect(state.puzzle[emptyIdx]);
    render();
    if (isPuzzleClear()) {
      playSE('clear'); // SE: パズル揃い
      setTimeout(() => setPhase("dinner"), 800);
    }
  }
}

function applyChipEffect(chip) {
  if (!chip) return;
  if (chip === "hunting") {
    state.pendingChip = "hunting";
    openGirlModal("狩りをする女の子を選択");
  } else if (!state.flags[chip]) {
    if (chip === "berry") { 
      state.food++; state.flags.berry = true;
      playSE('food_up'); // SE: 食料増
      notify("stat-food", "+1", "#7fff7f");
    } else if (chip === "storm") { 
      state.girls.forEach(g => g.stress--); state.flags.storm = true;
      playSE('storm'); // SE: 嵐
      notify("stat-round", "嵐!", "var(--yellow)");
    } else if (chip === "housework" || chip === "power") {
      state.pendingChip = chip;
      openGirlModal(`${CHIP_DATA[chip].label}を行う女の子を選択`);
    }
  }
}

function openGirlModal(title) {
  const modal = document.getElementById("girlModal");
  document.getElementById("modalTitle").textContent = title;
  const grid = document.getElementById("modalButtons");
  grid.innerHTML = "";
  state.girls.forEach((g, i) => {
    const card = createGirlCard(g);
    if (g.skill === state.pendingChip) card.classList.add("match");
    card.onclick = () => {
      playSE('select'); // SE: 女の子決定
      const cost = (g.skill === state.pendingChip) ? 1 : 2;
      g.stress -= cost;
      if (state.pendingChip === "hunting") {
        state.food += 2; 
        playSE('food_up'); // SE: 食料増(狩り)
        notify("stat-food", "+2", "#7fff7f");
      } else state.flags[state.pendingChip] = true;
      state.pendingChip = null;
      modal.classList.add("hidden");
      render();
    };
    grid.appendChild(card);
  });
  modal.classList.remove("hidden");
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
  notify("stat-food", "-3", "var(--red)");
  const msg = document.getElementById("dinnerMessage");
  setTimeout(() => {
    if (state.food < 0) {
      state.girls.forEach(g => g.stress--);
      state.food = 0;
      msg.innerHTML = "<span style='color:var(--red)'>食料不足！</span><br><small>全員のストレスが1悪化した...</small>";
    } else msg.textContent = "ディナーを終えました。";
    render();
    setTimeout(() => setPhase("date"), 1500);
  }, 500);
}

// --- デートフェイズ ---
function renderDate() {
  if (state.girls.length <= 1) { setTimeout(() => setPhase("kill"), 800); return; }
  const list = document.getElementById("dateGirlList");
  list.innerHTML = "";
  state.girls.forEach((g, i) => {
    const card = createGirlCard(g);
    card.onclick = () => {
      playSE('select'); // SE: 選択
      const recovery = g.max - g.stress;
      g.stress = g.max;
      const others = state.girls.filter((_, idx) => idx !== i);
      const baseDmg = Math.floor(recovery / others.length);
      const remainder = recovery % others.length;
      others.forEach(og => og.stress -= baseDmg);
      if (remainder > 0) {
        state.dateRemainderTargets = [];
        askRemainder(others, remainder);
      } else setPhase("kill");
    };
    list.appendChild(card);
  });
}

function skipDate() { setPhase("kill"); }

function askRemainder(candidates, amount) {
  const modal = document.getElementById("girlModal");
  document.getElementById("modalTitle").textContent = `不満の端数[残り:${amount}]を誰に振りますか？(1人1点まで)`;
  const grid = document.getElementById("modalButtons");
  grid.innerHTML = "";
  candidates.forEach(g => {
    const card = createGirlCard(g);
    const selected = state.dateRemainderTargets.includes(g.id);
    if (selected) card.style.opacity = "0.3";
    card.onclick = () => {
      if (selected) return;
      playSE('select'); // SE: 選択
      g.stress--; state.dateRemainderTargets.push(g.id); amount--;
      if (amount > 0) askRemainder(candidates, amount);
      else { modal.classList.add("hidden"); setPhase("kill"); }
    };
    grid.appendChild(card);
  });
  modal.classList.remove("hidden");
}

// --- 殺戮フェイズ ---
async function runKill() {
  const detail = document.getElementById("killDetail");
  let i = 0;
  while (i < state.girls.length) {
    renderKillVisuals();
    let girl = state.girls[i];
    if (girl.stress < 0) {
      detail.innerHTML = `<span style='color:var(--red)'>${girl.name}が暴走！</span>`;
      await new Promise(r => setTimeout(r, 1000));
      let targetIdx = (girl.atk === "left") ? i - 1 : i + 1;
      
      if (targetIdx >= 0 && targetIdx < state.girls.length) {
        detail.textContent = `${girl.name}が隣の${state.girls[targetIdx].name}を殺害した。`;
        playSE('attack'); // SE: 殺戮発生
        state.girls.splice(targetIdx, 1);
        playSE('death'); // SE: 消滅
        girl.stress += 2;
        if (targetIdx < i) i--;
        continue;
      } else {
        detail.textContent = `${girl.name}は誰にもぶつけられず自滅した。`;
        playSE('death'); // SE: 自滅
        state.girls.splice(i, 1);
        continue;
      }
    }
    i++;
  }
  renderKillVisuals();
  await new Promise(r => setTimeout(r, 1000));
  if (state.girls.length === 0) endGame(false);
  else if (state.round >= 7) endGame(true);
  else { state.round++; startRound(); }
}

function renderKillVisuals() {
  const v = document.getElementById("killVisuals");
  v.innerHTML = "";
  state.girls.forEach(g => v.appendChild(createGirlCard(g)));
}

// --- 描画コア ---
function render() {
  document.getElementById("round").textContent = state.round;
  document.getElementById("food").textContent = state.food;
  document.getElementById("phaseLabel").textContent = state.phase.toUpperCase();

  if (state.phase === "event") {
    const pEl = document.getElementById("puzzle");
    pEl.innerHTML = "";
    state.puzzle.forEach((chip, i) => {
      const d = document.createElement("div");
      d.className = `cell ${chip ? CHIP_DATA[chip].color : 'empty'}`;
      if (chip) {
        const img = document.createElement("img");
        img.src = `assets/chips/${chip}.png`;
        img.onerror = () => { img.remove(); d.textContent = CHIP_DATA[chip].label; };
        d.appendChild(img);
      }
      d.onclick = () => moveTile(i);
      pEl.appendChild(d);
    });
    const gList = document.getElementById("girlsList");
    gList.innerHTML = "";
    state.girls.forEach(g => gList.appendChild(createGirlCard(g)));
  }
}

function createGirlCard(g) {
  const d = document.createElement("div");
  d.className = "girl-card";
  if (g.stress < 0) d.classList.add("critical");
  const arrow = g.atk === "left" ? "←" : "→";
  const skillNames = { hunting: "狩り", housework: "家事", power: "腕力" };
  
  d.innerHTML = `
    <div class="atk-dir">${arrow}</div>
    <div class="img-wrapper" style="width:100%; aspect-ratio:180/260; background:#333; border-radius:4px; overflow:hidden;">
        <img src="assets/girls/${g.id}.png" style="width:100%; height:100%; object-fit:cover;" 
             onerror="this.style.display='none';">
    </div>
    <div class="girl-name">${g.name}</div>
    <div class="girl-skill">${skillNames[g.skill]}</div>
    <div class="girl-stress" style="color:${g.stress < 0 ? 'var(--red)' : '#fff'}">
      ${g.stress}/${g.max}
    </div>
  `;
  return d;
}

function toggleMute() {
  state.isMuted = !state.isMuted;
  document.getElementById("muteBtn").textContent = state.isMuted ? "🎵 OFF" : "🎵 ON";
}

function endGame(win) {
  setPhase("result");
  document.getElementById("resultTitle").textContent = win ? "SURVIVED" : "DEAD END";
  document.getElementById("resultStat").textContent = win ? `${state.girls.length}人と生還しました！` : "全滅しました。";
  document.getElementById("shareBtn").onclick = () => {
    const txt = encodeURIComponent(`乙女島：${state.round}Rで${state.girls.length}人生還！`);
    window.open(`https://twitter.com/intent/tweet?text=${txt}`);
  };
}

init();