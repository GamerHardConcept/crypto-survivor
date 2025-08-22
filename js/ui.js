// WS: Fichier pour la gestion de l'interface utilisateur (UI)

function showScreen(screenId) {
    // WS: Cache tous les écrans en retirant la classe 'active'
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // WS: Affiche l'écran demandé en ajoutant la classe 'active'
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
        screenToShow.classList.add('active');
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

function showLevelUpOptions() {
    showScreen('level-up');
    gameState.isPaused = true;
    const optionsContainer = document.getElementById('level-up-options');
    optionsContainer.innerHTML = '';

    // Logique de sélection des améliorations (simplifiée pour la démo)
    const availableUpgrades = [...weapons, ...passiveUpgrades].filter(u => {
        // Filtrer les améliorations déjà au max
        return true; 
    });

    const chosenUpgrades = [];
    while (chosenUpgrades.length < 3 && availableUpgrades.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
        chosenUpgrades.push(availableUpgrades.splice(randomIndex, 1)[0]);
    }

    chosenUpgrades.forEach(upgradeData => {
        const option = document.createElement('div');
        option.className = 'level-up-option';
        const isWeapon = !!upgradeData.dps;
        const level = 1; // Placeholder

        option.innerHTML = `
            <div class="upgrade-icon">${upgradeData.icon || '✨'}</div>
            <div class="upgrade-name">${upgradeData.name} <span class="level-tag">Niv. ${level}</span></div>
            <div class="upgrade-desc">${upgradeData.description}</div>
        `;
        option.onclick = () => {
            // TODO: Appliquer l'amélioration
            showScreen('game');
            gameState.isPaused = false;
            gameLoop(lastTime);
        };
        optionsContainer.appendChild(option);
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
    for (const charId in characters) {
        const charData = characters[charId];
        // Pour la démo, tous les personnages sont débloqués
        const isUnlocked = true; // saveData.unlockedCharacters.includes(charId);

        const charDiv = document.createElement('div');
        // WS: Utilisation de la classe 'char-button' pour correspondre au CSS et simplification de la structure HTML.
        charDiv.className = `char-button ${isUnlocked ? '' : 'locked'}`;
        charDiv.innerHTML = `
            <div class="character-icon" style="background-color: ${charData.color};"></div>
            <strong>${charData.name}</strong>
            <small>${charData.description}</small>
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
