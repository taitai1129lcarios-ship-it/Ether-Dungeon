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
    }

    update(dt) {
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.attackImageTimer > 0) this.attackImageTimer -= dt;

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

        if (!currentImg.complete) return;

        const faceLeft = this.game.player.x < this.x;
        const drawSize = 128; // Unified size for consistent look

        ctx.save();
        if (this.flashTimer > 0) ctx.filter = 'brightness(0) invert(1)';

        // Center bottom alignment
        ctx.translate(this.x + this.width / 2, this.y + this.height);
        if (faceLeft) ctx.scale(-1, 1);

        if (frameRect) {
            // Sprite sheet frame
            ctx.drawImage(
                currentImg,
                frameRect.x, frameRect.y, frameRect.w, frameRect.h,
                -drawSize / 2, -drawSize, drawSize, drawSize
            );
        } else {
            // Single image
            ctx.drawImage(currentImg, -drawSize / 2, -drawSize, drawSize, drawSize);
        }
        ctx.restore();

        // Draw extra UI like telegraph circles or HP bars
        this.drawUI(ctx);
    }

    // Helper to draw UI elements since we are overriding draw
    drawUI(ctx) {
        // Draw Telegraph Indicator
        if (this.isTelegraphing) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 40, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 4;
            ctx.stroke();

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
    }

    executeAttack() {
        const dist = Math.sqrt((this.game.player.x - this.x) ** 2 + (this.game.player.y - this.y) ** 2);

        // Show attack image for 0.3 seconds
        this.attackImageTimer = 0.3;

        if (dist < 150) {
            this.game.player.takeDamage(20);
            this.game.camera.shake(0.3, 10);

            // Visual Effect
            this.game.animations.push({
                type: 'circle',
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                radius: 120,
                color: 'rgba(255, 100, 0, 0.5)',
                life: 0.3,
                maxLife: 0.3
            });
        }
        this.attackCooldown = 3.0;
        this.stunTimer = 2.0; // Stun for 2 seconds after attack
    }
}
