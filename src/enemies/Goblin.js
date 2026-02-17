import { Enemy } from './BaseEnemy.js';
import { getCachedImage, getCachedJson } from '../utils.js';

export class Goblin extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 64, 64, '#33cc33', 150, 60, 'goblin');
        this.attackCooldown = 0;
        this.bounceAmount = 0; // Disable squash and stretch

        // Attack Visuals
        this.imgNormal = this.image;
        this.imgTelegraph = getCachedImage('assets/goblin_telegraph.png');
        this.imgAttack = getCachedImage('assets/goblin_attack.png');
        this.attackImageTimer = 0;

        // Walk Animation
        this.walkSheet = getCachedImage('assets/goblin_walk.png');
        this.walkData = null;
        this.frameKeys = [];
        this.animTimer = 0;

        getCachedJson('assets/goblin_walk.json').then(data => {
            if (data) {
                this.walkData = data;
                this.frameKeys = Object.keys(data.frames);
            }
        });

        this.stunTimer = 0;
    }

    update(dt) {
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.attackImageTimer > 0) this.attackImageTimer -= dt;
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            this.vx = 0;
            this.vy = 0;
        }

        // Advance animation if moving
        if (!this.isTelegraphing && (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1)) {
            this.animTimer += dt * 10; // 10 FPS
        } else {
            this.animTimer = 0;
        }

        // If not telegraphing and cooldown is off, check for heavy strike
        if (!this.isTelegraphing && !this.flashTimer && this.attackCooldown <= 0) {
            const dist = Math.sqrt((this.game.player.x - this.x) ** 2 + (this.game.player.y - this.y) ** 2);
            if (dist < 100) {
                this.startTelegraph(1.2);
            }
        }

        super.update(dt);
    }

    draw(ctx) {
        // Selection of image based on state
        let currentImg = this.imgNormal;
        let frameRect = null;

        if (this.isTelegraphing) {
            currentImg = this.imgTelegraph;
        } else if (this.attackImageTimer > 0) {
            currentImg = this.imgAttack;
        } else if (this.walkData && this.frameKeys.length > 0 && (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1)) {
            currentImg = this.walkSheet;
            const frameIndex = Math.floor(this.animTimer) % this.frameKeys.length;
            frameRect = this.walkData.frames[this.frameKeys[frameIndex]].frame;
        }

        this.image = currentImg;

        if (frameRect && currentImg.complete) {
            ctx.save();
            if (this.flashTimer > 0) {
                ctx.filter = 'brightness(0) invert(1)';
            }

            // Flip horizontally based on player position
            const faceLeft = this.game.player.x < this.x;

            // Draw matching height alignment with BaseEnemy's center-bottom logic
            ctx.translate(this.x + this.width / 2, this.y + this.height);

            if (faceLeft) {
                ctx.scale(-1, 1);
            }
            ctx.drawImage(
                currentImg,
                frameRect.x, frameRect.y, frameRect.w, frameRect.h,
                -this.width / 2, -this.height, this.width, this.height
            );
            ctx.restore();

            // Draw extra UI like telegraph circles or HP bars
            this.drawUI(ctx);
        } else {
            // Fallback to base drawing for single images
            ctx.save();
            const faceLeft = this.game.player.x < this.x;

            // Adjust size based on action
            let drawWidth = this.width;
            let drawHeight = this.height;
            if (this.isTelegraphing || this.attackImageTimer > 0) {
                drawWidth = 96; // 1.5x base size for visibility without being too huge
                drawHeight = 96;
            }

            // Center bottom alignment
            ctx.translate(this.x + this.width / 2, this.y + this.height);
            if (faceLeft) ctx.scale(-1, 1);

            if (this.flashTimer > 0) ctx.filter = 'brightness(0) invert(1)';

            ctx.drawImage(this.image, -drawWidth / 2, -drawHeight, drawWidth, drawHeight);
            ctx.restore();

            // Draw extra UI
            this.drawUI(ctx);
        }
    }

    // Helper to draw UI elements since we are overriding draw
    drawUI(ctx) {
        // Draw Telegraph Indicator
        if (this.isTelegraphing) {
            ctx.save();
            ctx.beginPath();
            const attackRadius = 112; // 150 * 0.75 = 112.5
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, attackRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const progress = 1 - (this.telegraphTimer / this.telegraphDuration);
            const radius = Math.max(0, attackRadius * progress);
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
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
    }

    executeAttack() {
        const attackRadius = 112;
        const goblinCenterX = this.x + this.width / 2;
        const goblinCenterY = this.y + this.height / 2;
        const playerCenterX = this.game.player.x + this.game.player.width / 2;
        const playerCenterY = this.game.player.y + this.game.player.height / 2;

        const dist = Math.sqrt((playerCenterX - goblinCenterX) ** 2 + (playerCenterY - goblinCenterY) ** 2);

        // Show attack image for 0.3 seconds
        this.attackImageTimer = 0.3;

        if (dist < attackRadius) {
            this.game.player.takeDamage(20);
            this.game.camera.shake(0.3, 10);
        }

        // Shockwave Visual Effect (Multiple Rings)
        for (let i = 0; i < 3; i++) {
            this.game.animations.push({
                type: 'circle',
                x: goblinCenterX,
                y: goblinCenterY,
                radius: 10,
                targetRadius: attackRadius * (1 - i * 0.2),
                color: `rgba(255, 100, 0, ${0.4 - i * 0.1})`,
                life: 0.4 + i * 0.1,
                maxLife: 0.4 + i * 0.1,
                update: function (dt) {
                    this.life -= dt;
                    const p = 1 - (this.life / this.maxLife);
                    this.currentRadius = this.radius + (this.targetRadius - this.radius) * p;
                },
                draw: function (ctx) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 4 * (this.life / this.maxLife);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }

        this.attackCooldown = 3.0;
        this.stunTimer = 2.0; // Stun for 2 seconds after attack
    }
}
