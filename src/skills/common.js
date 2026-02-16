
// Helper for spawning projectiles
export const spawnProjectile = (game, x, y, vx, vy, params) => {
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
        damageColor: params.damageColor, // Add damageColor from params
        aetherCharge: params.aetherCharge !== undefined ? params.aetherCharge : 1.0, // Default 1.0, allow 0
        statusEffect: params.statusEffect,
        statusChance: params.statusChance,
        shape: params.shape || 'circle',
        noShake: params.noShake, // Support disabling shake
        // Sprite Props
        image: image,
        frames: params.frames || 1,
        spriteFrames: params._loadedFrames,
        frameRate: params.frameRate || 0.1,
        scale: params.scale, // Optional scale override
        scale: params.scale, // Optional scale override
        rotation: params.rotation !== undefined ? params.rotation : 0,
        rotationOffset: params.rotationOffset || 0,
        fixedOrientation: params.fixedOrientation || false,
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
            if (!params.noTrail && this.shape !== 'slash') { // Added check to avoid double trail for slash
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
    if (params.visual) {
        proj.type = 'visual_projectile';
        game.animations.push(proj);
    } else {
        // Unified Hit Handler Construction
        // We need a custom handler if we have tickCount (DoT) OR special onHitEffects (Explosion)
        const needsCustomHandler = (params.tickCount && params.tickCount > 0) || params.onHitEffect === 'explosion' || params.onHitEffect === 'lightning_burst';

        if (needsCustomHandler) {
            proj.onHitEnemy = function (enemy, gameInstance) {
                // 1. Initial Hit Damage
                // Only deal initial damage if it hasn't been dealt (for DoT logic)
                // BUT for simple projectiles, we deal effective 'impact' damage.
                enemy.takeDamage(this.damage, this.damageColor, this.aetherCharge);

                // 2. Visual Effects
                if (params.onHitEffect === 'lightning_burst') {
                    spawnLightningBurst(gameInstance, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, {
                        burstCount: 5, burstSize: 60, burstSpeed: 150
                    });
                } else if (params.onHitEffect === 'explosion') {
                    // Use center of projectile for explosion origin
                    const ex = this.x + this.w / 2;
                    const ey = this.y + this.h / 2;
                    spawnExplosion(gameInstance, ex, ey, params.color || '#ff8800');
                } else {
                    // Default particles
                    gameInstance.spawnParticles(this.x, this.y, 8, 'orange');
                }

                // 3. DoT Logic (if tickCount > 0)
                const remainingTicks = (params.tickCount || 0) - 1;
                const interval = params.tickInterval || 0.1;

                if (remainingTicks > 0) {
                    gameInstance.animations.push({
                        type: 'logic',
                        target: enemy,
                        damage: this.damage,
                        damageColor: this.damageColor,
                        aetherCharge: this.aetherCharge, // Pass charge
                        ticks: remainingTicks,
                        timer: 0,
                        interval: interval,
                        life: remainingTicks * interval + 0.5,
                        update: function (dt) {
                            if (!this.target || this.target.markedForDeletion) {
                                this.life = 0;
                                return;
                            }
                            this.timer += dt;
                            if (this.timer >= this.interval) {
                                this.timer -= this.interval;
                                this.ticks--;
                                this.target.takeDamage(this.damage, this.damageColor, this.aetherCharge);
                                gameInstance.spawnParticles(
                                    this.target.x + this.target.width / 2,
                                    this.target.y + this.target.height / 2,
                                    3, '#FFFF00'
                                );
                                if (this.ticks <= 0) this.life = 0;
                            }
                        }
                    });
                }

                // 4. Destroy Projectile (unless it pierces, but standard assumption is destroy on impact)
                // If it was a multi-hit DoT starter, the projectile itself is done.
                this.life = 0;
            };
        }

        // Attach Wall Handler for Explosions
        if (params.onHitEffect === 'explosion') {
            proj.onHitWall = function (gameInstance) {
                const ex = this.x + this.w / 2;
                const ey = this.y + this.h / 2;
                spawnExplosion(gameInstance, ex, ey, params.color || '#ff8800');
                this.life = 0; // Destroy self
            };
        }

        game.projectiles.push(proj);
        return proj;
    }
};

// Helper for Lightning Burst
// Helper for Bounce Spark Impact (Simple Yellow Sparks)
export const spawnBounceSparkImpact = (game, x, y, options = {}) => {
    // 1. Flash (Small) - REMOVED per user request
    // game.animations.push({ ... });

    // 2. Lightning Segments (Visual Parts) - Restored
    const burstCount = options.burstCount || 4;
    const burstSize = options.burstSize || 10;

    for (let i = 0; i < burstCount; i++) {
        const partId = Math.floor(Math.random() * 10) + 1;
        const partStr = partId < 10 ? `0${partId}` : `${partId}`;
        const spritePath = `assets/lightning_part_${partStr}.png`;

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * burstSize;
        const lx = x + Math.cos(angle) * dist;
        const ly = y + Math.sin(angle) * dist;

        const speed = options.burstSpeed || 0;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        spawnProjectile(game, lx, ly, vx, vy, {
            visual: true,
            spriteSheet: spritePath,
            frames: 1,
            life: 0.15 + Math.random() * 0.2,
            width: 50 + Math.random() * 20,
            height: 50 + Math.random() * 20,
            randomRotation: true,
            rotation: Math.random() * Math.PI * 2,
            color: '#a5f2f3',
            filter: 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.2)',
            blendMode: 'lighter',
            noTrail: true
        });
    }

    // 3. Spark Particles (Scatter)
    const sparkCount = 4;
    for (let j = 0; j < sparkCount; j++) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkSpeed = 150 + Math.random() * 200;
        game.animations.push({
            type: 'particle',
            shape: 'circle',
            x: x, y: y,
            w: 3 + Math.random() * 3,
            h: 3 + Math.random() * 3,
            life: 0.2 + Math.random() * 0.2,
            maxLife: 0.4,
            color: '#ffff00',
            vx: Math.cos(sparkAngle) * sparkSpeed,
            vy: Math.sin(sparkAngle) * sparkSpeed
        });
    }
};

