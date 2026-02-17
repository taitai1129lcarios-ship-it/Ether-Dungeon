import { Entity, getCachedImage } from '../utils.js';

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
            // Add glow
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 10;
            ctx.drawImage(this.image, Math.floor(this.x), Math.floor(this.y + (this.renderYOffset || 0)), this.width, this.height);
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y + 8 + (this.renderYOffset || 0), 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
