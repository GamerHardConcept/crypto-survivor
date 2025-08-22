function showScreen(screenId) {
    Object.values(dom.screens).forEach(screen => screen.classList.remove('active'));
    if (screenId && dom.screens[screenId]) {
        dom.screens[screenId].classList.add('active');
    }
}

function updateHud() {
    const humanPlayer = players[0];
    if (!humanPlayer) {
        dom.gameHud.classList.add('hidden');
        return;
    }
    dom.gameHud.classList.remove('hidden');

    dom.displays.playerLevel.textContent = humanPlayer.level;
    dom.displays.playerWallet.textContent = humanPlayer.wallet;
    dom.displays.topHealthBarFill.style.width = `${(humanPlayer.hp / humanPlayer.maxHp) * 100}%`;
    dom.displays.topHealthBarText.textContent = `${Math.ceil(humanPlayer.hp)} / ${Math.ceil(humanPlayer.maxHp)}`;
    dom.displays.gameTimer.textContent = formatTime(timers.game);
    dom.displays.xpBar.style.width = `${Math.min(100, (humanPlayer.xp / humanPlayer.xpToNextLevel) * 100)}%`;
    dom.displays.xpBarText.textContent = `${Math.floor(humanPlayer.xp)} / ${humanPlayer.xpToNextLevel}`;

    if (gameMode === 'survivor' && entities.bonusUpgrades.length > 0) {
        const bonus = entities.bonusUpgrades[0];
        dom.displays.bonusTimer.textContent = `+1: ${Math.ceil(bonus.lifespan / 1000)}s`;
        dom.displays.bonusTimer.classList.remove('hidden');
    } else {
        dom.displays.bonusTimer.classList.add('hidden');
    }
}

function displayShop() {
    dom.displays.shopWallet.innerHTML = `${globalWallet.toLocaleString()} $<span class="mvx-logo-inline">X</span>`;
    const container = dom.displays.shopItemsContainer;
    container.innerHTML = '';

    Object.keys(shopData).forEach(key => {
        const item = shopData[key];
        const currentLevel = permanentUpgrades[key];
        const maxLevel = item.levels.length;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';

        let actionHTML;
        if (currentLevel >= maxLevel) {
            actionHTML = `<div class="shop-item-action"><span>Niveau MAX</span></div>`;
        } else {
            const nextLevelInfo = item.levels[currentLevel];
            const canAfford = globalWallet >= nextLevelInfo.cost;
            actionHTML = `
                <div class="shop-item-action">
                    <button onclick="purchaseUpgrade('${key}')" ${canAfford ? '' : 'disabled'}>
                        ${nextLevelInfo.cost.toLocaleString()} $<span class="mvx-logo-inline">X</span>
                    </button>
                </div>
            `;
        }

        itemDiv.innerHTML = `
            <div class="shop-item-info">
                <strong>${item.icon} ${item.name}</strong>
                <p>Niveau: ${currentLevel} / ${maxLevel}</p>
                ${currentLevel < maxLevel ? `<p>Prochain: +${item.levels[currentLevel].bonus * 100}%</p>` : '<p>Bonus max atteint !</p>'}
            </div>
            ${actionHTML}
        `;
        container.appendChild(itemDiv);
    });
}

window.purchaseUpgrade = function(key) {
    const item = shopData[key];
    const currentLevel = permanentUpgrades[key];
    const maxLevel = item.levels.length;

    if (currentLevel < maxLevel) {
        const nextLevelInfo = item.levels[currentLevel];
        if (globalWallet >= nextLevelInfo.cost) {
            audioManager.play('purchase');
            globalWallet -= nextLevelInfo.cost;
            permanentUpgrades[key]++;
            saveGameState();
            displayShop(); // Refresh the shop UI
        }
    }
}


function setupCharacterSelection() {
    const container = dom.displays.charChoicesContainer;
    container.innerHTML = '';
    Object.keys(characterData).forEach(charName => {
        const char = characterData[charName];
        const button = document.createElement('button');
        button.className = 'char-button';
        const color = getComputedStyle(document.documentElement).getPropertyValue(char.colorVar);
        const iconClass = charName === 'MVX' ? 'char-icon mvx-logo-select' : 'char-icon';
        const iconSymbol = char.symbol;

        button.innerHTML = `
            <span class="${iconClass}" style="color:${color};">${iconSymbol}</span>
            <strong>${charName}</strong>
            <small>${char.specialName}</small>
        `;
        if (unlockedCharacters.includes(charName)) {
            button.onclick = () => startGame(charName);
        } else {
            button.classList.add('locked');
            button.title = "À débloquer en battant ce boss.";
        }
        container.appendChild(button);
    });
}

