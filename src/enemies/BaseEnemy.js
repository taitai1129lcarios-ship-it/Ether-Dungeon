import { Entity, getCachedImage } from '../utils.js';
import { StatusManager } from '../status_effects.js';
import { DropItem } from '../entities/DropItem.js';

const textures = {
    slime: 'assets/slime.png',
    bat: 'assets/bat.png',
    goblin: 'assets/goblin.png'
};

const statusIcons = {
    bleed: getCachedImage('assets/icon_bleed.png'),
    slow: getCachedImage('assets/icon_ice.png'),
    burn: getCachedImage('assets/icon_burn.png')
};

export class Enemy extends Entity {
    constructor(game, x, y, width, height, color, hp, speed, textureKey) {
        super(game, x, y, width, height, color, hp);
        this.speed = speed;
        this.damage = 10; // Default contact damage
        this.flashTimer = 0; // Initialize flash timer
        this.image = textures[textureKey] ? getCachedImage(textures[textureKey]) : new Image();
        this.statusManager = new StatusManager(this);

        // Procedural Animation
        this.walkTimer = Math.random() * Math.PI * 2;
        this.bounceSpeed = 8 + Math.random() * 4;
        this.bounceAmount = 0.05 + Math.random() * 0.05;

        // Telegraph System
        this.telegraphTimer = 0;
        this.isTelegraphing = false;
        this.telegraphDuration = 1.0;

        // Stun System
        this.stunTimer = 0;
    }

    update(dt) {
        // Decrease flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            this.vx = 0;
            this.vy = 0;
        } else if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            this.vx = 0;
            this.vy = 0;
        } else if (this.isTelegraphing) {
            this.telegraphTimer -= dt;
            this.vx = 0;
            this.vy = 0;
            if (this.telegraphTimer <= 0) {
                this.isTelegraphing = false;
                this.executeAttack();
            }
        } else {
            // Simple tracking AI
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < 500) {
                const speedMult = this.statusManager.getSpeedMultiplier();
                this.vx = (dx / dist) * this.speed * speedMult;
                this.vy = (dy / dist) * this.speed * speedMult;

                // Update walk timer only when moving
                this.walkTimer += dt * this.bounceSpeed * (speedMult > 0 ? 1 : 0);
            } else {
                this.vx = 0;
                this.vy = 0;
            }
        }

        this.statusManager.update(dt);
        super.update(dt);
        this.checkPlayerCollision();
    }

    startTelegraph(duration) {
        this.isTelegraphing = true;
        this.telegraphDuration = duration || 1.0;
        this.telegraphTimer = this.telegraphDuration;
        this.vx = 0;
        this.vy = 0;
    }

    executeAttack() {
        // Override in subclasses
    }

    checkPlayerCollision() {
        if (this.damage > 0 && // Only if damage is positive
            this.x < this.game.player.x + this.game.player.width &&
            this.x + this.width > this.game.player.x &&
            this.y < this.game.player.y + this.game.player.height &&
            this.y + this.height > this.game.player.y) {
            this.game.player.takeDamage(this.damage);
        }
    }

    takeDamage(amount, damageColor, aetherGain = 1) {
        // Flash white on hit
        this.flashTimer = 0.1;

        // Aether Rush Gain
        if (this.game.player) {
            this.game.player.addAether(aetherGain);
        }

        // Apply Status Effects Damage Multiplier
        let multiplier = this.statusManager.getDamageMultiplier();
        amount = Math.ceil(amount * multiplier);

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
            color: damageColor || '#fff',
            font: '20px sans-serif'
        });

        if (this.hp <= 0) {
            this.hp = 0;
            this.markedForDeletion = true;
            this.game.spawnDeathEffect(this);

            // Spawn Currency Drops
            const dropCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 shards
            for (let i = 0; i < dropCount; i++) {
                const drop = new DropItem(this.game, this.x + this.width / 2, this.y + this.height / 2, 1);
                this.game.entities.push(drop);
            }
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            ctx.save();

            // Squash and Stretch Logic
            const squash = Math.sin(this.walkTimer) * this.bounceAmount;
            const scaleX = 1 + squash;
            const scaleY = 1 - squash;

            ctx.translate(this.x + this.width / 2, this.y + this.height); // Center bottom
            ctx.scale(scaleX, scaleY);

            if (this.flashTimer > 0) {
                // Apply white flash filter
                ctx.filter = 'brightness(0) invert(1)';
            }

            // Draw relative to translated origin (center bottom)
            ctx.drawImage(this.image, -this.width / 2, -this.height, this.width, this.height);
            ctx.restore();

            // Draw Telegraph Indicator
            if (this.isTelegraphing) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 40, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Fill inner progress
                const progress = 1 - (this.telegraphTimer / this.telegraphDuration);
                const radius = Math.max(0, 40 * progress);
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fill();
                ctx.restore();
            }

            // Draw HP Bar
            if (this.hp < this.maxHp) {
                ctx.fillStyle = 'red';
                ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 6), this.width, 4);
                ctx.fillStyle = 'green';
                ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 6), this.width * (this.hp / this.maxHp), 4);
            }

            // Draw Status Icons
            const activeEffects = this.statusManager.getActiveEffects();
            if (activeEffects.length > 0) {
                const iconSize = 16;
                const spacing = 4;
                const startY = this.y - 25; // Above HP bar
                let currentX = this.x;

                activeEffects.forEach(effect => {
                    const icon = statusIcons[effect.type];
                    if (icon && icon.complete && icon.naturalWidth !== 0) {
                        ctx.drawImage(icon, Math.floor(currentX), Math.floor(startY), iconSize, iconSize);

                        // Draw Stack Count
                        if (effect.stacks > 1) {
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 10px sans-serif';
                            ctx.strokeStyle = 'black';
                            ctx.lineWidth = 2;
                            ctx.strokeText(effect.stacks, currentX + iconSize - 4, startY + iconSize);
                            ctx.fillText(effect.stacks, currentX + iconSize - 4, startY + iconSize);
                        }

                        currentX += iconSize + spacing + (effect.stacks > 1 ? 8 : 0);
                    }
                });
            }
        } else {
            super.draw(ctx);
        }
    }
}
