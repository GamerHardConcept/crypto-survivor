// WS: Fichier pour la gestion de l'interface utilisateur (UI)

function showScreen(screenId) {
    const gameHud = document.getElementById('game-hud');
    const isOverlay = ['level-up-screen', 'pause-screen', 'confirm-quit-screen', 'game-over-screen'].includes(screenId);

    // Cache tous les écrans sauf si c'est une superposition
    if (!isOverlay) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    }

    // Gère l'affichage du HUD
    if (screenId === 'game-hud' || isOverlay) {
        if (gameHud) gameHud.classList.add('active');
    } else {
        if (gameHud) gameHud.classList.remove('active');
    }

    const screenElement = document.getElementById(screenId);
    if (screenElement) {
        screenElement.classList.add('active');
    }

    gameState.currentScreen = screenId;
}

function updateHUD() {
    if (!gameState.player || gameState.currentScreen !== 'game') return;
    // Barres de vie et d'XP
    document.getElementById('top-health-bar-fill').style.width = `${(gameState.player.health / gameState.player.maxHealth) * 100}%`;
    document.getElementById('top-health-bar-text').textContent = `${Math.ceil(gameState.player.health)} / ${gameState.player.maxHealth}`;
    document.getElementById('xp-bar').style.width = `${(gameState.player.xp / gameState.player.xpToNextLevel) * 100}%`;
    document.getElementById('xp-bar-text').textContent = `${gameState.player.xp} / ${gameState.player.xpToNextLevel}`;

    // Stats
    document.getElementById('player-level').textContent = gameState.player.level;
    document.getElementById('player-wallet').textContent = gameState.player.money;
    document.getElementById('game-timer').textContent = `${Math.floor(gameState.gameTime / 60).toString().padStart(2, '0')}:${(Math.floor(gameState.gameTime) % 60).toString().padStart(2, '0')}`;
}

function getUpgradeOptions() {
    const player = gameState.player;
    let options = [];

    // Options d'amélioration pour les armes et passifs existants
    player.weapons.forEach(w => {
        if (w.level < w.maxLevel) options.push({ type: 'upgrade', item: w });
    });
    Object.values(player.passiveUpgrades).forEach(p => {
        if (p.level < p.maxLevel) options.push({ type: 'upgrade', item: p });
    });

    // Options pour de nouvelles armes si le joueur a moins de 6 armes
    if (player.weapons.length < 6) {
        const available = Object.values(weapons).filter(wData => !player.weapons.some(w => w.id === wData.id));
        options.push(...available.map(wData => ({ type: 'new', item: wData })));
    }

    // Options pour de nouveaux passifs si le joueur a moins de 6 passifs
    if (Object.keys(player.passiveUpgrades).length < 6) {
        const available = Object.values(passiveUpgrades).filter(pData => !player.passiveUpgrades[pData.id]);
        options.push(...available.map(pData => ({ type: 'new', item: pData })));
    }

    // Filtrer les options en double (ne devrait pas arriver avec cette logique, mais par sécurité)
    options = options.filter((option, index, self) => 
        index === self.findIndex((o) => (
            o.item.id === option.item.id
        ))
    );

    // Mélanger et sélectionner 3 ou 4 options
    const shuffled = options.sort(() => 0.5 - Math.random());
    let finalOptions = shuffled.slice(0, player.luck > 1.2 ? 4 : 3);

    // Si aucune option, proposer de l'or ou un poulet
    if (finalOptions.length === 0) {
        finalOptions.push({ type: 'gold' });
        finalOptions.push({ type: 'chicken' });
    }

    return finalOptions;
}

function showLevelUpOptions() {
    showScreen('level-up-screen');
    gameState.isPaused = true;
    const optionsContainer = document.getElementById('level-up-options');
    optionsContainer.innerHTML = '';

    const upgradeOptions = getUpgradeOptions();

    upgradeOptions.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'level-up-option';

        let icon, name, levelText, description;

        switch (option.type) {
            case 'upgrade':
            case 'new':
                const item = option.item;
                const currentLevel = option.type === 'new' ? 0 : item.level;
                const nextLevel = currentLevel + 1;
                const isWeapon = !!item.dps;
                
                icon = item.icon;
                name = item.name;
                levelText = `Niv. ${nextLevel}`;
                description = isWeapon ? item.description(nextLevel) : item.description;
                break;
            case 'gold':
                icon = '💰';
                name = 'Bourse de 25 Or';
                levelText = 'Consommable';
                description = 'Ajoute 25 pièces d\'or à votre pécule.';
                break;
            case 'chicken':
                icon = '🍗';
                name = 'Poulet Rôti';
                levelText = 'Consommable';
                description = 'Restaure 30% de vos points de vie maximum.';
                break;
        }

        optionDiv.innerHTML = `
            <div class="upgrade-icon">${icon}</div>
            <div class="upgrade-info">
                <div class="upgrade-name">${name} <span class="level-tag">${levelText}</span></div>
                <div class="upgrade-desc">${description}</div>
            </div>
        `;

        optionDiv.onclick = () => {
            gameState.player.applyUpgrade(option);
            gameState.isPaused = false;
            showScreen('game-hud');
            gameLoop(lastTime);
        };

        optionsContainer.appendChild(optionDiv);
    });
}

