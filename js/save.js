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
