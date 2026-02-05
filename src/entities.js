import { Entity } from './utils.js';
import { skillsDB } from '../data/skills_db.js';
import { createSkill } from './skills.js';

export class Enemy extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 20, 20, '#ff4444', 50);
        this.speed = 90;
        this.attackCooldown = 0;
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
