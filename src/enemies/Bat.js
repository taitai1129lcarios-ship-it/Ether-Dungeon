import { Enemy } from './BaseEnemy.js';
import { Entity } from '../utils.js';

export class Bat extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 24, 24, '#4a00e0', 30, 150, 'bat');
        this.randomTimer = 0;
        this.randomDir = { x: 0, y: 0 };
    }

    update(dt) {
        if (this.isSpawning) {
            super.update(dt);
            return;
        }
        // Decrease flash timer
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            this.vx = 0;
            this.vy = 0;
            super.update(dt); // Call Entity update (hitbox etc)
            this.checkPlayerCollision();
            return;
        }

        // Bat AI: Maintain Distance (175) + Random Evasion
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
        let weightTarget = 1.0;
        if (distToPlayer > preferredDist - margin && distToPlayer < preferredDist + margin) {
            weightTarget = 0.3; // Less focused when in range
        }

        this.vx += (tx * weightTarget + this.randomDir.x) * 1000 * dt;
        this.vy += (ty * weightTarget + this.randomDir.y) * 1000 * dt;

        // Cap speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const speedMult = this.statusManager.getSpeedMultiplier();
        const maxSpeed = this.speed * speedMult;

        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        // Drag
        this.vx *= 0.95;
        this.vy *= 0.95;

        // Update walk timer for bobbing effect (scale by speed)
        if (speed > 10) {
            this.walkTimer += dt * this.bounceSpeed * (speed / this.speed);
        }

        this.statusManager.update(dt);
        Entity.prototype.update.call(this, dt);
        this.checkPlayerCollision();
    }
}
