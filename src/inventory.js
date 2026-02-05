
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
        if (skill) {
            el.textContent = skill.name;
            el.style.color = '#fff';
        } else {
            el.textContent = "Empty";
            el.style.color = '#888';
        }
    }

    // Update Backpack
    const grid = document.getElementById('backpack-grid');
    grid.innerHTML = '';

    game.player.inventory.forEach(skill => {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        item.textContent = skill.name;

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
