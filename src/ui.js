export function drawUI(ctx, game, width, height) {
    if (game.isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'red';
        ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", width / 2 - 100, height / 2);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText("Press SPACE to Restart", width / 2 - 100, height / 2 + 40);
    } else {
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Enemies: ${game.enemies.length}`, 10, 20);
        ctx.fillText("Left Click: Attack | E: Primary | Space: Secondary | Q: Ultimate", 10, 40);

        // Skill UI
        let y = 60;
        for (let key in game.player.equippedSkills) {
            const skill = game.player.equippedSkills[key];
            if (skill) {
                const color = skill.isReady() ? 'white' : 'gray';
                const cd = skill.currentCooldown > 0 ? `(${skill.currentCooldown.toFixed(1)})` : '';
                ctx.fillStyle = color;
                ctx.fillText(`${key}: ${skill.name} ${cd}`, 10, y);
                y += 20;
            }
        }
    }
}
