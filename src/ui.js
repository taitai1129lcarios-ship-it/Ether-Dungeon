let skillSlots = null;

function initSkillSlots() {
    skillSlots = {
        normal: {
            el: document.getElementById('skill-normal'),
            icon: document.querySelector('#skill-normal .skill-icon'),
            fallback: document.querySelector('#skill-normal .skill-fallback-text'),
            overlay: document.querySelector('#skill-normal .cooldown-overlay'),
            text: document.querySelector('#skill-normal .cooldown-text'),
            stack: document.querySelector('#skill-normal .stack-count')
        },
        primary1: {
            el: document.getElementById('skill-primary1'),
            icon: document.querySelector('#skill-primary1 .skill-icon'),
            fallback: document.querySelector('#skill-primary1 .skill-fallback-text'),
            overlay: document.querySelector('#skill-primary1 .cooldown-overlay'),
            text: document.querySelector('#skill-primary1 .cooldown-text'),
            stack: document.querySelector('#skill-primary1 .stack-count')
        },
        primary2: {
            el: document.getElementById('skill-primary2'),
            icon: document.querySelector('#skill-primary2 .skill-icon'),
            fallback: document.querySelector('#skill-primary2 .skill-fallback-text'),
            overlay: document.querySelector('#skill-primary2 .cooldown-overlay'),
            text: document.querySelector('#skill-primary2 .cooldown-text'),
            stack: document.querySelector('#skill-primary2 .stack-count')
        },
        secondary: {
            el: document.getElementById('skill-secondary'),
            icon: document.querySelector('#skill-secondary .skill-icon'),
            fallback: document.querySelector('#skill-secondary .skill-fallback-text'),
            overlay: document.querySelector('#skill-secondary .cooldown-overlay'),
            text: document.querySelector('#skill-secondary .cooldown-text'),
            stack: document.querySelector('#skill-secondary .stack-count')
        },
        ultimate: {
            el: document.getElementById('skill-ultimate'),
            icon: document.querySelector('#skill-ultimate .skill-icon'),
            fallback: document.querySelector('#skill-ultimate .skill-fallback-text'),
            overlay: document.querySelector('#skill-ultimate .cooldown-overlay'),
            text: document.querySelector('#skill-ultimate .cooldown-text'),
            stack: document.querySelector('#skill-ultimate .stack-count')
        }
    };
}

