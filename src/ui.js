const skillSlots = {
    normal: {
        el: document.getElementById('skill-normal'),
        name: document.querySelector('#skill-normal .skill-name'),
        overlay: document.querySelector('#skill-normal .cooldown-overlay'),
        text: document.querySelector('#skill-normal .cooldown-text')
    },
    primary: {
        el: document.getElementById('skill-primary'),
        name: document.querySelector('#skill-primary .skill-name'),
        overlay: document.querySelector('#skill-primary .cooldown-overlay'),
        text: document.querySelector('#skill-primary .cooldown-text')
    },
    secondary: {
        el: document.getElementById('skill-secondary'),
        name: document.querySelector('#skill-secondary .skill-name'),
        overlay: document.querySelector('#skill-secondary .cooldown-overlay'),
        text: document.querySelector('#skill-secondary .cooldown-text')
    },
    ultimate: {
        el: document.getElementById('skill-ultimate'),
        name: document.querySelector('#skill-ultimate .skill-name'),
        overlay: document.querySelector('#skill-ultimate .cooldown-overlay'),
        text: document.querySelector('#skill-ultimate .cooldown-text')
    }
};

export function drawUI(ctx, game, width, height) {
    // Canvas UI (Game Over, etc)
    if (game.isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'red';
        ctx.font = '40px Arial';
        ctx.fillText("GAME OVER", width / 2 - 100, height / 2);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText("Press SPACE to Restart", width / 2 - 100, height / 2 + 40);
        return;
    }

    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Enemies: ${game.enemies.length}`, 10, 20);

    // Update Skill DOM UI
    for (let key in game.player.equippedSkills) {
        const skill = game.player.equippedSkills[key];
        const slot = skillSlots[key];

        if (slot) {
            if (skill) {
                // Update Name (optimization: only if changed? checking textContent is fast enough)
                if (slot.name.textContent !== skill.name) {
                    slot.name.textContent = skill.name;
                }

                // Update Cooldown
                if (skill.currentCooldown > 0) {
                    const ratio = skill.currentCooldown / skill.cooldown;
                    slot.overlay.style.height = `${ratio * 100}%`;
                    slot.text.style.display = 'block';
                    slot.text.textContent = skill.currentCooldown.toFixed(1);
                    slot.el.classList.remove('active');
                } else {
                    slot.overlay.style.height = '0%';
                    slot.text.style.display = 'none';
                    slot.el.classList.add('active');
                }
            } else {
                slot.name.textContent = "Empty";
                slot.overlay.style.height = '0%';
                slot.text.style.display = 'none';
                slot.el.classList.remove('active');
            }
        }
    }
}
