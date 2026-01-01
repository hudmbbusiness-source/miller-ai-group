/**
 * FLAPPY JUMP - GAME ENGINE
 * Tap to fly through the gaps and earn coins!
 */

// ============================================================================
// FLAPPY BIRD (Player)
// ============================================================================
class FlappyBird {
    constructor(game) {
        this.game = game;
        this.x = 80;
        this.y = 0;
        this.width = 40;
        this.height = 30;
        this.vy = 0;
        this.rotation = 0;
        this.flapPower = -8;
        this.gravity = 0.4;
        this.maxFallSpeed = 12;
        this.frame = 0;
        this.frameTimer = 0;
        this.wingAngle = 0;
    }

    reset() {
        this.y = this.game.canvas.height / 2 - this.height / 2;
        this.vy = 0;
        this.rotation = 0;
    }

    flap() {
        this.vy = this.flapPower;
        this.game.audio.playFlap();
        this.game.particles.emitFlap(this.x + this.width / 2, this.y + this.height);
    }

    update(dt) {
        // Gravity
        this.vy += this.gravity * dt * 60;
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
        this.y += this.vy * dt * 60;

        // Rotation based on velocity
        const targetRotation = Math.min(Math.max(this.vy * 0.06, -0.5), 1.2);
        this.rotation += (targetRotation - this.rotation) * 0.15;

        // Wing animation
        this.wingAngle = Math.sin(Date.now() / 80) * 0.5;

        // Boundary check
        if (this.y < 0) {
            this.y = 0;
            this.vy = 0;
        }
        if (this.y + this.height > this.game.canvas.height - this.game.groundHeight) {
            this.game.die();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        const color = this.game.characterColor;

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing
        ctx.save();
        ctx.rotate(this.wingAngle);
        ctx.fillStyle = this.adjustColor(color, -30);
        ctx.beginPath();
        ctx.ellipse(-5, 5, 15, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Eye white
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(10, -5, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupil
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(12, -5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - 5, 0);
        ctx.lineTo(this.width / 2 + 12, -3);
        ctx.lineTo(this.width / 2 + 12, 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `rgb(${r},${g},${b})`;
    }

    getBounds() {
        return {
            x: this.x + 5,
            y: this.y + 5,
            width: this.width - 10,
            height: this.height - 10
        };
    }
}

// ============================================================================
// PIPE (Obstacle)
// ============================================================================
class Pipe {
    constructor(game, x) {
        this.game = game;
        this.x = x;
        this.width = 70;
        this.gap = 160;
        this.gapY = 120 + Math.random() * (game.canvas.height - game.groundHeight - 280);
        this.scored = false;
        this.hasCoin = Math.random() > 0.4;
        this.coinCollected = false;
    }

    update(dt) {
        this.x -= this.game.pipeSpeed * dt * 60;
    }

    draw(ctx) {
        const theme = this.game.getTheme();
        const topHeight = this.gapY;
        const bottomY = this.gapY + this.gap;
        const bottomHeight = this.game.canvas.height - this.game.groundHeight - bottomY;

        // Pipe gradient
        const pipeGrad = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        pipeGrad.addColorStop(0, theme.obstacleGradient[0]);
        pipeGrad.addColorStop(0.5, theme.obstacleAccent);
        pipeGrad.addColorStop(1, theme.obstacleGradient[1]);

        ctx.fillStyle = pipeGrad;
        ctx.strokeStyle = theme.obstacleStroke || '#000';
        ctx.lineWidth = 3;

        // Top pipe
        ctx.beginPath();
        ctx.roundRect(this.x, 0, this.width, topHeight, [0, 0, 10, 10]);
        ctx.fill();
        ctx.stroke();

        // Top pipe cap
        ctx.beginPath();
        ctx.roundRect(this.x - 5, topHeight - 30, this.width + 10, 30, 6);
        ctx.fill();
        ctx.stroke();

        // Bottom pipe
        ctx.beginPath();
        ctx.roundRect(this.x, bottomY, this.width, bottomHeight, [10, 10, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Bottom pipe cap
        ctx.beginPath();
        ctx.roundRect(this.x - 5, bottomY, this.width + 10, 30, 6);
        ctx.fill();
        ctx.stroke();

        // Draw coin in gap
        if (this.hasCoin && !this.coinCollected) {
            this.drawCoin(ctx, this.x + this.width / 2, this.gapY + this.gap / 2);
        }
    }

    drawCoin(ctx, x, y) {
        const radius = 15;
        const bob = Math.sin(Date.now() / 200) * 5;
        const stretch = Math.abs(Math.cos(Date.now() / 150));

        ctx.save();
        ctx.translate(x, y + bob);
        ctx.scale(stretch, 1);

        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFEB3B');
        grad.addColorStop(0.6, '#FFC107');
        grad.addColorStop(1, '#FF9800');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-3, -3, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);

        ctx.restore();
    }

    getTopBounds() {
        return { x: this.x, y: 0, width: this.width, height: this.gapY };
    }

    getBottomBounds() {
        const bottomY = this.gapY + this.gap;
        return { x: this.x, y: bottomY, width: this.width, height: this.game.canvas.height - bottomY };
    }

    getCoinBounds() {
        if (!this.hasCoin || this.coinCollected) return null;
        return {
            x: this.x + this.width / 2 - 15,
            y: this.gapY + this.gap / 2 - 15,
            width: 30,
            height: 30
        };
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// ============================================================================
// FLAPPY AUDIO SYSTEM
// ============================================================================
class FlappyAudio {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.initialized = false;
        this.musicPlaying = false;
        this.musicNodes = [];
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.context.destination);

            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = 0.12;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = 0.4;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    startMusic() {
        if (!this.enabled || !this.context || this.musicPlaying) return;
        this.musicPlaying = true;
        this.playMusicLoop();
    }

    stopMusic() {
        this.musicPlaying = false;
        this.musicNodes.forEach(node => {
            try { node.stop(); } catch(e) {}
        });
        this.musicNodes = [];
    }

    playMusicLoop() {
        if (!this.musicPlaying || !this.context) return;

        // Upbeat flying melody
        const chords = [
            [329.63, 415.30, 493.88], // E major
            [293.66, 369.99, 440.00], // D major
            [261.63, 329.63, 392.00], // C major
            [293.66, 369.99, 440.00]  // D major
        ];

        const beatDuration = 0.4;
        const barsPerLoop = 4;
        const beatsPerBar = 4;
        const loopDuration = barsPerLoop * beatsPerBar * beatDuration;

        const now = this.context.currentTime;

        chords.forEach((chord, chordIndex) => {
            const chordStart = now + (chordIndex * beatsPerBar * beatDuration);

            // Bass
            this.playMusicNote(chord[0] / 2, chordStart, beatsPerBar * beatDuration * 0.85, 'sine', 0.1);

            // Arpeggio
            for (let beat = 0; beat < beatsPerBar; beat++) {
                const noteIndex = beat % chord.length;
                const noteTime = chordStart + (beat * beatDuration);
                const freq = chord[noteIndex] * (beat === 2 ? 2 : 1);
                this.playMusicNote(freq, noteTime, beatDuration * 0.35, 'triangle', 0.06);
            }
        });

        setTimeout(() => this.playMusicLoop(), loopDuration * 1000 - 50);
    }

    playMusicNote(freq, startTime, duration, type, volume) {
        if (!this.context || !this.musicGain) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gain.gain.setValueAtTime(volume, startTime + duration - 0.04);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);

        this.musicNodes.push(osc);

        setTimeout(() => {
            this.musicNodes = this.musicNodes.filter(n => n !== osc);
        }, (duration + 0.5) * 1000);
    }

    createOscillator(frequency, type, duration, volume = 0.3) {
        if (!this.enabled || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain || this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    }

    playFlap() {
        this.createOscillator(400, 'sine', 0.08, 0.2);
        setTimeout(() => this.createOscillator(600, 'triangle', 0.05, 0.15), 30);
    }

    playCoin() {
        this.createOscillator(988, 'sine', 0.08, 0.2);
        setTimeout(() => this.createOscillator(1319, 'sine', 0.1, 0.18), 50);
        setTimeout(() => this.createOscillator(1568, 'triangle', 0.12, 0.1), 90);
    }

    playScore() {
        this.createOscillator(523, 'sine', 0.1, 0.15);
        setTimeout(() => this.createOscillator(659, 'triangle', 0.08, 0.12), 50);
    }

    playHit() {
        this.createOscillator(80, 'sine', 0.3, 0.4);
        this.createOscillator(100, 'sawtooth', 0.2, 0.2);
    }
}

// ============================================================================
// FLAPPY PARTICLE SYSTEM
// ============================================================================
class FlappyParticle {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || (Math.random() - 0.5) * 6;
        this.vy = config.vy || (Math.random() - 0.5) * 6;
        this.life = config.life || 1;
        this.maxLife = this.life;
        this.size = config.size || 4;
        this.color = config.color || '#fff';
        this.gravity = config.gravity || 0;
    }

    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        this.vy += this.gravity * dt * 60;
        this.life -= dt;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const size = this.size * alpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class FlappyParticles {
    constructor() {
        this.particles = [];
    }

    emitFlap(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 2) + (Math.random() - 0.5) * 1;
            const speed = 2 + Math.random() * 4;
            this.particles.push(new FlappyParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.2,
                size: 3 + Math.random() * 3,
                color: '#fff',
                gravity: 0.2
            }));
        }
    }

    emitCoin(x, y) {
        const colors = ['#FFD700', '#FFA500', '#FFEB3B'];
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            this.particles.push(new FlappyParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.3,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.1
            }));
        }
    }

    emitDeath(x, y, color) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 8;
            this.particles.push(new FlappyParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.4,
                size: 4 + Math.random() * 6,
                color: i % 3 === 0 ? '#fff' : color,
                gravity: 0.15
            }));
        }
    }

    update(dt) {
        this.particles = this.particles.filter(p => {
            p.update(dt);
            return !p.isDead();
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}

// ============================================================================
// FLAPPY BACKGROUND
// ============================================================================
class FlappyBackground {
    constructor(game) {
        this.game = game;
        this.clouds = [];
        this.buildings = [];

        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * 1500,
                y: 30 + Math.random() * 150,
                size: 30 + Math.random() * 50,
                speed: 0.2 + Math.random() * 0.3
            });
        }

        for (let i = 0; i < 15; i++) {
            this.buildings.push({
                x: i * 120,
                width: 60 + Math.random() * 60,
                height: 80 + Math.random() * 150,
                color: Math.random() > 0.5 ? '#1a1a2e' : '#252542'
            });
        }
    }

    update(dt) {
        const speed = this.game.pipeSpeed;

        this.clouds.forEach(cloud => {
            cloud.x -= speed * cloud.speed * dt * 60;
            if (cloud.x + cloud.size * 2 < 0) {
                cloud.x = this.game.canvas.width + cloud.size;
                cloud.y = 30 + Math.random() * 150;
            }
        });

        this.buildings.forEach(building => {
            building.x -= speed * 0.5 * dt * 60;
            if (building.x + building.width < 0) {
                building.x = this.game.canvas.width + Math.random() * 100;
                building.height = 80 + Math.random() * 150;
            }
        });
    }

    draw(ctx) {
        const theme = this.game.getTheme();
        const canvas = this.game.canvas;

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        theme.skyGradient.forEach((color, i) => {
            skyGrad.addColorStop(i / (theme.skyGradient.length - 1), color);
        });
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clouds
        ctx.fillStyle = theme.cloudColor;
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.35, cloud.y - cloud.size * 0.2, cloud.size * 0.4, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.7, cloud.y, cloud.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
        });

        // Buildings silhouette
        const groundY = canvas.height - this.game.groundHeight;
        this.buildings.forEach(building => {
            ctx.fillStyle = building.color;
            ctx.fillRect(building.x, groundY - building.height, building.width, building.height);

            // Windows
            ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
            for (let wy = groundY - building.height + 15; wy < groundY - 20; wy += 25) {
                for (let wx = building.x + 10; wx < building.x + building.width - 15; wx += 20) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(wx, wy, 10, 12);
                    }
                }
            }
        });

        // Ground
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        groundGrad.addColorStop(0, theme.groundGradient[0]);
        groundGrad.addColorStop(1, theme.groundGradient[1]);
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, canvas.width, this.game.groundHeight);

        // Ground line
        ctx.strokeStyle = theme.groundLineColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();
    }
}

