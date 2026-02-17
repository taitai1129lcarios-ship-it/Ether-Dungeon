import { Entity, getCachedImage } from './utils.js';
import { SkillType, spawnAetherExplosion } from './skills/index.js';
import { StatusManager } from './status_effects.js';
import { skillsDB } from '../data/skills_db.js';

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

// --- Enemy Classes ---

export class Enemy extends Entity {
    constructor(game, x, y, width, height, color, hp, speed, textureKey) {
        super(game, x, y, width, height, color, hp);
        this.speed = speed;
        this.damage = 10; // Default contact damage
        this.flashTimer = 0; // Initialize flash timer
        this.image = textures[textureKey] ? getCachedImage(textures[textureKey]) : new Image();
        this.statusManager = new StatusManager(this);
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
                const speedMult = this.statusManager.getSpeedMultiplier();
                this.vx = (dx / dist) * this.speed * speedMult;
                this.vy = (dy / dist) * this.speed * speedMult;
            } else {
                this.vx = 0;
                this.vy = 0;
            }
        }

        this.statusManager.update(dt);
        super.update(dt);
        this.checkPlayerCollision();
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

export class Slime extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 32, 32, '#ff4444', 50, 90, 'slime');
    }
}

export class Bat extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 24, 24, '#4a00e0', 30, 150, 'bat');
        this.randomTimer = 0;
        this.randomDir = { x: 0, y: 0 };
    }

    update(dt) {
        // Decrease flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            this.vx = 0;
            this.vy = 0;
            super.update(dt); // Call Entity update (hitbox etc)
            this.checkPlayerCollision();
            return;
        }

        // Bat AI: Maintain Distance (200-300) + Random Evasion
        const distToPlayer = Math.sqrt((this.game.player.x - this.x) ** 2 + (this.game.player.y - this.y) ** 2);
        const preferredDist = 175;
        const margin = 50;

        let tx = 0, ty = 0;

        if (distToPlayer < preferredDist - margin) {
            // Too Close: Flee
            const dx = this.x - this.game.player.x;
            const dy = this.y - this.game.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                tx = (dx / dist);
                ty = (dy / dist);
            }
        } else if (distToPlayer > preferredDist + margin) {
            // Too Far: Chase
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                tx = (dx / dist);
                ty = (dy / dist);
            }
        } else {
            // Sweet Spot: Strafe / Random
            // Move perpendicular?
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                // Perpendicular
                tx = -(dy / dist);
                ty = (dx / dist);
            }
        }

        // Add Random Jitter
        this.randomTimer -= dt;
        if (this.randomTimer <= 0) {
            this.randomTimer = 0.5 + Math.random() * 0.5;
            this.randomDir = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            };
        }

        // Combine Vectors (Target + Random)
        // Weight target more if out of range
        let weightTarget = 1.0;
        if (distToPlayer > preferredDist - margin && distToPlayer < preferredDist + margin) {
            weightTarget = 0.3; // Less focused when in range
        }

        this.vx += (tx * weightTarget + this.randomDir.x) * 1000 * dt; // Acceleration-ish
        this.vy += (ty * weightTarget + this.randomDir.y) * 1000 * dt;

        // Cap speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.speed) {
            this.vx = (this.vx / speed) * this.speed;
            this.vy = (this.vy / speed) * this.speed;
        }

        // Drag (to prevent infinite uncontrolled slide)
        this.vx *= 0.95;
        this.vy *= 0.95;

        // Update Position (Entity Logic)
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Check Collisions manually since we are overriding
        // Actually, Entity.update does simple x += vx*dt. 
        // We can just set vx/vy and call super.update(dt) if we didn't do x+= manually.
        // Let's reset position to "undo" our manual move and use super to handle wall collisions nicely if Entity has it.
        // Entity.utils.js: Entity update is: this.x += this.vx * dt; ...
        // So we should NOT manually add x+=vx*dt if we call super.
        this.x -= this.vx * dt;
        this.y -= this.vy * dt;

        // Bypass Enemy.update (which forces simple tracking) and call Entity.update directly
        // We need to import Entity class or access it. Since we are in the same file, we can't easily access Entity if it's imported.
        // Wait, 'Entity' is imported at top of file.
        // But better yet, let's just duplicate the Entity.update logic or call it via prototype.
        // Entity is imported.
        // Also need to handle flash timer part if we skipped super.update? 
        // We handled flash timer at top of Bat.update.

        // Entity.update(dt):
        // if (this.invulnerable > 0) this.invulnerable -= dt;
        // x/y update logic

        // We can just call the prototype method:
        Entity.prototype.update.call(this, dt);
        this.checkPlayerCollision();
    }
}

