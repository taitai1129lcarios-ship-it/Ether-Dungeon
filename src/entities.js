import { Entity } from './utils.js';
import { skillsDB } from '../data/skills_db.js';
import { createSkill } from './skills.js';

const enemyTexture = createSlimeTexture();

export class Enemy extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 32, 32, '#ff4444', 50); // Increased size to 32x32
        this.speed = 90;
        this.attackCooldown = 0;
        this.image = new Image();
        this.image.src = enemyTexture;
    }

    update(dt) {
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 500) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }

        super.update(dt);

        if (this.x < this.game.player.x + this.game.player.width &&
            this.x + this.width > this.game.player.x &&
            this.y < this.game.player.y + this.game.player.height &&
            this.y + this.height > this.game.player.y) {
            this.game.player.takeDamage(10);
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            ctx.drawImage(this.image, Math.floor(this.x), Math.floor(this.y), this.width, this.height);

            // Draw HP Bar above (since we override super.draw)
            if (this.hp < this.maxHp) {
                ctx.fillStyle = 'red';
                ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 10), this.width, 5);
                ctx.fillStyle = 'green';
                ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 10), this.width * (this.hp / this.maxHp), 5);
            }
        } else {
            super.draw(ctx);
        }
    }
}

export class Chest extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 30, 30, '#ffd700', 1); // Gold color
        this.opened = false;
    }

    update(dt) {
        // Static entity, no movement
    }

    draw(ctx) {
        ctx.fillStyle = this.opened ? '#8B4513' : this.color; // Brown if opened
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

        // Lock detail
        if (!this.opened) {
            ctx.fillStyle = '#000';
            ctx.fillRect(Math.floor(this.x + 12), Math.floor(this.y + 12), 6, 6);
        }
    }

    open() {
        if (this.opened) return;
        this.opened = true;

        // Drop a random skill
        const randomSkillData = skillsDB[Math.floor(Math.random() * skillsDB.length)];
        const skill = createSkill(randomSkillData);

        if (skill) {
            this.game.player.inventory.push(skill);
            console.log(`Found skill: ${skill.name}`);

            // Notification
            this.game.animations.push({
                type: 'text',
                text: `Got ${skill.name}!`,
                x: this.x + this.width / 2,
                y: this.y,
                vx: 0,
                vy: -50,
                life: 2.0,
                color: '#ffff00',
                font: '16px bold sans-serif'
            });

            this.game.spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 20, '#ffff00');
        }
    }
}

// Helper to generate a procedural texture
function createSlimeTexture() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw Slime
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.4;

    // Body (Blob shape)
    ctx.fillStyle = '#8A2BE2'; // BlueViolet
    ctx.beginPath();
    // Top arc
    ctx.arc(cx, cy, radius, Math.PI, 0);
    // Bottom slightly flatter
    ctx.bezierCurveTo(cx + radius, cy + radius * 1.5, cx - radius, cy + radius * 1.5, cx - radius, cy);
    ctx.fill();

    // Highlight/Shine
    ctx.fillStyle = '#D8BFD8'; // Thistle (Light Purple)
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.4, cy - radius * 0.4, 3, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    const eyeOffsetX = radius * 0.4;
    const eyeOffsetY = -2;

    // Left Eye
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX, cy + eyeOffsetY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX, cy + eyeOffsetY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toDataURL('image/png');
}