function updateWeaponDisplay() {
    const container = document.getElementById('weapon-display-ui');
    if (!container || !gameState.player) return;
    container.innerHTML = '<h3>Armes</h3>';
    gameState.player.weapons.forEach(w => {
        container.innerHTML += `<div class="hud-icon">${w.name} <span class="level-tag">${w.level}</span></div>`;
    });
}

function updatePassiveDisplay() {
    const container = document.getElementById('passive-upgrades-display');
    if (!container || !gameState.player) return;
    container.innerHTML = '<h3>Passifs</h3>';
    for (const key in gameState.player.passiveUpgrades) {
        const p = gameState.player.passiveUpgrades[key];
        container.innerHTML += `<div class="hud-icon">${p.name} <span class="level-tag">${p.level}</span></div>`;
    }
}

function updateShop() {
    const container = document.getElementById('shop-items-container');
    const moneyDisplay = document.getElementById('shop-wallet-display');
    if (!container || !moneyDisplay) return;

    container.innerHTML = '';
    moneyDisplay.innerHTML = `${saveData.money} <span class="mvx-logo-inline">X</span>`;

    permanentUpgrades.forEach(upgrade => {
        const currentLevel = saveData.permanentUpgrades[upgrade.id] || 0;
        const cost = upgrade.cost(currentLevel);
        const canAfford = saveData.money >= cost;

        const item = document.createElement('div');
        item.className = `shop-item ${!canAfford || currentLevel >= upgrade.maxLevel ? 'disabled' : ''}`;
        item.innerHTML = `
            <div class="shop-item-name">${upgrade.name} (Niv. ${currentLevel}/${upgrade.maxLevel})</div>
            <div class="shop-item-desc">${upgrade.description}</div>
            <div class="shop-item-bonus">Bonus: +${(upgrade.bonus * 100).toFixed(0)}% par niveau</div>
            <button class="action-button" ${!canAfford || currentLevel >= upgrade.maxLevel ? 'disabled' : ''}>
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
    const container = document.getElementById('character-choices-container');
    if (!container) return;
    container.innerHTML = '';

    Object.values(characters).forEach(charData => {
        const isUnlocked = saveData.unlockedCharacters.includes(charData.id);

        const charDiv = document.createElement('div');
        charDiv.className = 'char-button-container';

        const charButton = document.createElement('button');
        charButton.className = 'char-button';
        charButton.style.setProperty('--char-color', charData.color);

        if (isUnlocked) {
            charButton.innerHTML = `
                <div class="char-icon">${charData.iconHTML}</div>
                <div class="char-name">${charData.name}</div>
                <div class="char-sub-name">${charData.subName}</div>
            `;
            charButton.onclick = () => startGame(charData.id);
        } else {
            charButton.classList.add('locked');
            charButton.innerHTML = `
                <div class="char-icon">?</div>
                <div class="char-name">${charData.unlockCondition}</div>
            `;
            charButton.disabled = true;
        }

        charDiv.appendChild(charButton);
        container.appendChild(charDiv);
    });
}

function updateSpecialAbilityButton() {
    const btn = document.getElementById('special-ability-button');
    if (!btn || !gameState.player || !gameState.player.special) return;

    if (gameState.player.special.cooldownTimer > 0) {
        btn.classList.add('on-cooldown');
        btn.textContent = Math.ceil(gameState.player.special.cooldownTimer);
    } else {
        btn.classList.remove('on-cooldown');
        btn.textContent = '🚀'; // Icône par défaut
    }
}

function updateWaitingRoom(game) {
    const playerList = document.getElementById('player-list');
    const gameIdDisplay = document.getElementById('game-id-display');
    const startMultiplayerGameButton = document.getElementById('start-multiplayer-game-button');

    if (!playerList || !gameIdDisplay || !startMultiplayerGameButton) return;

    // Mettre à jour l'ID de la partie
    gameIdDisplay.textContent = game.id;

    // Mettre à jour la liste des joueurs
    playerList.innerHTML = '';
    game.players.forEach((player, index) => {
        const playerItem = document.createElement('li');
        playerItem.textContent = `${player.name} ${index === 0 ? '(Hôte)' : ''}`;
        playerList.appendChild(playerItem);
    });

    // Mettre à jour le nombre de joueurs
    const playerCountDisplay = document.querySelector('#waiting-room-screen h3');
    if (playerCountDisplay) {
        playerCountDisplay.textContent = `Joueurs (${game.players.length}/4)`;
    }

    // Activer le bouton de démarrage si assez de joueurs
    // Note: La logique exacte dépendra si le créateur est le seul à pouvoir lancer
    startMultiplayerGameButton.disabled = game.players.length < 2;
}