// Helper for Thunder Burst Impact (Area Blast)
export const spawnThunderBurstImpact = (game, x, y, options = {}) => {
    // Similar to Bounce Spark but maybe slightly larger or distinct if needed later
    // For now, clone simple behavior
    const sizeScale = options.burstSize ? (options.burstSize / 50) : 1.0;

    // 1. Flash - REMOVED per user request
    // game.animations.push({ ... });

    // 2. Lightning Segments (Visual Parts) - Restored
    const burstCount = options.burstCount || 6;
    const burstSpeed = options.burstSpeed || 150;

    for (let i = 0; i < burstCount; i++) {
        const partId = Math.floor(Math.random() * 10) + 1;
        const partStr = partId < 10 ? `0${partId}` : `${partId}`;
        const spritePath = `assets/lightning_part_${partStr}.png`;

        const angle = Math.random() * Math.PI * 2;
        const s = burstSpeed + Math.random() * 100;
        const vx = Math.cos(angle) * s;
        const vy = Math.sin(angle) * s;

        spawnProjectile(game, x, y, vx, vy, {
            visual: true,
            spriteSheet: spritePath,
            frames: 1,
            life: 0.15 + Math.random() * 0.2,
            width: 50 * sizeScale + Math.random() * 20,
            height: 50 * sizeScale + Math.random() * 20,
            randomRotation: true,
            rotation: Math.random() * Math.PI * 2,
            color: '#a5f2f3',
            filter: 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.2)',
            blendMode: 'lighter',
            noTrail: true
        });
    }

    // 3. Sparks
    const count = options.burstCount || 6;
    const speed = options.burstSpeed || 150;

    for (let j = 0; j < count; j++) {
        const angle = Math.random() * Math.PI * 2;
        const s = speed + Math.random() * 100;
        game.animations.push({
            type: 'particle',
            shape: 'circle',
            x: x, y: y,
            w: 4 + Math.random() * 4,
            h: 4 + Math.random() * 4,
            life: 0.3 + Math.random() * 0.2,
            maxLife: 0.5,
            color: '#ffff00',
            vx: Math.cos(angle) * s,
            vy: Math.sin(angle) * s
        });
    }
};

// Legacy Alias (Deprecated) - kept just in case, mapping to Bounce Spark
export const spawnLightningBurst = spawnBounceSparkImpact;

