// WS: Fichier pour la sauvegarde et le chargement des données

let saveData = {
    money: 0,
    permanentUpgrades: {},
    unlockedCharacters: ['MVX'],
};

function saveGameData() {
    try {
        localStorage.setItem('cryptoSurvivorSave', JSON.stringify(saveData));
    } catch (e) {
        console.error("Impossible de sauvegarder les données :", e);
    }
}

function loadGameData() {
    try {
        const saved = localStorage.getItem('cryptoSurvivorSave');
        if (saved) {
            const loadedData = JSON.parse(saved);
            // Fusionner les données chargées avec les données par défaut pour éviter les erreurs
            saveData = { ...saveData, ...loadedData };
            // S'assurer que les sous-objets existent
            saveData.permanentUpgrades = saveData.permanentUpgrades || {};
            saveData.unlockedCharacters = saveData.unlockedCharacters || ['MVX'];
        } else {
            // Si aucune sauvegarde n'existe, on crée une sauvegarde initiale
            saveGameData();
        }
    } catch (e) {
        console.error("Impossible de charger les données :", e);
        // En cas d'erreur, on utilise les données par défaut
        saveGameData();
    }
}
// --- Ponts & synchro globals <-> saveData ---

// crée les globals s'ils n'existent pas
window.globalWallet        = window.globalWallet        ?? 0;
window.permanentUpgrades   = window.permanentUpgrades   || {};
window.unlockedCharacters  = window.unlockedCharacters  || ['MVX'];

// push des globals vers saveData
function syncGlobalsToSave() {
  saveData.money               = Number(window.globalWallet) || 0;
  saveData.permanentUpgrades   = { ...saveData.permanentUpgrades, ...window.permanentUpgrades };
  saveData.unlockedCharacters  = Array.isArray(window.unlockedCharacters)
    ? [...new Set(window.unlockedCharacters)]
    : ['MVX'];
}

// pull de saveData vers globals
function syncSaveToGlobals() {
  window.globalWallet       = Number(saveData.money) || 0;
  window.permanentUpgrades  = { ...window.permanentUpgrades, ...saveData.permanentUpgrades };
  window.unlockedCharacters = Array.isArray(saveData.unlockedCharacters) && saveData.unlockedCharacters.length
    ? saveData.unlockedCharacters
    : ['MVX'];
}

// expose les noms attendus par le reste du code
window.loadGameState = window.loadGameState || function () {
  loadGameData();      // -> remplit saveData depuis localStorage
  syncSaveToGlobals(); // -> met à jour globalWallet / permanentUpgrades / unlockedCharacters
};

window.saveGameState = window.saveGameState || function () {
  syncGlobalsToSave(); // -> copie les globals courants dans saveData
  saveGameData();      // -> persiste dans localStorage
};

// chargement au démarrage (facultatif ici, utile si appelé tôt)
try { window.loadGameState(); } catch (e) { console.warn('loadGameState init', e); }
