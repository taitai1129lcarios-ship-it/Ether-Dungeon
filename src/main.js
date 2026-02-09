import { InputHandler, Camera, Map, Entity } from './utils.js'; // Updated for Death Animation
import { Player } from './player.js';
import { Enemy, Slime, Bat, Goblin, Chest } from './entities.js';
import { createSkill } from './skills.js';
import { drawUI, showSkillSelection, hideSkillSelection } from './ui.js';
import { initInventory, renderInventory } from './inventory.js';
import { skillsDB } from '../data/skills_db.js';

const logToScreen = (msg) => {
    console.log(msg);
    let logParams = document.getElementById('debug-log');
    if (!logParams) {
        logParams = document.createElement('div');
        logParams.id = 'debug-log';
        logParams.style.cssText = "position:absolute;top:0;left:0;width:300px;height:200px;overflow:auto;background:rgba(0,0,0,0.5);color:white;z-index:9999;font-size:12px;pointer-events:none;";
        document.body.appendChild(logParams);
    }
    logParams.innerHTML += `<div>${msg}</div>`;
    logParams.scrollTop = logParams.scrollHeight;
};

logToScreen("Script loaded");

// Enemy class moved to entities.js
class Game {
    constructor() {
        logToScreen("Game Constructor Start");
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.zoom = 1.2;
        this.debugMode = false;

        this.input = new InputHandler();
        try {
            this.init();
        } catch (e) {
            logToScreen("Init Error: " + e.message);
            console.error(e);
        }

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
        logToScreen("Game Loop Started");
    }

    init() {
        // Larger Map: 80x60 tiles (3200x2400 pixels)
        this.map = new Map(80, 60, 40);
        this.map.generate();
        logToScreen("Map Generated");

        this.camera = new Camera(this.width / this.zoom, this.height / this.zoom, this.map.pixelWidth, this.map.pixelHeight);

        const startRoom = this.map.rooms.find(r => r.type === 'start') || this.map.rooms[0];
        console.log("Start Room:", startRoom);
        if (startRoom) {
            this.player = new Player(this, (startRoom.x + startRoom.w / 2) * 40, (startRoom.y + startRoom.h / 2) * 40);
            console.log("Player Spawned at:", this.player.x, this.player.y);
        } else {
            console.error("CRITICAL: No rooms found to spawn player!");
            this.player = new Player(this, 100, 100); // Emergency fallback
        }
        this.camera.follow(this.player);

        // --- Load Skills from DB ---
        skillsDB.forEach(skillData => {
            const skill = createSkill(skillData);
            if (skill) {
                this.player.inventory.push(skill);
                // Auto equip for now based on type (simple logic)
                if (!this.player.equippedSkills[skill.type]) {
                    this.player.equipSkill(skill);
                }
            }
        });

        this.enemies = [];
        this.chests = [];

        for (let i = 0; i < this.map.rooms.length; i++) { // Include room 0 now as it might be treasure
            const room = this.map.rooms[i];

            // Skip spawning enemies in the very first room (Start Room) 
            // We'll treat index 0 as start room? Or we should pick a start room.
            // Current map gen: placePresetRoom (Treasure) is first added?
            // Wait, generate() calls: place preset, then random.
            // So rooms[0] is likely the Treasure Room.

            if (room.type === 'treasure') {
                // Spawn Chest in center
                const cx = (room.x + Math.floor(room.w / 2)) * 40;
                const cy = (room.y + Math.floor(room.h / 2)) * 40;
                this.chests.push(new Chest(this, cx, cy));

                // Maybe a guardian enemy?
                const gx = (room.x + Math.floor(room.w / 2) + 1) * 40;
                const gy = (room.y + Math.floor(room.h / 2)) * 40;
                this.enemies.push(new Goblin(this, gx, gy));

                continue; // Done for this room
            }

        }

        this.animations = [];
        this.projectiles = [];
        this.lastTime = 0;
        this.accumulator = 0;
        this.step = 1 / 60;
        this.isGameOver = false;

        this.uiHp = document.getElementById('hp-value');
        this.uiHpMax = document.getElementById('hp-max');
        this.uiHpBar = document.getElementById('health-bar-fill');
        this.uiLevel = document.getElementById('level-value');

        this.showInventory = false;
        initInventory(this);
    }

    spawnParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.animations.push({
                type: 'particle',
                x: x, y: y,
                w: 4, h: 4,
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                color: color,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200
            });
        }
    }

    spawnDeathEffect(entity) {
        // 1. White Silhouette (Ghost)
        this.animations.push({
            type: 'ghost',
            x: entity.x,
            y: entity.y,
            w: entity.width,
            h: entity.height,
            image: entity.image, // Use same sprite
            spriteData: null, // Simple image for now, unless animated
            life: 0.5,
            maxLife: 0.5,
            isWhite: true, // Special flag for white silhouette
            scale: 1.0
        });

        // 2. Circular Explosion
        const particleCount = 16;
        const angleStep = (Math.PI * 2) / particleCount;
        const speed = 150;
        const cx = entity.x + entity.width / 2;
        const cy = entity.y + entity.height / 2;

        for (let i = 0; i < particleCount; i++) {
            const angle = i * angleStep;
            this.animations.push({
                type: 'particle',
                x: cx,
                y: cy,
                w: 6, h: 6,
                life: 0.6 + Math.random() * 0.2,
                maxLife: 0.8,
                color: 'white', // White particles
                vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
                vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.4)
            });
        }
    }

    update(dt) {
        // Toggle Inventory
        if (this.input.isDown('KeyB')) {
            if (!this.input.bPressed) {
                this.showInventory = !this.showInventory;
                this.input.bPressed = true;
                renderInventory(this);
            }
        } else {
            this.input.bPressed = false;
        }

        if (this.showInventory || this.isPaused) return; // Pause game when inventory or modal is open

        if (this.isGameOver) {
            if (this.input.isDown('Space')) {
                this.init();
            }
            return;
        }

        this.player.update(dt);
        if (this.player.markedForDeletion) {
            this.isGameOver = true;
        }

        // --- Room Encounter Logic ---
        const px = Math.floor(this.player.x / this.map.tileSize);
        const py = Math.floor(this.player.y / this.map.tileSize);

        // Find current room (Even stricter bounds: +2 to ensure player is deeply inside)
        const currentRoom = this.map.rooms.find(r =>
            px >= r.x + 2 && px < r.x + r.w - 2 &&
            py >= r.y + 2 && py < r.y + r.h - 2
        );

        if (currentRoom) {
            // Trigger Encounter
            if (!currentRoom.cleared && !currentRoom.active) {
                currentRoom.active = true;
                this.map.closeRoom(currentRoom);

                // Spawn Enemies
                const enemyCount = Math.floor(Math.random() * 3) + 2; // 2-4 enemies
                for (let i = 0; i < enemyCount; i++) {
                    const ex = (currentRoom.x + 1 + Math.floor(Math.random() * (currentRoom.w - 2))) * this.map.tileSize;
                    const ey = (currentRoom.y + 1 + Math.floor(Math.random() * (currentRoom.h - 2))) * this.map.tileSize;

                    const rand = Math.random();
                    if (rand < 0.5) {
                        this.enemies.push(new Slime(this, ex, ey));
                    } else if (rand < 0.8) {
                        this.enemies.push(new Goblin(this, ex, ey));
                    } else {
                        this.enemies.push(new Bat(this, ex, ey));
                    }
                }

                // Screen Shake for drama
                this.camera.shake(0.3, 5);

                // Optional: Text notification?
            }

            // Monitor Encounter
            if (currentRoom.active) {
                // Count enemies inside this room
                const enemiesInRoom = this.enemies.filter(e =>
                    e.x >= currentRoom.x * this.map.tileSize &&
                    e.x < (currentRoom.x + currentRoom.w) * this.map.tileSize &&
                    e.y >= currentRoom.y * this.map.tileSize &&
                    e.y < (currentRoom.y + currentRoom.h) * this.map.tileSize
                );

                if (enemiesInRoom.length === 0) {
                    // Room Cleared!
                    currentRoom.active = false;
                    currentRoom.cleared = true;
                    this.map.openRoom(currentRoom);

                    // Reward?
                    if (Math.random() < 0.3) { // 30% chance for chest
                        const cx = (currentRoom.x + Math.floor(currentRoom.w / 2)) * this.map.tileSize;
                        const cy = (currentRoom.y + Math.floor(currentRoom.h / 2)) * this.map.tileSize;
                        this.chests.push(new Chest(this, cx, cy));
                    }
                }
            }
        }

        this.camera.follow(this.player, dt);

        this.enemies.forEach(enemy => enemy.update(dt));
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);

        // Update Chests (Interaction)
        this.chests.forEach(chest => {
            chest.update(dt);
            // Check proximity
            const dist = Math.sqrt((this.player.x - chest.x) ** 2 + (this.player.y - chest.y) ** 2);
            if (dist < 50 && !chest.opened) {
                // Show Prompt (Logic moved to draw)
                chest.showPrompt = true;

                if (this.input.isDown('Space')) {
                    chest.open();
                }
            } else {
                chest.showPrompt = false;
            }
        });

        // Update Animations
        this.animations.forEach(a => {
            a.life -= dt;
            if (a.type === 'particle' || a.type === 'text') {
                a.x += a.vx * dt;
                a.y += a.vy * dt;
            }
            if (a.update) a.update(dt);
        });
        this.animations = this.animations.filter(a => a.life > 0);

        // Update Projectiles
        this.projectiles.forEach(p => {
            p.update(dt);
            // Check collision with enemies
            this.enemies.forEach(e => {
                if (p.x < e.x + e.width && p.x + p.w > e.x &&
                    p.y < e.y + e.height && p.y + p.h > e.y) {

                    // Screen Shake
                    this.camera.shake(0.15, 3.5);

                    if (p.onHitEnemy) {
                        p.onHitEnemy(e, this);
                    } else {
                        e.takeDamage(p.damage);
                        p.life = 0; // Destroy projectile
                        this.spawnParticles(p.x, p.y, 8, 'orange');
                    }
                }
            });
            // Check wall collision
            if (this.map.isWall(p.x + p.w / 2, p.y + p.h / 2)) {
                p.life = 0;
                this.spawnParticles(p.x, p.y, 5, 'gray');
            }
        });
        this.projectiles = this.projectiles.filter(p => p.life > 0);


        if (this.uiHp) this.uiHp.textContent = Math.ceil(this.player.hp);
        if (this.uiHpMax) this.uiHpMax.textContent = Math.ceil(this.player.maxHp);
        if (this.uiHpBar) {
            const pct = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
            this.uiHpBar.style.width = `${pct}%`;
        }
    }

    draw() {
        if (!this.hasDrawn) {
            logToScreen("First Draw Call");
            this.hasDrawn = true;
        }
        // Clear screen
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // --- Camera Space ---
        this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        this.map.draw(this.ctx, this.camera, this.debugMode);
        this.chests.forEach(chest => {
            chest.draw(this.ctx);
            if (chest.showPrompt) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '14px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("SPACE", chest.x + chest.width / 2, chest.y - 10);
            }
        });
        this.player.draw(this.ctx);
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw Projectiles
        this.projectiles.forEach(p => {
            this.ctx.save();
            // Fade out in the last 30% of life, or if no maxLife, standard
            let alpha = 1;
            if (p.maxLife) {
                // Fade out when life < 30% of maxLife
                const fadeThreshold = p.maxLife * 0.3;
                if (p.life < fadeThreshold) {
                    alpha = p.life / fadeThreshold;
                }
            }
            this.ctx.globalAlpha = alpha;

            this.ctx.fillStyle = p.color;
            if (p.image && p.image.complete && p.image.naturalWidth !== 0) {
                // Draw Sprite Projectile
                let sx, sy, sw, sh;

                if (p.spriteFrames && p.spriteFrames.length > 0) {
                    // Use precise JSON data
                    // Ensure frameX is within bounds
                    const frameData = p.spriteFrames[p.frameX % p.spriteFrames.length];
                    sx = frameData.x;
                    sy = frameData.y;
                    sw = frameData.w;
                    sh = frameData.h;
                } else {
                    // Fallback to uniform grid calculation
                    sw = p.image.width / p.frames;
                    sh = p.image.height;
                    sx = p.frameX * sw;
                    sy = 0;
                }

                this.ctx.save();
                this.ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
                this.ctx.rotate(Math.atan2(p.vy, p.vx));

                // Ensure we draw the Longest dimension along the Rotated X (Direction of Travel)
                // Since hitbox (p.w/p.h) might be swapped for vertical travel, we un-swap for local drawing.
                const destW = Math.max(p.w, p.h);
                const destH = Math.min(p.w, p.h);

                // Draw centered
                this.ctx.drawImage(
                    p.image,
                    sx, sy, sw, sh,
                    -destW / 2, -destH / 2, destW, destH
                );
                this.ctx.restore();

            } else if (p.shape === 'triangle') {
                // Determine orientation based on dimensions (AABB logic)
                this.ctx.beginPath();
                if (p.w > p.h) {
                    // Horizontal
                    if (p.vx > 0) { // Right
                        this.ctx.moveTo(Math.floor(p.x), Math.floor(p.y));
                        this.ctx.lineTo(Math.floor(p.x + p.w), Math.floor(p.y + p.h / 2));
                        this.ctx.lineTo(Math.floor(p.x), Math.floor(p.y + p.h));
                    } else { // Left
                        this.ctx.moveTo(Math.floor(p.x + p.w), Math.floor(p.y));
                        this.ctx.lineTo(Math.floor(p.x), Math.floor(p.y + p.h / 2));
                        this.ctx.lineTo(Math.floor(p.x + p.w), Math.floor(p.y + p.h));
                    }
                } else {
                    // Vertical
                    if (p.vy > 0) { // Down
                        this.ctx.moveTo(Math.floor(p.x), Math.floor(p.y));
                        this.ctx.lineTo(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h));
                        this.ctx.lineTo(Math.floor(p.x + p.w), Math.floor(p.y));
                    } else { // Up
                        this.ctx.moveTo(Math.floor(p.x), Math.floor(p.y + p.h));
                        this.ctx.lineTo(Math.floor(p.x + p.w / 2), Math.floor(p.y));
                        this.ctx.lineTo(Math.floor(p.x + p.w), Math.floor(p.y + p.h));
                    }
                }
                this.ctx.fill();
            } else if (p.shape === 'slash') {
                this.ctx.beginPath();
                // Draw a crescent shape centered at p.x + p.w/2, p.y + p.h/2
                const cx = p.x + p.w / 2;
                const cy = p.y + p.h / 2;
                const angle = Math.atan2(p.vy, p.vx);

                this.ctx.save();
                this.ctx.translate(cx, cy);
                this.ctx.rotate(angle);

                // Draw crescent
                // M 0 -h/2 (Top tip)
                // Q w/2 0, 0 h/2 (Outer curve to bottom tip)
                // Q -w/4 0, 0 -h/2 (Inner curve back to top)
                // Note: since we rotated, we draw as if facing Right (width is thickness, height is length? Or vice versa?)
                // In setup: W=Thickness, H=Length.
                // So in local space (facing right): extend along Y axis? No, "Slash" implies vertical cut moving forward?
                // Actually, usually a slash projectile creates a vertical crescent moving horiz.
                // So H is length (vertical), W is thickness (horizontal).

                const len = Math.max(p.w, p.h) / 2; // Half Length
                const thick = Math.min(p.w, p.h);   // Thickness

                this.ctx.beginPath();
                this.ctx.moveTo(0, -len);
                this.ctx.quadraticCurveTo(thick, 0, 0, len);
                this.ctx.quadraticCurveTo(thick * 0.4, 0, 0, -len);
                this.ctx.fill();

                // Glow effect
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 10;
                // this.ctx.stroke(); // Removed to eliminate black outline

                this.ctx.restore();
            } else if (p.shape === 'orb') {
                const cx = p.x + p.w / 2;
                const cy = p.y + p.h / 2;
                const radius = p.w / 2;

                const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
                grad.addColorStop(0, 'white');
                grad.addColorStop(1, p.color || 'yellow');

                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.w, p.h);
            }
            this.ctx.restore();
        });

        // Draw Animations
        this.animations.forEach(a => {
            this.ctx.save();
            let alpha = a.life / a.maxLife; // Linear 0 to 1

            // For slash, stay opaque longer
            if (a.type === 'slash') {
                // Fade out only in the last 30% of life
                alpha = Math.min(1, alpha * 3);
            }

            this.ctx.globalAlpha = Math.max(0, alpha);

            if (a.type === 'slash') {
                const progress = 1 - (a.life / a.maxLife);
                // Sweep logic
                const currentAngle = a.startAngle + (a.endAngle - a.startAngle) * progress;

                // Draw trails/blur
                const trailLength = Math.PI / 3;
                let trailStart = currentAngle - trailLength; // Default for one direction? 
                let trailEnd = currentAngle;

                // Direction fix:
                // If end < start (CCW), trail should be ahead of current? Or current is leading edge?
                // Let's stick to the visual logic we established.
                if (a.endAngle < a.startAngle) {
                    trailStart = currentAngle;
                    trailEnd = currentAngle + trailLength;
                }

                // Calculate gradient points
                const startX = a.x + Math.cos(trailStart) * a.radius;
                const startY = a.y + Math.sin(trailStart) * a.radius;
                const endX = a.x + Math.cos(trailEnd) * a.radius;
                const endY = a.y + Math.sin(trailEnd) * a.radius;

                const grad = this.ctx.createLinearGradient(startX, startY, endX, endY);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                grad.addColorStop(1, a.color);

                // Main Blade
                this.ctx.strokeStyle = grad;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(a.x, a.y, a.radius, trailStart, trailEnd);
                this.ctx.stroke();

                this.ctx.strokeStyle = 'rgba(200, 255, 255, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(a.x, a.y, a.radius - 5, trailStart + 0.1, trailEnd - 0.1);
                this.ctx.stroke();

            } else if (a.type === 'particle') {
                this.ctx.fillStyle = a.color || 'white';
                if (a.shape === 'circle') {
                    this.ctx.beginPath();
                    const radius = (a.w + a.h) / 4; // Average radius
                    this.ctx.arc(a.x + a.w / 2, a.y + a.h / 2, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    this.ctx.fillRect(a.x, a.y, a.w, a.h);
                }
            } else if (a.type === 'ghost') {
                if (a.image && a.spriteData) {
                    // Draw Sprite Ghost
                    const frameIndex = a.frameY * 4 + a.frameX;
                    if (a.spriteData.frames && a.spriteData.frames[frameIndex]) {
                        const frameData = a.spriteData.frames[frameIndex].frame;

                        // Tinting / Silhouette Logic
                        this.ctx.save();
                        if (a.isWhite) {
                            // Turn sprite into pure white silhouette
                            this.ctx.filter = 'brightness(10) grayscale(100%)';
                            // brightness(10) blows out colors to white if they are light enough, but might not work for darks.
                            // Better: brightness(0) invert(1) makes everything white (if background was black... wait).
                            // brightness(0) makes it black. invert(1) makes black white.
                            // Yes, this works for non-transparent pixels!
                            this.ctx.filter = 'brightness(0) invert(1)';
                        }

                        this.ctx.globalAlpha = a.life / a.maxLife; // Fade out

                        if (a.spriteData) {
                            // existing sprite logic if needed, but for now we might just use raw image if no spriteData passed
                            // But wait, spawnDeathEffect passed `entity.image` and `null` spriteData.
                            // So we should fall through to a simpler drawImage if spriteData is null but image is present.
                        }

                        // If we have spriteData (from Dash etc), use it.
                        // If we don't (from Death Effect), just draw the whole image?
                        // But Enemy has `image` which IS the sprite.

                        if (a.spriteData) {
                            // ... existing logic ...
                            // Copied from original for context preservation
                            const frameData = a.spriteData.frames[frameIndex].frame;
                            this.ctx.drawImage(
                                a.image,
                                frameData.x, frameData.y, frameData.w, frameData.h,
                                Math.floor(a.x), Math.floor(a.y), a.w, a.h
                            );
                        } else {
                            // Simple Image Draw (for enemies that are just single images or handled simply)
                            this.ctx.drawImage(
                                a.image,
                                Math.floor(a.x), Math.floor(a.y), a.w, a.h
                            );
                        }

                        this.ctx.restore();
                    }
                } else if (a.isWhite && a.image) {
                    // Handle case where we passed image but NO spriteData (e.g. simple enemy death)
                    this.ctx.save();
                    this.ctx.filter = 'brightness(0) invert(1)';
                    this.ctx.globalAlpha = a.life / a.maxLife;
                    this.ctx.drawImage(
                        a.image,
                        Math.floor(a.x), Math.floor(a.y), a.w, a.h
                    );
                    this.ctx.restore();
                } else {
                    // Fallback Shape
                    this.ctx.fillStyle = a.color;
                    this.ctx.fillRect(a.x, a.y, a.w, a.h);
                }
            } else if (a.type === 'ring') {
                const progress = 1 - (a.life / a.maxLife);
                const currentRadius = a.radius + (a.maxRadius - a.radius) * progress;
                this.ctx.strokeStyle = a.color;
                this.ctx.lineWidth = a.width * (1 - progress);
                this.ctx.beginPath();
                this.ctx.arc(a.x, a.y, currentRadius, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (a.type === 'text') {
                this.ctx.font = a.font || '16px sans-serif';
                this.ctx.fillStyle = a.color || 'white';
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(a.text, a.x, a.y);
                this.ctx.fillText(a.text, a.x, a.y);
            } else if (a.type === 'visual_projectile') {
                this.ctx.fillStyle = a.color;
                if (a.image && a.image.complete && a.image.naturalWidth !== 0) {
                    // Draw Sprite Projectile (Visual)
                    let sx, sy, sw, sh;
                    if (a.spriteFrames && a.spriteFrames.length > 0) {
                        const frameData = a.spriteFrames[a.frameX % a.spriteFrames.length];
                        sx = frameData.x;
                        sy = frameData.y;
                        sw = frameData.w;
                        sh = frameData.h;
                    } else {
                        sw = a.image.width / a.frames;
                        sh = a.image.height;
                        sx = a.frameX * sw;
                        sy = 0;
                    }

                    this.ctx.save();
                    if (a.blendMode) {
                        this.ctx.globalCompositeOperation = a.blendMode;
                    }
                    this.ctx.translate(a.x + a.w / 2, a.y + a.h / 2);
                    if (a.rotation) this.ctx.rotate(a.rotation);

                    // Maintain Aspect Ratio logic
                    let destW = a.w;
                    let destH = a.h;

                    if (a.scale) {
                        destW = sw * a.scale;
                        destH = sh * a.scale;
                    } else if (sw > 0 && sh > 0) {
                        const ratio = sw / sh;
                        // Attempt to fit width first
                        destW = a.w;
                        destH = destW / ratio;

                        // If height exceeds bounds, fit height
                        if (destH > a.h) {
                            destH = a.h;
                            destW = destH * ratio;
                        }
                    } else {
                        // Fallback logic
                        destW = Math.max(a.w, a.h);
                        destH = Math.min(a.w, a.h);
                    }

                    this.ctx.drawImage(
                        a.image,
                        sx, sy, sw, sh,
                        -destW / 2, -destH / 2, destW, destH
                    );
                    this.ctx.restore();
                }
                // Removed Fallback: Don't draw yellow square if loading or invalid.
            } else if (!a.type) {
                this.ctx.fillStyle = a.color || 'white';
                this.ctx.fillRect(Math.floor(a.x), Math.floor(a.y), a.w, a.h);
            }

            this.ctx.restore();
        });

        this.ctx.restore();

        // --- UI Space ---
        drawUI(this.ctx, this, this.width, this.height);
    }

    triggerSkillSelection(skills) {
        this.isPaused = true;
        showSkillSelection(skills, (selectedSkill) => {
            this.handleSkillSelected(selectedSkill);
        });
    }

    handleSkillSelected(skillData) {
        this.isPaused = false;
        // Create the actual skill instance
        const skill = createSkill(skillData);
        if (skill) {
            this.player.inventory.push(skill);
            console.log(`Selected skill: ${skill.name}`);

            // Notification
            this.animations.push({
                type: 'text',
                text: `Learned ${skill.name}!`,
                x: this.player.x, // Show near player
                y: this.player.y - 20,
                vx: 0,
                vy: -50,
                life: 2.0,
                color: '#ffff00',
                font: '16px bold sans-serif'
            });

            this.spawnParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 20, '#ffff00');

            // Auto Equip if slot looks empty? (Optional, kept simple)
        }
    }

    loop(timestamp) {
        let deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (deltaTime > 0.25) deltaTime = 0.25;
        this.accumulator += deltaTime;
        while (this.accumulator >= this.step) {
            this.update(this.step);
            this.accumulator -= this.step;
        }
        this.draw();
        this.input.update();
        requestAnimationFrame(this.loop);
    }
}

window.onload = () => {
    try {
        console.log("Starting Game Initialization...");
        const game = new Game();
        console.log("Game Initialized Successfully.");
    } catch (e) {
        console.error("Game Initialization Failed:", e);
        document.body.innerHTML += `<div style="position:absolute;top:0;left:0;color:red;background:rgba(0,0,0,0.8);padding:20px;z-index:9999;font-size:24px;">Error: ${e.message}<br><pre>${e.stack}</pre></div>`;
    }
};

window.addEventListener('error', (e) => {
    document.body.innerHTML += `<div style="position:absolute;top:50px;left:0;color:yellow;background:rgba(0,0,0,0.8);padding:20px;z-index:9999;font-size:20px;">Runtime Error: ${e.message}</div>`;
});
