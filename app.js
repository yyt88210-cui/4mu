const STORAGE_KEY = "kidRewardAppState";
const MAX_STARS = 3;

const tasks = ["数学练习", "读绘本", "收拾玩具", "画画", "运动", "劳动", "其他"];
const gifts = [
  { id: "sun-hat", animalId: "rabbit", name: "太阳帽", emoji: "👒", type: "帽子" },
  { id: "jellyfish", animalId: "cat", name: "水母朋友", emoji: "🪼", type: "海洋动物" },
  { id: "apple", animalId: "dog", name: "红苹果", emoji: "🍎", type: "水果" },
  { id: "rainbow-painting", animalId: "panda", name: "彩虹画", emoji: "🖼️", type: "画" },
];

const defaultAnimals = [
  { id: "rabbit", name: "小兔", emoji: "🐰", giftType: "帽子", intro: "欢迎来我的房间，今天想试试新帽子！", toys: ["🎩 小礼帽", "🧢 蓝帽子"], equippedGiftId: "" },
  { id: "cat", name: "小猫", emoji: "🐱", giftType: "海洋动物", intro: "欢迎来我的房间，海洋朋友会跳舞。", toys: ["🐠 小鱼", "🐙 章鱼"], equippedGiftId: "" },
  { id: "dog", name: "小狗", emoji: "🐶", giftType: "水果", intro: "欢迎来我的房间，我会假装吃水果。", toys: ["🍌 香蕉", "🍓 草莓"], equippedGiftId: "" },
  { id: "panda", name: "熊猫", emoji: "🐼", giftType: "画", intro: "欢迎来我的房间，墙上的画会抖一抖。", toys: ["🌈 彩虹画", "⭐ 星星画"], equippedGiftId: "" },
];

const app = document.querySelector("#app");
const modal = document.querySelector("#task-modal");
const taskList = document.querySelector("#task-list");
const closeTaskModalButton = document.querySelector("#close-task-modal");

let state = loadState();
let audioContext;
let musicTimer;
let musicPlaying = false;
let interaction = {
  toy: "",
  message: "",
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.animals)) {
      return {
        stars: Number.isInteger(saved.stars) ? Math.min(saved.stars, MAX_STARS) : 0,
        activeAnimalId: saved.activeAnimalId || defaultAnimals[0].id,
        animals: mergeAnimals(saved.animals),
        hasStarted: Boolean(saved.hasStarted),
      };
    }
  } catch (error) {
    console.warn("无法读取本地进度，已使用默认状态。", error);
  }

  return {
    stars: 0,
    activeAnimalId: defaultAnimals[0].id,
    animals: structuredClone(defaultAnimals),
    hasStarted: false,
  };
}