export function drawUI(ctx, game, width, height) {
    // ... (Game Over logic unchanged)
    if (game.isGameOver) {
        // ...
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
            if (!slot.icon) console.warn("UI Warning: Icon element missing for slot", key);

            if (skill) {
                // Update Icon
                // Update Icon with Fallback
                if (skill.icon) {
                    if (slot.lastIcon !== skill.icon) {
                        slot.lastIcon = skill.icon;
                        slot.icon.src = skill.icon;

                        // Reset handlers
                        slot.icon.onload = () => {
                            slot.icon.style.display = 'block';
                            slot.fallback.style.display = 'none';
                        };
                        slot.icon.onerror = () => {
                            slot.icon.style.display = 'none';
                            slot.fallback.textContent = skill.name;
                            slot.fallback.style.display = 'block';
                        };
                    }
                    // Note: If icon matches lastIcon, we assume state is managed by handlers
                } else {
                    if (slot.icon.style.display !== 'none') slot.icon.style.display = 'none';
                    if (slot.fallback.style.display !== 'block') {
                        slot.fallback.textContent = skill.name;
                        slot.fallback.style.display = 'block';
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

                // Update Stacks
                if (skill.maxStacks > 1) {
                    slot.stack.textContent = skill.stacks;
                    slot.stack.style.display = 'block';
                } else {
                    slot.stack.style.display = 'none';
                }

            } else {
                slot.icon.style.display = 'none';
                slot.overlay.style.height = '0%';
                slot.text.style.display = 'none';
                slot.el.classList.remove('active');
                slot.stack.style.display = 'none';
            }
        }
    }

    // Draw Mini-map
    drawMiniMap(ctx, game, width, height);
}

function drawMiniMap(ctx, game, screenWidth, screenHeight) {
    const map = game.map;
    const player = game.player;

    // Mini-map configuration
    const mapSize = 150; // Max width/height in pixels
    const timerSize = 4; // Tile size in pixels (if fitted)

    // Calculate scale to fit in mapSize
    const scaleX = mapSize / map.width;
    const scaleY = mapSize / map.height;
    const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio

    const mmW = map.width * scale;
    const mmH = map.height * scale;

    const mmX = screenWidth - mmW - 20; // 20px padding from right
    const mmY = 20; // 20px padding from top

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(mmX - 5, mmY - 5, mmW + 10, mmH + 10);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX - 5, mmY - 5, mmW + 10, mmH + 10);

    // Draw Map Tiles
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            const tile = map.tiles[y][x];

            // Check for Staircase
            let isStaircase = false;
            // Check room grid for staircase type
            if (map.roomGrid && map.roomGrid[y] && map.roomGrid[y][x] !== -1) {
                const roomId = map.roomGrid[y][x];
                const room = map.rooms[roomId];
                if (room && room.type === 'staircase') {
                    const centerX = room.x + Math.floor(room.w / 2);
                    const centerY = room.y + Math.floor(room.h / 2);
                    // Highlight center 2x2
                    if ((x === centerX || x === centerX - 1) && (y === centerY || y === centerY - 1)) {
                        isStaircase = true;
                    }
                }
            }

            if (isStaircase) {
                ctx.fillStyle = '#00ffff'; // Cyan for stairs
                ctx.fillRect(mmX + x * scale, mmY + y * scale, scale, scale);
            } else if (tile === 1) {
                // Wall
                ctx.fillStyle = '#888';
                ctx.fillRect(mmX + x * scale, mmY + y * scale, scale, scale);
                // Floor - Do nothing (Transparent/Background)
            }
        }
    }

    // Draw Player
    const pX = (player.x / map.tileSize) * scale;
    const pY = (player.y / map.tileSize) * scale;

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(mmX + pX + (player.width / map.tileSize * scale) / 2, mmY + pY + (player.height / map.tileSize * scale) / 2, Math.max(2, scale), 0, Math.PI * 2);
    ctx.fill();
}

// --- Skill Selection UI ---
const skillModal = document.getElementById('skill-selection-modal');
const skillCardsContainer = document.getElementById('skill-selection-cards');

export function showSkillSelection(skills, onSelectCallback) {
    if (!skillModal || !skillCardsContainer) return;

    // Clear previous
    skillCardsContainer.innerHTML = '';

    skills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.dataset.type = skill.type; // for styling

        // Icon
        const icon = document.createElement('img');
        icon.className = 'skill-card-icon';
        icon.src = skill.icon || 'assets/icon_unknown.png'; // Fallback? based on type?
        icon.onerror = () => { icon.style.display = 'none'; }; // Hide if missing
        card.appendChild(icon);

        // Name
        const name = document.createElement('div');
        name.className = 'skill-card-name';
        name.textContent = skill.name;
        card.appendChild(name);

        // Type
        const type = document.createElement('div');
        type.className = 'skill-card-type';
        // Translate type or capitalize
        const typeMap = {
            normal: '通常スキル',
            primary: 'メインスキル',
            secondary: 'サブスキル',
            ultimate: 'アルティメット'
        };
        type.textContent = typeMap[skill.type] || skill.type.toUpperCase();
        card.appendChild(type);

        // Description
        const desc = document.createElement('div');
        desc.className = 'skill-card-desc';
        desc.textContent = skill.description || 'No description available.';
        card.appendChild(desc);

        // Click Handler
        card.addEventListener('click', () => {
            hideSkillSelection();
            if (onSelectCallback) onSelectCallback(skill);
        });

        skillCardsContainer.appendChild(card);
    });

    skillModal.style.display = 'flex';
}

export function hideSkillSelection() {
    if (skillModal) {
        skillModal.style.display = 'none';
        skillCardsContainer.innerHTML = ''; // Cleanup
    }
}
