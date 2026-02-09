import { Entity } from './utils.js';
import { skillsDB } from '../data/skills_db.js';
import { createSkill } from './skills.js';

const textures = {
    slime: 'assets/slime.png',
    bat: 'assets/bat.png',
    goblin: 'assets/goblin.png'
};

// --- Enemy Classes ---

export class Enemy extends Entity {
    constructor(game, x, y, width, height, color, hp, speed, textureKey) {
        super(game, x, y, width, height, color, hp);
        this.speed = speed;
        this.flashTimer = 0; // Initialize flash timer
        this.image = new Image();
        if (textures[textureKey]) {
            this.image.src = textures[textureKey];
        }
    }

    update(dt) {
        // Decrease flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            this.vx = 0;
            this.vy = 0;
        } else {
            // Simple tracking AI
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
        }

        super.update(dt);
        this.checkPlayerCollision();
    }

    checkPlayerCollision() {
        if (this.x < this.game.player.x + this.game.player.width &&
            this.x + this.width > this.game.player.x &&
            this.y < this.game.player.y + this.game.player.height &&
            this.y + this.height > this.game.player.y) {
            this.game.player.takeDamage(10); // Base contact damage
        }
    }

    takeDamage(amount) {
        // Flash white on hit
        this.flashTimer = 0.1;

        // No invulnerability check for enemies so they can take rapid damage
        this.hp -= amount;

        // Spawn Damage Text
        this.game.animations.push({
            type: 'text',
            text: amount,
            x: this.x + this.width / 2,
            y: this.y,
            vx: (Math.random() - 0.5) * 50,
            vy: -100,
            life: 0.8,
            maxLife: 0.8,
            color: '#fff',
            font: '20px sans-serif'
        });

        if (this.hp <= 0) {
            this.hp = 0;
            this.markedForDeletion = true;
            this.game.spawnDeathEffect(this);
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            ctx.save();
            if (this.flashTimer > 0) {
                // Apply white flash filter
                ctx.filter = 'brightness(0) invert(1)';
            }
            ctx.drawImage(this.image, Math.floor(this.x), Math.floor(this.y), this.width, this.height);
            ctx.restore();

            // Draw HP Bar
            if (this.hp < this.maxHp) {
                ctx.fillStyle = 'red';
                ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 6), this.width, 4);
                ctx.fillStyle = 'green';
                ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 6), this.width * (this.hp / this.maxHp), 4);
            }
        } else {
            super.draw(ctx);
        }
    }
}

export class Slime extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 32, 32, '#ff4444', 50, 90, 'slime');
    }
}

export class Bat extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 24, 24, '#4a00e0', 30, 150, 'bat');
    }
}

export class Goblin extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 32, 32, '#33cc33', 80, 60, 'goblin');
    }
}

export class Chest extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 30, 30, '#ffd700', 1); // Gold color
        this.opened = false;

        this.imageClosed = new Image();
        this.imageClosed.src = 'assets/chest_closed.png';

        this.imageOpen = new Image();
        this.imageOpen.src = 'assets/chest_open.png';
    }

    update(dt) {
        // Static entity, no movement
    }

    draw(ctx) {
        const img = this.opened ? this.imageOpen : this.imageClosed;

        if (img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, Math.floor(this.x), Math.floor(this.y), this.width, this.height);
        } else {
            // Fallback rendering
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
    }

    open() {
        if (this.opened) return;
        this.opened = true;

        // Pick 3 random unique skills
        const choices = [];
        // Clone array to avoid modifying original DB if we used splice, 
        // but better to just pick random indices or filter.
        // Simple shuffle and take 3
        const shuffled = [...skillsDB].sort(() => 0.5 - Math.random());
        const selectedOptions = shuffled.slice(0, 3);

        this.game.triggerSkillSelection(selectedOptions);
    }
}