export class Goblin extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 64, 64, '#33cc33', 120, 60, 'goblin'); // 2x Size (64x64), +50% HP
    }
}

export class Chest extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 30, 30, '#ffd700', 1); // Gold color
        this.opened = false;

        this.imageClosed = getCachedImage('assets/chest_closed.png');
        this.imageOpen = getCachedImage('assets/chest_open.png');
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

// --- Drop Items (Currency) ---
export class DropItem extends Entity {
    constructor(game, x, y, value) {
        super(game, x, y, 16, 16, '#ffd700', 1);
        this.value = value || 1;
        this.type = 'currency';

        // Physics: Stiff Angle Snapping
        const rawAngle = Math.random() * Math.PI * 2;
        const angleStep = Math.PI / 6; // 30 degree increments
        const angle = Math.round(rawAngle / angleStep) * angleStep;

        const speed = 150 + Math.random() * 100;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Friction for "Stiff" stop
        this.deceleration = 400; // Linear deceleration

        // Visuals
        this.image = getCachedImage('assets/aether_shard.png');

        // Magnet
        this.magnetRange = 150;
        this.magnetForce = 600;
        this.isMagnetized = false;

        // Floating animation: Rigid/Square wave-ish
        this.floatTimer = 0;

        // Pickup Delay
        this.pickupDelay = 0.8; // Slightly reduced for snappier feel
    }

    update(dt) {
        // Physics with Linear Deceleration (Stiff Stop)
        if (!this.isMagnetized) {
            const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (currentSpeed > 0) {
                const newSpeed = Math.max(0, currentSpeed - this.deceleration * dt);
                const ratio = newSpeed / currentSpeed;
                this.vx *= ratio;
                this.vy *= ratio;
            }
        }

        let nextX = this.x + this.vx * dt;
        let nextY = this.y + this.vy * dt;

        // Wall Collision (Bounce)
        if (this.game.map.isWall(nextX + 8, this.y + 8)) {
            this.vx *= -0.5;
            nextX = this.x;
        }
        if (this.game.map.isWall(this.x + 8, nextY + 8)) {
            this.vy *= -0.5;
            nextY = this.y;
        }

        this.x = nextX;
        this.y = nextY;

        // Rigid Bobbing
        this.floatTimer += dt * 5;
        // Step-like bobbing instead of smooth sin
        const bob = Math.floor(Math.sin(this.floatTimer) * 2);
        this.renderYOffset = bob;

        // Pickup Delay Logic
        if (this.pickupDelay > 0) {
            this.pickupDelay -= dt;
            return;
        }

        // Magnet Logic
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < this.magnetRange) {
            this.isMagnetized = true;
        }

        if (this.isMagnetized) {
            // Accelerate towards player with high tension
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4); // Snap to 45 deg when flying to player

            const targetVx = Math.cos(snappedAngle) * 400;
            const targetVy = Math.sin(snappedAngle) * 400;

