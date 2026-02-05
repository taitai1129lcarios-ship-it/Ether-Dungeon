export const skillsDB = [
    {
        id: 'slash',
        name: 'スラッシュ', // Slash
        type: 'normal',
        icon: 'assets/icon_slash.png',
        cooldown: 0.2,
        behavior: 'arc_slash',
        description: '前方への素早い剣撃。基本的な攻撃スキル。',
        params: {
            damage: 25,
            range: 50,
            angleStart: -Math.PI / 3, // Right facing relative
            angleEnd: Math.PI / 3,
            radius: 40,
            color: '#fff',
            duration: 0.15
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
            speed: 400,
            size: 12,
            life: 2.0,
            color: '#ff8800',
            trailColor: 'rgba(255, 150, 0, 1)'
        }
    },
    {
        id: 'dash',
        name: 'ダッシュ', // Dash
        type: 'secondary',
        icon: 'assets/icon_dash.png',
        cooldown: 2.0,
        behavior: 'dash',
        description: '向いている方向へ高速移動する。回避に便利。',
        params: {
            speed: 800,
            duration: 0.15,
            ghostColor: 'rgba(100, 200, 255, 0.4)'
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
