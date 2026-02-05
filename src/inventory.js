
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
                // Equip selected skill to this slot
                // Check if type matches? (Optional restriction, but for now allow any skill in any slot? 
                // Use skill.type if strictly typed, but user might want flexibility.
                // Let's enforce type based on skill.type if we want, OR allow mapping.
                // Game logic: Player.equipSkill(skill) maps by skill.type.
                // So clicking a slot might just trigger "Equip" but the slot depends on skill type?
                // OR: The user wants to map "Normal" (LMB) to a specific skill.
                // If the game logic strictly uses skill.type for slots, then clicking a slot 
                // to equip a skill of a DIFFERENT type might be confusing.
                // Let's assume skills have fixed types for now (Normal, Primary, etc).
                // So clicking a slot only works if the selected skill matches the slot type?
                // OR: Allow re-mapping types? Complex.
                // SIMPLEST: "Equip" button on skill.
                // USER REQUEST: "Click skill in backpack, then click an Equipped slot to equip."
                // This implies customizable slots or just setting that slot.

                // Let's try to set the slot.
                // If skill.type doesn't match slot type, maybe warn?
                // Or just force it. Player.equippedSkills is an object keyed by type.
                // If we put a 'secondary' skill in 'primary' slot, does it work?
                // player.js: useSkill(type) calls equippedSkills[type].
                // So yes, if we put any skill object in equippedSkills['primary'], pressing E will use it.
                // This allows cool customization!

                game.player.equippedSkills[type] = selectedSkill;
                renderInventory(game); // Re-render to show updates
                selectedSkill = null; // Deselect
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