function applyUpgrade(option) {
    const humanPlayer = players[0];
    if (option.type === 'upgradeWeapon') {
        option.weapon.upgrade();
    } else if (option.type === 'newWeapon') {
        humanPlayer.weapons.push(weaponList[option.weaponKey].init(humanPlayer));
    } else if (option.type === 'passive') {
        passiveUpgrades[option.key].apply(humanPlayer, option.bonus);
        humanPlayer.acquiredPassives.push({ key: option.key, level: option.level, bonus: option.bonus });
    }
}

function displayLevelUpOptions() {
    const humanPlayer = players[0];
    const optionsContainer = dom.displays.levelUpOptions;
    optionsContainer.innerHTML = '';
    dom.buttons.confirmUpgrade.classList.add('hidden');
    selectedUpgrades = [];
    
    // --- Logique de génération des options (commune aux deux cas) ---
    const weaponUpgradeOptions = humanPlayer.weapons
        .filter(w => w.level < w.maxLevel)
        .map(w => ({ type: 'upgradeWeapon', weapon: w, name: weaponList[w.key].name, text: w.getUpgradeDescription(), level: w.level + 1 }));

    const newWeaponOptions = Object.keys(weaponList)
        .filter(key => !humanPlayer.weapons.some(w => w.key === key))
        .map(key => ({ type: 'newWeapon', weaponKey: key, name: weaponList[key].name, text: weaponList[key].description, level: 1 }));

    const passivePool = [];
    Object.keys(passiveUpgrades).forEach(key => {
        const upgradeInfo = passiveUpgrades[key];
        upgradeInfo.levels.forEach(levelInfo => {
            const option = {
                type: 'passive',
                key: key,
                ...levelInfo,
                name: `${upgradeInfo.name} (Niv. ${levelInfo.level})`,
                text: `Ajoute un bonus de +${(levelInfo.bonus * 100).toFixed(0)}%`
            };
            for (let i = 0; i < levelInfo.weight; i++) {
                passivePool.push(option);
            }
        });
    });

    let availableOptions = [...weaponUpgradeOptions, ...newWeaponOptions];
    if(passivePool.length > 0) {
        for (let i = passivePool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [passivePool[i], passivePool[j]] = [passivePool[j], passivePool[i]];
        }
        const uniquePassiveOptions = [];
        for(const option of passivePool) {
            if(!uniquePassiveOptions.some(o => o.key === option.key && o.level === option.level)) {
                uniquePassiveOptions.push(option);
            }
            if(uniquePassiveOptions.length >= 4) break; // On en prend un peu plus pour assurer 3 uniques
        }
        availableOptions.push(...uniquePassiveOptions);
    }

    availableOptions.sort(() => 0.5 - Math.random());
    const choiceCount = humanPlayer.level >= 40 ? 5 : 4;
    const chosenOptions = availableOptions.slice(0, choiceCount);
    
    // --- Logique de Bonus de Boss ---
    if (humanPlayer.isBonusLevelUp) {
        dom.displays.levelUpTitle.textContent = "BOSS VAINCU - BONUS !";
        dom.displays.levelUpSubtitle.textContent = `Vous obtenez les ${chosenOptions.length} améliorations suivantes gratuitement !`;

        if (chosenOptions.length === 0) {
            optionsContainer.innerHTML = `<p>Toutes les améliorations sont au maximum ! +500 $<span class="mvx-logo-inline">X</span> en compensation !</p>`;
            humanPlayer.wallet += 500;
        } else {
            chosenOptions.forEach(opt => {
                applyUpgrade(opt);
                const optionDiv = document.createElement('div');
                optionDiv.className = 'level-up-option disabled'; // Grisé car déjà appliqué
                optionDiv.dataset.level = Math.min(opt.level, 5);
                optionDiv.innerHTML = `<strong>${opt.name}</strong><p>${opt.text}</p>`;
                optionsContainer.appendChild(optionDiv);
            });
        }

        const continueButton = document.createElement('button');
        continueButton.className = 'action-button';
        continueButton.textContent = 'Continuer';
        continueButton.style.marginTop = '20px';
        continueButton.onclick = () => {
            updateAllUI();
            showScreen(null);
            gameState = 'running';
        };
        optionsContainer.appendChild(continueButton);

        humanPlayer.isBonusLevelUp = false; // Réinitialiser le flag
        showScreen('levelUp');
        return;
    }
    
    // --- Logique normale de Level Up ---
    if (humanPlayer.extraUpgradeCharges > 0) {
        humanPlayer.upgradesToPick = 2;
        humanPlayer.extraUpgradeCharges--;
        dom.displays.levelUpSubtitle.textContent = `Vous pouvez prendre DEUX améliorations :`;
    } else {
        humanPlayer.upgradesToPick = 1;
        dom.displays.levelUpSubtitle.textContent = `Choisissez UNE seule amélioration :`;
    }

    if (chosenOptions.length === 0) {
        createFloatingText("Maxed Out! +100$", humanPlayer.x, humanPlayer.y, 'gold');
        humanPlayer.wallet += 100;
        gameState = 'running';
        return;
    }

    chosenOptions.forEach(opt => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'level-up-option';
        optionDiv.dataset.level = Math.min(opt.level, 5);
        optionDiv.innerHTML = `<strong>${opt.name}</strong><p>${opt.text}</p>`;
        optionDiv.onclick = () => selectLevelUpOption(opt, optionDiv);
        optionsContainer.appendChild(optionDiv);
    });

    showScreen('levelUp');
}

