
let selectedSkill = null;
let activeTab = 'all';

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
                // Special case for Primary: selectedSkill.type 'primary' can go into 'primary1' or 'primary2'
                let allowed = false;
                if (type === 'primary1' || type === 'primary2') {
                    if (selectedSkill.type === 'primary') allowed = true;
                } else {
                    if (selectedSkill.type === type) allowed = true;
                }

                if (allowed) {
                    // Equip logic via player method
                    game.player.equipSkill(selectedSkill, type);
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
    // --- Settings UI Injection ---
    // Settings Button
    let settingsBtn = document.getElementById('settings-btn');
    if (!settingsBtn) {
        settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.textContent = '⚙️';
        settingsBtn.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            color: #666;
            font-size: 24px;
            cursor: pointer;
            z-index: 1002;
        `;
        settingsBtn.onmouseover = () => settingsBtn.style.color = '#fff';
        settingsBtn.onmouseout = () => settingsBtn.style.color = '#666';
        invScreen.querySelector('.inventory-container').appendChild(settingsBtn);

        settingsBtn.addEventListener('click', () => {
            const modal = document.getElementById('settings-modal');
            if (modal) modal.style.display = 'flex';
        });
    }

    // Settings Modal
    let settingsModal = document.getElementById('settings-modal');
    if (!settingsModal) {
        settingsModal = document.createElement('div');
        settingsModal.id = 'settings-modal';
        settingsModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #2a2a2a;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #444;
            width: 300px;
            color: white;
            font-family: sans-serif;
        `;
        content.innerHTML = `
            <h3 style="margin-top:0; border-bottom:1px solid #444; padding-bottom:10px;">設定</h3>
            <div style="margin: 20px 0; display:flex; align-items:center; justify-content:space-between;">
                <span>デバッグ情報の表示</span>
                <input type="checkbox" id="debug-toggle">
            </div>
            <div style="text-align:right; margin-top:20px;">
                <button id="close-settings" style="
                    background: #444; border:none; color:white; 
                    padding: 8px 16px; border-radius:4px; cursor:pointer;
                ">閉じる</button>
            </div>
        `;
        settingsModal.appendChild(content);
        document.body.appendChild(settingsModal);

        // Bind Events
        const closeSettings = content.querySelector('#close-settings');
        closeSettings.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });

        const debugToggle = content.querySelector('#debug-toggle');

        // Sync Initial State (needs game ref, handled below in render? or just check global if available, but passing 'game' is safer)
        // Since init is run once, we need to bind event to update 'game'.
        // BUT 'game' is passed to initInventory!

        debugToggle.addEventListener('change', (e) => {
            game.debugMode = e.target.checked;
        });

        // Expose update function to sync checkbox when opening
        settingsBtn.addEventListener('click', () => {
            debugToggle.checked = game.debugMode;
        });
    }

    // Bind Tab Events (once)
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        // Remove old listeners? No easy way, but init is called once.
        // Assuming initInventory is called only once per game load.
        tab.addEventListener('click', () => {
            activeTab = tab.dataset.filter;
            renderInventory(game);
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
        if (!el) continue; // Safety
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

    // Update Tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.filter === activeTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update Detail Panel
    updateDetailPanel(selectedSkill);

    game.player.inventory.forEach(skill => {
        // Filter by Tab
        if (activeTab !== 'all' && skill.type !== activeTab) return;

        const item = document.createElement('div');
        item.className = 'inventory-item';

        const img = document.createElement('img');
        img.className = 'skill-icon';

        const fallback = document.createElement('div');
        fallback.className = 'skill-fallback-text';
        fallback.textContent = skill.name;
        fallback.style.display = 'none';

        if (skill.icon) {
            img.src = skill.icon;
            img.onerror = () => {
                img.style.display = 'none';
                fallback.style.display = 'block';
            };
            img.onload = () => {
                img.style.display = 'block';
                fallback.style.display = 'none';
            };
        } else {
            img.style.display = 'none';
            fallback.style.display = 'block';
        }

        item.appendChild(img);
        item.appendChild(fallback);

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
