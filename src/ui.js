let skillSlots = null;

function initSkillSlots() {
    skillSlots = {
        normal: {
            el: document.getElementById('skill-normal'),
            icon: document.querySelector('#skill-normal .skill-icon'),
            overlay: document.querySelector('#skill-normal .cooldown-overlay'),
            text: document.querySelector('#skill-normal .cooldown-text')
        },
        primary: {
            el: document.getElementById('skill-primary'),
            icon: document.querySelector('#skill-primary .skill-icon'),
            overlay: document.querySelector('#skill-primary .cooldown-overlay'),
            text: document.querySelector('#skill-primary .cooldown-text')
        },
        secondary: {
            el: document.getElementById('skill-secondary'),
            icon: document.querySelector('#skill-secondary .skill-icon'),
            overlay: document.querySelector('#skill-secondary .cooldown-overlay'),
            text: document.querySelector('#skill-secondary .cooldown-text')
        },
        ultimate: {
            el: document.getElementById('skill-ultimate'),
            icon: document.querySelector('#skill-ultimate .skill-icon'),
            overlay: document.querySelector('#skill-ultimate .cooldown-overlay'),
            text: document.querySelector('#skill-ultimate .cooldown-text')
        }
    };
}

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

    if (!skillSlots) initSkillSlots();

    // Update Skill DOM UI
    for (let key in game.player.equippedSkills) {
        const skill = game.player.equippedSkills[key];
        const slot = skillSlots[key];

        if (slot) {
            if (skill) {
                // Update Name (optimization: only if changed? checking textContent is fast enough)
                // Update Icon
                // Update Icon
                if (skill.icon) {
                    if (slot.icon.getAttribute('src') !== skill.icon) {
                        slot.icon.src = skill.icon;
                        slot.icon.style.display = 'block';
                    }
                } else {
                    if (slot.icon.style.display !== 'none') {
                        slot.icon.style.display = 'none';
                    }
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
                slot.icon.style.display = 'none';
                slot.overlay.style.height = '0%';
                slot.text.style.display = 'none';
                slot.el.classList.remove('active');
            }
        }
    }
}
