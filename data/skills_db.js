export const skillsDB = [
    {
        id: 'flame_fan',
        name: 'フレイムファン', // Flame Fan
        type: 'normal',
        icon: 'assets/icon_flame_fan.png', // Dedicated icon
        cooldown: 0.8,
        behavior: 'fan_projectile',
        description: '前方に扇状の炎を撒き散らす。',
        params: {
            count: 6, // Number of pellets
            angleSpread: 45, // Spread in degrees
            damage: 6,
            speed: 400,
            randomSpeed: 100, // Variation in speed
            life: 0.35, // Short range
            width: 14,
            height: 14,
            // shape: 'orb', // REMOVE procedural shape
            spriteSheet: 'assets/flame_fan.png', // Use the new pixel art
            frames: 1, // Single frame for now
            fixedOrientation: true, // Don't rotate sprite automatically (unless round)

            color: '#ff6600', // Orange Fire (still good for lighting/damage)
            trailColor: 'rgba(255, 100, 0, 0.5)',
            damageColor: '#ff6600',
            knockback: 50, // Slight push
            statusEffect: 'burn',
            statusChance: 0.2,
            aetherCharge: 2.7 // Calculated: 5.0 / (1.5 hits / 0.8s)
        }
    },
    {
        id: 'slash',
        // name: 'スラッシュ', // Slash
        name: 'Slash (Backup)',
        type: 'normal',
        icon: 'assets/icon_slash.png',
        cooldown: 0.4,
        behavior: 'static_slash',
        description: '前方に飛ぶ斬撃を放つ。',
        params: {
            damage: 15,
            speed: 0, // Stationary
            life: 0.1, // Duration of animation (Tripled speed)
            width: 14,
            height: 48,
            forwardOffset: 30,
            shape: 'slash',
            color: 'rgba(255, 255, 255, 1.0)', // Pure White
            trailColor: 'rgba(220, 255, 255, 0.6)', // Wind trail
            damageColor: '#ffffff', // White (Wind)
            aetherCharge: 2.0 // Calculated: 5.0 / (1 hit / 0.4s)
        }
    },
    {
        id: 'crimson_cross',
        name: 'クリムゾン・クロス', // Crimson Cross
        type: 'normal',
        icon: 'assets/icon_blood_scythe.png',
        cooldown: 0.2,
        behavior: 'crimson_cross',
        description: '前方に十文字の斬撃を放ち、敵を出血させる。',
        params: {
            damage: 5,
            speed: 0,
            life: 0.2, // Adjusted to 0.2s
            width: 120, // Match visual span/thickness better
            height: 120, // Match visual span/thickness better
            forwardOffset: 35, // Centered better on player
            shape: 'slash',
            color: '#800000', // Deep Dark Red
            trailColor: 'rgba(128, 0, 0, 0.4)',
            damageColor: '#cc0000', // Brighter Blood Red for visibility
            statusEffect: 'bleed',
            statusChance: 0.4,
            pierce: 999, // Allow hitting multiple enemies in the X
            ignoreWallDestruction: true, // Don't vanish on walls
            aetherCharge: 2.0
        }
    },

    {
        id: 'ice_signal',
        name: 'アイスシグナル', // Ice Signal
        type: 'normal',
        icon: 'assets/icon_ice.png', // Placeholder
        cooldown: 0.035, // 0.05 * 0.7
        behavior: 'projectile',
        description: '目の前に氷の針を一瞬だけ出現させる超高速の突き攻撃。',
        params: {
            damage: 2,
            speed: 600, // 2x Speed
            width: 14,
            height: 50,
            life: 0.1, // Slightly longer visible life
            spriteSheet: 'assets/ice_spike.png',
            frames: 1,
            rotationOffset: Math.PI / 2, // 90 degrees to point Right
            fixedOrientation: true, // Prevent auto-swap of W/H
            forwardOffset: 30, // Distance from player center
            heightOffset: -10, // Slight upward visual offset
            trailColor: 'rgba(255, 255, 255, 0.5)',
            shape: 'triangle', // Fallback
            damageColor: '#00ffff', // Cyan (Ice)
            aetherCharge: 0.18 // Calculated: 5.0 / (1 hit / 0.035s)
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
            onHitEffect: 'lightning_burst', // New param to trigger burst
            damageColor: '#ffff00', // Yellow (Electric)
            aetherCharge: 0.5 // Calculated: 5.0 / (3 hits / 0.3s)
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
            width: 64, // 32 * 2
            height: 32, // 16 * 2
            life: 2.0,
            color: '#ff8800',
            trailColor: 'rgba(255, 150, 0, 1)',
            trailShape: 'circle', // New param for circular trails
            damageColor: '#ff8800', // Orange (Fire)
            onHitEffect: 'explosion', // Grand Explosion Effect
            shakeIntensity: 0.8,
            noShake: true,
            spriteSheet: 'assets/fireball_sheet.png',
            spriteData: 'assets/fireball_sheet.json',
            frames: 4,
            frameRate: 0.05, // 0.1 / 2 (2x Speed)
            // Charge Params
            chargeable: true,
            chargeTime: 1.0,
            minDamage: 20, // Uncharged
            maxDamage: 80, // Fully Charged (4x)
            minSize: 48, // Uncharged (Small)
            maxSize: 128, // Fully Charged (Large) (64*2)
            maxSpeed: 700,
            statusEffect: 'burn',
            statusChance: 0.5,
            aetherCharge: 5.0 // Calculated: 5.0 / (1 hit / 1.0s)
        }
    },
    {
        id: 'thunder_burst',
        name: 'サンダーバースト', // Thunder Burst
        type: 'primary',
        icon: 'assets/icon_thunder_burst.png',
        cooldown: 6.0,
        behavior: 'area_blast',
        description: '周囲に電撃を帯びた爆発を起こす。',
        params: {
            damage: 5, // Increased damage (3 -> 5)
            range: 100, // +25% range (was 80)
            duration: 1.0, // Lasts 1 second
            interval: 0.1, // Damage every 0.1s (10 ticks total = 100 dmg)
            color: '#ffff00', // Yellow
            particleCount: 20,
            particleColor: '#ffff00', // Yellow sparks
            damageColor: '#ffff00', // Yellow (Electric)
            // Visual Animation
            spriteSheet: 'assets/thunder_burst.png',
            spriteData: null, // No JSON for single image
            width: 200, // Match range * 2
            height: 200,
            frames: 1, // Single frame
            frameRate: 0.1, // Not used for single frame but good practice
            // scale: 1.0, // Force Fit to 160x160 instead
            randomRotation: true, // Rotate randomly each frame
            aetherCharge: 1.5 // Halved from 3.0 per user request
        }
    },
    {
        id: 'bounce_spark',
        name: 'バウンスパーク', // Bounce Spark
        type: 'primary',
        icon: 'assets/icon_bounce.png', // Placeholder
        cooldown: 5.0,
        behavior: 'bouncing_projectile',
        description: '壁に反射する電気の弾を前方に5発扇状に発射する。',
        params: {
            damage: 5, // Base damage per tick
            count: 5, // Projectile Count
            angleSpread: 15, // Degrees between projectiles
            tickCount: 5, // Total hits per projectile
            tickInterval: 0.1, // Time between hits
            speed: 400,
            width: 15, // 15px
            height: 15,
            life: 60.0, // Long life (effectively infinite)
            maxBounces: 3,
            color: '#ffff00',
            trailColor: 'rgba(255, 255, 0, 0.5)',
            damageColor: '#ffff00', // Yellow (Electric)
            // Lightning Burst Params
            burstCount: 8, // More segments
            burstSize: 80, // Larger area
            burstSpeed: 150, // Speed for diffusion
            aetherCharge: 5.0 // Calculated: 5.0 / (1 hit / 5.0s)
        }
    },

    {
        id: 'ember_strike',
        name: 'エンバーストライク', // Ember Strike
        type: 'ultimate',
        icon: 'assets/icon_ember_strike.png',
        cooldown: 10.0,
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
            damageColor: '#ff8800', // Orange (Fire)
            onHitEffect: 'explosion', // Grand Explosion Effect
            shakeIntensity: 0.3,
            noShake: true,
            spriteSheet: 'assets/fireball_sheet.png',
            spriteData: 'assets/fireball_sheet.json',
            frames: 4,
            frameRate: 0.1,
            statusEffect: 'burn',
            statusChance: 0.3,
            aetherCharge: 3.0 // Ultimate (Normal Mode Gain)
        }
    },

    {
        id: 'blood_scythe',
        name: 'ブラッドサイス', // Blood Scythe
        type: 'primary',
        icon: 'assets/icon_blood_scythe.png', // Updated icon path
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
            tickInterval: 0.1, // Damage every 0.1s
            statusEffect: 'bleed',
            statusEffect: 'bleed',
            statusChance: 0.3, // 30% chance per tick
            damageColor: '#880000', // Dark Red (Blood)
            aetherCharge: 2.0 // Calculated: 5.0 / (5 ticks / 2.0s)
        }
    },
    {
        id: 'ice_spike',
        name: 'アイススパイク', // Ice Spike
        type: 'primary',
        icon: 'assets/icon_ice_spike.png', // Updated icon path
        // actually, let's use a placeholder or the sprite sheet as icon if logic allows, but usually icon is separate.
        // For now, null is fine or we can reuse `icon_ice.png` if it exists (from ice_signal).
        // icon: 'assets/icon_ice_spike.png', // Placeholder name
        cooldown: 6.0,
        behavior: 'ice_spike',
        description: '前方に氷の棘を突き上げる。5秒間持続し、上にいる敵にダメージを与え続ける。',
        params: {
            damage: 3, // Initial Hit
            duration: 1.0,
            tickInterval: 0.5,
            count: 30, // Increased count to 30
            spacing: 5, // Reduced spacing for density (was 8)
            width: 10, // 15 * 0.7
            height: 46, // 66 * 0.7
            spriteSheet: 'assets/ice_spike.png',
            frames: 1,
            damageColor: '#00ffff', // Cyan (Ice)
            pierce: 999,
            aetherCharge: 2.5 // Reduced to 25% (was 10.0)
        }
    },
    {
        id: 'ice_garden',
        name: 'アイスガーデン', // Ice Garden
        type: 'ultimate',
        icon: 'assets/icon_ice_garden.png', // Placeholder
        cooldown: 10.0,
        behavior: 'ice_garden',
        description: '範囲内の敵を減速させ、足元から氷の棘で攻撃するエリアを展開する。',
        params: {
            damage: 5, // Damage per spike
            duration: 10.0,
            radius: 150, // 200 * 0.75
            tickInterval: 0.5, // Spill interval
            tickInterval: 0.5, // Spill interval
            visualSpikeCount: 60, // Dense visual spikes
            damageColor: '#00ffff', // Cyan (Ice)
            aetherCharge: 0.5 // Ultimate (Normal Mode Gain)
        }
    },
    {
        id: 'tornado',
        name: 'トルネード', // Tornado
        type: 'primary',
        icon: 'assets/icon_wind.png', // Placeholder or use generic
        cooldown: 8.0,
        behavior: 'tornado',
        description: '前方に竜巻を発生させる。竜巻はゆっくり進み、触れた敵を連続ヒットさせながら少しノックバックさせる。',
        params: {
            damage: 5, // Low damage per tick
            tickInterval: 0.2, // 5 hits per second
            speed: 800, // Very Fast
            width: 90,
            height: 90,
            life: 5.0, // Lasts 5 seconds
            knockback: 150, // Push speed
            color: '#88ccff',
            shape: 'tornado',
            damageColor: '#ffffff', // White (Wind) - User requested White for Wind
            aetherCharge: 1.6 // Calculated: 5.0 / (25 hits / 8.0s)
        }
    },
    {
        id: 'chain_lightning',
        name: 'チェーンライトニング', // Chain Lightning
        type: 'primary',
        icon: 'assets/icon_chain.png',
        cooldown: 5.0,
        behavior: 'chain_lightning',
        description: '敵から敵へと連鎖する雷撃を放つ。',
        params: {
            damage: 8,
            speed: 1000,
            width: 40,
            height: 8,
            life: 1.0,
            color: '#ffff00',
            trailColor: 'rgba(255, 255, 0, 0.5)',
            damageColor: '#ffff00', // Yellow
            chainCount: 4, // 4 Jumps (Initial launch parameter, logic uses per-enemy limit now)
            chainRange: 500,
            crackle: true,
            crackleColor: '#ffff00',
            aetherCharge: 25.0 // Calculated: 5.0 / (1 hit / 5.0s)
        }
    },
    {
        id: 'thunderfall',
        name: 'サンダーフォール', // Thunderfall
        type: 'primary', // Active skill
        icon: 'assets/icon_thunder_fall.png', // Placeholder
        cooldown: 8.0,
        behavior: 'thunderfall_storm',
        description: '一定時間、周囲の敵に対してランダムに落雷を発生させる。',
        params: {
            damage: 8,
            count: 12, // User requested 12
            interval: 0.03, // Fast
            spacing: 25, // User requested 25
            zigzagWidth: 30, // Zigzag offset
            damageColor: '#ffff00', // Yellow
            aetherCharge: 3.25 // Reduced to 25% (was 13.0)
        }
    },
    {
        id: 'thunder_god_wrath',
        name: 'サンダー・ラス', // Thunder Wrath
        type: 'ultimate',
        icon: 'assets/icon_thunder_god.png', // Placeholder
        cooldown: 15.0,
        behavior: 'global_strike',
        description: '画面内の全ての敵に、神の如き雷槌を落とす。',
        params: {
            damage: 20, // High single hit
            count: 5, // Total bolts to drop
            damageColor: '#ffff00', // Yellow
            aetherCharge: 0 // Ultimate (No gain)
        }
    },
    {
        id: 'glacial_lotus',
        name: 'グラシアル・ロータス', // Glacial Lotus
        type: 'ultimate',
        icon: 'assets/icon_glacial_lotus.png',
        cooldown: 15.0,
        behavior: 'glacial_lotus',
        description: '周囲に巨大な氷の蓮を展開し、一斉に射出する奥義。',
        params: {
            damage: 15, // Reduced for balance with pierce/scatter
            petalCount: 16, // Number of petals
            bloomRadius: 60,
            bloomDuration: 0.8, // Time until burst
            burstSpeed: 900,
            burstLife: 1.2,
            width: 24,
            height: 60,
            spriteSheet: 'assets/ice_spike.png',
            damageColor: '#00ffff', // Cyan (Ice)
            fixedOrientation: true,
            rotationOffset: Math.PI / 2,
            aetherCharge: 0 // Ultimate (No gain)
        }
    },
    {
        id: 'lunatic_snicker',
        name: 'ルナティックスニッカー', // Lunatic Snicker
        type: 'ultimate',
        icon: 'assets/icon_blood_scythe.png', // Temporary, same as crimson_cross
        cooldown: 15.0,
        behavior: 'lunatic_snicker_strike',
        description: '画面内の全ての敵をターゲットし、狂気の如き深紅の十文字を刻み込む奥義。',
        params: {
            damage: 25,
            life: 0.3, // Slightly longer than normal for impact
            width: 140, // Larger than normal
            height: 140,
            shape: 'slash',
            color: '#800000', // Deep Dark Red
            trailColor: 'rgba(128, 0, 0, 0.5)',
            damageColor: '#cc0000', // Brighter Blood Red
            statusEffect: 'bleed',
            statusChance: 1.0, // Guaranteed bleed per hit
            pierce: 999,
            ignoreWallDestruction: true,
            aetherCharge: 0 // Ultimate (No gain)
        }
    }
];
