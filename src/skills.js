export const SkillType = {
    NORMAL: 'normal',
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    ULTIMATE: 'ultimate'
};

export class Skill {
    constructor(id, name, type, cooldown, effect, icon, maxStacks = 1) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.cooldown = cooldown;
        this.currentCooldown = 0;
        this.effect = effect;
        this.icon = icon;
        this.description = "";
        this.maxStacks = maxStacks;
        this.stacks = maxStacks; // Start fully charged
    }

    update(dt) {
        if (this.stacks < this.maxStacks) {
            this.currentCooldown -= dt;
            if (this.currentCooldown <= 0) {
                this.stacks++;
                // If still not full, reset cooldown for next stack
                if (this.stacks < this.maxStacks) {
                    this.currentCooldown = this.cooldown;
                } else {
                    this.currentCooldown = 0;
                }
            }
        }
    }

    isReady() {
        return this.stacks > 0;
    }

    activate(user, game) {
        if (this.isReady()) {
            this.effect(user, game);

            // Consume stack
            if (this.stacks === this.maxStacks) {
                // If we were full, start cooldown
                this.currentCooldown = this.cooldown;
            }
            this.stacks--;

            return true;
        }
        return false;
    }
}

// Helper for spawning projectiles
const spawnProjectile = (game, x, y, vx, vy, params) => {
    // Sprite Sheet Logic
    let image = null;
    if (params.spriteSheet) {
        image = new Image();
        image.src = params.spriteSheet;
    }

    // JSON Data Logic
    if (params.spriteData && !params._loadedFrames) {
        params._loadedFrames = [];
        fetch(params.spriteData)
            .then(r => r.json())
            .then(data => {
                const keys = Object.keys(data.frames).sort();
                const frames = keys.map(k => data.frames[k].frame);
                params._loadedFrames.push(...frames);
            })
            .catch(e => console.error("Failed to load sprite data", e));
    }

    const w = params.width || params.size || 10;
    const h = params.height || params.size || 10;

    const proj = {
        active: true,
        x: x - w / 2,
        y: y - h / 2,
        w: w,
        h: h,
        vx: vx,
        vy: vy,
        life: params.life,
        maxLife: params.life,
        color: params.color,
        damage: params.damage,
        shape: params.shape || 'circle',
        // Sprite Props
        image: image,
        frames: params.frames || 1,
        spriteFrames: params._loadedFrames,
        frameRate: params.frameRate || 0.1,
        scale: params.scale, // Optional scale override
        rotation: 0,
        frameX: 0,
        frameTimer: 0,
        update: function (dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.life -= dt;

            // Animate Sprite
            const frameCount = (this.spriteFrames && this.spriteFrames.length > 0) ? this.spriteFrames.length : this.frames;

            if (this.image && frameCount > 1) {
                this.frameTimer += dt;
                if (this.frameTimer >= this.frameRate) {
                    this.frameTimer = 0;
                    this.frameX = (this.frameX + 1) % frameCount;
                }
            }

            // Random Rotation Logic
            if (params.randomRotation) {
                this.rotation = Math.random() * Math.PI * 2;
            }

            // Trail
            if (!params.noTrail && Math.random() < 0.8) {
                if (this.shape === 'slash') {
                    game.animations.push({
                        type: 'particle',
                        x: this.x + (Math.random() * this.w),
                        y: this.y + (Math.random() * this.h),
                        w: this.vx !== 0 ? 10 + Math.random() * 10 : 2,
                        h: this.vy !== 0 ? 10 + Math.random() * 10 : 2,
                        life: 0.15,
                        maxLife: 0.15,
                        color: params.trailColor || 'rgba(255, 255, 255, 0.5)',
                        vx: this.vx * 0.1,
                        vy: this.vy * 0.1
                    });
                } else {
                    game.animations.push({
                        type: 'particle',
                        x: this.x + Math.random() * this.w,
                        y: this.y + Math.random() * this.h,
                        w: 3 + Math.random() * 3,
                        h: 3 + Math.random() * 3,
                        life: 0.4,
                        maxLife: 0.4,
                        color: params.trailColor || 'rgba(255,100,0,1)',
                        shape: params.trailShape, // Pass shape
                        vx: (Math.random() - 0.5) * 30,
                        vy: (Math.random() - 0.5) * 30
                    });
                }
            }


            // Crackle Effect (Lightning)
            if (params.crackle && Math.random() < 0.3) {
                // Spawn small lightning part
                const partId = Math.floor(Math.random() * 10) + 1;
                const partStr = partId < 10 ? `0${partId}` : `${partId}`;
                const spritePath = `assets/lightning_part_${partStr}.png`;

                game.animations.push({
                    type: 'particle', // generic type, handled by drawer?
                    // Actually, let's use spawnProjectile recursively for visual only?
                    // Or just push a visual projectile directly.
                    // We need access to spawnProjectile but it's consistent.
                    x: this.x + Math.random() * this.w,
                    y: this.y + Math.random() * this.h,
                    w: 10, h: 10,
                    vx: 0, vy: 0,
                    life: 0.1, maxLife: 0.1,
                    image: new Image(), // We need to load it? Or use existing text texture/color?
                    // Better to use spawnLightningBurst helper if available in scope?
                    // It is defined in same file but not exported? It is const.
                    // We are inside spawnProjectile closure?
                    // spawnProjectile is defined above.
                    // Wait, this update function is inside spawnProjectile.
                    // But spawnLightningBurst is defined AFTER spawnProjectile.
                    // JS hoisting for const? No.
                    // We can't call spawnLightningBurst from here if it's defined after.
                    // But spawnProjectile is defined BEFORE spawnLightningBurst.
                    // So we can't use it.

                    // Let's just use simple particles for now with Cyan color.
                    color: '#a5f2f3',
                    shape: 'rect'
                });
            }
        }
    };
    // Finalize
    if (params.visual) {
        proj.type = 'visual_projectile';
        game.animations.push(proj);
    } else {
        game.projectiles.push(proj);
    }
};

