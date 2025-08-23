// gamedata.js
// Données globales exposées sur window pour éviter les doubles déclarations.

// ==== Personnages (nom attendu par l'UI : characterData) ====
window.characterData = {
    MVX:  { id:'MVX', name:'MVX',  subName:'Roquette HODL', icon:'X', color:'#00f5d4', hp:100, speed:200, damage:1.0, baseWeapon:'FomoGun',           unlockCost:0 },
    AVAX: { id:'AVAX',name:'AVAX', subName:'Avalanche',     icon:'A', color:'#e84142', hp:90,  speed:210, damage:0.9, baseWeapon:'ConeGun',           unlockCost:1000 },
    ETH:  { id:'ETH', name:'ETH',  subName:'Gas Burn',      icon:'♦', color:'#627eea', hp:80,  speed:220, damage:0.8, baseWeapon:'SpiralGun',         unlockCost:1000 },
    SOL:  { id:'SOL', name:'SOL',  subName:'Network Haste', icon:'S', color:'#9945FF', hp:70,  speed:250, damage:1.2, baseWeapon:'LaserGun',          unlockCost:2000 },
    AAVE: { id:'AAVE',name:'AAVE', subName:'Flash Loan',    icon:'👻', color:'#B6509E',hp:120, speed:180, damage:0.7, baseWeapon:'LifeStealAura',     unlockCost:1500 },
    BTC:  { id:'BTC', name:'BTC',  subName:'Digital Gold',  icon:'B', color:'#f7931a', hp:150, speed:170, damage:1.3, baseWeapon:'FomoGun',           unlockCost:5000 },
    GRT:  { id:'GRT', name:'GRT',  subName:'Indexing',      icon:'G', color:'#6f4cff', hp:85,  speed:210, damage:1.0, baseWeapon:'HomingMissileLauncher', unlockCost:2500 },
    DOGE: { id:'DOGE',name:'DOGE', subName:'Much Wow',      icon:'D', color:'#c3a634', hp:60,  speed:230, damage:0.6, baseWeapon:'WildShotgun',       unlockCost:500 },
    CRO:  { id:'CRO', name:'CRO',  subName:'Cronos Chain',  icon:'C', color:'#0c1b42', hp:90,  speed:200, damage:0.8, baseWeapon:'ScalingGun',        unlockCost:1200 },
    ZIL:  { id:'ZIL', name:'ZIL',  subName:'Sharding',      icon:'Z', color:'#49c6ad', hp:75,  speed:220, damage:0.7, baseWeapon:'MultiShotgun',      unlockCost:1800 },
    BNB:  { id:'BNB', name:'BNB',  subName:'Smart Chain',   icon:'N', color:'#f0b90b', hp:95,  speed:205, damage:1.1, baseWeapon:'ChainReactionGun',  unlockCost:3000 },
    HTM:  { id:'HTM', name:'HTM',  subName:'Liquid Stake',  icon:'H', color:'#ff8a5c', hp:110, speed:190, damage:0.9, baseWeapon:'AcidPoolLauncher',  unlockCost:2200 },
  };
  
  // ==== Boutique (nom attendu par l'UI : shopData) ====
  // levels = tableau d'objets { bonus, cost } pour chaque niveau
  function buildLevels(max, bonusPerLvl, baseCost) {
    const arr = [];
    for (let i = 0; i < max; i++) {
      arr.push({ bonus: bonusPerLvl, cost: baseCost * (i + 1) });
    }
    return arr;
  }
  
  window.shopData = {
    perm_hp:     { icon: '❤', name: 'HP Max',  levels: buildLevels(10, 0.10, 100) },
    perm_speed:  { icon: '🏃', name: 'Vitesse', levels: buildLevels(5,  0.05, 150) },
    perm_damage: { icon: '💥', name: 'Dégâts',  levels: buildLevels(10, 0.08, 200) },
    perm_luck:   { icon: '🍀', name: 'Chance',  levels: buildLevels(5,  0.05, 300) },
  };
  
  // ==== Progression achetée (objet clé -> niveau) ====
  // IMPORTANT : n'utilise pas "const/let permanentUpgrades =" ailleurs.
  // On réutilise l'existant si présent pour éviter "already been declared".
  window.permanentUpgrades = window.permanentUpgrades || {
    perm_hp: 0,
    perm_speed: 0,
    perm_damage: 0,
    perm_luck: 0,
  };
  
  // ==== Persos débloqués (pour la sélection) ====
  window.unlockedCharacters = window.unlockedCharacters || ['MVX'];
  
  // ==== Vagues ennemies ====
  // (tu peux adapter librement ; UI non dépendante)
  window.waves = [
    { interval: 3.0, count:  5, types: ['normal'] },                 // 0–30s
    { interval: 2.5, count:  8, types: ['normal'] },                 // 30–60s
    { interval: 2.5, count: 10, types: ['normal','normal','tank'] }, // 1:00–1:30
    { interval: 2.0, count: 15, types: ['normal','tank'] },          // 1:30–2:00
    { interval: 2.0, count: 15, types: ['normal','tank','miniboss'] },// 2:00–2:30
    { interval: 1.5, count: 20, types: ['normal','tank'] },          // 2:30–3:00
    { interval: 1.0, count: 30, types: ['normal','tank','miniboss'] } // 3:00+
  ];
  