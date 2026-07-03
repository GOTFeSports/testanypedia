'use strict';

/**
 * prizeAutoFill.js — автоматическое определение призёров.
 *
 * ПРАВИЛО: заполняем только те позиции prizePool которые УЖЕ существуют в массиве.
 * Если prizePool пуст или не содержит позиции — не создаём фиктивные места.
 * Если prizePool содержит только 1 место — заполняем только победителя.
 *
 * Это предотвращает ситуацию когда организатор задал только 1 место в призовых,
 * а бот автоматически создаёт фиктивные 2 и 3 место.
 */

function isTournamentComplete(bracket) {
  if (!bracket?.stages?.length) return false;
  return bracket.stages.flatMap(s => s.matches || [])
    .some(m => m.isFinal && m.status === 'finished' && m.winner);
}

/**
 * Определить призовые места из Single Elimination / Playoff части.
 * Возвращает Map<place_number, team_name>.
 */
function extractSingleElimPlaces(bracket) {
  const places = new Map();

  // Ищем финальный матч (isFinal=true в не-Swiss, не-Group стадии)
  let finalMatch = null;
  for (const stage of bracket.stages) {
    if (stage.isSwiss || stage.isGroup) continue;
    const fin = (stage.matches || []).find(m => m.isFinal && m.status === 'finished' && m.winner);
    if (fin) { finalMatch = fin; break; }
  }

  if (!finalMatch) return places;

  places.set(1, finalMatch.winner);
  places.set(2, finalMatch.winner === finalMatch.teamA ? finalMatch.teamB : finalMatch.teamA);

  // 3/4 место
  const finalRound  = finalMatch.round ?? 1;
  let   stage3rd    = null;
  for (const stage of bracket.stages) {
    if (stage.isSwiss || stage.isGroup) continue;
    const bronzeMatch = (stage.matches || []).find(m => m.isBronze && m.status === 'finished' && m.winner);
    if (bronzeMatch) {
      places.set(3, bronzeMatch.winner);
      places.set(4, bronzeMatch.winner === bronzeMatch.teamA ? bronzeMatch.teamB : bronzeMatch.teamA);
      stage3rd = true;
      break;
    }
    if (!stage3rd) {
      const semis = (stage.matches || []).filter(m =>
        (m.round ?? 1) === finalRound - 1 && m.status === 'finished' && m.winner
      );
      if (semis.length >= 1) {
        semis.forEach((sf, i) => {
          const loser = sf.winner === sf.teamA ? sf.teamB : sf.teamA;
          if (loser) places.set(3 + i, loser);
        });
        stage3rd = true;
      }
    }
  }

  return places;
}

/**
 * Определить призовые из Double Elimination.
 */
function extractDoubleElimPlaces(bracket) {
  const places = new Map();

  const gf = bracket.stages.flatMap(s => s.matches || [])
    .find(m => m.isFinal && m.status === 'finished' && m.winner);
  if (!gf) return places;

  places.set(1, gf.winner);
  places.set(2, gf.winner === gf.teamA ? gf.teamB : gf.teamA);

  const lbStage = bracket.stages.find(s => s.name?.toLowerCase().includes('lower'));
  if (lbStage) {
    const lbFin = [...(lbStage.matches || [])]
      .filter(m => m.status === 'finished' && m.winner)
      .sort((a, b) => (b.round ?? 0) - (a.round ?? 0))[0];
    if (lbFin) {
      const loser = lbFin.winner === lbFin.teamA ? lbFin.teamB : lbFin.teamA;
      if (loser && loser !== places.get(2)) places.set(3, loser);
    }
  }

  return places;
}

/**
 * Автоматически заполнить prizePool.team для существующих позиций.
 *
 * @param {object} tournament — мутируется
 * @returns {{ filled: boolean, places: object, message: string }}
 */
function autoFillPrizes(tournament) {
  const bracket = tournament.bracket;
  if (!bracket?.stages?.length) return { filled: false, places: {}, message: 'Нет bracket' };

  // Определяем призовые места из сетки
  let placesMap;
  if (bracket.type === 'double') {
    placesMap = extractDoubleElimPlaces(bracket);
  } else {
    placesMap = extractSingleElimPlaces(bracket);
  }

  if (!placesMap.size) return { filled: false, places: {}, message: 'Не удалось определить призёров из сетки' };

  if (!Array.isArray(tournament.prizePool)) tournament.prizePool = [];

  let filled = 0;
  const placesObj = {};

  for (const [place, team] of placesMap) {
    placesObj[place] = team;

    // ТОЛЬКО если позиция УЖЕ существует в prizePool — заполняем team
    // Не создаём новые позиции которых организатор не добавлял
    const existing = tournament.prizePool.find(p => p.place === place);
    if (existing && !existing.team) {
      existing.team = team;
      filled++;
    }
    // Специальный случай: если prizePool пуст — всё равно записываем 1 место
    // (минимальная запись о победителе)
    if (!existing && place === 1 && tournament.prizePool.length === 0) {
      tournament.prizePool.push({ place: 1, amount: '', team });
      filled++;
    }
  }

  // Обновляем tournament.winner
  if (placesMap.has(1) && !tournament.winner) {
    tournament.winner = placesMap.get(1);
  }

  return {
    filled: filled > 0,
    places: placesObj,
    message: filled > 0
      ? Object.entries(placesObj).map(([p,t]) => `${p} место — ${t}`).join(', ')
      : 'Призовые позиции уже заполнены или не заданы в prizePool',
  };
}

module.exports = { autoFillPrizes, isTournamentComplete, extractSingleElimPlaces, extractDoubleElimPlaces };
