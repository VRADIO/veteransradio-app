const $ = (id) => document.getElementById(id);

const audio = $("audio");
const grid = $("stationGrid");
const nowTitle = $("nowTitle");
const statusEl = $("status");
const trackEl = $("track");
const pauseBtn = $("pauseBtn");
const stopBtn = $("stopBtn");
const volume = $("volume");
const installBtn = $("installBtn");

let current = null;
let deferredPrompt = null;

function setStatus(t){ statusEl.textContent = t || ""; }
function setNow(t){ nowTitle.textContent = t || "Nothing"; }
function setButtons(pauseOk, stopOk){
  pauseBtn.disabled = !pauseOk;
  stopBtn.disabled = !stopOk;
}

function hardStop(){
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

async function tune(st){
  current = st;
  setNow(st.name);
  trackEl.textContent = "Now Playing unavailable";
  setStatus("Tuning: " + st.name);

  hardStop();

  const cacheBust = (st.url.includes("?") ? "&" : "?") + "t=" + Date.now();
  audio.src = st.url + cacheBust;
  audio.volume = Number(volume.value);

  try{
    await audio.play();
    setStatus("Ready: " + st.name);
    setButtons(true, true);
    render();
  }catch(e){
    console.error(e);
    setStatus("Play failed. Browser blocked it or stream rejected it.");
    setButtons(false, false);
  }
}

function pause(){
  audio.pause();
  setStatus("Paused.");
  setButtons(false, true);
}

function stop(){
  hardStop();
  setStatus("Stopped.");
  setButtons(false, false);
}

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

pauseBtn.addEventListener("click", pause);
stopBtn.addEventListener("click", stop);

audio.addEventListener("playing", () => setStatus("Playing."));
audio.addEventListener("waiting", () => setStatus("Buffering."));
audio.addEventListener("stalled", () => setStatus("Stalled."));
audio.addEventListener("error", () => setStatus("Audio error. Stream blocked or bad URL."));

function card(st){
  const el = document.createElement("div");
  el.className = "card";

  const left = document.createElement("div");
  left.innerHTML = `
    <div class="cardTitle">${st.name}</div>
    <div class="cardSub">${st.desc || ""}</div>
    <div class="cardUrl">${st.url}</div>
  `;

  const right = document.createElement("div");
  const pill = document.createElement("div");
  pill.className = "pill";
  pill.textContent = st.tag || "TUNE";

  right.appendChild(pill);

  el.appendChild(left);
  el.appendChild(right);

  el.addEventListener("click", () => tune(st));

  return el;
}

let stations = [];

function render(){
  grid.innerHTML = "";
  stations.forEach((st) => grid.appendChild(card(st)));
}

async function loadStations(){
  const res = await fetch("./stations.json", { cache: "no-store" });
  stations = await res.json();
  render();
  if (stations[0]) setNow(stations[0].name);
  setStatus("Ready.");
  setButtons(false, false);
}

loadStations().catch((e) => {
  console.error(e);
  setStatus("Failed to load stations.json");
});

/* Install button (PWA) */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.disabled = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  installBtn.disabled = true;
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch {}
  deferredPrompt = null;
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
