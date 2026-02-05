
let selectedSkill = null;

export function initInventory(game) {
    const invScreen = document.getElementById('inventory-screen');
    const closeBtn = document.getElementById('close-inventory');

    closeBtn.addEventListener('click', () => {
        game.showInventory = false;
        invScreen.style.display = 'none';
    });

    // Equipped Slot Clicks
    document.querySelectorAll('.equip-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const type = slot.dataset.type;
            if (selectedSkill) {
                // Check if type matches
                if (selectedSkill.type === type) {
                    game.player.equippedSkills[type] = selectedSkill;
                    renderInventory(game); // Re-render to show updates
                    selectedSkill = null; // Deselect
                } else {
                    // Feedback for mismatch
                    slot.classList.add('error');
                    setTimeout(() => slot.classList.remove('error'), 400);
                }
            } else {
                // Determine if we want to unequip? Or just select equipped?
                // For now, do nothing if nothing selected.
            }
        });
    });
}

export function renderInventory(game) {
    const invScreen = document.getElementById('inventory-screen');
    if (!game.showInventory) {
        invScreen.style.display = 'none';
        return;
    }
    invScreen.style.display = 'flex';

    // Update Equipped
    for (let key in game.player.equippedSkills) {
        const skill = game.player.equippedSkills[key];
        const el = document.getElementById(`equip-${key}`);
        const slot = el.parentElement; // .equip-slot
        const icon = slot.querySelector('.skill-icon');

        if (skill) {
            el.textContent = skill.name;
            el.style.color = '#fff';
            if (skill.icon) {
                icon.src = skill.icon;
                icon.style.display = 'inline-block';
            } else {
                icon.style.display = 'none';
            }
        } else {
            el.textContent = "Empty";
            el.style.color = '#888';
            if (icon) icon.style.display = 'none';
        }
    }

    // Update Backpack
    const grid = document.getElementById('backpack-grid');
    grid.innerHTML = '';

    // Update Detail Panel
    updateDetailPanel(selectedSkill);

    game.player.inventory.forEach(skill => {
        const item = document.createElement('div');
        item.className = 'inventory-item';

        let iconHtml = '';
        if (skill.icon) {
            iconHtml = `<img src="${skill.icon}" class="skill-icon">`;
        }
        item.innerHTML = `${iconHtml}`; // Icon only

        if (selectedSkill === skill) {
            item.classList.add('selected');
        }

        item.addEventListener('click', () => {
            selectedSkill = skill;
            renderInventory(game); // Re-render to show selection
        });

        grid.appendChild(item);
    });
}

function updateDetailPanel(skill) {
    const nameEl = document.getElementById('detail-name');
    const infoEl = document.getElementById('detail-info');
    const descEl = document.getElementById('detail-desc');

    if (!skill) {
        nameEl.textContent = 'スキルを選択してください';
        infoEl.innerHTML = '';
        descEl.textContent = '';
        return;
    }

    nameEl.textContent = skill.name;

    const typeMap = {
        'normal': '通常',
        'primary': 'メイン',
        'secondary': 'サブ',
        'ultimate': '必殺技'
    };

    let infoHtml = `タイプ: ${typeMap[skill.type] || skill.type}<br>`;
    infoHtml += `クールダウン: ${skill.cooldown}秒<br>`;

    // Add dmg/speed if available
    if (skill.params && skill.params.damage) {
        infoHtml += `威力: ${skill.params.damage}<br>`;
    }

    infoEl.innerHTML = infoHtml;
    descEl.textContent = skill.description || '説明がありません。';
}
