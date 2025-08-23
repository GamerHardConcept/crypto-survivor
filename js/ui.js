/* =========================
   ui.js — contrôles UI & écrans
   ========================= */

// Espace global DOM (cache de références)
window.dom = window.dom || {};
dom.screens    = dom.screens    || {};
dom.containers = dom.containers || {};
dom.displays   = dom.displays   || {};
dom.buttons    = dom.buttons    || {};

/* ---------- Outils d’écrans ---------- */

window.showScreen = window.showScreen || function (id) {
  Object.values(dom.screens).forEach(s => s.classList.remove('active'));
  if (id && dom.screens[id]) dom.screens[id].classList.add('active');
};

window.hideAllScreens = window.hideAllScreens || function () {
  Object.values(dom.screens).forEach(s => s.classList.remove('active'));
};

window.showMainMenu = window.showMainMenu || function () {
  showScreen('main-menu-screen');
};

/* ---------- HUD & affichages en jeu ---------- */

function updateHud() {
  const humanPlayer = window.players?.[0];
  if (!humanPlayer) {
    dom.gameHud?.classList?.add('hidden');
    return;
  }
  dom.gameHud?.classList?.remove('hidden');

  dom.displays.playerLevel && (dom.displays.playerLevel.textContent = humanPlayer.level);
  dom.displays.playerWallet && (dom.displays.playerWallet.textContent = humanPlayer.wallet);
  dom.displays.topHealthBarFill && (dom.displays.topHealthBarFill.style.width = `${(humanPlayer.hp / humanPlayer.maxHp) * 100}%`);
  dom.displays.topHealthBarText && (dom.displays.topHealthBarText.textContent = `${Math.ceil(humanPlayer.hp)} / ${Math.ceil(humanPlayer.maxHp)}`);
  dom.displays.gameTimer && (dom.displays.gameTimer.textContent = formatTime(window.timers?.game ?? 0));
  dom.displays.xpBar && (dom.displays.xpBar.style.width = `${Math.min(100, (humanPlayer.xp / humanPlayer.xpToNextLevel) * 100)}%`);
  dom.displays.xpBarText && (dom.displays.xpBarText.textContent = `${Math.floor(humanPlayer.xp)} / ${humanPlayer.xpToNextLevel}`);

  // Harmonisé avec main.js -> 'survival'
  if (window.gameMode === 'survival' && window.entities?.bonusUpgrades?.length > 0) {
    const bonus = window.entities.bonusUpgrades[0];
    if (dom.displays.bonusTimer) {
      dom.displays.bonusTimer.textContent = `+1: ${Math.ceil(bonus.lifespan / 1000)}s`;
      dom.displays.bonusTimer.classList.remove('hidden');
    }
  } else {
    dom.displays.bonusTimer?.classList?.add('hidden');
  }
}

/* ---------- Boutique ---------- */

function displayShop() {
  if (dom.displays.shopWallet) {
    dom.displays.shopWallet.innerHTML = `${(window.globalWallet ?? 0).toLocaleString()} $<span class="mvx-logo-inline">X</span>`;
  }
  const container = dom.displays.shopItemsContainer;
  if (!container) return;

  container.innerHTML = '';

  Object.keys(window.shopData || {}).forEach(key => {
    const item = window.shopData[key];
    const currentLevel = (window.permanentUpgrades?.[key] ?? 0);
    const maxLevel = item.levels.length;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'shop-item';

    let actionHTML;
    if (currentLevel >= maxLevel) {
      actionHTML = `<div class="shop-item-action"><span>Niveau MAX</span></div>`;
    } else {
      const nextLevelInfo = item.levels[currentLevel];
      const canAfford = (window.globalWallet ?? 0) >= nextLevelInfo.cost;
      actionHTML = `
        <div class="shop-item-action">
          <button ${canAfford ? '' : 'disabled'} data-purchase="${key}">
            ${nextLevelInfo.cost.toLocaleString()} $<span class="mvx-logo-inline">X</span>
          </button>
        </div>`;
    }

    itemDiv.innerHTML = `
      <div class="shop-item-info">
        <strong>${item.icon} ${item.name}</strong>
        <p>Niveau: ${currentLevel} / ${maxLevel}</p>
        ${
          currentLevel < maxLevel
            ? `<p>Prochain: +${Math.round(item.levels[currentLevel].bonus * 100)}%</p>`
            : '<p>Bonus max atteint !</p>'
        }
      </div>
      ${actionHTML}
    `;
    container.appendChild(itemDiv);
  });

  // Délégation (évite les onclick inline)
  container.onclick = (e) => {
    const key = e.target?.getAttribute?.('data-purchase');
    if (!key) return;
    purchaseUpgrade(key);
  };
}

window.purchaseUpgrade = function (key) {
  const item = window.shopData?.[key];
  if (!item) return;

  const currentLevel = (window.permanentUpgrades?.[key] ?? 0);
  const maxLevel = item.levels.length;

  if (currentLevel < maxLevel) {
    const nextLevelInfo = item.levels[currentLevel];
    if ((window.globalWallet ?? 0) >= nextLevelInfo.cost) {
      window.audioManager?.play?.('purchase');
      window.globalWallet -= nextLevelInfo.cost;
      window.permanentUpgrades[key] = currentLevel + 1;
      window.saveGameState?.();
      displayShop();
    }
  }
};

