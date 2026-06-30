'use strict';

/**
 * prizeAutoFill.js — автоматическое определение призёров после завершения турнира.
 *
 * Поддерживаемые форматы:
 *   Single Elimination — 1/2/3 место из финала и полуфиналов
 *   Double Elimination — 1/2/3 из Grand Final и Lower Final
 *   Swiss+Playoff — делегируем в SE/DE логику для playoff части
 *
 * Мутирует tournament.prizePool[].team напрямую.
 * Вызывается из reportMatchWorkflow после завершения финального матча.
 */

/**
 * Попытаться автоматически заполнить prizePool после завершения турнира.
 *
 * @param {object} tournament — объект турнира из data.js (мутируется)
 * @returns {{ filled: boolean, places: object, message: string }}
 */
function autoFillPrizes(tournament) {
  const bracket = tournament.bracket;
  if (!bracket?.stages?.length) {
    return { filled: false, places: {}, message: 'Нет bracket' };
  }

  let places = {};

  if (bracket.type === 'double') {
    places = extractDoubleElimPlaces(bracket);
  } else {
    // single, multi, group+playoff — ищем SE-подобную playoff часть
    places = extractSingleElimPlaces(bracket);
  }

  if (!Object.keys(places).length) {
    return { filled: false, places: {}, message: 'Не удалось определить призёров из сетки' };
  }

  // Записываем в prizePool
  if (!Array.isArray(tournament.prizePool)) tournament.prizePool = [];

  let filled = 0;
  for (const [place, team] of Object.entries(places)) {
    const placeNum = parseInt(place, 10);
    const existing = tournament.prizePool.find(p => p.place === placeNum);
    if (existing) {
      if (!existing.team) { existing.team = team; filled++; }
    } else {
      tournament.prizePool.push({ place: placeNum, amount: '', team });
      filled++;
    }
  }

  // Также обновляем tournament.winner (1 место)
  if (places[1] && !tournament.winner) {
    tournament.winner = places[1];
  }

  return {
    filled: filled > 0,
    places,
    message: filled > 0
      ? `Призёры определены: ${Object.entries(places).map(([p,t])=>`${p} место — ${t}`).join(', ')}`
      : 'Призёры уже были заполнены',
  };
}

/**
 * Определить призёров из Single Elimination bracket (или playoff части multi-bracket).
 * Ищет матч с isFinal=true и полуфиналы (матчи предыдущего раунда).
 */
function extractSingleElimPlaces(bracket) {
  const places = {};

  // Ищем финальный матч
  let finalMatch = null;
  let finalStage = null;

  for (const stage of bracket.stages) {
    if (stage.isSwiss || stage.isGroup) continue;
    for (const m of (stage.matches || [])) {
      if (m.isFinal && m.status === 'finished' && m.winner) {
        finalMatch = m;
        finalStage = stage;
        break;
      }
    }
    if (finalMatch) break;
  }

  if (!finalMatch) return places;

  // 1 место — победитель финала
  places[1] = finalMatch.winner;
  // 2 место — проигравший финала
  places[2] = finalMatch.winner === finalMatch.teamA ? finalMatch.teamB : finalMatch.teamA;

  // 3 место — ищем матч за 3 место (isBronze) или проигравших полуфиналов
  const bronzeMatch = (finalStage?.matches || []).find(m => m.isBronze && m.status === 'finished' && m.winner);
  if (bronzeMatch) {
    places[3] = bronzeMatch.winner;
    places[4] = bronzeMatch.winner === bronzeMatch.teamA ? bronzeMatch.teamB : bronzeMatch.teamA;
  } else {
    // Находим полуфиналы: предыдущий раунд финала
    const finalRound = finalMatch.round ?? 1;
    const semiFinals = (finalStage?.matches || []).filter(m =>
      (m.round ?? 1) === finalRound - 1 && m.status === 'finished' && m.winner
    );
    if (semiFinals.length >= 2) {
      const losers = semiFinals.map(m => m.winner === m.teamA ? m.teamB : m.teamA).filter(Boolean);
      if (losers.length >= 1) places[3] = losers[0];
      if (losers.length >= 2) places[4] = losers[1];
    } else if (semiFinals.length === 1) {
      const loser = semiFinals[0].winner === semiFinals[0].teamA
        ? semiFinals[0].teamB : semiFinals[0].teamA;
      if (loser) places[3] = loser;
    }
  }

  return places;
}

/**
 * Определить призёров из Double Elimination bracket.
 * 1 — победитель Grand Final
 * 2 — проигравший Grand Final
 * 3 — проигравший Lower Final
 */
function extractDoubleElimPlaces(bracket) {
  const places = {};

  // Grand Final
  const gfMatch = bracket.stages
    .flatMap(s => s.matches || [])
    .find(m => m.isFinal && m.status === 'finished' && m.winner);

  if (!gfMatch) return places;

  places[1] = gfMatch.winner;
  places[2] = gfMatch.winner === gfMatch.teamA ? gfMatch.teamB : gfMatch.teamA;

  // Lower Final — ищем lb-final или матч перед GF в Lower Bracket
  const lbStage = bracket.stages.find(s => s.name?.includes('Lower'));
  if (lbStage) {
    const lbFinal = [...(lbStage.matches || [])]
      .filter(m => m.status === 'finished' && m.winner)
      .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))[0];
    if (lbFinal) {
      const lbLoser = lbFinal.winner === lbFinal.teamA ? lbFinal.teamB : lbFinal.teamA;
      if (lbLoser && lbLoser !== places[2]) places[3] = lbLoser;
    }
  }

  return places;
}

/**
 * Проверить завершён ли турнир (финальный матч сыгран).
 */
function isTournamentComplete(bracket) {
  if (!bracket?.stages?.length) return false;
  return bracket.stages
    .flatMap(s => s.matches || [])
    .some(m => m.isFinal && m.status === 'finished' && m.winner);
}

module.exports = { autoFillPrizes, isTournamentComplete, extractSingleElimPlaces, extractDoubleElimPlaces };