// Helper for Lightning Burst
const spawnLightningBurst = (game, x, y, params) => {
    const count = params.burstCount || 3;
    const size = params.burstSize || 40;

    for (let i = 0; i < count; i++) {
        // Pick random part 01-10
        const partId = Math.floor(Math.random() * 10) + 1;
        const partStr = partId < 10 ? `0${partId}` : `${partId}`;
        const spritePath = `assets/lightning_part_${partStr}.png`;

        // Random transform
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (size / 2);
        const lx = x + Math.cos(angle) * dist;
        const ly = y + Math.sin(angle) * dist;

        const speed = params.burstSpeed || 0;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        spawnProjectile(game, lx, ly, vx, vy, {
            visual: true,
            spriteSheet: spritePath, // Treat single image as spritesheet
            frames: 1,
            life: 0.15 + Math.random() * 0.2, // slightly longer
            width: 50 + Math.random() * 20, // 50-70px
            height: 50 + Math.random() * 20,
            // scale: 1.0, // REMOVED: scales to source image size if present
            randomRotation: true, // Rotate the part
            rotation: Math.random() * Math.PI * 2, // Initial rotation
            color: '#a5f2f3', // Cyan tint if supported (currently separate draw path)
            blendMode: 'lighter', // Additive blending for glow
            noTrail: true // Disable orange trails
        });
    }
};

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
        let vx = 0, vy = 0;
        let w = params.width || params.size || 10;
        let h = params.height || params.size || 10;

        // Facing Logic
        if (user.facing === 'left') vx = -params.speed;
        if (user.facing === 'right') vx = params.speed;
        if (user.facing === 'up') {
            vy = -params.speed;
            if (params.width && params.height) { let temp = w; w = h; h = temp; }
        }
        if (user.facing === 'down') {
            vy = params.speed;
            if (params.width && params.height) { let temp = w; w = h; h = temp; }
        }

        spawnProjectile(game, user.x + user.width / 2, user.y + user.height / 2, vx, vy, params);
    },

    'barrage': (user, game, params) => {
        const waves = params.waves || 4;
        const perWave = params.perWave || 2;
        const interval = params.interval || 0.08;
        const spread = params.angleSpread || 5;
        const spacing = params.spacing || 20;
        const speed = params.speed || 550;

        user.isCasting = true;

        let waveCount = 0;
        let timer = interval; // Trigger immediately? Logic below increments first.

        // Push spawner to animations
        game.animations.push({
            type: 'spawner',
            life: waves * interval + 0.5,
            update: (dt) => {
                timer += dt;
                if (timer >= interval && waveCount < waves) {
                    timer = 0;

                    // Calc Base Velocity based on Facing
                    let baseVx = 0, baseVy = 0;
                    let nx = 0, ny = 0; // Normal vector for spacing

                    if (user.facing === 'left') { baseVx = -speed; ny = 1; }
                    if (user.facing === 'right') { baseVx = speed; ny = 1; }
                    if (user.facing === 'up') { baseVy = -speed; nx = 1; }
                    if (user.facing === 'down') { baseVy = speed; nx = 1; }

                    for (let i = 0; i < perWave; i++) {
                        // Offset
                        const offsetMag = (i - (perWave - 1) / 2) * spacing;
                        const centerX = user.x + user.width / 2;
                        const centerY = user.y + user.height / 2;

                        const spawnX = centerX + (nx * offsetMag);
                        const spawnY = centerY + (ny * offsetMag);

                        // Spread Angle
                        const angleNoise = ((Math.random() - 0.5) * spread) * (Math.PI / 180);

                        // Rotate Velocity
                        let vx = baseVx;
                        let vy = baseVy;

                        if (baseVx !== 0) {
                            vx = baseVx * Math.cos(angleNoise);
                            vy = baseVx * Math.sin(angleNoise); // Correct rotation logic for horiz
                        } else {
                            vx = baseVy * Math.sin(angleNoise); // Rotated vector from vertical
                            vy = baseVy * Math.cos(angleNoise);
                        }

                        const waveParams = { ...params };
                        if (baseVy !== 0 && params.width && params.height) {
                            waveParams.width = params.height;
                            waveParams.height = params.width;
                        }

                        spawnProjectile(game, spawnX, spawnY, vx, vy, waveParams);
                    }
                    waveCount++;

                    if (waveCount >= waves) {
                        user.isCasting = false;
                    }
                }
            }
        });
    },

    'dash': (user, game, params) => {
        // Set Dashing State
        user.isDashing = true;
        user.invulnerable = params.duration + 0.1;

        // Calculate forced velocity based on facing
        user.dashVx = 0;
        user.dashVy = 0;
        if (user.facing === 'left') user.dashVx = -params.speed;
        if (user.facing === 'right') user.dashVx = params.speed;
        if (user.facing === 'up') user.dashVy = -params.speed;
        if (user.facing === 'down') user.dashVy = params.speed;

        let dashTimer = 0;
        const dashEffect = (dt) => {
            dashTimer += dt;
            if (dashTimer < params.duration && Math.random() < 0.9) {
                // Calculate correct ghost visual dims
                let ghostX = user.x;
                let ghostY = user.y;
                let ghostW = user.width;
                let ghostH = user.height;

                if (user.spriteData) {
                    const frameIndex = user.frameY * 4 + user.frameX; // Re-calculate frame index
                    if (user.spriteData && user.spriteData.frames && user.spriteData.frames[frameIndex]) {
                        const frameData = user.spriteData.frames[frameIndex].frame;
                        const ratio = frameData.w / frameData.h;
                        // Match player draw scaling (1.5 * 0.7 = 1.05)
                        ghostW = user.width * 1.05;
                        ghostH = ghostW / ratio;
                        ghostX = user.x + (user.width - ghostW) / 2;
                        ghostY = user.y + user.height - ghostH;
                    }
                }

                game.animations.push({
                    type: 'ghost',
                    x: ghostX, y: ghostY,
                    w: ghostW, h: ghostH,
                    life: 0.25, maxLife: 0.25,
                    color: params.ghostColor,
                    // Pass sprite data
                    image: user.image,
                    frameX: user.frameX,
                    frameY: user.frameY,
                    spriteData: user.spriteData
                });
            }
        };

        setTimeout(() => {
            user.isDashing = false;
            user.dashVx = 0;
            user.dashVy = 0;
        }, params.duration * 1000);

        game.animations.push({
            type: 'spawner', life: params.duration, update: dashEffect
        });
    },

    'area_blast': (user, game, params) => {
        const center = { x: user.x + user.width / 2, y: user.y + user.height / 2 };

        // Immobilize User
        if (params.duration > 0) {
            user.isCasting = true;
            game.animations.push({
                type: 'logic',
                life: params.duration,
                maxLife: params.duration,
                update: function (dt) {
                    this.life -= dt;
                    if (this.life <= 0) {
                        user.isCasting = false;
                    }
                }
            });
        }

        // Visual Sprite Animation
        // Visual Sprite Animation
        if (params.spriteSheet && (!params.interval || params.interval <= 0)) {
            // Spawn a visual-only projectile (no damage, no physics)
            const visualParams = { ...params, visual: true, speed: 0, life: params.duration };
            spawnProjectile(game, center.x, center.y, 0, 0, visualParams);
        } else if (!params.spriteSheet) {
            // Ring (Fallback if no sprite)
            game.animations.push({
                type: 'ring',
                x: center.x, y: center.y,
                radius: 10, maxRadius: params.range,
                width: 8,
                life: params.duration, maxLife: params.duration,
                color: params.color
            });

            // Particles (Fallback if no sprite)
            const count = params.particleCount || 16;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                game.animations.push({
                    type: 'particle',
                    x: center.x, y: center.y,
                    w: 6, h: 6,
                    life: 0.5, maxLife: 0.5,
                    color: params.particleColor || '#88ffff',
                    vx: Math.cos(angle) * 350,
                    vy: Math.sin(angle) * 350
                });
            }
        }

        // Damage Logic
        if (params.interval && params.interval > 0) {
            // Damage over Time (DoT) Field
            let damageTimer = params.interval;

            game.animations.push({
                type: 'field', // Invisible logic object
                life: params.duration,
                update: (dt) => {
                    damageTimer += dt;
                    if (damageTimer >= params.interval) {
                        damageTimer = 0;

                        // Spawn Visual Per Tick
                        // Spawn Visual Per Tick
                        if (params.spriteSheet) {
                            const tickLife = 0.25;
                            const tickParams = {
                                ...params,
                                visual: true,
                                speed: 0,
                                noTrail: true, // Fix: Prevent orange trail particles
                                life: tickLife,
                            };
                            spawnProjectile(game, center.x, center.y, 0, 0, tickParams);
                        }

                        // Additional Lightning Burst
                        spawnLightningBurst(game, center.x, center.y, {
                            burstCount: 3,
                            burstSize: params.range * 1.8,
                            burstSpeed: 50
                        });

                        // Deal Damage
                        game.enemies.forEach(enemy => {
                            const ex = enemy.x + enemy.width / 2;
                            const ey = enemy.y + enemy.height / 2;
                            const dist = Math.sqrt((ex - center.x) ** 2 + (ey - center.y) ** 2);
                            if (dist < params.range) {
                                enemy.takeDamage(params.damage);
                                // Shake on hit
                                game.camera.shake(0.15, 3.5);

                                spawnLightningBurst(game, ex, ey, {
                                    burstCount: 1,
                                    burstSize: 30,
                                    burstSpeed: 50
                                });
                            }
                        });
                    }
                }
            });
        } else {
            // Instant Damage
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
    },

    'bouncing_projectile': (user, game, params) => {
        let w = params.width || 10;
        let h = params.height || 10;
        const speed = params.speed || 400;

        // 8-Directional Fire
        const directions = 8;
        const angleStep = (Math.PI * 2) / directions;

        for (let i = 0; i < directions; i++) {
            const angle = i * angleStep;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            // Custom update for bouncing
            const projParams = {
                ...params,
                life: params.life || 5.0,
                bounces: params.maxBounces || 5
            };

            const proj = {
                active: true,
                x: user.x + user.width / 2 - w / 2,
                y: user.y + user.height / 2 - h / 2,
                w: w, h: h,
                vx: vx, vy: vy,
                life: projParams.life,
                maxLife: projParams.life,
                color: params.color,
                damage: params.damage,
                bounces: projParams.bounces,
                trailColor: params.trailColor,
                shape: 'orb',

                update: function (dt) {
                    this.life -= dt;

                    // Prediction
                    const nextX = this.x + this.vx * dt;
                    const nextY = this.y + this.vy * dt;

                    // Wall Collision
                    if (game.map.isWall(nextX + this.w / 2, this.y + this.h / 2)) {
                        this.vx = -this.vx;
                        this.bounces--;
                        spawnLightningBurst(game, this.x, this.y, params);
                    } else {
                        this.x = nextX;
                    }

                    if (game.map.isWall(this.x + this.w / 2, nextY + this.h / 2)) {
                        this.vy = -this.vy;
                        this.bounces--;
                        spawnLightningBurst(game, this.x, this.y, params);
                    } else {
                        this.y = nextY;
                    }

                    if (this.bounces < 0) this.life = 0;

                    // Trail
                    if (Math.random() < 0.5) {
                        game.animations.push({
                            type: 'particle',
                            x: this.x + Math.random() * this.w,
                            y: this.y + Math.random() * this.h,
                            w: 4, h: 4,
                            life: 0.3, maxLife: 0.3,
                            color: this.trailColor || '#ffff00',
                            vx: 0, vy: 0
                        });
                    }

                    // Crackling Effect (Small lightning parts around orb)
                    if (Math.random() < 0.9) {
                        const count = 2;
                        for (let i = 0; i < count; i++) {
                            const offsetDist = this.w * 0.7;
                            const angle = Math.random() * Math.PI * 2;
                            const px = (this.x + this.w / 2) + Math.cos(angle) * offsetDist;
                            const py = (this.y + this.h / 2) + Math.sin(angle) * offsetDist;

                            const partId = Math.floor(Math.random() * 10) + 1;
                            const partStr = partId < 10 ? `0${partId}` : `${partId}`;
                            const spritePath = `assets/lightning_part_${partStr}.png`;

                            spawnProjectile(game, px, py, 0, 0, {
                                visual: true,
                                spriteSheet: spritePath,
                                frames: 1,
                                life: 0.1,
                                width: 15,
                                height: 15,
                                randomRotation: true,
                                rotation: Math.random() * Math.PI * 2,
                                color: '#a5f2f3',
                                blendMode: 'lighter',
                                noTrail: true
                            });
                        }
                    }
                },

                onHitEnemy: function (enemy, gameInstance) {
                    // 1. Deal Initial Hit
                    enemy.takeDamage(this.damage);
                    spawnLightningBurst(gameInstance, this.x, this.y, params);

                    // 2. Spawn DoT Logic Object (if tickCount > 0)
                    const tickCount = params.tickCount || 0;
                    if (tickCount > 0) {
                        gameInstance.animations.push({
                            type: 'logic', // Invisible, logic-only
                            target: enemy,
                            damage: this.damage,
                            ticksRemaining: tickCount - 1, // First hit already done
                            timer: 0,
                            interval: params.tickInterval || 0.1,
                            life: (tickCount) * (params.tickInterval || 0.1) + 0.5, // Safety life
                            update: function (dt) {
                                if (this.ticksRemaining <= 0) return;

                                this.timer += dt;
                                if (this.timer >= this.interval) {
                                    this.timer -= this.interval;
                                    this.ticksRemaining--;

                                    if (this.target && !this.target.markedForDeletion) {
                                        this.target.takeDamage(this.damage);
                                        // Visual for tick
                                        gameInstance.spawnParticles(
                                            this.target.x + this.target.width / 2,
                                            this.target.y + this.target.height / 2,
                                            3, '#a5f2f3'
                                        );
                                    } else {
                                        this.ticksRemaining = 0; // Stop if target dead
                                    }
                                }
                            }
                        });
                    }

                    this.life = 0; // Destroy projectile
                }
            };
            game.projectiles.push(proj);
        }
    },
};

export function createSkill(data) {
    const behaviorFn = behaviors[data.behavior];
    if (!behaviorFn) {
        console.warn(`Behavior ${data.behavior} not found for skill ${data.id}`);
        return null;
    }

    // Create skill instance
    const maxStacks = data.maxStacks || 1;
    const skill = new Skill(data.id, data.name, data.type, data.cooldown, null, data.icon, maxStacks);

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