/* ---------- Sélection de personnage ---------- */

function setupCharacterSelection() {
  const container = dom.displays.charChoicesContainer;
  if (!container) return;

  container.innerHTML = '';

  Object.keys(window.characterData || {}).forEach(charName => {
    const char = window.characterData[charName];
    const button = document.createElement('button');
    button.className = 'char-button';

    const iconClass = charName === 'MVX' ? 'char-icon mvx-logo-select' : 'char-icon';

    button.innerHTML = `
      <span class="${iconClass}" style="color:${char.color};">${char.icon}</span>
      <div class="char-name">${char.name}</div>
      <div class="char-sub-name">${char.subName}</div>
    `;

    if ((window.unlockedCharacters || []).includes(charName)) {
      // Démarre en mode survival (main.js attend 'survival')
      button.onclick = () => window.startGame?.('survival', charName);
    } else {
      button.classList.add('locked');
      button.title = "À débloquer en battant ce boss.";
    }

    container.appendChild(button);
  });
}

/* ---------- Level up (inchangé, sécurisés) ---------- */

function applyUpgrade(option) {
  const humanPlayer = window.players?.[0];
  if (!humanPlayer) return;

  if (option.type === 'upgradeWeapon') {
    option.weapon.upgrade();
  } else if (option.type === 'newWeapon') {
    humanPlayer.weapons.push(window.weaponList[option.weaponKey].init(humanPlayer));
  } else if (option.type === 'passive') {
    window.passiveUpgrades[option.key].apply(humanPlayer, option.bonus);
    humanPlayer.acquiredPassives.push({ key: option.key, level: option.level, bonus: option.bonus });
  }
}

