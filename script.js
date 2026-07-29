const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const levelTxt = document.getElementById('level-txt');
const timeTxt = document.getElementById('time-txt');
const p1ScoreTxt = document.getElementById('p1-score');
const p2ScoreTxt = document.getElementById('p2-score');
const overlay = document.getElementById('overlay');
const menuTitle = document.getElementById('menu-title');
const menuSubtitle = document.getElementById('menu-subtitle');
const difficultySelect = document.getElementById('difficulty-select');

// Game State Variables
let isMultiplayer = false;
let gameRunning = false;
let level = 1;
let timeLeft = 30;
let timerInterval = null;
let currentDifficulty = 'medium';

// System AFK / Idle Detection (Cek Kebiasaan Diam)
let idleTimer = 0;
const MAX_IDLE_TIME = 5; // Game over jika diam selama 5 detik

// Pengaturan Konfigurasi Kesulitan
const difficultySettings = {
  easy: { baseTime: 40, timeReduction: 2, aiSpeedBase: 2, aiSpeedMult: 0.3, scoreTarget: 3 },
  medium: { baseTime: 30, timeReduction: 3, aiSpeedBase: 3, aiSpeedMult: 0.5, scoreTarget: 5 },
  hard: { baseTime: 20, timeReduction: 4, aiSpeedBase: 4.5, aiSpeedMult: 0.7, scoreTarget: 7 }
};

let player1 = { x: 100, y: 225, size: 30, color: '#38bdf8', speed: 5, score: 0 };
let player2 = { x: 670, y: 225, size: 30, color: '#f43f5e', speed: 4, score: 0 };
let coin = { x: 400, y: 250, size: 15 };

const keys = {};

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type, duration) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Event Listeners Input
window.addEventListener('keydown', (e) => (keys[e.key] = true));
window.addEventListener('keyup', (e) => (keys[e.key] = false));

document.getElementById('btn-single').addEventListener('click', () => startGame(false));
document.getElementById('btn-multi').addEventListener('click', () => startGame(true));

function startGame(multi) {
  isMultiplayer = multi;
  currentDifficulty = difficultySelect.value;
  gameRunning = true;
  level = 1;
  player1.score = 0;
  player2.score = 0;
  idleTimer = 0;
  
  overlay.style.display = 'none';
  resetPositions();
  startLevel();
  requestAnimationFrame(gameLoop);
}

function startLevel() {
  const settings = difficultySettings[currentDifficulty];
  
  timeLeft = settings.baseTime - (level - 1) * settings.timeReduction;
  if (timeLeft < 8) timeLeft = 8;
  
  player2.speed = isMultiplayer ? 5 : settings.aiSpeedBase + (level * settings.aiSpeedMult);

  updateUI();
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameRunning) return;
    
    timeLeft--;
    
    // Cek apakah ada tombol pergerakan yang sedang ditekan
    const isP1Moving = keys['w'] || keys['a'] || keys['s'] || keys['d'];
    const isP2Moving = keys['ArrowUp'] || keys['ArrowLeft'] || keys['ArrowDown'] || keys['ArrowRight'];

    if (isMultiplayer) {
      // Pada mode 2 Player, minimal salah satu pemain harus bergerak
      if (!isP1Moving && !isP2Moving) {
        idleTimer++;
      } else {
        idleTimer = 0; // Reset hitungan jika ada pergerakan
      }
    } else {
      // Pada mode Single Player, Player 1 harus bergerak
      if (!isP1Moving) {
        idleTimer++;
      } else {
        idleTimer = 0; // Reset hitungan jika Player 1 bergerak
      }
    }

    // Jika waktu diam melebihi batas maksimal (5 detik)
    if (idleTimer >= MAX_IDLE_TIME) {
      endGame("Kamu Dikeluarkan Karena Diam / Tidak Bergerak!");
      return;
    }

    updateUI();

    if (timeLeft <= 0) {
      endGame("Waktu Habis!");
    }
  }, 1000);
}

