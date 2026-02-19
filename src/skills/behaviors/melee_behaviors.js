
export const meleeBehaviors = {
    'arc_slash': (user, game, params) => {
        const hit = user.getHitBox(params.range, params.range * 1.2, params.range * 1.2);

        // Define sweep angles based on facing
        let startAngle = params.angleStart;
        let endAngle = params.angleEnd;

        // Hardcoded facing logic matches the robust implementation we had
        if (user.facing === 'right') { startAngle = -Math.PI / 3; endAngle = Math.PI / 3; }
        else if (user.facing === 'left') { startAngle = 4 * Math.PI / 3; endAngle = 2 * Math.PI / 3; }
        else if (user.facing === 'up') { startAngle = 7 * Math.PI / 6; endAngle = 11 * Math.PI / 6; }
        else if (user.facing === 'down') { startAngle = Math.PI / 6; endAngle = 5 * Math.PI / 6; }
        else if (user.facing === 'up-right') { startAngle = -7 * Math.PI / 12; endAngle = -Math.PI / 12; }
        else if (user.facing === 'up-left') { startAngle = 13 * Math.PI / 12; endAngle = 19 * Math.PI / 12; }
        else if (user.facing === 'down-right') { startAngle = Math.PI / 12; endAngle = 7 * Math.PI / 12; }
        else if (user.facing === 'down-left') { startAngle = 5 * Math.PI / 12; endAngle = 11 * Math.PI / 12; }

        // Randomly reverse the slash direction
        if (Math.random() < 0.5) {
            const temp = startAngle;
            startAngle = endAngle;
            endAngle = temp;
        }

        game.animations.push({
            type: 'slash',
            x: user.x + user.width / 2,
            y: user.y + user.height / 2,
            radius: params.radius,
            startAngle: startAngle,
            endAngle: endAngle,
            life: params.duration,
            maxLife: params.duration,
            color: params.color
        });

        game.enemies.forEach(enemy => {
            if (hit.x < enemy.x + enemy.width && hit.x + hit.w > enemy.x &&
                hit.y < enemy.y + enemy.height && hit.y + hit.h > enemy.y) {
                const isCrit = params.critChance > 0 && Math.random() < params.critChance;
                const finalDamage = isCrit ? params.damage * (params.critMultiplier || 2.0) : params.damage;
                enemy.takeDamage(finalDamage, params.damageColor, params.aetherCharge, isCrit);
                const particleColor = isCrit ? '#FFD700' : 'red';
                game.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, isCrit ? 10 : 5, particleColor);
            }
        });
    },

    'spiral_out': (user, game, params) => {
        const center = { x: user.x + user.width / 2, y: user.y + user.height / 2 };
        const count = params.count || 8;
        const speed = params.speed || 200;
        const rotationSpeed = params.rotationSpeed || 5;

        for (let i = 0; i < count; i++) {
            const startAngle = (i / count) * Math.PI * 2;

            game.projectiles.push({
                x: center.x,
                y: center.y,
                baseX: center.x, // Store origin
                baseY: center.y,
                w: 10, h: 10,
                angle: startAngle,
                radius: 10, // Start slightly out
                life: params.duration,
                color: params.color,
                damage: params.damage,
                aetherCharge: params.aetherCharge,
                update: function (dt) {
                    this.life -= dt;

                    // Spiral logic
                    this.radius += speed * dt; // Expand radius
                    this.angle += rotationSpeed * dt; // Rotate

                    this.x = this.baseX + Math.cos(this.angle) * this.radius;
                    this.y = this.baseY + Math.sin(this.angle) * this.radius;

                    // Trail
                    if (Math.random() < 0.3) {
                        game.animations.push({
                            type: 'particle',
                            x: this.x, y: this.y,
                            w: 4, h: 4,
                            life: 0.3, maxLife: 0.3,
                            color: this.color,
                            vx: 0, vy: 0
                        });
                    }
                }
            });
        }
    }
};
