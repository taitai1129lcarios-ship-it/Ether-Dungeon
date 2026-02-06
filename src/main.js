import { InputHandler, Camera, Map, Entity } from './utils.js';
import { Player } from './player.js';
import { Enemy, Slime, Bat, Goblin, Chest } from './entities.js';
import { createSkill } from './skills.js';
import { drawUI } from './ui.js';
import { initInventory, renderInventory } from './inventory.js';
import { skillsDB } from '../data/skills_db.js';

// Enemy class moved to entities.js
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.input = new InputHandler();
        this.init();

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    init() {
        // Larger Map: 80x60 tiles (3200x2400 pixels)
        this.map = new Map(80, 60, 40);
        this.map.generate();

        this.camera = new Camera(this.width, this.height, this.map.pixelWidth, this.map.pixelHeight);

        const startRoom = this.map.rooms.find(r => r.type === 'normal') || this.map.rooms[0];
        this.player = new Player(this, (startRoom.x + 1) * 40, (startRoom.y + 1) * 40);
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

            // Normal Rooms
            // Skip player start room (usually index 1 if 0 is treasure?)
            // Let's spawn player in the LAST room generated to be far from treasure?
            // Or just spawn in room[1].

            // Random Enemy Type
            const ex = (room.x + Math.floor(room.w / 2)) * 40;
            const ey = (room.y + Math.floor(room.h / 2)) * 40;

            const rand = Math.random();
            if (rand < 0.5) {
                this.enemies.push(new Slime(this, ex, ey));
            } else if (rand < 0.8) {
                this.enemies.push(new Goblin(this, ex, ey));
            } else {
                this.enemies.push(new Bat(this, ex, ey));
            }

            // Low chance for extra chest in normal rooms
            if (Math.random() < 0.1) {
                const cx = (room.x + 1 + Math.floor(Math.random() * (room.w - 2))) * 40;
                const cy = (room.y + 1 + Math.floor(Math.random() * (room.h - 2))) * 40;
                this.chests.push(new Chest(this, cx, cy));
            }
        }

        this.animations = [];
        this.projectiles = [];
        this.lastTime = 0;
        this.accumulator = 0;
        this.step = 1 / 60;
        this.isGameOver = false;

        this.uiHp = document.getElementById('hp-value');
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

        if (this.showInventory) return; // Pause game when inventory is open

        if (this.isGameOver) {
            if (this.input.isDown(' ')) {
                this.init();
            }
            return;
        }

        this.player.update(dt);
        if (this.player.markedForDeletion) {
            this.isGameOver = true;
        }

        this.camera.follow(this.player);

        this.enemies.forEach(enemy => enemy.update(dt));
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);

        // Update Chests (Interaction)
        this.chests.forEach(chest => {
            chest.update(dt);
            // Check collision with player
            if (this.player.x < chest.x + chest.width &&
                this.player.x + this.player.width > chest.x &&
                this.player.y < chest.y + chest.height &&
                this.player.y + this.player.height > chest.y) {
                chest.open();
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
                    e.takeDamage(p.damage);
                    p.life = 0; // Destroy projectile
                    this.spawnParticles(p.x, p.y, 8, 'orange');
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
    }

    draw() {
        // Clear screen
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // --- Camera Space ---
        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        this.map.draw(this.ctx, this.camera);
        this.chests.forEach(chest => chest.draw(this.ctx)); // Draw chests
        this.player.draw(this.ctx);
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw Projectiles
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.color;
            if (p.shape === 'triangle') {
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
            } else {
                this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.w, p.h);
            }
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
                this.ctx.fillStyle = a.color;
                this.ctx.fillRect(a.x, a.y, a.w, a.h);
            } else if (a.type === 'ghost') {
                this.ctx.fillStyle = a.color;
                this.ctx.fillRect(a.x, a.y, a.w, a.h);
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
