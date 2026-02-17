import { Enemy } from './BaseEnemy.js';
import { getCachedImage } from '../utils.js';

export class SkeletonArcher extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 40, 48, '#ffffff', 60, 70, 'skeleton_archer');
        this.image = getCachedImage('assets/skeleton_archer.png'); // Placeholder if needed
        this.shootTimer = 2.0;
    }

    update(dt) {
        if (this.flashTimer > 0) {
            super.update(dt);
            return;
        }

        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 300) {
            // Keep distance: move away if too close
            if (dist < 200) {
                this.vx = -(dx / dist) * this.speed;
                this.vy = -(dy / dist) * this.speed;
            } else {
                this.vx = 0;
                this.vy = 0;
            }

            // Shooting logic
            if (!this.isTelegraphing) {
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    this.startTelegraph(0.8);
                }
            }
        } else {
            // Far away: Move closer
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        }

        super.update(dt);
    }

    executeAttack() {
        // Spawn Arrow Projectile
        const dx = this.game.player.x - this.x;
        const dy = this.game.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.game.enemyProjectiles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: (dx / dist) * 300,
                vy: (dy / dist) * 300,
                radius: 5,
                damage: 8,
                color: '#fff',
                life: 2.0,
                update: function (dt, game) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.life -= dt;

                    // Collision with player
                    const pdx = game.player.x + game.player.width / 2 - this.x;
                    const pdy = game.player.y + game.player.height / 2 - this.y;
                    if (Math.sqrt(pdx * pdx + pdy * pdy) < 20) {
                        game.player.takeDamage(this.damage);
                        this.life = 0;
                    }

                    // Collision with wall
                    if (game.map.isWall(this.x, this.y)) {
                        this.life = 0;
                    }
                },
                draw: function (ctx) {
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        this.shootTimer = 2.0 + Math.random();
    }
}