function resetPositions() {
  player1.x = 100;
  player1.y = 225;
  player2.x = 670;
  player2.y = 225;
  spawnCoin();
}

function spawnCoin() {
  coin.x = Math.random() * (canvas.width - 60) + 30;
  coin.y = Math.random() * (canvas.height - 60) + 30;
}

function updateUI() {
  levelTxt.innerText = level;
  timeTxt.innerText = timeLeft;
  p1ScoreTxt.innerText = player1.score;
  p2ScoreTxt.innerText = player2.score;
}

// Movement & Logic
function update() {
  if (!gameRunning) return;

  // Player 1 Control (WASD)
  if (keys['w'] && player1.y > 0) player1.y -= player1.speed;
  if (keys['s'] && player1.y < canvas.height - player1.size) player1.y += player1.speed;
  if (keys['a'] && player1.x > 0) player1.x -= player1.speed;
  if (keys['d'] && player1.x < canvas.width - player1.size) player1.x += player1.speed;

  // Player 2 / AI Control
  if (isMultiplayer) {
    if (keys['ArrowUp'] && player2.y > 0) player2.y -= player2.speed;
    if (keys['ArrowDown'] && player2.y < canvas.height - player2.size) player2.y += player2.speed;
    if (keys['ArrowLeft'] && player2.x > 0) player2.x -= player2.speed;
    if (keys['ArrowRight'] && player2.x < canvas.width - player2.size) player2.x += player2.speed;
  } else {
    // Perilaku AI Musuh
    if (player2.x < coin.x) player2.x += player2.speed;
    if (player2.x > coin.x) player2.x -= player2.speed;
    if (player2.y < coin.y) player2.y += player2.speed;
    if (player2.y > coin.y) player2.y -= player2.speed;
  }

  // Cek Tabrakan Koin
  checkCoinCollision(player1, true);
  checkCoinCollision(player2, false);
}

function checkCoinCollision(p, isP1) {
  let dist = Math.hypot((p.x + p.size/2) - coin.x, (p.y + p.size/2) - coin.y);
  if (dist < p.size/2 + coin.size) {
    p.score++;
    playSound(600, 'sine', 0.1);
    spawnCoin();

    const target = difficultySettings[currentDifficulty].scoreTarget;
    if (player1.score + player2.score >= level * target) {
      level++;
      playSound(800, 'triangle', 0.3);
      startLevel();
    }
  }
}

// Render Animasi & Background
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Grid Line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Visual Peringatan jika Diam (> 2 detik)
  if (idleTimer >= 2) {
    ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(`PERINGATAN: Bergeraklah! (Game Over dalam ${MAX_IDLE_TIME - idleTimer}s)`, canvas.width / 2, 30);
  }

  // Draw Coin
  ctx.fillStyle = '#facc15';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw Player 1
  ctx.fillStyle = player1.color;
  ctx.shadowColor = player1.color;
  ctx.shadowBlur = 10;
  ctx.fillRect(player1.x, player1.y, player1.size, player1.size);

  // Draw Player 2
  ctx.fillStyle = player2.color;
  ctx.shadowColor = player2.color;
  ctx.shadowBlur = 10;
  ctx.fillRect(player2.x, player2.y, player2.size, player2.size);
  
  ctx.shadowBlur = 0;
}

function endGame(reason) {
  gameRunning = false;
  clearInterval(timerInterval);
  playSound(150, 'sawtooth', 0.4);

  let winnerText = "";
  if (player1.score > player2.score) {
    winnerText = "Player 1 Menang!";
  } else if (player2.score > player1.score) {
    winnerText = isMultiplayer ? "Player 2 Menang!" : "Computer Menang!";
  } else {
    winnerText = "Hasil Seri!";
  }

  menuTitle.innerText = "GAME OVER";
  menuSubtitle.innerHTML = `<span style="color:#f43f5e;">${reason}</span><br><b>${winnerText}</b><br>Level Tertinggi: ${level}`;
  overlay.style.display = 'flex';
}

function gameLoop() {
  if (gameRunning) {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
}