// Helper for Thunderfall Impact (Realism: Smoke only)
export const spawnThunderfallImpact = (game, x, y, scale = 1.0) => {
    // 1. Rising Smoke
    const smokeCount = 3 * scale;
    for (let i = 0; i < smokeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 20 * scale;
        const sx = x + Math.cos(angle) * dist;
        const sy = y + Math.sin(angle) * dist;

        game.animations.push({
            type: 'particle',
            shape: 'circle',
            x: sx, y: sy,
            w: (10 + Math.random() * 10) * scale,
            h: (10 + Math.random() * 10) * scale,
            life: 0.8 + Math.random() * 0.4,
            maxLife: 1.2,
            color: 'rgba(100, 100, 100, 0.5)', // Gray
            vx: (Math.random() - 0.5) * 20 * scale,
            vy: (-40 - Math.random() * 40) * scale, // Float UP
            alpha: 0.5,
            update: function (dt) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.life -= dt;
                this.w += 10 * scale * dt; // Expand
                this.h += 10 * scale * dt;
                this.alpha = (this.life / this.maxLife) * 0.5;
            }
        });
    }

    // 2. Core Lightning (Center Crackle)
    // Large, stationary lightning at the center
    const coreCount = Math.max(2, Math.floor(2 * scale));
    for (let k = 0; k < coreCount; k++) {
        const partId = Math.floor(Math.random() * 10) + 1;
        const partStr = partId < 10 ? `0${partId}` : `${partId}`;
        const spritePath = `assets/lightning_part_${partStr}.png`;

        spawnProjectile(game, x + (Math.random() - 0.5) * 20 * scale, y + (Math.random() - 0.5) * 20 * scale, 0, 0, {
            visual: true,
            spriteSheet: spritePath,
            frames: 1,
            life: 0.15 + Math.random() * 0.1, // Very short flash
            width: (100 + Math.random() * 50) * scale, // MUCH Larger (was 40-60)
            height: (100 + Math.random() * 50) * scale,
            randomRotation: true,
            rotation: Math.random() * Math.PI * 2,
            color: '#ffff00',
            filter: 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.5)', // Brighter
            blendMode: 'lighter',
            noTrail: true
        });
    }

    // 3. Sparks (Reusing previous excessive logic)
    const sparkCount = Math.floor(5 * scale);
    for (let j = 0; j < sparkCount; j++) {
        const sparkAngle = Math.random() * Math.PI * 2;
        // Reduced speed to keep them closer (was 300+400)
        const sparkSpeed = (100 + Math.random() * 200) * scale;

        const partId = Math.floor(Math.random() * 10) + 1;
        const partStr = partId < 10 ? `0${partId}` : `${partId}`;
        const spritePath = `assets/lightning_part_${partStr}.png`;

        const vx = Math.cos(sparkAngle) * sparkSpeed;
        const vy = Math.sin(sparkAngle) * sparkSpeed;

        spawnProjectile(game, x, y, vx, vy, {
            visual: true,
            spriteSheet: spritePath,
            frames: 1,
            life: 0.3 + Math.random() * 0.3,
            width: (15 + Math.random() * 15) * scale,
            height: (30 + Math.random() * 30) * scale,
            randomRotation: true, // Randomize orientation
            rotation: Math.random() * Math.PI * 2,
            color: '#ffff00',
            filter: 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.2)',
            blendMode: 'lighter',
            noTrail: true
        });
    }
};