// ============================================================================
// MAIN FLAPPY GAME
// ============================================================================
class FlappyGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.audio = new FlappyAudio();
        this.particles = new FlappyParticles();
        this.background = null;
        this.bird = new FlappyBird(this);

        this.pipes = [];
        this.pipeSpeed = 3.5;
        this.pipeSpawnTimer = 0;
        this.pipeSpawnInterval = 2000;

        this.groundHeight = 80;

        this.score = 0;
        this.coinsCollected = 0;
        this.running = false;
        this.gameOver = false;

        this.lastTime = 0;

        this.themeId = 'forest';
        this.characterColor = '#2196F3';

        this.shake = { x: 0, y: 0, intensity: 0, duration: 0 };

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupControls();
        this.loadEquipped();
        this.background = new FlappyBackground(this);
        this.bird.reset();
        this.draw();
    }

    resize() {
        const wrapper = this.canvas.parentElement;
        this.canvas.width = wrapper.clientWidth;
        this.canvas.height = wrapper.clientHeight;
        this.background = new FlappyBackground(this);
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp') && this.running) {
                e.preventDefault();
                this.bird.flap();
            }
        });

        this.canvas.addEventListener('click', () => {
            if (this.running) this.bird.flap();
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.running) this.bird.flap();
        });
    }

    loadEquipped() {
        if (window.progression) {
            const equipped = progression.getEquipped();
            this.themeId = equipped.theme;

            const colorData = GAME_DATA.colors[equipped.color];
            if (colorData) {
                this.characterColor = colorData.hex === 'rainbow' ? this.getRainbowColor() : colorData.hex;
            }
        }
    }

    getRainbowColor() {
        const hue = (Date.now() / 20) % 360;
        return `hsl(${hue}, 80%, 50%)`;
    }

    getTheme() {
        const themeData = GAME_DATA.themes[this.themeId];
        return themeData ? themeData.colors : GAME_DATA.themes.forest.colors;
    }

    start() {
        this.loadEquipped();
        this.audio.init();
        this.audio.startMusic();

        this.running = true;
        this.gameOver = false;

        this.reset();
        this.background = new FlappyBackground(this);
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    reset() {
        this.score = 0;
        this.coinsCollected = 0;
        this.pipes = [];
        this.pipeSpawnTimer = 0;
        this.particles.clear();
        this.bird.reset();
        this.updateHUD();
    }

    gameLoop(currentTime) {
        if (!this.running) return;

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // Rainbow color update
        if (GAME_DATA.colors[progression?.getEquipped()?.color]?.hex === 'rainbow') {
            this.characterColor = this.getRainbowColor();
        }

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        this.background.update(dt);
        this.bird.update(dt);

        // Spawn pipes
        this.pipeSpawnTimer += dt * 1000;
        if (this.pipeSpawnTimer > this.pipeSpawnInterval) {
            this.pipes.push(new Pipe(this, this.canvas.width + 50));
            this.pipeSpawnTimer = 0;
        }

        // Update pipes
        this.pipes.forEach(pipe => pipe.update(dt));
        this.pipes = this.pipes.filter(pipe => !pipe.isOffScreen());

        this.checkCollisions();
        this.particles.update(dt);

        // Screen shake
        if (this.shake.duration > 0) {
            this.shake.duration -= dt * 1000;
            this.shake.x = (Math.random() - 0.5) * this.shake.intensity;
            this.shake.y = (Math.random() - 0.5) * this.shake.intensity;
        } else {
            this.shake.x = 0;
            this.shake.y = 0;
        }

        this.updateHUD();
    }

    checkCollisions() {
        const birdBounds = this.bird.getBounds();

        for (const pipe of this.pipes) {
            // Check pipe collision
            if (this.intersects(birdBounds, pipe.getTopBounds()) ||
                this.intersects(birdBounds, pipe.getBottomBounds())) {
                this.die();
                return;
            }

            // Score when passing pipe
            if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.audio.playScore();
            }

            // Coin collection
            const coinBounds = pipe.getCoinBounds();
            if (coinBounds && this.intersects(birdBounds, coinBounds)) {
                pipe.coinCollected = true;
                this.coinsCollected++;
                this.audio.playCoin();
                this.particles.emitCoin(coinBounds.x + 15, coinBounds.y + 15);
            }
        }
    }

    intersects(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    die() {
        this.running = false;
        this.gameOver = true;

        this.audio.stopMusic();
        this.audio.playHit();
        this.particles.emitDeath(
            this.bird.x + this.bird.width / 2,
            this.bird.y + this.bird.height / 2,
            this.characterColor
        );
        this.screenShake(15, 500);

        // Process game end
        const gameStats = {
            score: this.score * 100, // Scale score for progression
            coinsCollected: this.coinsCollected,
            distance: this.score * 50,
            obstaclesDodged: this.score,
            maxCombo: Math.floor(this.score / 5)
        };

        if (window.progression) {
            progression.data.sessionStats = gameStats;
            const rewards = progression.processGameEnd(gameStats);

            setTimeout(() => {
                this.showGameOver(gameStats, rewards);
            }, 500);
        }
    }

    showGameOver(stats, rewards) {
        document.getElementById('finalScore').textContent = this.score.toLocaleString();
        document.getElementById('earnedCoins').textContent = stats.coinsCollected;
        document.getElementById('earnedXp').textContent = rewards.xpEarned;
        document.getElementById('finalDistance').textContent = Math.floor(stats.distance) + 'm';
        document.getElementById('finalObstacles').textContent = stats.obstaclesDodged;
        document.getElementById('finalMaxCombo').textContent = stats.maxCombo + 'x';
        document.getElementById('newRecord').style.display = rewards.newHighScore ? 'block' : 'none';

        document.getElementById('gameoverScreen').classList.add('show');
        document.getElementById('hud').style.display = 'none';
    }

    screenShake(intensity, duration) {
        this.shake.intensity = intensity;
        this.shake.duration = duration;
    }

    draw() {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.shake.x, this.shake.y);

        this.background.draw(ctx);
        this.pipes.forEach(pipe => pipe.draw(ctx));
        this.bird.draw(ctx);
        this.particles.draw(ctx);

        ctx.restore();
    }

    updateHUD() {
        document.getElementById('scoreDisplay').textContent = this.score.toLocaleString();
        document.getElementById('coinsDisplay').textContent = this.coinsCollected;

        if (window.progression) {
            document.getElementById('highScoreDisplay').textContent = progression.data.highScore.toLocaleString();
        }
    }
}

// Export for use
window.FlappyGame = FlappyGame;
window.flappyGame = null;

// Function to start Flappy game
window.startFlappyGame = function() {
    if (!window.flappyGame) {
        window.flappyGame = new FlappyGame();
    }
    window.flappyGame.start();
};
