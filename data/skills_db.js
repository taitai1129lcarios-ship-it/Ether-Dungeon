export const skillsDB = [
    {
        id: 'slash',
        name: 'スラッシュ', // Slash
        type: 'normal',
        icon: 'assets/icon_slash.png',
        cooldown: 0.4,
        behavior: 'projectile',
        description: '前方に飛ぶ斬撃を放つ。',
        params: {
            damage: 15,
            speed: 750, // 1.5x Speed
            life: 0.14, // Distance halved (was 200, now ~105)
            width: 14,
            height: 48,
            shape: 'slash',
            color: 'rgba(255, 255, 255, 1.0)', // Pure White
            trailColor: 'rgba(220, 255, 255, 0.6)' // Wind trail
        }
    },
    {
        id: 'ice_signal',
        name: 'アイスシグナル', // Ice Signal
        type: 'normal',
        icon: 'assets/icon_ice.png', // Placeholder
        cooldown: 0.05,
        behavior: 'projectile',
        description: '目の前に氷の針を一瞬だけ出現させる超高速の突き攻撃。',
        params: {
            damage: 8,
            speed: 600, // 2x Speed
            length: 40,
            thickness: 12, // Thicker
            size: 4, // Fallback
            life: 0.075, // 1/2 Duration
            color: '#a5f2f3',
            trailColor: 'rgba(255, 255, 255, 0.8)',
            shape: 'triangle'
        }
    },
    {
        id: 'lightning_needle',
        name: 'ライトニングニードル', // Lightning Needle
        type: 'normal',
        icon: 'assets/icon_needle.png',
        cooldown: 0.3,
        behavior: 'projectile',
        description: '前方に極細の電気の針を飛ばす。弾速が非常に速い。',
        params: {
            damage: 3, // 3 damage per tick
            tickCount: 3, // 3 hits total
            tickInterval: 0.1, // 0.1s interval (0.5s duration)
            range: 600,
            speed: 1500, // 3x Speed
            width: 70, // Longer
            height: 6, // Sharp/Thin
            life: 0.17, // 1/3 Life (Same range)
            color: '#FFFFFF', // White
            shape: 'triangle', // Sharp needle shape
            // spriteSheet: 'assets/lightning_part_01.png', // REMOVED: Use shape for needle
            crackle: true, // Asset Lightning Effect enabled
            crackleColor: '#FFFF00', // Yellow
            noTrail: true, // Disable orange trail
            onHitEffect: 'lightning_burst' // New param to trigger burst
        },
    },
    {
        id: 'fireball',
        name: 'ファイアボール', // Fireball
        type: 'primary',
        icon: 'assets/icon_fireball.png',
        cooldown: 1.0,
        behavior: 'projectile',
        description: '前方に火の玉を発射する。射程が長く、威力も高い。',
        params: {
            damage: 40,
            speed: 550,
            width: 32,
            height: 16,
            life: 2.0,
            color: '#ff8800',
            trailColor: 'rgba(255, 150, 0, 1)',
            trailShape: 'circle', // New param for circular trails
            spriteSheet: 'assets/fireball_sheet.png',
            spriteData: 'assets/fireball_sheet.json',
            frames: 4,
            frameRate: 0.1
        }
    },
    {
        id: 'thunder_burst',
        name: 'サンダーバースト', // Thunder Burst
        type: 'primary',
        icon: 'assets/icon_thunder_burst.png',
        cooldown: 4.0,
        behavior: 'area_blast',
        description: '周囲に電撃を帯びた爆発を起こす。',
        params: {
            damage: 3, // Low damage per tick
            range: 100, // +25% range (was 80)
            duration: 1.0, // Lasts 1 second
            interval: 0.1, // Damage every 0.1s (10 ticks total = 100 dmg)
            color: '#ffff00', // Yellow
            particleCount: 20,
            particleColor: '#ffff00', // Yellow sparks
            // Visual Animation
            spriteSheet: 'assets/thunder_burst.png',
            spriteData: null, // No JSON for single image
            width: 200, // Match range * 2
            height: 200,
            frames: 1, // Single frame
            frameRate: 0.1, // Not used for single frame but good practice
            // scale: 1.0, // Force Fit to 160x160 instead
            randomRotation: true // Rotate randomly each frame
        }
    },
    {
        id: 'bounce_spark',
        name: 'バウンスパーク', // Bounce Spark
        type: 'primary',
        icon: 'assets/icon_bounce.png', // Placeholder
        cooldown: 5.0,
        behavior: 'bouncing_projectile',
        description: '壁に5回反射する電気の弾を8方向に放つ。',
        params: {
            damage: 2, // Base damage per tick
            tickCount: 5, // Total hits
            tickInterval: 0.1, // Time between hits
            speed: 400,
            width: 15, // 15px
            height: 15,
            life: 60.0, // Long life (effectively infinite)
            maxBounces: 3,
            color: '#ffff00',
            trailColor: 'rgba(255, 255, 0, 0.5)',
            // Lightning Burst Params
            burstCount: 8, // More segments
            burstSize: 80, // Larger area
            burstSpeed: 150 // Speed for diffusion
        }
    },
    {
        id: 'dash',
        name: 'ダッシュ', // Dash
        type: 'secondary',
        icon: 'assets/icon_dash.png',
        cooldown: 1.0,
        maxStacks: 2,
        behavior: 'dash',
        description: '向いている方向へ高速移動する。回避に便利。',
        params: {
            speed: 800,
            duration: 0.15,
            ghostColor: 'rgba(100, 200, 255, 0.4)'
        }
    },
    {
        id: 'ember_strike',
        name: 'エンバーストライク', // Ember Strike
        type: 'ultimate',
        icon: 'assets/icon_ember_strike.png',
        cooldown: 8.0,
        behavior: 'barrage',
        description: '８つの火の玉を連射する奥義。',
        params: {
            waves: 10,
            perWave: 1,
            interval: 0.07,
            spacing: 20,
            angleSpread: 10,
            damage: 10,
            speed: 550,
            width: 32,
            height: 16,
            life: 2.0,
            shape: 'circle',
            color: '#ff8800',
            trailColor: 'rgba(255, 100, 0, 0.8)',
            spriteSheet: 'assets/fireball_sheet.png',
            spriteData: 'assets/fireball_sheet.json',
            frames: 4,
            frameRate: 0.1
        }
    },
    {
        id: 'spin',
        name: 'スピンアタック', // Spin Attack
        type: 'ultimate',
        icon: 'assets/icon_spin.png',
        cooldown: 5.0,
        behavior: 'spiral_out',
        description: '周囲に剣気を放ち、広範囲の敵を攻撃する必殺技。',
        params: {
            damage: 60,
            range: 200, // Not used directly by behavior but good metadata
            color: 'cyan',
            duration: 1.5,
            count: 8,
            speed: 150,
            rotationSpeed: 4
        }
    },
    {
        id: 'blood_scythe',
        name: 'ブラッドサイス', // Blood Scythe
        type: 'primary',
        icon: null, // Unimplemented
        cooldown: 2.0,
        behavior: 'blood_scythe',
        description: '血濡れた鎌を投げ、加速しながら前進し続ける。触れた敵に連続ダメージ。',
        params: {
            damage: 5, // Reduced base damage
            speed: 800, // High start speed
            acceleration: -1200, // Decelerate on way out
            returnSpeed: 1500, // Speed on return
            range: 800, // Max distance safety
            width: 96,
            height: 96,
            color: '#ff0000', // Red
            trailColor: 'rgba(255, 0, 0, 0.5)',
            rotationSpeed: -45, // Reversed and 3x Speed
            spriteSheet: 'assets/blood_scythe.png',
            frames: 1,
            pierce: 999, // Infinite pierce
            tickInterval: 0.1 // Damage every 0.1s
        }
    },
    {
        id: 'ice_spike',
        name: 'アイススパイク', // Ice Spike
        type: 'primary',
        icon: null, // Unimplemented icon (will use spriteSheet if icon is null inside createSkill logc? No, logic usually expects icon)
        // Actually, let's use a placeholder or the sprite sheet as icon if logic allows, but usually icon is separate.
        // For now, null is fine or we can reuse `icon_ice.png` if it exists (from ice_signal).
        icon: 'assets/icon_ice_spike.png', // Placeholder name
        cooldown: 6.0,
        behavior: 'ice_spike',
        description: '前方に氷の棘を突き上げる。5秒間持続し、上にいる敵にダメージを与え続ける。',
        params: {
            damage: 10, // Initial Hit
            duration: 1.0,
            tickInterval: 0.5,
            count: 30, // Increased count to 30
            spacing: 5, // Reduced spacing for density (was 8)
            width: 10, // 15 * 0.7
            height: 46, // 66 * 0.7
            spriteSheet: 'assets/ice_spike.png',
            frames: 1,
            pierce: 999
        }
    }
];
