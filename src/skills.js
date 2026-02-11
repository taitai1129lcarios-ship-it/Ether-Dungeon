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
    // Image Caching
    let image = null;
    if (params.spriteSheet) {
        if (!window.imageCache) window.imageCache = {};
        if (window.imageCache[params.spriteSheet]) {
            image = window.imageCache[params.spriteSheet];
        } else {
            image = new Image();
            image.src = params.spriteSheet;
            window.imageCache[params.spriteSheet] = image;
        }
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
                }
            }

            // Jitter Effect (Vibration)
            if (this.shape === 'triangle' && params.crackle) {
                this.x += (Math.random() - 0.5) * 2;
                this.y += (Math.random() - 0.5) * 2;
            }
            if (!params.noTrail) {
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


            // Crackle Effect (Lightning)
            if (params.crackle) {
                const count = 2; // Always spawn 2 per frame for intensity
                for (let i = 0; i < count; i++) {
                    // Spawn small lightning part
                    const partId = Math.floor(Math.random() * 10) + 1;
                    const partStr = partId < 10 ? `0${partId}` : `${partId}`;
                    const spritePath = `assets/lightning_part_${partStr}.png`;

                    // Rear Bias Logic
                    // Calculate normalized velocity or direction vector
                    let dirX = 0, dirY = 0;
                    if (this.vx !== 0 || this.vy !== 0) {
                        const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                        dirX = this.vx / len;
                        dirY = this.vy / len;
                    }

                    // Bias towards rear: move center backwards
                    // Needle length is approx max(w, h).
                    const length = Math.max(this.w, this.h);

                    // Random Position: 
                    // Along length: random roughly -0.8 to +0.2 relative to center (mostly behind)
                    // Along width: random small spread

                    // Refined Spread Logic
                    // 1. Shift Center further back
                    const shiftBack = length * 0.4;
                    const centerX = -dirX * shiftBack;
                    const centerY = -dirY * shiftBack;

                    // 2. Random Scatter
                    // Along the path (lengthwise spread): heavy bias to rear
                    // Use a range that covers mostly the tail area
                    const spreadLength = length * 0.8;
                    const rAlong = (Math.random() - 0.5) * spreadLength;

                    // Across the path (widthwise spread): VERY tight to needle
                    // Needle width is small (e.g., 6px). 
                    // Let's use a small constant or ratio of width/height min
                    const spreadWidth = 8; // Tight spread (total 16px width approx)
                    const rAcross = (Math.random() - 0.5) * spreadWidth;

                    // 3. Combine vectors
                    // Position = (Center + shift) + (Dir * rAlong) + (Perp * rAcross)
                    // Perpendicular vector: (-dirY, dirX)

                    const offsetX = centerX + (dirX * rAlong) + (-dirY * rAcross);
                    const offsetY = centerY + (dirY * rAlong) + (dirX * rAcross);

                    // Determine Filter for Yellow
                    let filter = 'none';
                    if (params.crackleColor === '#FFFF00') {
                        filter = 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.2)'; // Gold/Yellow
                    }

                    spawnProjectile(game, this.x + this.w / 2 + offsetX, this.y + this.h / 2 + offsetY, 0, 0, {
                        visual: true, // Visual only
                        spriteSheet: spritePath, // Use asset
                        frames: 1,
                        life: 0.1, // Quick flash
                        width: 15 + Math.random() * 20, // Reverted size
                        height: 15 + Math.random() * 20,
                        randomRotation: true,
                        rotation: Math.random() * Math.PI * 2,
                        color: params.crackleColor || '#a5f2f3',
                        filter: filter, // Apply filter
                        blendMode: 'lighter',
                        noTrail: true
                    });
                }
            }
        }
    };
    // Finalize
    // Finalize
    if (params.visual) {
        proj.type = 'visual_projectile';
        game.animations.push(proj);
    } else {
        // Multi-Hit Logic via tickCount
        if (params.tickCount && params.tickCount > 0) {
            proj.onHitEnemy = function (enemy, gameInstance) {
                // 1. Initial Hit
                enemy.takeDamage(this.damage);

                // Visual for hit
                if (params.onHitEffect === 'lightning_burst') {
                    spawnLightningBurst(gameInstance, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, {
                        burstCount: 3, burstSize: 30, burstSpeed: 100
                    });
                }

                // 2. Spawn DoT Logic for remaining ticks
                const remainingTicks = params.tickCount - 1;
                const interval = params.tickInterval || 0.1;

                if (remainingTicks > 0) {
                    gameInstance.animations.push({
                        type: 'logic',
                        target: enemy,
                        damage: this.damage,
                        ticks: remainingTicks,
                        timer: 0,
                        interval: interval,
                        life: remainingTicks * interval + 0.5, // safety buffer
                        update: function (dt) {
                            if (!this.target || this.target.markedForDeletion) {
                                this.life = 0;
                                return;
                            }
                            this.timer += dt;
                            if (this.timer >= this.interval) {
                                this.timer -= this.interval;
                                this.ticks--;

                                // Deal Damage
                                this.target.takeDamage(this.damage);

                                // Small visual
                                gameInstance.spawnParticles(
                                    this.target.x + this.target.width / 2,
                                    this.target.y + this.target.height / 2,
                                    3, '#FFFF00' // Yellow sparks
                                );

                                if (this.ticks <= 0) this.life = 0;
                            }
                        }
                    });
                }

                // 3. Destroy Projectile
                this.life = 0;
            };
        }

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
            filter: 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.2)', // Force Yellow
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

        const projParams = { ...params };
        if (user.facing === 'up' || user.facing === 'down') {
            projParams.width = w;
            projParams.height = h;
        }

        spawnProjectile(game, user.x + user.width / 2, user.y + user.height / 2, vx, vy, projParams);
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

    'boomerang': (user, game, params) => {
        // Calculate initial velocity based on facing
        let vx = 0, vy = 0;
        const speed = params.speed || 600;
        if (user.facing === 'left') vx = -speed;
        if (user.facing === 'right') vx = speed;
        if (user.facing === 'up') vy = -speed;
        if (user.facing === 'down') vy = speed;

        const w = params.width || 48;
        const h = params.height || 48;

        // Image Loading (similar to spawnProjectile)
        const image = new Image();
        image.src = params.spriteSheet || params.icon; // Use icon as fallback if no sheet

        const proj = {
            active: true,
            type: 'projectile',
            x: user.x + user.width / 2 - w / 2,
            y: user.y + user.height / 2 - h / 2,
            w: w, h: h,
            vx: vx, vy: vy,
            life: 5.0, // Safety max life
            damage: params.damage,
            color: params.color || 'red',
            image: image,
            rotation: 0,
            spinning: true, // Enable rotation override
            // Sprite Rendering Required Props
            frames: 1,
            frameX: 0,
            spriteFrames: null, // No JSON for this

            // State
            state: 0, // 0: Outward, 1: Return
            maxDist: params.range || 400,
            distTraveled: 0,
            owner: user, // Reference to catch

            update: function (dt) {
                // Rotation
                this.rotation += (params.rotationSpeed || 15) * dt;

                // Movement Logic
                // Movement Logic
                if (this.state === 0) {
                    // Outward Phase
                    // Move
                    const dx = this.vx * dt;
                    const dy = this.vy * dt;
                    const nextX = this.x + dx;
                    const nextY = this.y + dy;

                    // Check Wall Collision
                    if (game.map.isWall(nextX + this.w / 2, nextY + this.h / 2)) {
                        this.state = 1; // Force Return
                        this.vx = 0;
                        this.vy = 0;
                    } else {
                        this.x = nextX;
                        this.y = nextY;
                        this.distTraveled += Math.sqrt(dx * dx + dy * dy);

                        if (this.distTraveled >= this.maxDist) {
                            this.state = 1;
                            this.vx = 0;
                            this.vy = 0;
                        }
                    }
                } else {
                    // Return Phase (ignores walls)
                    // Accelerate towards owner
                    const targetX = this.owner.x + this.owner.width / 2 - this.w / 2;
                    const targetY = this.owner.y + this.owner.height / 2 - this.h / 2;

                    const dx = targetX - this.x;
                    const dy = targetY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Catch Check
                    if (dist < 30) {
                        this.life = 0; // Caught
                        return;
                    }

                    // Move towards owner
                    const returnSpeed = params.returnSpeed || 800; // Fast return
                    const dirX = dx / dist;
                    const dirY = dy / dist;

                    this.vx = dirX * returnSpeed;
                    this.vy = dirY * returnSpeed;

                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                }

                // Trail Effect (Ghost)
                if (Math.random() < 0.6) {
                    game.animations.push({
                        type: 'ghost',
                        x: this.x,
                        y: this.y,
                        w: this.w,
                        h: this.h,
                        life: 0.15, // Short life for blur
                        maxLife: 0.15,
                        color: params.trailColor || 'rgba(255, 0, 0, 0.5)',
                        // Pass Sprite Data
                        image: this.image,
                        frames: this.frames,
                        frameX: this.frameX,
                        rotation: this.rotation, // Pass current rotation
                        vx: 0, vy: 0
                    });
                }

                // Particle Effect (Red Spheres)
                if (Math.random() < 0.5) {
                    const size = Math.random() * 4 + 2; // 2-6px
                    game.animations.push({
                        type: 'particle', // generic particle
                        shape: 'circle',
                        x: this.x + this.w / 2 + (Math.random() - 0.5) * 20,
                        y: this.y + this.h / 2 + (Math.random() - 0.5) * 20,
                        w: size, h: size,
                        life: 0.3, maxLife: 0.3,
                        color: 'rgba(255, 50, 50, 0.8)',
                        vx: (Math.random() - 0.5) * 50,
                        vy: (Math.random() - 0.5) * 50
                    });
                }
            },

            // Allow checking for collision (infinite pierce usually implies not destroying on hit)
            // But we can implement onHitEnemy if desired. Default projectile logic handles damage.
            // If pierce is high, it won't be destroyed.
            pierce: params.pierce || 999
        };

        game.projectiles.push(proj);
    },

    'blood_scythe': (user, game, params) => {
        // Calculate initial velocity based on facing
        let directionX = 0, directionY = 0;
        if (user.facing === 'left') directionX = -1;
        if (user.facing === 'right') directionX = 1;
        if (user.facing === 'up') directionY = -1;
        if (user.facing === 'down') directionY = 1;

        // Initial Speed setup
        const initialSpeed = params.speed || 800; // Fast out
        const acceleration = params.acceleration || -1200; // Slow down
        const returnSpeedMax = params.returnSpeed || 1500;

        const w = params.width || 48;
        const h = params.height || 48;

        // Image Loading (Cached)
        const imageSrc = params.spriteSheet || params.icon;
        let image = null;
        if (imageSrc) {
            if (!window.imageCache) window.imageCache = {};
            if (window.imageCache[imageSrc]) {
                image = window.imageCache[imageSrc];
            } else {
                image = new Image();
                image.src = imageSrc;
                window.imageCache[imageSrc] = image;
            }
        }

        const proj = {
            active: true,
            type: 'projectile',
            x: user.x + user.width / 2 - w / 2,
            y: user.y + user.height / 2 - h / 2,
            w: w, h: h,
            // Velocity components
            vx: directionX * initialSpeed,
            vy: directionY * initialSpeed,

            // State
            state: 0, // 0: Outward, 1: Return
            currentSpeed: initialSpeed,
            directionX: directionX,
            directionY: directionY,
            acceleration: acceleration,

            owner: user,
            maxDist: params.range || 800,
            distTraveled: 0,
            life: 10,

            damage: params.damage,
            color: params.color || 'red',
            image: image,
            rotation: 0,
            spinning: true,
            frames: 1,
            frameX: 0,
            spriteFrames: null,

            // Hit Tracking for Continuous Damage
            hitTimers: new Map(), // Map<EnemyID, TimeSinceLastHit>
            tickInterval: params.tickInterval || 0.1,

            // Hide fallback rect while loading image to avoid "Red Square" glitch for this specific skill
            hideWhileLoading: true,

            update: function (dt) {
                // Rotation
                this.rotation += (params.rotationSpeed || -15) * dt;

                if (this.state === 0) {
                    // --- Outward Phase ---
                    // Decelerate
                    this.currentSpeed += this.acceleration * dt;

                    // Update Velocity
                    this.vx = this.directionX * this.currentSpeed;
                    this.vy = this.directionY * this.currentSpeed;

                    // Move
                    const dx = this.vx * dt;
                    const dy = this.vy * dt;
                    this.x += dx;
                    this.y += dy;

                    // Switch to Return if stopped or slow enough
                    if (this.currentSpeed <= 0) {
                        this.state = 1;
                        this.currentSpeed = 0;
                    }

                    // Check Distance safety
                    this.distTraveled += Math.sqrt(dx * dx + dy * dy);
                    if (this.distTraveled >= this.maxDist) {
                        this.state = 1; // Force return
                    }

                    // Check Wall Collision (Reduced Hitbox to prevent snagging on spawn)
                    // Use a tiny 4x4 central box for wall checks (Visual is HUGE)
                    const wallCheckSize = 4;
                    const wallCheckMargin = (Math.min(this.w, this.h) - wallCheckSize) / 2;
                    // Ensure margin is positive
                    const m = wallCheckMargin > 0 ? wallCheckMargin : 0;

                    const wx = this.x + m;
                    const wy = this.y + m;
                    const ww = this.w - m * 2;
                    const wh = this.h - m * 2;

                    if (game.map.isWall(wx, wy) ||
                        game.map.isWall(wx + ww, wy) ||
                        game.map.isWall(wx, wy + wh) ||
                        game.map.isWall(wx + ww, wy + wh)) {
                        // Undo move (Clamp to previous)
                        this.x -= dx;
                        this.y -= dy;

                        // Force state change and zero speed (Immediate Return)
                        this.state = 1;
                        this.currentSpeed = 0;
                    }

                } else {
                    // --- Return Phase ---
                    // Accelerate towards owner
                    const targetX = this.owner.x + this.owner.width / 2 - this.w / 2;
                    const targetY = this.owner.y + this.owner.height / 2 - this.h / 2;

                    const dx = targetX - this.x;
                    const dy = targetY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Catch Check
                    if (dist < 30) {
                        this.life = -1; // Caught
                        return;
                    }

                    // Homing Logic
                    const dirX = dx / dist;
                    const dirY = dy / dist;

                    // Accelerate speed
                    this.currentSpeed += (returnSpeedMax * 1.5) * dt; // Accelerate fast
                    if (this.currentSpeed > returnSpeedMax) this.currentSpeed = returnSpeedMax;

                    this.vx = dirX * this.currentSpeed;
                    this.vy = dirY * this.currentSpeed;

                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                }

                // Update Hit Timers
                for (let [enemyId, timer] of this.hitTimers) {
                    this.hitTimers.set(enemyId, timer + dt);
                }

                // Trail Effect (Ghost)
                if (Math.random() < 0.6) {
                    game.animations.push({
                        type: 'ghost',
                        x: this.x, y: this.y,
                        w: this.w, h: this.h,
                        life: 0.15, maxLife: 0.15,
                        color: params.trailColor || 'rgba(255, 0, 0, 0.5)',
                        image: this.image,
                        frames: this.frames,
                        frameX: this.frameX,
                        rotation: this.rotation,
                        vx: 0, vy: 0
                    });
                }

                // Scattered Red Particles (Round)
                // Spawn rate: e.g., 2 per frame on average
                for (let i = 0; i < 2; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const scatterDist = Math.random() * 30; // Scatter radius
                    const px = this.x + this.w / 2 + Math.cos(angle) * scatterDist;
                    const py = this.y + this.h / 2 + Math.sin(angle) * scatterDist;

                    game.animations.push({
                        type: 'particle',
                        shape: 'circle',
                        x: px, y: py,
                        w: 6, h: 6, // Size
                        color: `rgba(255, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 0.8)`, // Red with slight variety
                        life: 0.4 + Math.random() * 0.2, // Short life
                        maxLife: 0.6,
                        vx: (Math.random() - 0.5) * 60, // Random velocity
                        vy: (Math.random() - 0.5) * 60
                    });
                }
            },

            // Custom Hit Handler
            onHitEnemy: function (enemy, gameInstance) {
                // Ensure enemy has an ID for tracking
                if (!enemy.id) enemy.id = Math.random().toString(36).substr(2, 9);

                let timeSinceLast = this.hitTimers.get(enemy.id);

                // If never hit or interval passed
                if (timeSinceLast === undefined || timeSinceLast >= this.tickInterval) {
                    // Deal Damage
                    enemy.takeDamage(this.damage);
                    gameInstance.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 5, 'red');

                    // Reset Timer
                    this.hitTimers.set(enemy.id, 0);
                }
            },

            pierce: params.pierce || 999
        };

        game.projectiles.push(proj);
    },

    'ice_spike': function (user, game, params) {
        // Base spawn center
        const startX = user.x + user.width / 2;
        const startY = user.y + user.height / 2;

        // Direction based on Player Facing
        let dx = 0;
        let dy = 0;
        // user.facing is 'left', 'right', 'up', 'down'
        if (user.facing === 'left') dx = -1;
        if (user.facing === 'right') dx = 1;
        if (user.facing === 'up') dy = -1;
        if (user.facing === 'down') dy = 1;

        // Fallback if no facing (shouldn't happen)
        if (dx === 0 && dy === 0) dy = 1;

        const count = params.count || 30;
        const spacing = params.spacing || 5;
        const duration = params.duration || 1.0; // Life of each spike
        const width = params.width || 10;
        const maxH = params.height || 46;

        // Lock movement during activation
        user.isCasting = true;

        const imageSrc = params.spriteSheet;
        let image = null;
        if (imageSrc) {
            if (!game.images[imageSrc]) {
                game.images[imageSrc] = new Image();
                game.images[imageSrc].src = imageSrc;
            }
            image = game.images[imageSrc];
        }

        // Spawner state
        let spawnedCount = 0;
        let timer = 0;
        const spawnInterval = 0.02; // Speed of wave

        game.animations.push({
            type: 'spawner',
            life: count * spawnInterval + 1.0, // Ensure it lives long enough
            update: function (dt) {
                // Check if finished
                if (spawnedCount >= count) {
                    user.isCasting = false;
                    this.life = 0;
                    return;
                }

                timer += dt;
                while (timer >= spawnInterval && spawnedCount < count) {
                    timer -= spawnInterval;
                    spawnedCount++;
                    const i = spawnedCount;

                    // Calc Base Position along line
                    let targetX = startX + (dx * spacing * i);
                    let targetY = startY + (dy * spacing * i);

                    // Apply Perpendicular Offset
                    const offsetP = (Math.random() * 10) - 5;
                    if (dx !== 0) {
                        targetY += offsetP;
                    } else if (dy !== 0) {
                        targetX += offsetP;
                    }

                    const baseY = targetY + maxH / 2;

                    // Random Variation
                    const scale = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
                    const angleDeg = (Math.random() * 30) - 15; // -15 to +15 degrees
                    const angleRad = angleDeg * (Math.PI / 180);

                    const finalW = width * scale;
                    const finalMaxH = maxH * scale;

                    const proj = {
                        id: i,
                        active: true,
                        type: 'projectile',
                        x: targetX - finalW / 2,
                        y: baseY, // Start at bottom
                        w: finalW,
                        h: 0, // Start Height 0

                        vx: 0, vy: 0,

                        // Rotation & Anchor
                        spinning: true,
                        rotation: angleRad,
                        anchorX: 0.5,
                        anchorY: 1.0,

                        life: duration,
                        maxLife: duration,

                        // Sprite Properties
                        frameX: 0,
                        frames: params.frames || 1,

                        // Custom
                        maxH: finalMaxH,
                        baseY: baseY,
                        damage: params.damage,
                        tickInterval: params.tickInterval || 0.5,
                        hitTimers: new Map(),

                        image: image,
                        color: '#a5f2f3',
                        alpha: 1.0,

                        hideWhileLoading: false,
                        hasSpawnedEffects: false,

                        update: function (dt) {
                            // Spawn Particles on first frame active
                            if (!this.hasSpawnedEffects) {
                                for (let k = 0; k < 3; k++) {
                                    game.animations.push({
                                        type: 'particle',
                                        x: this.x + this.w / 2,
                                        y: this.baseY,
                                        w: 4, h: 4,
                                        vx: (Math.random() - 0.5) * 100, // Spread X
                                        vy: -(150 + Math.random() * 150), // Shoot Up
                                        life: 0.4,
                                        maxLife: 0.4,
                                        color: '#a5f2f3',
                                        update: function (pDt) {
                                            this.vy += 600 * pDt; // Gravity
                                        }
                                    });
                                }
                                this.hasSpawnedEffects = true;
                            }

                            this.life -= dt;

                            // Growth Animation (0.05s)
                            const timeAlive = this.maxLife - this.life;
                            const growTime = 0.05;

                            if (timeAlive < growTime) {
                                this.h = this.maxH * (timeAlive / growTime);
                            } else {
                                this.h = this.maxH;
                            }

                            this.y = this.baseY - this.h;

                            // Fade out check
                            if (this.life < 0.5) {
                                this.alpha = this.life / 0.5;
                            }

                            // Hit Logic
                            for (let [id, t] of this.hitTimers) {
                                this.hitTimers.set(id, t + dt);
                            }
                        },

                        onHitEnemy: function (enemy, gameInstance) {
                            if (!enemy.id) enemy.id = Math.random().toString(36).substr(2, 9);
                            let t = this.hitTimers.get(enemy.id);

                            if (t === undefined || t >= this.tickInterval) {
                                enemy.takeDamage(this.damage);
                                gameInstance.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 5, 'cyan');
                                this.hitTimers.set(enemy.id, 0);
                            }
                        },
                        pierce: 999
                    };
                    game.projectiles.push(proj);
                }
            }
        });
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
