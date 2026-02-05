export const skillsDB = [
    {
        id: 'slash',
        name: 'Slash',
        type: 'normal',
        cooldown: 0.4,
        behavior: 'arc_slash',
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
        id: 'fireball',
        name: 'Fireball',
        type: 'primary',
        cooldown: 1.0,
        behavior: 'projectile',
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
        name: 'Dash',
        type: 'secondary',
        cooldown: 2.0,
        behavior: 'dash',
        params: {
            speed: 800,
            duration: 0.15,
            ghostColor: 'rgba(100, 200, 255, 0.4)'
        }
    },
    {
        id: 'spin',
        name: 'Spin Attack',
        type: 'ultimate',
        cooldown: 5.0,
        behavior: 'area_blast',
        params: {
            damage: 100,
            range: 120,
            color: 'cyan',
            duration: 0.4,
            particleCount: 16
        }
    }
];