// Helper for Grand Explosion
export const spawnExplosion = (game, x, y, color = '#ff8800', sizeScale = 1.0, shakeIntensity = 1.0) => {
    // 1. Flash (Large, short-lived expanding circle)
    // 1. Flash (Large, short-lived expanding circle)
    const baseSize = 60 * sizeScale;
    game.animations.push({
        type: 'particle', // Use particle logic for simple shape
        shape: 'circle',
        x: x - (baseSize / 2) + (Math.random() - 0.5) * 20 * sizeScale, // Random offset centered
        y: y - (baseSize / 2) + (Math.random() - 0.5) * 20 * sizeScale,
        w: baseSize, h: baseSize, // Start large
        life: 0.1, maxLife: 0.1,
        color: 'white', // Bright center
        vx: 0, vy: 0,
        alpha: 1.0,
        update: function (dt) {
            this.life -= dt;
            const expansion = 200 * dt * sizeScale;
            this.w += expansion;
            this.h += expansion;
            this.x -= expansion / 2; // Keep centered while expanding
            this.y -= expansion / 2;
        }
    });

    // 2. Shockwave Ring
    game.animations.push({
        type: 'ring',
        x: x, y: y,
        radius: 10 * sizeScale, maxRadius: 80 * sizeScale,
        width: 10 * sizeScale, // Thickness
        life: 0.3, maxLife: 0.3,
        color: color
    });

    // 3. High-Velocity Debris (Particles)
    const debrisCount = Math.max(3, Math.floor(12 * sizeScale));
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (200 + Math.random() * 200) * sizeScale;
        const size = (4 + Math.random() * 2) * sizeScale;

        game.animations.push({
            type: 'particle',
            shape: 'circle', // Round debris
            x: x, y: y,
            w: 6 * sizeScale, h: 6 * sizeScale,
            life: 0.4 + Math.random() * 0.2 * sizeScale,
            maxLife: 0.6 * sizeScale,
            color: color,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            // Drag
            update: function (dt) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.life -= dt;
                this.vx *= 0.95; // Slow down
                this.vy *= 0.95;
            }
        });
    }

    // 4. Smoke / Glow (Slower, rising)
    const smokeCount = Math.max(2, Math.floor(8 * sizeScale));
    for (let i = 0; i < smokeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (20 + Math.random() * 40) * sizeScale; // Slow
        const size = (20 + Math.random() * 20) * sizeScale;

        game.animations.push({
            type: 'particle',
            shape: 'circle',
            x: x, y: y,
            w: size,
            h: size,
            life: 0.6 + Math.random() * 0.4 * sizeScale,
            maxLife: 1.0 * sizeScale,
            color: `rgba(50, 50, 50, 0.5)`, // Dark smoke
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 50 * sizeScale, // Rise up
            alpha: 0.6
        });
    }

    // Screen Shake
    if (game.camera && shakeIntensity > 0) {
        game.camera.shake(0.15, shakeIntensity * 10.0); // Stronger shake multiplier
    }
};

// Helper for Lightning Bolt (Sky to Ground)
export const spawnLightningBolt = (game, x, y, options = {}) => {
    const height = options.height || 600;
    const segments = options.segments || 15;
    const deviation = options.deviation || 30;
    const color = options.color || '#a5f2f3';

    // Start from top
    // Use explicit sourceX if provided, otherwise random offset
    let currentX = options.sourceX !== undefined ? options.sourceX : (x + (Math.random() - 0.5) * 100);
    let currentY = y - height;

    const segmentHeight = height / segments;

    for (let i = 0; i < segments; i++) {
        const nextY = currentY + segmentHeight;
        // Last segment hits exact target X, others wander
        let nextX;
        if (i === segments - 1) {
            nextX = x; // Lock to target
        } else {
            nextX = currentX + (Math.random() - 0.5) * deviation;
            // Bias towards target X
            nextX += (x - currentX) * 0.2;
        }

        // Calculate vector
        const dx = nextX - currentX;
        const dy = nextY - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Pick random lightning part
        const partId = Math.floor(Math.random() * 10) + 1;
        const partStr = partId < 10 ? `0${partId}` : `${partId}`;
        const spritePath = `assets/lightning_part_${partStr}.png`;

        spawnProjectile(game, currentX + dx / 2, currentY + dy / 2, 0, 0, {
            visual: true,
            spriteSheet: spritePath, // Use asset
            frames: 1,
            life: options.life || 0.15, // Custom life or default Flash
            width: dist * 1.2, // Stretch slightly
            height: (options.thickness || 40) + Math.random() * 20, // Thickness variation
            randomRotation: false,
            rotation: angle,
            color: color,
            filter: 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.5)', // Yellow/Bright
            blendMode: 'lighter',
            noTrail: true
        });

        // Current becomes next
        currentX = nextX;
        currentY = nextY;
    }
};

// --- Aether Explosion ---
export function spawnAetherExplosion(game, x, y) {
    // 1. Large Expanding Ring (White/Transparent)
    game.animations.push({
        type: 'ring',
        x: x, y: y,
        radius: 10,
        maxRadius: 300,
        width: 50, // Thick
        life: 0.6,
        maxLife: 0.6,
        color: 'rgba(255, 255, 255, 0.7)', // White with transparency
    });

    // 2. High Density Particle Burst (White)
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 200 + Math.random() * 600; // High speed
        game.animations.push({
            type: 'particle',
            x: x, y: y,
            w: 6, h: 6,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1.0,
            color: Math.random() < 0.5 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(200, 200, 255, 0.8)', // White with slight blue tint variance
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            drag: 0.95 // Slow down
        });
    }

    // 3. Screen Shake
    if (game.camera) {
        game.camera.shake(0.8, 15); // Strong shake
    }
}
