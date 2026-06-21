'use strict';

const path = require('path');
// bot/src/data/ → три уровня вверх → корень репо
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

let BracketEngine = null;
let TournamentSync = null;

function loadBracketEngine() {
  if (!BracketEngine) {
    try {
      BracketEngine = require(path.join(REPO_ROOT, 'bracket-engine.js'));
    } catch (err) {
      throw new Error(`bracketEngineBridge: не найден bracket-engine.js в "${REPO_ROOT}". Ошибка: ${err.message}`);
    }
  }
  return BracketEngine;
}

function loadTournamentSync() {
  if (!TournamentSync) {
    try {
      TournamentSync = require(path.join(REPO_ROOT, 'tournament-sync.js'));
    } catch (err) {
      throw new Error(`bracketEngineBridge: не найден tournament-sync.js в "${REPO_ROOT}". Ошибка: ${err.message}`);
    }
  }
  return TournamentSync;
}

module.exports = { loadBracketEngine, loadTournamentSync };