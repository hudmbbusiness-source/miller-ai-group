/**
 * HEADING SOUTH - GAME ENGINE
 * Escape the snowstorm! Fly south through the gaps to safety.
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
        const topHeight = this.gapY;
        const bottomY = this.gapY + this.gap;
        const bottomHeight = this.game.canvas.height - this.game.groundHeight - bottomY;

        // Icy frozen pipe gradient
        const pipeGrad = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        pipeGrad.addColorStop(0, '#5dade2');
        pipeGrad.addColorStop(0.3, '#aed6f1');
        pipeGrad.addColorStop(0.5, '#ebf5fb');
        pipeGrad.addColorStop(0.7, '#aed6f1');
        pipeGrad.addColorStop(1, '#3498db');

        ctx.fillStyle = pipeGrad;
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 3;

        // Top pipe (icicle)
        ctx.beginPath();
        ctx.roundRect(this.x, 0, this.width, topHeight, [0, 0, 10, 10]);
        ctx.fill();
        ctx.stroke();

        // Icicles hanging from top pipe
        ctx.fillStyle = '#d4e6f1';
        for (let i = 0; i < 4; i++) {
            const icicleX = this.x + 10 + i * 15;
            const icicleH = 15 + Math.sin(i * 2) * 8;
            ctx.beginPath();
            ctx.moveTo(icicleX, topHeight);
            ctx.lineTo(icicleX + 5, topHeight + icicleH);
            ctx.lineTo(icicleX + 10, topHeight);
            ctx.closePath();
            ctx.fill();
        }

        // Top pipe cap with snow
        ctx.fillStyle = pipeGrad;
        ctx.beginPath();
        ctx.roundRect(this.x - 5, topHeight - 30, this.width + 10, 30, 6);
        ctx.fill();
        ctx.stroke();

        // Bottom pipe
        ctx.beginPath();
        ctx.roundRect(this.x, bottomY, this.width, bottomHeight, [10, 10, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Snow pile on bottom pipe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, bottomY - 5, this.width / 2 + 5, 12, 0, Math.PI, 0);
        ctx.fill();

        // Bottom pipe cap
        ctx.fillStyle = pipeGrad;
        ctx.beginPath();
        ctx.roundRect(this.x - 5, bottomY, this.width + 10, 30, 6);
        ctx.fill();
        ctx.stroke();

        // Frost shimmer effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.x + 5, 0, 8, topHeight);
        ctx.fillRect(this.x + 5, bottomY, 8, bottomHeight);

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
// FLAPPY BACKGROUND - HEADING SOUTH (Snowstorm Theme)
// ============================================================================
class FlappyBackground {
    constructor(game) {
        this.game = game;
        this.snowflakes = [];
        this.stormClouds = [];
        this.trees = [];

        // Create snowflakes
        for (let i = 0; i < 150; i++) {
            this.snowflakes.push({
                x: Math.random() * 2000,
                y: Math.random() * 800,
                size: 1 + Math.random() * 4,
                speed: 2 + Math.random() * 4,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.03
            });
        }

        // Storm clouds
        for (let i = 0; i < 6; i++) {
            this.stormClouds.push({
                x: Math.random() * 1500,
                y: -20 + Math.random() * 100,
                size: 80 + Math.random() * 120,
                speed: 0.5 + Math.random() * 0.5,
                darkness: 0.3 + Math.random() * 0.4
            });
        }

        // Snowy trees in background
        for (let i = 0; i < 20; i++) {
            this.trees.push({
                x: i * 100 + Math.random() * 50,
                height: 40 + Math.random() * 80,
                width: 20 + Math.random() * 30
            });
        }
    }

    update(dt) {
        const speed = this.game.pipeSpeed;

        // Snowflakes fall and blow sideways
        this.snowflakes.forEach(flake => {
            flake.y += flake.speed * dt * 60;
            flake.x -= (speed * 0.8 + Math.sin(flake.wobble) * 2) * dt * 60;
            flake.wobble += flake.wobbleSpeed;

            if (flake.y > this.game.canvas.height) {
                flake.y = -10;
                flake.x = Math.random() * this.game.canvas.width * 1.5;
            }
            if (flake.x < -20) {
                flake.x = this.game.canvas.width + 20;
            }
        });

        // Storm clouds move
        this.stormClouds.forEach(cloud => {
            cloud.x -= speed * cloud.speed * dt * 60;
            if (cloud.x + cloud.size * 2 < 0) {
                cloud.x = this.game.canvas.width + cloud.size;
            }
        });

        // Trees scroll
        this.trees.forEach(tree => {
            tree.x -= speed * 0.3 * dt * 60;
            if (tree.x + tree.width < 0) {
                tree.x = this.game.canvas.width + Math.random() * 100;
                tree.height = 40 + Math.random() * 80;
            }
        });
    }

    draw(ctx) {
        const canvas = this.game.canvas;
        const groundY = canvas.height - this.game.groundHeight;

        // Stormy winter sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, '#2c3e50');
        skyGrad.addColorStop(0.3, '#4a6274');
        skyGrad.addColorStop(0.6, '#7f8c9a');
        skyGrad.addColorStop(1, '#bdc3c7');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Storm clouds
        this.stormClouds.forEach(cloud => {
            ctx.fillStyle = `rgba(40, 50, 60, ${cloud.darkness})`;
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.5, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.8, cloud.y, cloud.size * 0.55, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.3, cloud.y + cloud.size * 0.1, cloud.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
        });

        // Snowy trees silhouettes
        this.trees.forEach(tree => {
            // Tree trunk
            ctx.fillStyle = '#3d2914';
            ctx.fillRect(tree.x + tree.width * 0.4, groundY - tree.height * 0.3, tree.width * 0.2, tree.height * 0.3);

            // Snowy evergreen shape
            ctx.fillStyle = '#2d4a3e';
            ctx.beginPath();
            ctx.moveTo(tree.x + tree.width / 2, groundY - tree.height);
            ctx.lineTo(tree.x + tree.width, groundY - tree.height * 0.3);
            ctx.lineTo(tree.x, groundY - tree.height * 0.3);
            ctx.closePath();
            ctx.fill();

            // Snow on tree
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(tree.x + tree.width / 2, groundY - tree.height);
            ctx.lineTo(tree.x + tree.width * 0.7, groundY - tree.height * 0.6);
            ctx.lineTo(tree.x + tree.width * 0.3, groundY - tree.height * 0.6);
            ctx.closePath();
            ctx.fill();
        });

        // Snowy ground
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        groundGrad.addColorStop(0, '#ecf0f1');
        groundGrad.addColorStop(0.5, '#d5dbdb');
        groundGrad.addColorStop(1, '#bfc9ca');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, canvas.width, this.game.groundHeight);

        // Snow drifts on ground
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let x = 0; x < canvas.width; x += 60) {
            ctx.beginPath();
            ctx.arc(x + 30, groundY + 5, 25 + Math.sin(x * 0.1) * 10, Math.PI, 0);
            ctx.fill();
        }

        // Ground line (icy)
        ctx.strokeStyle = '#85c1e9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        // Snowflakes
        ctx.fillStyle = '#fff';
        this.snowflakes.forEach(flake => {
            ctx.globalAlpha = 0.6 + Math.sin(flake.wobble) * 0.4;
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Wind streaks for storm effect
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const y = 50 + i * 50 + Math.sin(Date.now() * 0.001 + i) * 20;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y + 30);
            ctx.stroke();
        }
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
        this.paused = false;

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
        this.setupPauseControls();
        this.loadEquipped();
        this.background = new FlappyBackground(this);
        this.bird.reset();
        this.draw();
    }

    setupPauseControls() {
        // Pause button
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.pause());

        // Resume button
        document.getElementById('resumeBtn')?.addEventListener('click', () => this.resume());

        // Quit button
        document.getElementById('quitBtn')?.addEventListener('click', () => this.quit());

        // Auto-pause on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.running && !this.paused && !this.gameOver) {
                this.pause();
            }
        });

        // Auto-pause on window blur
        window.addEventListener('blur', () => {
            if (this.running && !this.paused && !this.gameOver) {
                this.pause();
            }
        });
    }

    pause() {
        if (!this.running || this.gameOver || this.paused) return;
        this.paused = true;
        this.audio.stopMusic();
        document.getElementById('pauseOverlay')?.classList.add('show');
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        this.lastTime = performance.now();
        this.audio.startMusic();
        document.getElementById('pauseOverlay')?.classList.remove('show');
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    quit() {
        this.paused = false;
        this.running = false;
        this.audio.stopMusic();
        document.getElementById('pauseOverlay')?.classList.remove('show');
        document.getElementById('hud').style.display = 'none';
        document.getElementById('topBar').style.display = 'flex';
        document.getElementById('navButtons').style.display = 'flex';
        document.getElementById('gamesScreen').classList.add('active');
        this.reset();
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
        // Ensure canvas has proper dimensions before starting
        this.resize();

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
        if (!this.running || this.paused) return;

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

        // Submit score to leaderboard
        if (window.app && this.score > 0) {
            window.app.submitScore('flappy', this.score);
        }
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
