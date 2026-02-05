export const SkillType = {
    NORMAL: 'normal',
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    ULTIMATE: 'ultimate'
};

export class Skill {
    constructor(id, name, type, cooldown, effect) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.cooldown = cooldown;
        this.currentCooldown = 0;
        this.effect = effect;
        this.description = "";
    }

    update(dt) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= dt;
            if (this.currentCooldown < 0) this.currentCooldown = 0;
        }
    }

    isReady() {
        return this.currentCooldown <= 0;
    }

    activate(user, game) {
        if (this.isReady()) {
            this.effect(user, game);
            this.currentCooldown = this.cooldown;
            return true;
        }
        return false;
    }
}

// Behavior Library
const behaviors = {
    'arc_slash': (user, game, params) => {
        const hit = user.getHitBox(params.range, params.range * 1.2, params.range * 1.2);

        // Define sweep angles based on facing
        let startAngle = params.angleStart;
        let endAngle = params.angleEnd;

        // Adjust for facing direction (assuming params are relative to Right)
        let rotationOffset = 0;
        if (user.facing === 'left') rotationOffset = Math.PI; // flip?
        // Actually, let's just hardcode the facing logic here for simplicity as it was in game.js
        // or use params if provided. For now, adapting the previous logic but using params.radius

        // Hardcoded facing logic matches the robust implementation we had
        if (user.facing === 'right') { startAngle = -Math.PI / 3; endAngle = Math.PI / 3; }
        if (user.facing === 'left') { startAngle = 4 * Math.PI / 3; endAngle = 2 * Math.PI / 3; }
        if (user.facing === 'up') { startAngle = 7 * Math.PI / 6; endAngle = 11 * Math.PI / 6; }
        if (user.facing === 'down') { startAngle = Math.PI / 6; endAngle = 5 * Math.PI / 6; }

        // Toggle logic (requires state, but Skill class handles effect only. 
        // We can attach state to the skill instance if we change how effect works or pass 'this' skill)
        // For simplicity, we'll skip the toggle or Attach it to the user? 
        // user.slashReverse is specific. 
        // Let's attach it to the skill instance. We need 'this' context in the effect.
        // But the effect is a closure. 
        // We will modify createSkill to bind the context properly.

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
                enemy.takeDamage(params.damage);
                game.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 5, 'red');
            }
        });
    },

    'projectile': (user, game, params) => {
        const proj = {
            x: user.x + user.width / 2 - params.size / 2,
            y: user.y + user.height / 2 - params.size / 2,
            w: params.size, h: params.size,
            vx: 0, vy: 0,
            life: params.life,
            color: params.color,
            damage: params.damage,
            update: function (dt) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.life -= dt;
                // Trail
                if (Math.random() < 0.8) {
                    game.animations.push({
                        type: 'particle',
                        x: this.x + Math.random() * this.w,
                        y: this.y + Math.random() * this.h,
                        w: 3 + Math.random() * 3,
                        h: 3 + Math.random() * 3,
                        life: 0.4,
                        maxLife: 0.4,
                        color: params.trailColor || 'rgba(255,100,0,1)',
                        vx: (Math.random() - 0.5) * 30,
                        vy: (Math.random() - 0.5) * 30
                    });
                }
            }
        };

        const speed = params.speed;
        if (user.facing === 'left') proj.vx = -speed;
        if (user.facing === 'right') proj.vx = speed;
        if (user.facing === 'up') proj.vy = -speed;
        if (user.facing === 'down') proj.vy = speed;

        game.projectiles.push(proj);
    },

    'dash': (user, game, params) => {
        const originalSpeed = user.speed;
        user.speed = params.speed;
        user.invulnerable = params.duration + 0.1;

        let dashTimer = 0;
        const dashEffect = (dt) => {
            dashTimer += dt;
            if (dashTimer < params.duration && Math.random() < 0.9) {
                game.animations.push({
                    type: 'ghost',
                    x: user.x, y: user.y,
                    w: user.width, h: user.height,
                    life: 0.25, maxLife: 0.25,
                    color: params.ghostColor
                });
            }
        };

        setTimeout(() => {
            user.speed = originalSpeed;
        }, params.duration * 1000);

        game.animations.push({
            type: 'spawner', life: params.duration, update: dashEffect
        });
    },

    'area_blast': (user, game, params) => {
        const center = { x: user.x + user.width / 2, y: user.y + user.height / 2 };

        // Ring
        game.animations.push({
            type: 'ring',
            x: center.x, y: center.y,
            radius: 10, maxRadius: params.range,
            width: 8,
            life: params.duration, maxLife: params.duration,
            color: params.color
        });

        // Particles
        const count = params.particleCount || 16;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            game.animations.push({
                type: 'particle',
                x: center.x, y: center.y,
                w: 6, h: 6,
                life: 0.5, maxLife: 0.5,
                color: '#88ffff',
                vx: Math.cos(angle) * 350,
                vy: Math.sin(angle) * 350
            });
        }

        // Damage
        game.enemies.forEach(enemy => {
            const ex = enemy.x + enemy.width / 2;
            const ey = enemy.y + enemy.height / 2;
            const dist = Math.sqrt((ex - center.x) ** 2 + (ey - center.y) ** 2);
            if (dist < params.range) {
                enemy.takeDamage(params.damage);
                game.spawnParticles(ex, ey, 10, '#ff0000');
            }
        });
    }
};

export function createSkill(data) {
    const behaviorFn = behaviors[data.behavior];
    if (!behaviorFn) {
        console.warn(`Behavior ${data.behavior} not found for skill ${data.id}`);
        return null;
    }

    // Create skill instance
    const skill = new Skill(data.id, data.name, data.type, data.cooldown, null);

    // Initialize state if needed (for reverse slash)
    if (data.behavior === 'arc_slash') {
        skill.state = { reverse: false };
    }

    // Bind the effect function to the skill instance so 'this' works
    skill.effect = function (user, game) {
        behaviorFn.call(skill, user, game, data.params);
    };

    return skill;
}
