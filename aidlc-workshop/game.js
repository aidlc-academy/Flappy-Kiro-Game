(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const overlay = document.getElementById('overlay');
  const hud = document.getElementById('hud');
  const scoreEl = document.getElementById('score');
  const soulCountEl = document.getElementById('soul-count');
  const soulMultEl = document.getElementById('soul-mult');
  const phaseIconEl = document.getElementById('phase-icon');
  const bestLine = document.getElementById('best-line');
  const startHint = document.getElementById('start-hint');
  const muteBtn = document.getElementById('mute-btn');

  // ---------- Audio (WebAudio, no external files) ----------
  let audioCtx = null;
  let muted = false;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function beep(freq, duration, type, volume, delay) {
    if (muted || !audioCtx) return;
    const t0 = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume || 0.15, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function sfxFlap() { beep(520, 0.09, 'square', 0.08); }
  function sfxScore() { beep(880, 0.12, 'sine', 0.12); beep(1180, 0.12, 'sine', 0.1, 0.05); }
  function sfxCrash() { beep(160, 0.35, 'sawtooth', 0.18); beep(90, 0.4, 'sawtooth', 0.15, 0.05); }
  function sfxOrb() { beep(1200, 0.08, 'sine', 0.09); }
  function sfxGolden() { beep(1400, 0.1, 'sine', 0.12); beep(1800, 0.14, 'sine', 0.1, 0.06); beep(2200, 0.16, 'sine', 0.08, 0.12); }
  function sfxPhase() { beep(300, 0.25, 'triangle', 0.14); beep(600, 0.3, 'triangle', 0.1, 0.08); }
  function sfxMultUp() { beep(700, 0.07, 'square', 0.08); beep(950, 0.09, 'square', 0.08, 0.05); }

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });

  // ---------- Game constants ----------
  const GRAVITY = 900;
  const FLAP_VELOCITY = -290;
  const MAX_FALL_SPEED = 420;
  const GHOST_X = 90;
  const GHOST_RADIUS = 16;
  const WALL_WIDTH = 62;
  const GAP_HEIGHT = 160;
  const WALL_SPAWN_INTERVAL = 1550;
  const BASE_WALL_SPEED = 130;
  const GROUND_HEIGHT = 60;
  const MAX_TILT = 0.6;

  const ORB_RADIUS = 7;
  const GOLDEN_CHANCE = 0.22;
  const STREAK_PER_MULT = 3;
  const MAX_MULT = 5;
  const PHASE_INVULN_TIME = 0.8;

  // ---------- State ----------
  let state = 'start';
  let ghosty, walls, score, best, wallSpeed, lastSpawn, lastTime, groundOffset;
  let particles = [];
  let stars = [];
  let fireflies = [];
  let popups = [];
  let shakeTime = 0;

  let soulScore = 0;
  let soulStreak = 0;
  let soulMult = 1;
  let hasPhase = false;
  let phaseInvulnTimer = 0;
  let phaseFlash = 0;

  function loadBest() {
    try {
      const v = window.__flappyKiroBest;
      return typeof v === 'number' ? v : 0;
    } catch (e) { return 0; }
  }
  function saveBest(v) {
    window.__flappyKiroBest = v;
  }

  best = loadBest();
  bestLine.textContent = 'Best: ' + best;

  function initStars() {
    stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (H - GROUND_HEIGHT - 40),
        r: Math.random() * 1.6 + 0.4,
        tw: Math.random() * Math.PI * 2
      });
    }
  }
  initStars();

  function initFireflies() {
    fireflies = [];
    for (let i = 0; i < 14; i++) {
      fireflies.push({
        x: Math.random() * W,
        y: H - GROUND_HEIGHT - 20 - Math.random() * 160,
        baseY: 0,
        speed: 6 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.5 ? '#b8f27a' : '#ffe08a'
      });
    }
    fireflies.forEach(f => f.baseY = f.y);
  }
  initFireflies();

  function updateSoulHud() {
    soulCountEl.textContent = soulScore;
    soulMultEl.textContent = 'x' + soulMult;
    phaseIconEl.classList.toggle('active', hasPhase);
  }

  function resetGame() {
    ghosty = { x: GHOST_X, y: H / 2, vy: 0, tilt: 0 };
    walls = [];
    score = 0;
    wallSpeed = BASE_WALL_SPEED;
    lastSpawn = 0;
    groundOffset = 0;
    particles = [];
    popups = [];
    shakeTime = 0;

    soulScore = 0;
    soulStreak = 0;
    soulMult = 1;
    hasPhase = false;
    phaseInvulnTimer = 0;
    phaseFlash = 0;

    scoreEl.textContent = '0';
    updateSoulHud();
  }

  function spawnWall() {
    const margin = 60;
    const gapCenter = margin + Math.random() * (H - GROUND_HEIGHT - margin * 2);

    const orbs = [];
    const hasGolden = Math.random() < GOLDEN_CHANCE;
    const offsets = [-16, 0, 16];
    const orbCount = 2 + (Math.random() < 0.4 ? 1 : 0);
    const goldenIndex = hasGolden ? Math.floor(Math.random() * orbCount) : -1;

    for (let i = 0; i < orbCount; i++) {
      orbs.push({
        xOffset: offsets[i % offsets.length] + (Math.random() - 0.5) * 6,
        yOffset: (i - (orbCount - 1) / 2) * 30 + (Math.random() - 0.5) * 8,
        collected: false,
        golden: i === goldenIndex
      });
    }

    walls.push({
      x: W + WALL_WIDTH,
      gapCenter: gapCenter,
      passed: false,
      orbs: orbs
    });
  }

  function flap() {
    ensureAudio();
    if (state === 'start') { startGame(); return; }
    if (state === 'gameover') {
      resetGame();
      state = 'playing';
      overlay.classList.add('hidden');
      hud.classList.remove('hidden');
      return;
    }
    if (state === 'playing') {
      ghosty.vy = FLAP_VELOCITY;
      sfxFlap();
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: ghosty.x - 10, y: ghosty.y + 10,
          vx: -40 - Math.random() * 40, vy: (Math.random() - 0.5) * 40,
          life: 0.4, age: 0, r: 2 + Math.random() * 2
        });
      }
    }
  }

  function startGame() {
    resetGame();
    state = 'playing';
    overlay.classList.add('hidden');
    hud.classList.remove('hidden');
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); flap(); }
  });
  canvas.addEventListener('mousedown', flap);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });

  function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  function circleCircleCollide(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const rr = r1 + r2;
    return (dx * dx + dy * dy) < (rr * rr);
  }

  function collectOrb(orb) {
    orb.collected = true;
    soulStreak += 1;
    const newMult = Math.min(MAX_MULT, 1 + Math.floor(soulStreak / STREAK_PER_MULT));
    if (newMult > soulMult) {
      soulMult = newMult;
      sfxMultUp();
    } else {
      sfxOrb();
    }
    soulScore += soulMult;
    popups.push({ x: ghosty.x, y: ghosty.y - 10, age: 0, life: 0.6, text: '+' + soulMult, color: '#9be7ff' });

    if (orb.golden) {
      hasPhase = true;
      sfxGolden();
      popups.push({ x: ghosty.x, y: ghosty.y - 26, age: 0, life: 0.9, text: 'PHASE READY', color: '#ffe08a' });
    }
    updateSoulHud();
  }

  function missStreak() {
    if (soulStreak > 0 || soulMult > 1) {
      soulStreak = 0;
      soulMult = 1;
      updateSoulHud();
    }
  }

  function endGame() {
    state = 'gameover';
    sfxCrash();
    shakeTime = 0.35;
    if (score > best) { best = score; saveBest(best); }
    overlay.classList.remove('hidden');
    hud.classList.add('hidden');
    overlay.querySelector('.ghosty-title').textContent = '💥';
    overlay.querySelector('h1').textContent = 'GAME OVER';
    overlay.querySelector('p').innerHTML =
      'Score: ' + score + '<br>Souls: ' + soulScore + '<br>Best: ' + best;
    bestLine.style.display = 'none';
    startHint.textContent = 'Press SPACE or tap to retry';
  }

  function resetOverlayForStart() {
    overlay.querySelector('.ghosty-title').textContent = '👻';
    overlay.querySelector('h1').textContent = 'FLAPPY KIRO';
    overlay.querySelector('p').innerHTML =
      'Guide Ghosty through the graveyard gates.<br>Tap SPACE or click/tap to rise.<br>Collect souls ✧ to build a multiplier.<br>A golden soul grants one free pass through a wall.';
    bestLine.style.display = 'block';
    bestLine.textContent = 'Best: ' + best;
    startHint.textContent = 'Press SPACE or tap to start';
  }

  function update(dt, t) {
    groundOffset -= wallSpeed * dt;
    if (groundOffset <= -40) groundOffset += 40;

    fireflies.forEach(f => {
      f.x -= (wallSpeed * 0.3) * dt;
      f.y = f.baseY + Math.sin(t * f.speed * 0.3 + f.phase) * 14;
      if (f.x < -10) {
        f.x = W + 10;
        f.baseY = H - GROUND_HEIGHT - 20 - Math.random() * 160;
      }
    });

    if (phaseFlash > 0) phaseFlash -= dt;

    if (state !== 'playing') return;

    if (phaseInvulnTimer > 0) phaseInvulnTimer -= dt;

    ghosty.vy += GRAVITY * dt;
    if (ghosty.vy > MAX_FALL_SPEED) ghosty.vy = MAX_FALL_SPEED;
    ghosty.y += ghosty.vy * dt;

    const targetTilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, ghosty.vy / 380));
    ghosty.tilt += (targetTilt - ghosty.tilt) * Math.min(1, dt * 8);

    lastSpawn += dt * 1000;
    if (lastSpawn >= WALL_SPAWN_INTERVAL) {
      lastSpawn = 0;
      spawnWall();
    }

    wallSpeed = BASE_WALL_SPEED + Math.min(score, 20) * 6;

    for (let i = walls.length - 1; i >= 0; i--) {
      const w = walls[i];
      w.x -= wallSpeed * dt;

      if (!w.passed && w.x + WALL_WIDTH < ghosty.x - GHOST_RADIUS) {
        w.passed = true;
        score += 1;
        scoreEl.textContent = score;
        sfxScore();
        popups.push({ x: ghosty.x, y: ghosty.y - 20, age: 0, life: 0.7, text: '+1', color: '#ffd76b' });
      }

      w.orbs.forEach(orb => {
        if (orb.collected) return;
        const ox = w.x + WALL_WIDTH / 2 + orb.xOffset;
        const oy = w.gapCenter + orb.yOffset;
        if (circleCircleCollide(ghosty.x, ghosty.y, GHOST_RADIUS, ox, oy, ORB_RADIUS)) {
          collectOrb(orb);
        }
      });

      const topH = w.gapCenter - GAP_HEIGHT / 2;
      const botY = w.gapCenter + GAP_HEIGHT / 2;
      const botH = H - GROUND_HEIGHT - botY;

      const hitTop = circleRectCollide(ghosty.x, ghosty.y, GHOST_RADIUS, w.x, 0, WALL_WIDTH, topH);
      const hitBot = circleRectCollide(ghosty.x, ghosty.y, GHOST_RADIUS, w.x, botY, WALL_WIDTH, botH);

      if ((hitTop || hitBot) && phaseInvulnTimer <= 0) {
        if (hasPhase) {
          hasPhase = false;
          phaseInvulnTimer = PHASE_INVULN_TIME;
          phaseFlash = 0.3;
          sfxPhase();
          updateSoulHud();
        } else {
          endGame();
        }
      }

      if (w.x + WALL_WIDTH < -5) {
        const anyMissed = w.orbs.some(o => !o.collected);
        if (anyMissed) missStreak();
        walls.splice(i, 1);
      }
    }

    if (ghosty.y + GHOST_RADIUS >= H - GROUND_HEIGHT) {
      ghosty.y = H - GROUND_HEIGHT - GHOST_RADIUS;
      if (phaseInvulnTimer <= 0) endGame();
    }
    if (ghosty.y - GHOST_RADIUS <= 0) {
      ghosty.y = GHOST_RADIUS;
      ghosty.vy = 0;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life) particles.splice(i, 1);
    }

    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.age += dt;
      if (p.age >= p.life) popups.splice(i, 1);
    }

    if (shakeTime > 0) shakeTime -= dt;
  }

  // ---------- Drawing ----------
  function drawBackground(t) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1233');
    grad.addColorStop(0.6, '#241a45');
    grad.addColorStop(1, '#2e2255');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f4f1ff';
    stars.forEach(s => {
      const a = 0.5 + Math.sin(t * 2 + s.tw) * 0.5;
      ctx.globalAlpha = 0.3 + a * 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(240, 235, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(330, 70, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#241a45';
    ctx.beginPath();
    ctx.arc(340, 62, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#180f30';
    ctx.beginPath();
    ctx.moveTo(0, H - GROUND_HEIGHT);
    for (let x = 0; x <= W; x += 40) {
      ctx.lineTo(x, H - GROUND_HEIGHT - 20 - Math.sin((x + 10) * 0.02) * 10);
    }
    ctx.lineTo(W, H - GROUND_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  function drawFireflies(t) {
    fireflies.forEach(f => {
      const glow = 0.5 + Math.sin(t * 3 + f.phase) * 0.5;
      ctx.globalAlpha = 0.3 + glow * 0.5;
      ctx.fillStyle = f.hue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = (0.3 + glow * 0.5) * 0.25;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    ctx.fillStyle = '#3a2e5c';
    ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
    ctx.fillStyle = '#4a3a72';
    ctx.fillRect(0, H - GROUND_HEIGHT, W, 8);
    ctx.fillStyle = '#5a4788';
    for (let x = groundOffset; x < W; x += 40) {
      ctx.fillRect(x, H - GROUND_HEIGHT + 14, 20, 6);
    }
  }

  function drawWall(w) {
    const topH = w.gapCenter - GAP_HEIGHT / 2;
    const botY = w.gapCenter + GAP_HEIGHT / 2;
    const botH = H - GROUND_HEIGHT - botY;

    const bodyGrad = ctx.createLinearGradient(w.x, 0, w.x + WALL_WIDTH, 0);
    bodyGrad.addColorStop(0, '#4a4166');
    bodyGrad.addColorStop(0.5, '#5c527e');
    bodyGrad.addColorStop(1, '#3d3557');

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(w.x, 0, WALL_WIDTH, topH);
    ctx.fillRect(w.x, botY, WALL_WIDTH, botH);

    ctx.fillStyle = '#6a5f92';
    ctx.fillRect(w.x - 5, topH - 18, WALL_WIDTH + 10, 18);
    ctx.fillRect(w.x - 5, botY, WALL_WIDTH + 10, 18);

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let y = 20; y < topH; y += 30) {
      ctx.beginPath();
      ctx.moveTo(w.x + 6, y);
      ctx.lineTo(w.x + WALL_WIDTH - 6, y);
      ctx.stroke();
    }
    for (let y = botY + 30; y < H - GROUND_HEIGHT; y += 30) {
      ctx.beginPath();
      ctx.moveTo(w.x + 6, y);
      ctx.lineTo(w.x + WALL_WIDTH - 6, y);
      ctx.stroke();
    }
  }

  function drawOrbs(w, t) {
    w.orbs.forEach(orb => {
      if (orb.collected) return;
      const ox = w.x + WALL_WIDTH / 2 + orb.xOffset;
      const oy = w.gapCenter + orb.yOffset;
      const pulse = 0.6 + Math.sin(t * 5 + ox * 0.1) * 0.4;

      if (orb.golden) {
        ctx.fillStyle = 'rgba(255, 224, 138, ' + (0.2 + pulse * 0.2) + ')';
        ctx.beginPath();
        ctx.arc(ox, oy, ORB_RADIUS * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath();
        ctx.arc(ox, oy, ORB_RADIUS * (0.9 + pulse * 0.15), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff7e0';
        ctx.beginPath();
        ctx.arc(ox - 2, oy - 2, ORB_RADIUS * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(155, 231, 255, ' + (0.15 + pulse * 0.15) + ')';
        ctx.beginPath();
        ctx.arc(ox, oy, ORB_RADIUS * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9be7ff';
        ctx.beginPath();
        ctx.arc(ox, oy, ORB_RADIUS * (0.75 + pulse * 0.12), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eafcff';
        ctx.beginPath();
        ctx.arc(ox - 1.5, oy - 1.5, ORB_RADIUS * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawGhosty(t) {
    ctx.save();
    ctx.translate(ghosty.x, ghosty.y);

    const inPhase = phaseInvulnTimer > 0;
    const auraPulse = 0.5 + Math.sin(t * 3) * 0.5;
    const auraColor = inPhase ? '234, 200, 255' : '179, 150, 255';
    const auraGrad = ctx.createRadialGradient(0, 0, GHOST_RADIUS * 0.4, 0, 0, GHOST_RADIUS * (inPhase ? 2.8 : 2.1));
    auraGrad.addColorStop(0, 'rgba(' + auraColor + ', ' + (0.25 + auraPulse * (inPhase ? 0.3 : 0.15)) + ')');
    auraGrad.addColorStop(1, 'rgba(' + auraColor + ', 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, GHOST_RADIUS * (inPhase ? 2.8 : 2.1), 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(ghosty.tilt);
    const bob = Math.sin(t * 6) * 2;
    ctx.translate(0, bob);

    ctx.globalAlpha = inPhase ? (0.5 + Math.sin(t * 20) * 0.2) : 1;

    ctx.fillStyle = 'rgba(20, 10, 40, 0.25)';
    ctx.beginPath();
    ctx.ellipse(2, GHOST_RADIUS + 4, GHOST_RADIUS * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f4f1ff';
    ctx.beginPath();
    ctx.moveTo(-GHOST_RADIUS, 4);
    ctx.arc(0, 0, GHOST_RADIUS, Math.PI, 0, false);
    ctx.lineTo(GHOST_RADIUS, 10);
    const waveY = 10;
    ctx.quadraticCurveTo(GHOST_RADIUS * 0.66, waveY + 6, GHOST_RADIUS * 0.33, waveY);
    ctx.quadraticCurveTo(0, waveY + 6, -GHOST_RADIUS * 0.33, waveY);
    ctx.quadraticCurveTo(-GHOST_RADIUS * 0.66, waveY + 6, -GHOST_RADIUS, waveY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a2244';
    ctx.beginPath();
    ctx.ellipse(-5, -2, 2.4, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -2, 2.4, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2a2244';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 4, 2.5, 0, Math.PI, false);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      const a = 1 - p.age / p.life;
      ctx.fillStyle = 'rgba(244, 241, 255, ' + (a * 0.8) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawPopups() {
    popups.forEach(p => {
      const a = 1 - p.age / p.life;
      const rise = p.age * 40;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color || '#ffd76b';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y - rise);
      ctx.globalAlpha = 1;
    });
  }

  function render(t) {
    ctx.save();
    if (shakeTime > 0) {
      const mag = shakeTime * 18;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    drawBackground(t);
    drawFireflies(t);
    walls.forEach(w => { drawWall(w); drawOrbs(w, t); });
    drawParticles();
    drawPopups();
    drawGhosty(t);
    drawGround();

    if (phaseFlash > 0) {
      ctx.fillStyle = 'rgba(234, 200, 255, ' + (phaseFlash / 0.3 * 0.35) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function loop(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    const t = now / 1000;

    update(dt, t);
    render(t);

    requestAnimationFrame(loop);
  }

  resetGame();
  resetOverlayForStart();
  requestAnimationFrame(loop);
})();