function mergeAnimals(savedAnimals) {
  return defaultAnimals.map((animal) => {
    const saved = savedAnimals.find((item) => item.id === animal.id);
    const hasV2GiftType = saved?.giftType === animal.giftType;
    return {
      ...animal,
      toys: hasV2GiftType && Array.isArray(saved?.toys) ? saved.toys : animal.toys,
      equippedGiftId: saved?.equippedGiftId || "",
    };
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function navigate(route) {
  window.location.hash = route;
}

function getRoute() {
  const route = window.location.hash || (state.hasStarted ? "#/home" : "#/start");
  if (route === "#/home" || route === "#/gift" || route === "#/start" || route.startsWith("#/room/")) {
    return route;
  }
  return state.hasStarted ? "#/home" : "#/start";
}

function render() {
  const route = getRoute();

  if (route === "#/gift") {
    renderGift();
    return;
  }

  if (route === "#/home") {
    renderHome();
    return;
  }

  if (route.startsWith("#/room/")) {
    renderRoomDetail(route.replace("#/room/", ""));
    return;
  }

  renderStart();
}

function formatDate() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${month}月${day}日 ${hour}:${minute}`;
}

function renderStart() {
  app.innerHTML = `
    <section class="screen start-screen">
      <div>
        <div class="top-date">${formatDate()}</div>
        <h1 class="hero-title">小动物星星房间</h1>
        <p class="hero-copy">完成一个现实任务，帮小动物多得到一颗星星。</p>
        <div class="wallpaper" aria-label="小动物壁纸动画">
          ${state.animals
            .map((animal) => `<div class="wallpaper-animal" style="background:${getAnimalColor(animal.id)}">${animal.emoji}</div>`)
            .join("")}
        </div>
      </div>
      <div class="start-actions">
        <button class="secondary-button" type="button" data-action="music">${musicPlaying ? "暂停音乐" : "播放音乐"}</button>
        <button class="primary-button" type="button" data-action="start">开始</button>
      </div>
    </section>
  `;
}

function renderHome() {
  const percent = (state.stars / MAX_STARS) * 100;

  app.innerHTML = `
    <section class="screen home-screen">
      <header class="home-head">
        <div class="home-row">
          <h1 class="home-title">小动物房间</h1>
          <div class="date-pill">${formatDate()}</div>
        </div>
        <div class="energy" aria-label="星星能量进度">
          <div class="energy-label">
            <span>星星能量</span>
            <span>${state.stars}/${MAX_STARS} ⭐</span>
          </div>
          <div class="energy-track">
            <div class="energy-fill" style="width:${percent}%"></div>
          </div>
        </div>
      </header>

      <div class="room-grid">
        ${state.animals.map(renderRoom).join("")}
      </div>

      <button class="checkin-button" type="button" data-action="open-checkin">打卡 ⭐</button>
    </section>
  `;
}

function renderRoom(animal) {
  const isActive = animal.id === state.activeAnimalId;
  const toys = animal.toys.length
    ? animal.toys.map((toy) => `<span class="toy">${toy}</span>`).join("")
    : `<span class="empty-state">还没有玩具</span>`;

  return `
    <article class="room-card ${isActive ? "active" : ""}" data-action="open-room" data-id="${animal.id}" tabindex="0">
      <div class="room-top">
        <h2 class="animal-name">
          <span class="animal-emoji" style="background:${getAnimalColor(animal.id)}">${animal.emoji}</span>
          ${animal.name}
        </h2>
        <span class="active-label">${animal.giftType}</span>
      </div>
      <div class="toy-shelf">${toys}</div>
    </article>
  `;
}

function renderRoomDetail(animalId) {
  const animal = state.animals.find((item) => item.id === animalId);
  if (!animal) {
    navigate("#/home");
    return;
  }

  state.activeAnimalId = animal.id;
  saveState();

  const equippedHat = animal.id === "rabbit" && animal.equippedGiftId
    ? animal.toys.find((toy) => getToyId(toy) === animal.equippedGiftId)
    : "";
  const detailClass = interaction.toy ? `is-${getInteractionType(animal.id)}` : "";
  const animalDisplay = equippedHat ? `${getToyEmoji(equippedHat)} ${animal.emoji}` : animal.emoji;

  app.innerHTML = `
    <section class="screen detail-screen">
      <button class="secondary-button back-button" type="button" data-action="back-home">返回房间列表</button>
      <div class="detail-room" style="background:${getAnimalColor(animal.id)}">
        <div class="speech">${interaction.message || animal.intro}</div>
        <div class="detail-animal ${detailClass}">${animalDisplay}</div>
        <h1 class="detail-title">${animal.name}的房间</h1>
        <p class="detail-copy">礼物类型：${animal.giftType}</p>
      </div>
      <div class="detail-gifts">
        <h2>已拥有的礼物</h2>
        <div class="detail-gift-list">
          ${animal.toys
            .map(
              (toy) => `
                <button class="detail-gift ${interaction.toy === toy ? "active" : ""}" type="button" data-action="interact-gift" data-id="${animal.id}" data-toy="${toy}">
                  ${toy}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderGift() {
  app.innerHTML = `
    <section class="screen gift-screen">
      <div class="gift-panel">
        <h1 class="gift-title">太棒了！</h1>
        <p class="gift-copy">选择一个新礼物，它会自动送到喜欢它的小动物房间。</p>
        <div class="gift-list">
          ${gifts
            .map(
              (gift) => `
                <button class="gift-button" type="button" data-action="choose-gift" data-gift-id="${gift.id}">
                  <span class="gift-emoji">${gift.emoji}</span>
                  ${gift.name}<span class="gift-owner">送给${getAnimalName(gift.animalId)}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function getAnimalColor(id) {
  const colors = {
    rabbit: "var(--pink)",
    cat: "var(--blue)",
    dog: "var(--green)",
    panda: "var(--purple)",
  };
  return colors[id] || "var(--panel-soft)";
}

function getActiveAnimal() {
  return state.animals.find((animal) => animal.id === state.activeAnimalId) || state.animals[0];
}

function getAnimalName(animalId) {
  return state.animals.find((animal) => animal.id === animalId)?.name || "小动物";
}

function openTaskModal() {
  taskList.innerHTML = tasks
    .map((task) => `<button class="task-button" type="button" data-task="${task}">${task}</button>`)
    .join("");
  modal.classList.remove("hidden");
}

function closeTaskModal() {
  modal.classList.add("hidden");
}

function completeTask() {
  state.stars = Math.min(state.stars + 1, MAX_STARS);
  saveState();
  closeTaskModal();

  if (state.stars >= MAX_STARS) {
    navigate("#/gift");
    return;
  }

  render();
}

function chooseGift(giftId) {
  const gift = gifts.find((item) => item.id === giftId);
  if (!gift) return;

  const animal = state.animals.find((item) => item.id === gift.animalId) || getActiveAnimal();
  animal.toys.push(`${gift.emoji} ${gift.name}`);
  state.activeAnimalId = animal.id;
  state.stars = 0;
  state.hasStarted = true;
  clearInteraction();
  saveState();
  navigate(`#/room/${animal.id}`);
}

function startApp() {
  state.hasStarted = true;
  saveState();
  navigate("#/home");
}

function selectAnimal(id) {
  state.activeAnimalId = id;
  saveState();
  render();
}

function openRoom(id) {
  state.activeAnimalId = id;
  clearInteraction();
  saveState();
  navigate(`#/room/${id}`);
}

function goHome() {
  clearInteraction();
  navigate("#/home");
}

function interactGift(animalId, toy) {
  const animal = state.animals.find((item) => item.id === animalId);
  if (!animal) return;

  interaction.toy = toy;

  if (animal.id === "rabbit") {
    animal.equippedGiftId = getToyId(toy);
    interaction.message = `${animal.name}戴上了${getToyName(toy)}！`;
  }

  if (animal.id === "cat") {
    interaction.message = `${getToyName(toy)}抖一抖，和${animal.name}打招呼。`;
  }

  if (animal.id === "dog") {
    interaction.message = `${animal.name}假装吃了一口${getToyName(toy)}。`;
  }

  if (animal.id === "panda") {
    interaction.message = `${getToyName(toy)}在墙上抖一抖。`;
  }

  saveState();
  renderRoomDetail(animalId);
}

function getInteractionType(animalId) {
  if (animalId === "dog") return "eat";
  return "shake";
}

function getToyId(toy) {
  return toy.replace(/\s+/g, "-").toLowerCase();
}

function getToyEmoji(toy) {
  return toy.trim().split(/\s+/)[0] || "";
}

function getToyName(toy) {
  return toy.replace(/^\S+\s*/, "");
}

function clearInteraction() {
  interaction = {
    toy: "",
    message: "",
  };
}

function toggleMusic() {
  if (musicPlaying) {
    stopMusic();
  } else {
    startMusic();
  }
  render();
}

function startMusic() {
  audioContext ||= new AudioContext();
  musicPlaying = true;
  playTone();
  musicTimer = window.setInterval(playTone, 900);
}

function stopMusic() {
  musicPlaying = false;
  window.clearInterval(musicTimer);
}

function playTone() {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 523.25;
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.38);
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (action === "start") startApp();
  if (action === "music") toggleMusic();
  if (action === "open-checkin") openTaskModal();
  if (action === "open-room") openRoom(target.dataset.id);
  if (action === "back-home") goHome();
  if (action === "interact-gift") interactGift(target.dataset.id, target.dataset.toy);
  if (action === "choose-gift") chooseGift(target.dataset.giftId);
});

app.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target.closest('[data-action="open-room"]');
  if (!target) return;
  event.preventDefault();
  openRoom(target.dataset.id);
});

taskList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-task]");
  if (target) completeTask();
});

closeTaskModalButton.addEventListener("click", closeTaskModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeTaskModal();
});

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