function selectLevelUpOption(option, optionDiv) {
    const humanPlayer = players[0];
    if (selectedUpgrades.includes(option)) {
        // Deselect
        selectedUpgrades = selectedUpgrades.filter(item => item !== option);
        optionDiv.classList.remove('selected');
    } else {
        // Select
        if (selectedUpgrades.length < humanPlayer.upgradesToPick) {
            selectedUpgrades.push(option);
            optionDiv.classList.add('selected');
        }
    }

    if (selectedUpgrades.length === humanPlayer.upgradesToPick) {
        dom.buttons.confirmUpgrade.classList.remove('hidden');
    } else {
        dom.buttons.confirmUpgrade.classList.add('hidden');
    }
}

function updatePassiveUpgradesDisplay() {
     const humanPlayer = players[0];
     if (!humanPlayer) return;
     dom.displays.passiveUpgrades.innerHTML = '';

    const passiveDisplayData = {
        damage: { value: humanPlayer.globalDamageMultiplier, icon: passiveUpgrades.damage.icon, name: "Puissance de Feu" },
        range: { value: humanPlayer.projectileLifespanBonus, icon: passiveUpgrades.range.icon, name: "Long HODL" },
        xpGain: { value: humanPlayer.xpGainBonus, icon: passiveUpgrades.xpGain.icon, name: "Airdrop d'XP" }
    };

    Object.keys(passiveDisplayData).forEach(key => {
        const data = passiveDisplayData[key];
        const totalBonus = data.value;
        const baseValue = 1.0;

        if (Math.abs(totalBonus - baseValue) > 0.001) {
            const percentage = `+${Math.round((totalBonus - 1) * 100)}%`;
            
            const div = document.createElement('div');
            div.className = 'passive-upgrade-icon';
            div.innerHTML = `${data.icon} ${percentage}`;
            div.title = `${data.name} (${percentage})`;
            dom.displays.passiveUpgrades.appendChild(div);
        }
    });
}

function updateWeaponUI() {
    const humanPlayer = players[0];
    if (!humanPlayer) return;
    dom.displays.weaponUI.innerHTML = '';
    humanPlayer.weapons.forEach(w => {
        const weaponInfo = weaponList[w.key];
        const icon = weaponInfo ? weaponInfo.icon : '?';
        const div = document.createElement('div');
        div.className = 'weapon-icon';
        div.style.color = `var(--level-${Math.min(w.level, 5)}-color)`;
        div.innerHTML = `<span>${icon}</span> <span>${w.level}</span>`;
        div.title = `${weaponInfo.name} Niv. ${w.level}`;
        dom.displays.weaponUI.appendChild(div);
    });
}

function formatTime(s) {
    const minutes = Math.floor(s / 60).toString().padStart(2, '0');
    const seconds = Math.floor(s % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function createFloatingText(text, x, y, color) {
    const colorValue = color.startsWith('var') ? getComputedStyle(document.documentElement).getPropertyValue(color.replace(/var\(|\)/g, '')) : color;
    entities.floatingTexts.push(new FloatingText(text, x, y, colorValue));
}