            // Fast lerp for "stiff" snapping feel
            this.vx += (targetVx - this.vx) * 10 * dt;
            this.vy += (targetVy - this.vy) * 10 * dt;
        }

        // Pickup Collision
        if (dist < 24) {
            this.game.player.addCurrency(this.value);
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            // Draw Sprite
            ctx.save();
            // Apply rigid bobbing offset here
            const drawX = Math.floor(this.x);
            const drawY = Math.floor(this.y + (this.renderYOffset || 0));

            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 5; // Reduced blur for harder edge
            ctx.drawImage(this.image, drawX, drawY, this.width, this.height);
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y + (this.renderYOffset || 0)), 10, 10);
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            // Draw Sprite
            // Add glow
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 10;
            ctx.drawImage(this.image, Math.floor(this.x), Math.floor(this.y), this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            // Fallback
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y + 8, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// --- Statue Entity ---
export class Statue extends Entity {
    constructor(game, x, y) {
        // Resize to 3x (120x120) and center (offset by -40, -40 relative to a 40x40 center)
        super(game, x - 40, y - 40, 120, 120, '#ffffff', 1);
        this.used = false;
        this.image = getCachedImage('assets/statue_angel.png');
        this.showPrompt = false;
    }

    update(dt) {
        // Static entity
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            ctx.save();
            if (this.used) ctx.filter = 'grayscale(100%) brightness(0.5)';
            ctx.drawImage(this.image, Math.floor(this.x), Math.floor(this.y), this.width, this.height);
            ctx.restore();
        } else {
            // Placeholder: Angelic winged block
            ctx.fillStyle = this.used ? '#555' : '#fff';
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

            // Wing shapes
            ctx.fillStyle = this.used ? '#444' : '#e0f0ff';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 10);
            ctx.lineTo(this.x - 10, this.y - 5);
            ctx.lineTo(this.x, this.y + 20);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + this.width, this.y + 10);
            ctx.lineTo(this.x + this.width + 10, this.y - 5);
            ctx.lineTo(this.x + this.width, this.y + 20);
            ctx.fill();
        }

        if (this.showPrompt && !this.used) {
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Press [SPACE] to Pray', this.x + this.width / 2, this.y - 10);
        }
    }

    use() {
        if (this.game.gameState === 'REWARD_SELECT' || this.game.gameState === 'DIALOGUE') return; // Prevent double trigger
        if (this.used) return;

        this.game.spawnParticles(this.x + this.width / 2, this.y + this.height / 2, 20, '#ffffff');

        // Start Dialogue
        // Start Dialogue
        this.game.gameState = 'DIALOGUE';
        this.game.dialogueText = "天使の加護を授けましょう";
        this.game.activeStatue = this;
        // Consume input to prevent immediate skip
        this.game.input.spacePressed = true;
    }

    presentRewards() {
        // Import UI helper dynamically or via game reference? 
        // Game has no direct reference to showBlessingSelection unless we attach it or import it here.
        // It's cleaner to import it here.
        import('./ui.js').then(ui => {
            const choices = [];

            // 1. HP Up
            choices.push({ id: 'hp_up', name: '最大HPアップ', description: '最大HPが20上昇し、HPが20回復する。', rarity: 'common' });

            // 2. Full Heal
            choices.push({ id: 'full_heal', name: '全回復', description: 'HPを全回復する。', rarity: 'common' });

            // 3. Shards
            choices.push({ id: 'shards', name: 'エーテルシャード', description: 'エーテルシャードを50個獲得する。', rarity: 'common' });

            // 4. Random Skill (Generic)
            choices.push({
                id: 'random_skill_grant',
                name: 'ランダムスキル習得',
                description: 'ランダムなスキルを1つ習得する。',
                rarity: 'rare'
            });

            // Pick 3 random
            const options = choices.sort(() => 0.5 - Math.random()).slice(0, 3);

            // Trigger UI
            this.game.gameState = 'REWARD_SELECT';
            ui.showBlessingSelection(options, (selectedOpt) => {
                this.game.applyReward(selectedOpt);
            });

            console.log("Statue Interaction: Options showed", options);

            // Screen shake for impact
            if (this.game.camera) this.game.camera.shake(0.4, 4);
        });
    }
}
