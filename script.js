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

// Game State Variables
let isMultiplayer = false;
let gameRunning = false;
let level = 1;
let timeLeft = 30;
let timerInterval = null;

let player1 = { x: 100, y: 225, size: 30, color: '#38bdf8', speed: 5, score: 0 };
let player2 = { x: 670, y: 225, size: 30, color: '#f43f5e', speed: 4, score: 0 };
let coin = { x: 400, y: 250, size: 15 };

const keys = {};

// Web Audio API untuk efek suara
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
  gameRunning = true;
  level = 1;
  player1.score = 0;
  player2.score = 0;
  
  overlay.style.display = 'none';
  resetPositions();
  startLevel();
  requestAnimationFrame(gameLoop);
}

function startLevel() {
  timeLeft = 30 - (level - 1) * 3; // Waktu berkurang tiap level
  if (timeLeft < 10) timeLeft = 10;
  
  // Tingkatkan kecepatan komputer seiring bertambahnya level
  player2.speed = isMultiplayer ? 5 : 3 + level * 0.5;

  updateUI();
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameRunning) return;
    timeLeft--;
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
    // Arrow Keys untuk Player 2
    if (keys['ArrowUp'] && player2.y > 0) player2.y -= player2.speed;
    if (keys['ArrowDown'] && player2.y < canvas.height - player2.size) player2.y += player2.speed;
    if (keys['ArrowLeft'] && player2.x > 0) player2.x -= player2.speed;
    if (keys['ArrowRight'] && player2.x < canvas.width - player2.size) player2.x += player2.speed;
  } else {
    // Perilaku AI Musuh sederhanan menuju koin
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
    playSound(600, 'sine', 0.1); // Suara ambil poin
    spawnCoin();

    // Naik Level jika total skor mencapai batas
    if (player1.score + player2.score >= level * 5) {
      level++;
      playSound(800, 'triangle', 0.3); // Suara Naik Level
      startLevel();
    }
  }
}

// Render Animasi & Background
function draw() {
  // Clear Frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Animasi Grid Line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Draw Coin (Animasi Bintang / Glowing Circle)
  ctx.fillStyle = '#facc15';
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // Reset Shadow

  // Draw Player 1 (Blue)
  ctx.fillStyle = player1.color;
  ctx.shadowColor = player1.color;
  ctx.shadowBlur = 10;
  ctx.fillRect(player1.x, player1.y, player1.size, player1.size);

  // Draw Player 2 (Red)
  ctx.fillStyle = player2.color;
  ctx.shadowColor = player2.color;
  ctx.shadowBlur = 10;
  ctx.fillRect(player2.x, player2.y, player2.size, player2.size);
  
  ctx.shadowBlur = 0; // Reset
}

function endGame(reason) {
  gameRunning = false;
  clearInterval(timerInterval);
  playSound(150, 'sawtooth', 0.4); // Game over sound

  let winnerText = "";
  if (player1.score > player2.score) {
    winnerText = "Player 1 Menang!";
  } else if (player2.score > player1.score) {
    winnerText = isMultiplayer ? "Player 2 Menang!" : "Computer Menang!";
  } else {
    winnerText = "Hasil Seri!";
  }

  menuTitle.innerText = "GAME OVER";
  menuSubtitle.innerHTML = `${reason}<br><b>${winnerText}</b><br>Level Tertinggi: ${level}`;
  overlay.style.display = 'flex';
}

function gameLoop() {
  if (gameRunning) {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
}
