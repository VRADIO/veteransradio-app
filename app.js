const $ = (id) => document.getElementById(id);
const audio = $("audio");
const grid = $("stationGrid");
const nowTitle = $("nowTitle");
const statusEl = $("status");
const trackEl = $("track");
const pauseBtn = $("pauseBtn");
const stopBtn = $("stopBtn");
const volume = $("volume");
const muteBtn = $("muteBtn");
const installBtn = $("installBtn");

volume.value = "0.30";
audio.volume = 0.30;

let lastVolume = Number(volume.value) || 0.3;

function syncMuteUI(){
  if (!muteBtn) return;
  muteBtn.textContent = (audio.muted || audio.volume === 0) ? "UNMUTE" : "MUTE";
}

syncMuteUI();

if (muteBtn) {
  muteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // IMPORTANT: stops parent click handlers

    console.log("MUTE CLICK"); // you should see this in console

    if (!audio.muted && audio.volume > 0) {
      lastVolume = audio.volume;
      audio.muted = true;
      audio.volume = 0;
      volume.value = "0";
      setStatus("Muted.");
    } else {
      audio.muted = false;
      const v = lastVolume > 0 ? lastVolume : 0.3;
      audio.volume = v;
      volume.value = String(v);
      setStatus("Unmuted.");
    }

    syncMuteUI();
  });
}


// --- Mute button ---
let lastVolume = Number(volume.value || 0.5);

function syncMuteUI(){
  if (!muteBtn) return;
  muteBtn.textContent = audio.muted ? "UNMUTE" : "MUTE";
}

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    // If muting, remember last non-zero volume
    if (!audio.muted) {
      const v = Number(volume.value);
      if (v > 0) lastVolume = v;
      audio.muted = true;
      audio.volume = 0;        // forces silence everywhere
      volume.value = "0";
    } else {
      audio.muted = false;
      const restore = (lastVolume && lastVolume > 0) ? lastVolume : 0.5;
      audio.volume = restore;
      volume.value = String(restore);
    }
    syncMuteUI();
  });

  // Set initial label
  syncMuteUI();
}
// --- end mute ---


installBtn.disabled = false;

let current = null;
let deferredPrompt = null;
let isPlaying = false;

let lastVolume = Number(volume.value) || 0.30;

function syncMuteUI(){
  if (!muteBtn) return;
  const isMuted = audio.muted || Number(audio.volume) === 0;
  muteBtn.textContent = isMuted ? "UNMUTE" : "MUTE";
}


// --- Install button (PWA) ---
function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.disabled = false;
  setStatus("Install ready.");
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  installBtn.disabled = true;
  setStatus("Installed.");
});

installBtn.addEventListener("click", async () => {
  setStatus("Install button pressed.");

  if (isStandaloneMode()) {
    setStatus("Already installed.");
    return;
  }

  if (!deferredPrompt) {
    setStatus("Install prompt unavailable. Use Chrome menu ⋮ → Install app.");
    return;
  }

  deferredPrompt.prompt();

  try {
    const choice = await deferredPrompt.userChoice;
    setStatus(
      choice && choice.outcome === "accepted"
        ? "Installing..."
        : "Install cancelled."
    );
  } catch {
    setStatus("Install failed.");
  }

  deferredPrompt = null;
  installBtn.disabled = true;
});
// --- end install ---


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
    isPlaying = true;

    startNowPlaying(st);

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
  isPlaying = false;
  stopNowPlaying();
  setStatus("Paused.");
  setButtons(false, true);
  render();
}

function stop(){
  hardStop();
  isPlaying = false;
  stopNowPlaying();
  setStatus("Stopped.");
  setButtons(false, false);
  render();
}

volume.addEventListener("input", () => {
  const v = Number(volume.value);
  audio.volume = v;

  if (v > 0) {
    lastVolume = v;
    audio.muted = false;
  } else {
    audio.muted = true;
  }

  syncMuteUI();
});

if (muteBtn) {
  muteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // ...
  });
}

  // If user moves slider up, unmute automatically
  if (v > 0 && audio.muted) audio.muted = false;

  audio.volume = v;

  // Remember last non-zero volume
  if (v > 0) lastVolume = v;

  syncMuteUI();
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

  if (isPlaying && current && current.url === st.url) {
    el.classList.add("activeCard");
  }

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

let nowPlayingTimer = null;

function startNowPlaying(st){
  stopNowPlaying();

  if (!st || !st.nowPlayingUrl) {
    trackEl.textContent = "Now Playing unavailable";
    return;
  }

  const pull = async () => {
    try {
      const res = await fetch(st.nowPlayingUrl, { cache: "no-store" });
      const text = (await res.text()).trim();

      let artist = "";
      let title = "";

      if (text.startsWith("<")) {
        // XML (SecureNet)
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const a = doc.getElementsByTagName("artist")[0];
        const t = doc.getElementsByTagName("title")[0];
        artist = a ? (a.textContent || "").trim() : "";
        title  = t ? (t.textContent || "").trim() : "";
      } else {
        // JSON (RadioKing)
        const data = JSON.parse(text);
        const song = Array.isArray(data) ? data[0] : data;
        artist = song && song.artist ? String(song.artist).trim() : "";
        title  = song && song.title ? String(song.title).trim() : "";
      }

      trackEl.textContent =
        artist && title ? artist + " - " + title : (title || "Now Playing unavailable");
    } catch (e) {
      trackEl.textContent = "Now Playing unavailable";
    }
  };

  pull();
  nowPlayingTimer = setInterval(pull, 15000);
}

function stopNowPlaying(){
  if (nowPlayingTimer) clearInterval(nowPlayingTimer);
  nowPlayingTimer = null;
}

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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
