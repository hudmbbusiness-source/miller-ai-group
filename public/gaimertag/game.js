/**
 * SUPER RUNNER - GAME ENGINE
 * Core gameplay with particles, audio, and progression integration
 */

// ============================================================================
// AUDIO SYSTEM - Enhanced with background music
// ============================================================================
class AudioSystem {
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

            // Master gain
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.context.destination);

            // Separate channels for music and SFX
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = 0.15;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = 0.4;
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    // Background music using procedural generation
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

        // Upbeat chord progression: C - G - Am - F (classic feel-good progression)
        const chords = [
            [261.63, 329.63, 392.00], // C major
            [196.00, 246.94, 293.66], // G major (lower octave)
            [220.00, 261.63, 329.63], // A minor
            [174.61, 220.00, 261.63]  // F major
        ];

        const beatDuration = 0.5; // seconds per beat
        const barsPerLoop = 4;
        const beatsPerBar = 4;
        const loopDuration = barsPerLoop * beatsPerBar * beatDuration;

        const now = this.context.currentTime;

        // Play chord progression with arpeggio pattern
        chords.forEach((chord, chordIndex) => {
            const chordStart = now + (chordIndex * beatsPerBar * beatDuration);

            // Bass note
            this.playMusicNote(chord[0] / 2, chordStart, beatsPerBar * beatDuration * 0.9, 'sine', 0.12);

            // Arpeggiated melody pattern
            for (let beat = 0; beat < beatsPerBar; beat++) {
                const noteIndex = beat % chord.length;
                const noteTime = chordStart + (beat * beatDuration);
                const noteFreq = chord[noteIndex] * (beat === 2 ? 2 : 1); // Octave up on beat 3
                this.playMusicNote(noteFreq, noteTime, beatDuration * 0.4, 'triangle', 0.08);
            }
        });

        // Schedule next loop
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

        // Soft attack and release
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gain.gain.setValueAtTime(volume, startTime + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);

        this.musicNodes.push(osc);

        // Cleanup old nodes
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

    playJump() {
        // Bouncy spring sound
        this.createOscillator(350, 'sine', 0.12, 0.25);
        setTimeout(() => this.createOscillator(520, 'sine', 0.08, 0.2), 40);
        setTimeout(() => this.createOscillator(700, 'triangle', 0.06, 0.12), 80);
    }

    playCoin() {
        // Sparkly coin pickup
        this.createOscillator(988, 'sine', 0.08, 0.2);
        setTimeout(() => this.createOscillator(1319, 'sine', 0.1, 0.18), 60);
        setTimeout(() => this.createOscillator(1568, 'triangle', 0.12, 0.1), 100);
    }

    playHit() {
        // Impact with bass thud
        this.createOscillator(80, 'sine', 0.25, 0.4);
        this.createOscillator(120, 'sawtooth', 0.15, 0.25);
        setTimeout(() => this.createOscillator(60, 'square', 0.2, 0.15), 50);
    }

    playCombo() {
        // Ascending victory fanfare
        const notes = [523, 659, 784, 988, 1175];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(freq, 'sine', 0.12, 0.22);
                this.createOscillator(freq * 1.5, 'triangle', 0.08, 0.08);
            }, i * 50);
        });
    }

    playLevelUp() {
        // Epic level up fanfare
        const fanfare = [523, 659, 784, 1047, 1319, 1568];
        fanfare.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(freq, 'sine', 0.25, 0.28);
                this.createOscillator(freq / 2, 'triangle', 0.3, 0.12);
            }, i * 90);
        });
    }

    playNearMiss() {
        // Whoosh sound for close calls
        this.createOscillator(200, 'sawtooth', 0.08, 0.1);
        setTimeout(() => this.createOscillator(400, 'sine', 0.06, 0.08), 30);
    }
}

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================
class Particle {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || (Math.random() - 0.5) * 8;
        this.vy = config.vy || (Math.random() - 0.5) * 8;
        this.life = config.life || 1;
        this.maxLife = this.life;
        this.size = config.size || 5;
        this.color = config.color || '#fff';
        this.gravity = config.gravity || 0;
        this.friction = config.friction || 0.98;
    }

    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        this.vy += this.gravity * dt * 60;
        this.vx *= this.friction;
        this.vy *= this.friction;
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

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, config = {}) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                ...config,
                vx: config.vx !== undefined ? config.vx : (Math.random() - 0.5) * (config.spread || 8),
                vy: config.vy !== undefined ? config.vy : (Math.random() - 0.5) * (config.spread || 8),
            }));
        }
    }

    emitJump(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI / 2) + (Math.random() - 0.5) * 1.2;
            const speed = 3 + Math.random() * 5;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.3,
                size: 4 + Math.random() * 4,
                color: color,
                gravity: 0.3,
                friction: 0.95
            }));
        }
    }

    emitLand(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const angle = -Math.PI + Math.random() * Math.PI;
            const speed = 2 + Math.random() * 4;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: -Math.abs(Math.sin(angle)) * speed * 0.5,
                life: 0.3 + Math.random() * 0.2,
                size: 3 + Math.random() * 3,
                color: color,
                gravity: 0.2,
                friction: 0.92
            }));
        }
    }

    emitCoin(x, y) {
        const colors = ['#FFD700', '#FFA500', '#FFEB3B', '#fff'];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.4,
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.1,
                friction: 0.96
            }));
        }
    }

    emitDeath(x, y, color) {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6 + Math.random() * 0.5,
                size: 5 + Math.random() * 8,
                color: i % 3 === 0 ? '#fff' : color,
                gravity: 0.15,
                friction: 0.97
            }));
        }
    }

    emitTrail(x, y, color) {
        this.particles.push(new Particle(x, y, {
            vx: -2 + Math.random() * -3,
            vy: (Math.random() - 0.5) * 2,
            life: 0.2 + Math.random() * 0.15,
            size: 3 + Math.random() * 3,
            color: color,
            gravity: 0,
            friction: 0.9
        }));
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
// BACKGROUND SYSTEM
// ============================================================================
class Background {
    constructor(game) {
        this.game = game;
        this.layers = [];
        this.stars = [];
        this.clouds = [];
        this.groundDetails = [];
        this.initLayers();
    }

    initLayers() {
        for (let i = 0; i < 3; i++) {
            this.layers.push({
                offset: 0,
                speed: 0.2 + i * 0.15,
                points: this.generateTerrain(20, 50 + i * 30, 150 + i * 50)
            });
        }

        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 400,
                size: 0.5 + Math.random() * 2,
                twinkle: Math.random() * Math.PI * 2
            });
        }

        for (let i = 0; i < 6; i++) {
            this.clouds.push({
                x: Math.random() * 1500,
                y: 40 + Math.random() * 120,
                size: 40 + Math.random() * 60,
                speed: 0.3 + Math.random() * 0.4
            });
        }

        for (let i = 0; i < 30; i++) {
            this.groundDetails.push({
                x: Math.random() * 1500,
                size: 8 + Math.random() * 20,
                type: Math.floor(Math.random() * 3)
            });
        }
    }

    generateTerrain(segments, minHeight, maxHeight) {
        const points = [];
        const segmentWidth = 150;
        for (let i = 0; i <= segments; i++) {
            points.push({
                x: i * segmentWidth,
                y: minHeight + Math.random() * (maxHeight - minHeight)
            });
        }
        return points;
    }

    update(dt) {
        const speed = this.game.config.baseSpeed * this.game.config.speedMultiplier;

        this.layers.forEach(layer => {
            layer.offset -= speed * layer.speed * dt * 60;
            if (layer.offset < -150) layer.offset += 150;
        });

        this.clouds.forEach(cloud => {
            cloud.x -= speed * cloud.speed * dt * 60;
            if (cloud.x + cloud.size * 2 < 0) {
                cloud.x = this.game.canvas.width + cloud.size;
                cloud.y = 40 + Math.random() * 120;
            }
        });

        this.groundDetails.forEach(detail => {
            detail.x -= speed * dt * 60;
            if (detail.x + detail.size < 0) {
                detail.x = this.game.canvas.width + Math.random() * 200;
            }
        });

        this.stars.forEach(star => {
            star.twinkle += dt * 3;
        });
    }

    draw(ctx) {
        const theme = this.game.getTheme();
        const canvas = this.game.canvas;

        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height - this.game.config.groundHeight);
        theme.skyGradient.forEach((color, i) => {
            skyGrad.addColorStop(i / (theme.skyGradient.length - 1), color);
        });
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        if (theme.stars || theme.glow) {
            ctx.fillStyle = '#fff';
            this.stars.forEach(star => {
                const alpha = 0.3 + Math.sin(star.twinkle) * 0.7;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(star.x % canvas.width, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        // Clouds
        ctx.fillStyle = theme.cloudColor;
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.35, cloud.y - cloud.size * 0.2, cloud.size * 0.4, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.7, cloud.y, cloud.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
        });

        // Parallax layers
        this.layers.forEach((layer, i) => {
            const color = theme.parallaxColors[i] || theme.parallaxColors[0];
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6 - i * 0.15;

            ctx.beginPath();
            ctx.moveTo(0, canvas.height - this.game.config.groundHeight);
            layer.points.forEach(point => {
                ctx.lineTo(point.x + layer.offset, canvas.height - this.game.config.groundHeight - point.y);
            });
            ctx.lineTo(canvas.width + 200, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Ground
        const groundY = canvas.height - this.game.config.groundHeight;
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        groundGrad.addColorStop(0, theme.groundGradient[0]);
        groundGrad.addColorStop(1, theme.groundGradient[1]);
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, canvas.width, this.game.config.groundHeight);

        // Ground line
        if (theme.glow) {
            ctx.shadowColor = theme.groundLineColor;
            ctx.shadowBlur = 10;
        }
        ctx.strokeStyle = theme.groundLineColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Ground details
        ctx.fillStyle = theme.grassColor;
        this.groundDetails.forEach(detail => {
            switch (detail.type) {
                case 0:
                    ctx.beginPath();
                    ctx.moveTo(detail.x, groundY);
                    ctx.lineTo(detail.x + detail.size / 2, groundY - detail.size);
                    ctx.lineTo(detail.x + detail.size, groundY);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 1:
                    ctx.beginPath();
                    ctx.moveTo(detail.x, groundY);
                    ctx.lineTo(detail.x + detail.size * 0.3, groundY - detail.size * 0.8);
                    ctx.lineTo(detail.x + detail.size * 0.5, groundY);
                    ctx.lineTo(detail.x + detail.size * 0.7, groundY - detail.size);
                    ctx.lineTo(detail.x + detail.size, groundY);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 2:
                    ctx.beginPath();
                    ctx.arc(detail.x + detail.size / 2, groundY, detail.size / 2, Math.PI, 0);
                    ctx.fill();
                    break;
            }
        });
    }
}

// ============================================================================
// PLAYER
// ============================================================================
class Player {
    constructor(game) {
        this.game = game;
        this.width = 60;
        this.height = 60;
        this.normalHeight = 60;
        this.duckHeight = 30;
        this.x = 100;
        this.y = 0;
        this.vy = 0;
        this.isJumping = false;
        this.isDucking = false;
        this.wasInAir = false;
        this.groundY = 0;
        this.frame = 0;
        this.frameTimer = 0;
        this.squash = { x: 1, y: 1 };
        this.rotation = 0;
        this.trailTimer = 0;
        this.hasShield = false;
    }

    reset() {
        this.y = this.groundY;
        this.vy = 0;
        this.isJumping = false;
        this.isDucking = false;
        this.wasInAir = false;
        this.height = this.normalHeight;
        this.squash = { x: 1, y: 1 };
        this.rotation = 0;
        this.hasShield = false;
    }

    jump() {
        if (!this.isJumping && !this.isDucking) {
            const jumpMultiplier = this.game.activePowerups.jumpBoost || 1;
            this.vy = -this.game.config.jumpPower * jumpMultiplier;
            this.isJumping = true;
            this.squash = { x: 0.7, y: 1.3 };
            this.game.audio.playJump();
            this.game.particles.emitJump(
                this.x + this.width / 2,
                this.y + this.height,
                this.game.getTheme().particleColor
            );
        }
    }

    duck() {
        if (!this.isJumping && !this.isDucking) {
            this.isDucking = true;
            this.height = this.duckHeight;
            this.y = this.groundY + (this.normalHeight - this.duckHeight);
            this.squash = { x: 1.4, y: 0.5 };
        }
    }

    standUp() {
        if (this.isDucking) {
            this.isDucking = false;
            this.height = this.normalHeight;
            this.y = this.groundY;
            this.squash = { x: 0.8, y: 1.2 };
        }
    }

    update(dt) {
        this.vy += this.game.config.gravity * dt * 60;
        this.y += this.vy * dt * 60;

        if (this.y >= this.groundY) {
            if (this.wasInAir && this.vy > 5) {
                this.squash = { x: 1.3, y: 0.7 };
                this.game.particles.emitLand(
                    this.x + this.width / 2,
                    this.groundY + this.height,
                    this.game.getTheme().particleColor
                );
                this.game.screenShake(3, 100);
            }
            this.y = this.groundY;
            this.vy = 0;
            this.isJumping = false;
        }

        this.wasInAir = this.y < this.groundY;

        this.squash.x += (1 - this.squash.x) * 0.2;
        this.squash.y += (1 - this.squash.y) * 0.2;

        if (this.isJumping) {
            this.rotation = Math.sin(this.vy * 0.1) * 0.15;
        } else {
            this.rotation *= 0.8;
        }

        this.frameTimer += dt * 1000;
        if (this.frameTimer > 100) {
            this.frame = (this.frame + 1) % 4;
            this.frameTimer = 0;
        }

        this.trailTimer += dt * 1000;
        if (this.trailTimer > 50 && this.game.running) {
            this.game.particles.emitTrail(this.x, this.y + this.height / 2, this.game.characterColor);
            this.trailTimer = 0;
        }
    }

    draw(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.scale(this.squash.x, this.squash.y);
        ctx.translate(-this.width / 2, -this.height / 2);

        // Shield effect
        if (this.hasShield) {
            ctx.strokeStyle = '#00bcd4';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00bcd4';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(this.width / 2, this.height / 2, this.width * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        this.drawCharacter(ctx, 0, 0);
        ctx.restore();
    }

    drawCharacter(ctx, x, y) {
        const color = this.game.characterColor;
        const type = this.game.characterType;
        const w = this.width;
        const h = this.height;

        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        // Simplified character drawing based on type
        ctx.fillStyle = color;

        switch (type) {
            case 'robot':
                ctx.beginPath();
                ctx.roundRect(x + 12, y + 20, w - 24, h - 35, 8);
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(x + 10, y + 2, w - 20, 22, 6);
                ctx.fill();
                // Eyes
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.beginPath();
                ctx.roundRect(x + 14, y + 6, w - 28, 14, 4);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(x + 22, y + 13, 4, 0, Math.PI * 2);
                ctx.arc(x + 38, y + 13, 4, 0, Math.PI * 2);
                ctx.fill();
                // Antenna
                ctx.fillStyle = '#888';
                ctx.fillRect(x + w/2 - 2, y - 8, 4, 12);
                ctx.fillStyle = '#ff0';
                ctx.beginPath();
                ctx.arc(x + w/2, y - 10, 5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'cat':
                ctx.beginPath();
                ctx.ellipse(x + w/2, y + h - 22, 22, 18, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + w/2, y + 20, 18, 0, Math.PI * 2);
                ctx.fill();
                // Ears
                ctx.beginPath();
                ctx.moveTo(x + 12, y + 12);
                ctx.lineTo(x + 18, y - 8);
                ctx.lineTo(x + 28, y + 8);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x + w - 12, y + 12);
                ctx.lineTo(x + w - 18, y - 8);
                ctx.lineTo(x + w - 28, y + 8);
                ctx.closePath();
                ctx.fill();
                // Face
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + w/2 - 8, y + 18, 5, 0, Math.PI * 2);
                ctx.arc(x + w/2 + 8, y + 18, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(x + w/2 - 7, y + 19, 3, 0, Math.PI * 2);
                ctx.arc(x + w/2 + 9, y + 19, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'ninja':
                ctx.fillStyle = '#1a1a1a';
                ctx.beginPath();
                ctx.roundRect(x + 12, y + 22, w - 24, h - 35, 8);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + w/2, y + 15, 16, 0, Math.PI * 2);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.roundRect(x + 10, y + 8, w - 20, 14, 4);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.ellipse(x + 22, y + 15, 4, 5, 0, 0, Math.PI * 2);
                ctx.ellipse(x + w - 22, y + 15, 4, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Headband
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x + 8, y + 2, w - 16, 8, 3);
                ctx.fill();
                break;

            case 'alien':
                ctx.beginPath();
                ctx.ellipse(x + w/2, y + h - 18, 18, 15, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + w/2, y + 18, 22, 20, 0, 0, Math.PI * 2);
                ctx.fill();
                // Eyes
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.ellipse(x + w/2 - 10, y + 16, 10, 13, -0.2, 0, Math.PI * 2);
                ctx.ellipse(x + w/2 + 10, y + 16, 10, 13, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + w/2 - 13, y + 12, 4, 0, Math.PI * 2);
                ctx.arc(x + w/2 + 7, y + 12, 4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'dino':
                ctx.beginPath();
                ctx.ellipse(x + w/2 - 5, y + h - 22, 22, 18, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + 25, y + 22, 18, 16, -0.2, 0, Math.PI * 2);
                ctx.fill();
                // Eye
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + 28, y + 18, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(x + 30, y + 18, 4, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'bunny':
                ctx.beginPath();
                ctx.ellipse(x + w/2, y + h - 18, 20, 18, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + w/2, y + 22, 18, 0, Math.PI * 2);
                ctx.fill();
                // Ears
                ctx.beginPath();
                ctx.ellipse(x + 18, y - 15, 8, 22, -0.2, 0, Math.PI * 2);
                ctx.ellipse(x + w - 18, y - 15, 8, 22, 0.2, 0, Math.PI * 2);
                ctx.fill();
                // Face
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + w/2 - 8, y + 18, 6, 0, Math.PI * 2);
                ctx.arc(x + w/2 + 8, y + 18, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(x + w/2 - 7, y + 19, 3, 0, Math.PI * 2);
                ctx.arc(x + w/2 + 9, y + 19, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            default:
                // Generic character
                ctx.beginPath();
                ctx.arc(x + w/2, y + h/2, w/2 - 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + w/2 - 10, y + h/2 - 5, 6, 0, Math.PI * 2);
                ctx.arc(x + w/2 + 10, y + h/2 - 5, 6, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.shadowBlur = 0;
    }

    getBounds() {
        return {
            x: this.x + 10,
            y: this.y + 5,
            width: this.width - 20,
            height: this.height - 10
        };
    }
}

// ============================================================================
// OBSTACLE
// ============================================================================
class Obstacle {
    constructor(game, x) {
        this.game = game;
        this.x = x;
        this.width = 35 + Math.random() * 25;
        this.height = 40 + Math.random() * 50;
        this.y = game.canvas.height - game.config.groundHeight - this.height;
        this.scored = false;
        this.type = Math.floor(Math.random() * 3);
    }

    update(dt) {
        const speedMult = this.game.activePowerups.slowMotion || 1;
        const speed = this.game.config.baseSpeed * this.game.config.speedMultiplier * speedMult;
        this.x -= speed * dt * 60;
    }

    draw(ctx) {
        const theme = this.game.getTheme();
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
        grad.addColorStop(0, theme.obstacleGradient[0]);
        grad.addColorStop(1, theme.obstacleGradient[1]);
        ctx.fillStyle = grad;
        ctx.strokeStyle = theme.obstacleStroke || '#000';
        ctx.lineWidth = 3;

        if (theme.glow) {
            ctx.shadowColor = theme.obstacleGradient[0];
            ctx.shadowBlur = 20;
        }

        switch (this.type) {
            case 0:
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 1:
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height * 0.4);
                ctx.lineTo(this.x + this.width * 0.8, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.2, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 2:
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 8);
                ctx.fill();
                ctx.stroke();
                break;
        }

        // Highlight accent
        ctx.fillStyle = theme.obstacleAccent;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.roundRect(this.x + 5, this.y + 5, this.width * 0.3, this.height * 0.3, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    getBounds() {
        return {
            x: this.x + 5,
            y: this.y + 5,
            width: this.width - 10,
            height: this.height - 5
        };
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// ============================================================================
// COIN
// ============================================================================
class Coin {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.collected = false;
    }

    update(dt) {
        const speedMult = this.game.activePowerups.slowMotion || 1;
        const speed = this.game.config.baseSpeed * this.game.config.speedMultiplier * speedMult;
        this.x -= speed * dt * 60;
        this.rotation += 5 * dt;
        this.bobOffset += 3 * dt;

        // Magnet effect
        if (this.game.activePowerups.magnetRange) {
            const player = this.game.player;
            const dx = (player.x + player.width / 2) - this.x;
            const dy = (player.y + player.height / 2) - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.game.activePowerups.magnetRange) {
                const pull = 0.1 * (1 - dist / this.game.activePowerups.magnetRange);
                this.x += dx * pull;
                this.y += dy * pull;
            }
        }
    }

    draw(ctx) {
        if (this.collected) return;

        const bob = Math.sin(this.bobOffset) * 5;
        const stretch = Math.abs(Math.cos(this.rotation));

        ctx.save();
        ctx.translate(this.x, this.y + bob);
        ctx.scale(stretch, 1);

        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        grad.addColorStop(0, '#FFEB3B');
        grad.addColorStop(0.6, '#FFC107');
        grad.addColorStop(1, '#FF9800');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-3, -3, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 1);

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2,
            height: this.radius * 2
        };
    }

    isOffScreen() {
        return this.x + this.radius < 0;
    }
}

// ============================================================================
// MONSTER - Chases the player, gets faster with levels
// ============================================================================
class Monster {
    constructor(game) {
        this.game = game;
        this.width = 80;
        this.height = 80;
        this.x = -150;
        this.baseX = -150;
        this.y = 0;
        this.speed = 2;
        this.frame = 0;
        this.frameTimer = 0;
        this.eyeGlow = 0;
        this.roarTimer = 0;
        this.isRoaring = false;
    }

    reset() {
        this.x = -150;
        this.baseX = -150;
        this.speed = 2;
    }

    update(dt, level) {
        const groundY = this.game.canvas.height - this.game.config.groundHeight - this.height;
        this.y = groundY;

        // Monster speed increases with level
        this.speed = 2 + (level - 1) * 0.3;

        // Monster creeps closer over time, but stays behind player
        const targetX = this.game.player.x - 120 - (30 / level);
        const catchUpSpeed = this.speed * 0.5;

        if (this.x < targetX) {
            this.x += catchUpSpeed * dt * 60;
        }

        // Monster lunges when player is slow/ducking
        if (this.game.player.isDucking) {
            this.x += this.speed * 0.3 * dt * 60;
        }

        // Roar animation
        this.roarTimer += dt * 1000;
        if (this.roarTimer > 5000) {
            this.isRoaring = true;
            this.roarTimer = 0;
            setTimeout(() => this.isRoaring = false, 500);
        }

        // Animation
        this.frameTimer += dt * 1000;
        if (this.frameTimer > 150) {
            this.frame = (this.frame + 1) % 4;
            this.frameTimer = 0;
        }

        // Eye glow effect
        this.eyeGlow = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    }

    draw(ctx) {
        const theme = this.game.getTheme();

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Roar shake
        if (this.isRoaring) {
            ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2 - 5, this.width / 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Monster body - dark menacing shape
        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
        bodyGrad.addColorStop(0, '#4a0080');
        bodyGrad.addColorStop(0.6, '#2d004d');
        bodyGrad.addColorStop(1, '#1a0033');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, this.height / 2);
        ctx.lineTo(-this.width / 2 + 10, -this.height / 3);
        ctx.quadraticCurveTo(0, -this.height / 2 - 10, this.width / 2 - 10, -this.height / 3);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Spikes on top
        ctx.fillStyle = '#6b00a8';
        for (let i = -2; i <= 2; i++) {
            const spikeX = i * 12;
            const spikeH = 15 + Math.abs(i) * 3;
            ctx.beginPath();
            ctx.moveTo(spikeX - 6, -this.height / 3);
            ctx.lineTo(spikeX, -this.height / 3 - spikeH);
            ctx.lineTo(spikeX + 6, -this.height / 3);
            ctx.closePath();
            ctx.fill();
        }

        // Glowing eyes
        ctx.shadowColor = '#ff0040';
        ctx.shadowBlur = 20 * this.eyeGlow;

        ctx.fillStyle = `rgba(255, 0, 64, ${this.eyeGlow})`;
        ctx.beginPath();
        ctx.ellipse(-15, -5, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(15, -5, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupils
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-12, -5, 3, 0, Math.PI * 2);
        ctx.arc(18, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        if (this.isRoaring) {
            ctx.fillStyle = '#ff0040';
            ctx.beginPath();
            ctx.ellipse(0, 15, 20, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Teeth
            ctx.fillStyle = '#fff';
            for (let i = -3; i <= 3; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 5 - 2, 8);
                ctx.lineTo(i * 5, 18);
                ctx.lineTo(i * 5 + 2, 8);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // Closed mouth grin
            ctx.strokeStyle = '#ff0040';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 10, 15, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x + 10,
            y: this.y + 10,
            width: this.width - 20,
            height: this.height - 20
        };
    }
}

// ============================================================================
// MAIN GAME
// ============================================================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.config = {
            baseSpeed: 6,
            speedMultiplier: 1,
            jumpPower: 18,
            gravity: 0.9,
            groundHeight: 100
        };

        this.audio = new AudioSystem();
        this.particles = new ParticleSystem();
        this.background = null;
        this.player = new Player(this);
        this.monster = new Monster(this);

        this.obstacles = [];
        this.coins = [];

        this.score = 0;
        this.coinsCollected = 0;
        this.distance = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.obstaclesDodged = 0;
        this.level = 1;
        this.levelDistance = 0;

        this.running = false;
        this.gameOver = false;
        this.paused = false;

        this.lastTime = 0;
        this.obstacleTimer = 0;
        this.coinTimer = 0;

        this.shake = { x: 0, y: 0, intensity: 0, duration: 0 };

        this.characterType = 'robot';
        this.characterColor = '#4CAF50';
        this.themeId = 'forest';

        this.activePowerups = {};

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupControls();
        this.setupPauseControls();
        this.loadEquipped();
        this.background = new Background(this);
        this.player.groundY = this.canvas.height - this.config.groundHeight - this.player.height;
        this.player.y = this.player.groundY;
        this.draw();
    }

    setupPauseControls() {
        // Pause button
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.pause());

        // Resume button
        document.getElementById('resumeBtn')?.addEventListener('click', () => this.resume());

        // Quit button
        document.getElementById('quitBtn')?.addEventListener('click', () => this.quit());

        // Auto-pause on visibility change (notifications, switching apps)
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
        document.getElementById('playScreen').classList.add('active');
        this.reset();
        this.draw();
    }

    resize() {
        const wrapper = this.canvas.parentElement;
        this.canvas.width = wrapper.clientWidth;
        this.canvas.height = wrapper.clientHeight;

        this.player.groundY = this.canvas.height - this.config.groundHeight - this.player.height;
        if (!this.running) {
            this.player.y = this.player.groundY;
        }

        this.background = new Background(this);
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.running) return;

            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.player.jump();
            }
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.player.duck();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowDown' && this.running) {
                this.player.standUp();
            }
        });

        // Touch controls - swipe up to jump, swipe down to duck, tap to jump
        let touchStartY = 0;
        let touchStartTime = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.running) return;

            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchStartY - touchEndY;
            const deltaTime = Date.now() - touchStartTime;

            // Quick tap = jump
            if (deltaTime < 200 && Math.abs(deltaY) < 30) {
                this.player.jump();
            }
            // Swipe up = jump
            else if (deltaY > 50) {
                this.player.jump();
            }
            // Swipe down = duck (release to stand up)
            else if (deltaY < -50) {
                this.player.duck();
                setTimeout(() => this.player.standUp(), 500);
            }
        });

        // Mouse click to jump
        this.canvas.addEventListener('click', () => {
            if (this.running) this.player.jump();
        });
    }

    loadEquipped() {
        if (window.progression) {
            const equipped = progression.getEquipped();
            this.characterType = equipped.character;
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
        this.background = new Background(this);
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    reset() {
        this.score = 0;
        this.coinsCollected = 0;
        this.distance = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.obstaclesDodged = 0;
        this.level = 1;
        this.levelDistance = 0;
        this.config.speedMultiplier = 1;
        this.obstacles = [];
        this.coins = [];
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.particles.clear();
        this.activePowerups = {};

        this.player.reset();
        this.monster.reset();
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
        this.player.update(dt);
        this.monster.update(dt, this.level);

        // Level progression - every 500 distance, level up
        this.levelDistance += dt * this.config.baseSpeed * this.config.speedMultiplier;
        if (this.levelDistance > 500) {
            this.level++;
            this.levelDistance = 0;
            this.config.speedMultiplier = 1 + (this.level - 1) * 0.1;
            this.showLevelUp();
        }

        // Spawn obstacles - faster at higher levels
        this.obstacleTimer += dt * 1000;
        const baseInterval = Math.max(600, 1400 - this.level * 50);
        const spawnInterval = Math.max(500, baseInterval - this.distance * 0.3);
        if (this.obstacleTimer > spawnInterval) {
            this.obstacles.push(new Obstacle(this, this.canvas.width + 50));
            this.obstacleTimer = 0;
        }

        // Spawn coins
        this.coinTimer += dt * 1000;
        if (this.coinTimer > 2000) {
            const coinY = this.canvas.height - this.config.groundHeight - 80 - Math.random() * 100;
            this.coins.push(new Coin(this, this.canvas.width + 50, coinY));
            this.coinTimer = 0;
        }

        // Update entities
        this.obstacles.forEach(o => o.update(dt));
        this.obstacles = this.obstacles.filter(o => !o.isOffScreen());

        this.coins.forEach(c => c.update(dt));
        this.coins = this.coins.filter(c => !c.isOffScreen() && !c.collected);

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

        // Score
        const scoreMult = this.activePowerups.scoreMultiplier || 1;
        this.score += Math.floor(dt * 10 * this.config.speedMultiplier * scoreMult);
        this.distance += dt * this.config.baseSpeed * this.config.speedMultiplier;

        this.updateHUD();
    }

    showLevelUp() {
        const comboDisplay = document.getElementById('comboDisplay');
        comboDisplay.textContent = `LEVEL ${this.level}!`;
        comboDisplay.classList.remove('show');
        void comboDisplay.offsetWidth;
        comboDisplay.classList.add('show');
        this.audio.playCombo();
        this.screenShake(5, 200);
    }

    checkCollisions() {
        const playerBounds = this.player.getBounds();

        // Monster catches player
        const monsterBounds = this.monster.getBounds();
        if (this.intersects(playerBounds, monsterBounds)) {
            this.die('monster');
            return;
        }

        // Obstacles
        for (const obstacle of this.obstacles) {
            const obstacleBounds = obstacle.getBounds();

            if (this.intersects(playerBounds, obstacleBounds)) {
                if (this.player.hasShield) {
                    this.player.hasShield = false;
                    this.obstacles = this.obstacles.filter(o => o !== obstacle);
                    this.particles.emitCoin(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
                    continue;
                }
                this.die();
                return;
            }

            if (!obstacle.scored && obstacle.x + obstacle.width < this.player.x) {
                obstacle.scored = true;
                this.obstaclesDodged++;
                const scoreMult = this.activePowerups.scoreMultiplier || 1;
                this.score += 50 * scoreMult;
                this.combo++;
                this.maxCombo = Math.max(this.maxCombo, this.combo);

                if (this.combo >= 3) {
                    this.showCombo();
                }
            }
        }

        // Coins
        for (const coin of this.coins) {
            if (coin.collected) continue;

            const coinBounds = coin.getBounds();

            if (this.intersects(playerBounds, coinBounds)) {
                coin.collected = true;
                const coinMult = this.activePowerups.coinMultiplier || 1;
                this.coinsCollected += Math.floor(1 * coinMult);
                this.score += 100 * coinMult;
                this.audio.playCoin();
                this.particles.emitCoin(coin.x, coin.y);
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
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            this.characterColor
        );
        this.screenShake(15, 500);

        // Process game end with progression
        const gameStats = {
            score: this.score,
            coinsCollected: this.coinsCollected,
            distance: this.distance,
            obstaclesDodged: this.obstaclesDodged,
            maxCombo: this.maxCombo
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
        document.getElementById('finalScore').textContent = stats.score.toLocaleString();
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

    showCombo() {
        const comboDisplay = document.getElementById('comboDisplay');
        comboDisplay.textContent = `${this.combo}x COMBO!`;
        comboDisplay.classList.remove('show');
        void comboDisplay.offsetWidth;
        comboDisplay.classList.add('show');

        if (this.combo >= 5) {
            this.audio.playCombo();
        }
    }

    draw() {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.shake.x, this.shake.y);

        this.background.draw(ctx);
        this.monster.draw(ctx);
        this.coins.forEach(coin => coin.draw(ctx));
        this.obstacles.forEach(obstacle => obstacle.draw(ctx));
        this.player.draw(ctx);
        this.particles.draw(ctx);

        // Level indicator
        if (this.running) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 16px Quicksand';
            ctx.textAlign = 'right';
            ctx.fillText(`LVL ${this.level}`, this.canvas.width - 20, 30);
        }

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

// Create global instance only when DOM is ready
function initGame() {
    if (!window.game) {
        window.game = new Game();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
