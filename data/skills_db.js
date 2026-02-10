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
            damage: 25,
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
            range: 80,
            duration: 1.0, // Lasts 1 second
            interval: 0.1, // Damage every 0.1s (10 ticks total = 100 dmg)
            color: '#ffff00', // Yellow
            particleCount: 20,
            particleColor: '#ffff00', // Yellow sparks
            // Visual Animation
            spriteSheet: 'assets/thunder_burst.png',
            spriteData: null, // No JSON for single image
            width: 160, // Match range * 2
            height: 160,
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
    }
];