function displayLevelUpOptions() {
  const humanPlayer = window.players?.[0];
  if (!humanPlayer) return;

  const optionsContainer = dom.displays.levelUpOptions;
  if (!optionsContainer) return;

  optionsContainer.innerHTML = '';
  dom.buttons?.confirmUpgrade?.classList?.add('hidden');
  window.selectedUpgrades = [];

  const weaponUpgradeOptions = humanPlayer.weapons
    .filter(w => w.level < w.maxLevel)
    .map(w => ({ type: 'upgradeWeapon', weapon: w, name: window.weaponList[w.key].name, text: w.getUpgradeDescription(), level: w.level + 1 }));

  const newWeaponOptions = Object.keys(window.weaponList || {})
    .filter(key => !humanPlayer.weapons.some(w => w.key === key))
    .map(key => ({ type: 'newWeapon', weaponKey: key, name: window.weaponList[key].name, text: window.weaponList[key].description, level: 1 }));

  const passivePool = [];
  Object.keys(window.passiveUpgrades || {}).forEach(key => {
    const upgradeInfo = window.passiveUpgrades[key];
    upgradeInfo.levels.forEach(levelInfo => {
      const option = {
        type: 'passive',
        key,
        ...levelInfo,
        name: `${upgradeInfo.name} (Niv. ${levelInfo.level})`,
        text: `Ajoute un bonus de +${(levelInfo.bonus * 100).toFixed(0)}%`
      };
      for (let i = 0; i < levelInfo.weight; i++) passivePool.push(option);
    });
  });

  let availableOptions = [...weaponUpgradeOptions, ...newWeaponOptions];
  if (passivePool.length > 0) {
    for (let i = passivePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passivePool[i], passivePool[j]] = [passivePool[j], passivePool[i]];
    }
    const uniquePassiveOptions = [];
    for (const option of passivePool) {
      if (!uniquePassiveOptions.some(o => o.key === option.key && o.level === option.level)) {
        uniquePassiveOptions.push(option);
      }
      if (uniquePassiveOptions.length >= 4) break;
    }
    availableOptions.push(...uniquePassiveOptions);
  }

  availableOptions.sort(() => 0.5 - Math.random());
  const choiceCount = humanPlayer.level >= 40 ? 5 : 4;
  const chosenOptions = availableOptions.slice(0, choiceCount);

  // Bonus de boss
  if (humanPlayer.isBonusLevelUp) {
    dom.displays.levelUpTitle && (dom.displays.levelUpTitle.textContent = "BOSS VAINCU - BONUS !");
    dom.displays.levelUpSubtitle && (dom.displays.levelUpSubtitle.textContent = `Vous obtenez les ${chosenOptions.length} améliorations suivantes gratuitement !`);

    if (chosenOptions.length === 0) {
      optionsContainer.innerHTML = `<p>Toutes les améliorations sont au maximum ! +500 $<span class="mvx-logo-inline">X</span> en compensation !</p>`;
      humanPlayer.wallet += 500;
    } else {
      chosenOptions.forEach(opt => {
        applyUpgrade(opt);
        const optionDiv = document.createElement('div');
        optionDiv.className = 'level-up-option disabled';
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
      window.updateAllUI?.();
      showScreen(null);
      window.gameState = 'running';
    };
    optionsContainer.appendChild(continueButton);

    humanPlayer.isBonusLevelUp = false;
    showScreen('levelUp');
    return;
  }

  // Cas normal
  if (humanPlayer.extraUpgradeCharges > 0) {
    humanPlayer.upgradesToPick = 2;
    humanPlayer.extraUpgradeCharges--;
    dom.displays.levelUpSubtitle && (dom.displays.levelUpSubtitle.textContent = `Vous pouvez prendre DEUX améliorations :`);
  } else {
    humanPlayer.upgradesToPick = 1;
    dom.displays.levelUpSubtitle && (dom.displays.levelUpSubtitle.textContent = `Choisissez UNE seule amélioration :`);
  }

  if (chosenOptions.length === 0) {
    window.createFloatingText?.("Maxed Out! +100$", humanPlayer.x, humanPlayer.y, 'gold');
    humanPlayer.wallet += 100;
    window.gameState = 'running';
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
  const humanPlayer = window.players?.[0];
  if (!humanPlayer) return;

  window.selectedUpgrades = window.selectedUpgrades || [];

  if (window.selectedUpgrades.includes(option)) {
    window.selectedUpgrades = window.selectedUpgrades.filter(item => item !== option);
    optionDiv.classList.remove('selected');
  } else {
    if (window.selectedUpgrades.length < humanPlayer.upgradesToPick) {
      window.selectedUpgrades.push(option);
      optionDiv.classList.add('selected');
    }
  }

  if (window.selectedUpgrades.length === humanPlayer.upgradesToPick) {
    dom.buttons?.confirmUpgrade?.classList?.remove('hidden');
  } else {
    dom.buttons?.confirmUpgrade?.classList?.add('hidden');
  }
}

/* ---------- Petits utilitaires ---------- */

function formatTime(s) {
  const minutes = Math.floor(s / 60).toString().padStart(2, '0');
  const seconds = Math.floor(s % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function createFloatingText(text, x, y, color) {
  const colorValue = String(color).startsWith('var')
    ? getComputedStyle(document.documentElement).getPropertyValue(color.replace(/var\(|\)/g, ''))
    : color;
  window.entities?.floatingTexts?.push(new window.FloatingText(text, x, y, colorValue));
}

/* ---------- Initialisation UI ---------- */

window.updateGameUI = window.updateGameUI || function () {
  updateHud();
};

window.initUI = window.initUI || function () {
  // Indexer tous les écrans
  dom.screens = {};
  document.querySelectorAll('.screen').forEach(s => dom.screens[s.id] = s);

  // Références affichages courants (si présents dans le DOM)
  dom.gameHud                       = document.getElementById('game-hud');
  dom.displays.playerLevel          = document.getElementById('player-level');
  dom.displays.playerWallet         = document.getElementById('player-wallet');
  dom.displays.topHealthBarFill     = document.getElementById('top-health-bar-fill');
  dom.displays.topHealthBarText     = document.getElementById('top-health-bar-text');
  dom.displays.gameTimer            = document.getElementById('game-timer');
  dom.displays.xpBar                = document.getElementById('xp-bar');
  dom.displays.xpBarText            = document.getElementById('xp-bar-text');
  dom.displays.bonusTimer           = document.getElementById('bonus-timer');

  dom.displays.charChoicesContainer = document.getElementById('character-choices-container');
  dom.displays.shopWallet           = document.getElementById('shop-wallet-display');
  dom.displays.shopItemsContainer   = document.getElementById('shop-items-container');

  dom.displays.levelUpOptions       = document.getElementById('level-up-options');
  dom.displays.levelUpTitle         = document.getElementById('level-up-title');
  dom.displays.levelUpSubtitle      = document.getElementById('level-up-subtitle');

  dom.displays.passiveUpgrades      = document.getElementById('passive-upgrades-display');
  dom.displays.weaponUI             = document.getElementById('weapon-display-ui');

  // Conteneur utilisé par main.js (safe fallback)
  dom.containers = dom.containers || {};
  dom.containers.gameUi             = document.getElementById('game-hud') || document.body;

  // Boutons utiles
  dom.buttons.confirmUpgrade        = document.getElementById('confirm-upgrade-button');

  // Brancher les boutons de navigation
  const startBtn       = document.getElementById('start-game-button');
  const backFromChar   = document.getElementById('back-to-menu-from-char-select-button');
  const shopBtn        = document.getElementById('shop-button');
  const backFromShop   = document.getElementById('back-to-menu-button');

  startBtn?.addEventListener('click', () => {
    setupCharacterSelection();
    showScreen('character-selection-screen');
  });

  backFromChar?.addEventListener('click', () => showScreen('main-menu-screen'));

  shopBtn?.addEventListener('click', () => {
    displayShop();
    showScreen('shop-screen');
  });

  backFromShop?.addEventListener('click', () => showScreen('main-menu-screen'));
};
