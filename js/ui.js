// WS: Fichier pour la gestion de l'interface utilisateur (UI)

function showScreen(screenId) {
    // WS: Cache tous les écrans
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });

    // WS: Affiche l'écran demandé seulement s'il existe
    if (screenId && document.getElementById(screenId)) {
        document.getElementById(screenId).style.display = 'flex';
    }
    gameState.currentScreen = screenId;
}

function updateHUD() {
    if (!gameState.player) return;
    document.getElementById('hp-bar').style.width = `${(gameState.player.health / gameState.player.maxHealth) * 100}%`;
    document.getElementById('hp-text').textContent = `${Math.round(gameState.player.health)} / ${gameState.player.maxHealth}`;
    document.getElementById('xp-bar').style.width = `${(gameState.player.xp / gameState.player.xpToNextLevel) * 100}%`;
    document.getElementById('xp-text').textContent = `Niv. ${gameState.player.level}`;
    document.getElementById('timer').textContent = `${Math.floor(gameState.gameTime / 60)}:${(Math.floor(gameState.gameTime) % 60).toString().padStart(2, '0')}`;
    document.getElementById('kill-count').textContent = `Kills: ${gameState.killCount}`;
    document.getElementById('money-hud').innerHTML = `${saveData.money} <span class="mvx-logo-inline">X</span>`;
}

function showLevelUpOptions() {
    const optionsContainer = document.getElementById('level-up-options');
    optionsContainer.innerHTML = '';

    const availableUpgrades = allUpgrades.filter(u => {
        const existingWeapon = gameState.player.weapons.find(w => w.constructor.name === u.constructor.name);
        if (existingWeapon) return existingWeapon.level < 5; // Limite de niveau
        
        const existingPassive = gameState.player.passiveUpgrades[u.id];
        if (existingPassive) return existingPassive.level < u.maxLevel;

        // Ne pas proposer d'arme si le joueur en a déjà 6
        if (!(u instanceof BonusUpgrade) && gameState.player.weapons.length >= 6) return false;

        return true;
    });

    const chosenUpgrades = [];
    while (chosenUpgrades.length < 3 && availableUpgrades.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
        chosenUpgrades.push(availableUpgrades[randomIndex]);
        availableUpgrades.splice(randomIndex, 1);
    }

    chosenUpgrades.forEach(upgrade => {
        const option = document.createElement('div');
        option.className = 'level-up-option';
        
        const existing = gameState.player.weapons.find(w => w.constructor.name === upgrade.constructor.name) || gameState.player.passiveUpgrades[upgrade.id];
        const level = existing ? existing.level : 0;

        option.innerHTML = `
            <div class="upgrade-icon">${upgrade.icon || '✨'}</div>
            <div class="upgrade-name">${upgrade.name} <span class="level-tag">Niv. ${level + 1}</span></div>
            <div class="upgrade-desc">${upgrade.description}</div>
            <div class="upgrade-info">${existing ? existing.getUpgradeInfo() : ''}</div>
        `;
        option.onclick = () => {
            if (upgrade instanceof BonusUpgrade) {
                gameState.player.addPassive(upgrade);
            } else {
                gameState.player.addWeapon(Object.create(upgrade));
            }
            showScreen('game');
            gameState.isPaused = false;
            gameLoop(); // Relancer la boucle
        };
        optionsContainer.appendChild(option);
    });
}

function updateWeaponDisplay() {
    const container = document.getElementById('weapon-display');
    container.innerHTML = '';
    gameState.player.weapons.forEach(w => {
        container.innerHTML += `<div class="hud-icon">${w.icon} <span class="level-tag">${w.level}</span></div>`;
    });
}

function updatePassiveDisplay() {
    const container = document.getElementById('passive-display');
    container.innerHTML = '';
    for (const key in gameState.player.passiveUpgrades) {
        const p = gameState.player.passiveUpgrades[key];
        container.innerHTML += `<div class="hud-icon">${p.icon || '✨'} <span class="level-tag">${p.level}</span></div>`;
    }
}

function updateShop() {
    const container = document.getElementById('permanent-upgrades-container');
    container.innerHTML = '';
    document.getElementById('shop-money').innerHTML = `${saveData.money} <span class="mvx-logo-inline">X</span>`;

    permanentUpgrades.forEach(upgrade => {
        const currentLevel = saveData.permanentUpgrades[upgrade.id] || 0;
        const cost = upgrade.cost(currentLevel);
        const canAfford = saveData.money >= cost;

        const item = document.createElement('div');
        item.className = `shop-item ${canAfford ? '' : 'disabled'}`;
        item.innerHTML = `
            <div class="shop-item-name">${upgrade.name} (Niv. ${currentLevel})</div>
            <div class="shop-item-desc">${upgrade.description}</div>
            <div class="shop-item-bonus">Bonus actuel: +${(upgrade.bonus * currentLevel * 100).toFixed(0)}%</div>
            <button class="shop-buy-btn" ${!canAfford || currentLevel >= upgrade.maxLevel ? 'disabled' : ''}>
                ${currentLevel >= upgrade.maxLevel ? 'MAX' : `Acheter: ${cost} <span class="mvx-logo-inline">X</span>`}
            </button>
        `;

        if (canAfford && currentLevel < upgrade.maxLevel) {
            item.querySelector('button').onclick = () => {
                saveData.money -= cost;
                saveData.permanentUpgrades[upgrade.id] = currentLevel + 1;
                saveGameData();
                updateShop();
            };
        }
        container.appendChild(item);
    });
}

function populateCharacterSelection() {
    const container = document.getElementById('character-selection');
    container.innerHTML = '';
    for (const charId in characters) {
        const charData = characters[charId];
        const isUnlocked = saveData.unlockedCharacters.includes(charId);

        const charDiv = document.createElement('div');
        charDiv.className = `char-card ${isUnlocked ? '' : 'locked'}`;
        charDiv.innerHTML = `
            <div class="char-name">${charData.name}</div>
            <div class="char-icon" style="background-color:${charData.color}"></div>
            <div class="char-desc">${charData.description}</div>
            <div class="char-stats">
                HP: ${charData.hp} | Vit: ${charData.speed} | Dmg: ${charData.damage*100}%
            </div>
            <div class="char-weapon">Arme: ${allUpgrades.find(u=>u.constructor.name === charData.baseWeapon).name}</div>
            ${!isUnlocked ? `<div class="lock-overlay">BLOQUÉ</div>` : ''}
        `;
        if (isUnlocked) {
             charDiv.onclick = () => {
                startGame(charId);
            };
        }
        container.appendChild(charDiv);
    }
}

function updateSpecialAbilityButton() {
    const btn = document.getElementById('special-ability-btn');
    if (gameState.player && gameState.player.specialAbility) {
        btn.style.display = 'block';
        const special = gameState.player.specialAbility;
        if (special.timer > 0) {
            btn.classList.add('on-cooldown');
            btn.textContent = Math.ceil(special.timer);
        } else {
            btn.classList.remove('on-cooldown');
            btn.textContent = special.name;
        }
    } else {
        btn.style.display = 'none';
    }
}
