'use strict';

/**
 * boSeries.js — управление BO1/BO3/BO5 сериями матчей.
 *
 * Структура матча с серией (добавляется к существующему match-объекту):
 *
 * match.series = {
 *   format:    'BO1' | 'BO3' | 'BO5',  // формат серии
 *   winsNeeded: 1 | 2 | 3,             // побед для победы в серии
 *   games: [
 *     {
 *       gameNumber: 1,
 *       winner:     'Team A' | null,
 *       dotabuff:   'https://...' | null,
 *       playedAt:   ISO-строка | null,
 *     },
 *     ...
 *   ]
 * }
 *
 * Когда кто-то набирает winsNeeded побед — match.winner, match.scoreA/B,
 * match.status = 'finished' проставляются автоматически.
 */

const FORMATS = {
  BO1: { winsNeeded: 1, maxGames: 1 },
  BO3: { winsNeeded: 2, maxGames: 3 },
  BO5: { winsNeeded: 3, maxGames: 5 },
};

/**
 * Инициализировать серию для матча.
 * Мутирует match на месте, добавляя поле series.
 *
 * @param {object} match — матч из bracket
 * @param {'BO1'|'BO3'|'BO5'} format
 * @returns {object} match
 */
function initSeries(match, format) {
  if (!FORMATS[format]) throw new Error(`Неизвестный формат серии: ${format}. Допустимые: BO1, BO3, BO5`);
  match.series = {
    format,
    winsNeeded: FORMATS[format].winsNeeded,
    games: [],
  };
  return match;
}

/**
 * Получить текущий счёт серии.
 * @returns {{ winsA: number, winsB: number }}
 */
function getSeriesScore(series) {
  let winsA = 0, winsB = 0;
  for (const g of (series.games || [])) {
    if (g.winner === 'A') winsA++;
    else if (g.winner === 'B') winsB++;
  }
  return { winsA, winsB };
}

/**
 * Добавить результат одной карты серии.
 *
 * @param {object} match       — матч из bracket (мутируется)
 * @param {'A'|'B'} winnerSlot — 'A' (teamA) или 'B' (teamB)
 * @param {string|null} dotabuffUrl — ссылка на матч Dotabuff
 * @returns {{
 *   ok: boolean,
 *   game: object,
 *   seriesWinner: string|null,   — имя команды-победителя серии (если серия завершена)
 *   score: { winsA, winsB },
 *   gamesPlayed: number,
 *   error: string|null
 * }}
 */
function addGame(match, winnerSlot, dotabuffUrl = null) {
  if (!match.series) {
    return { ok: false, error: 'У матча не инициализирована серия. Используйте /setseries', game: null, seriesWinner: null, score: null, gamesPlayed: 0 };
  }

  const series = match.series;
  const { winsNeeded } = series;
  const maxGames = FORMATS[series.format]?.maxGames ?? 3;

  // Проверяем — серия ещё не завершена?
  const { winsA, winsB } = getSeriesScore(series);
  if (winsA >= winsNeeded || winsB >= winsNeeded) {
    return { ok: false, error: `Серия уже завершена (${winsA}:${winsB}). Матч закрыт.`, game: null, seriesWinner: null, score: { winsA, winsB }, gamesPlayed: series.games.length };
  }

  if (series.games.length >= maxGames) {
    return { ok: false, error: `Достигнут максимум карт (${maxGames}) для ${series.format}`, game: null, seriesWinner: null, score: { winsA, winsB }, gamesPlayed: series.games.length };
  }

  if (winnerSlot !== 'A' && winnerSlot !== 'B') {
    return { ok: false, error: `Некорректный победитель: "${winnerSlot}". Допустимые: A, B`, game: null, seriesWinner: null, score: null, gamesPlayed: series.games.length };
  }

  const game = {
    gameNumber: series.games.length + 1,
    winner:     winnerSlot,
    dotabuff:   dotabuffUrl || null,
    playedAt:   new Date().toISOString(),
  };
  series.games.push(game);

  // Пересчитываем счёт после добавления
  const newScore  = getSeriesScore(series);
  const teamWinner = newScore.winsA >= winsNeeded ? match.teamA
                   : newScore.winsB >= winsNeeded ? match.teamB
                   : null;

  // Если серия завершена — проставляем результат матча
  let seriesWinner = null;
  if (teamWinner) {
    seriesWinner     = teamWinner;
    match.winner     = teamWinner;
    match.scoreA     = newScore.winsA;
    match.scoreB     = newScore.winsB;
    match.status     = 'finished';
  } else {
    // Обновляем промежуточный счёт и статус
    match.scoreA = newScore.winsA;
    match.scoreB = newScore.winsB;
    match.status = 'live';
  }

  return {
    ok: true,
    game,
    seriesWinner,
    score: newScore,
    gamesPlayed: series.games.length,
    error: null,
  };
}

/**
 * Добавить Dotabuff-ссылку к конкретной карте серии.
 *
 * @param {object} match
 * @param {number} gameNumber — номер карты (1-based)
 * @param {string} url
 */
function addDotabuffToGame(match, gameNumber, url) {
  if (!match.series?.games) return { ok: false, error: 'Нет серии или карт' };
  const game = match.series.games.find(g => g.gameNumber === gameNumber);
  if (!game) return { ok: false, error: `Карта ${gameNumber} не найдена (сыграно ${match.series.games.length})` };
  game.dotabuff = url;
  return { ok: true, game };
}

/**
 * Сформатировать текущий счёт серии для Telegram.
 * Пример: "Alpha **2** — 1 Beta  (BO3, карта 3)"
 */
function formatSeriesStatus(match) {
  if (!match.series) return null;

  const { format, winsNeeded, games } = match.series;
  const { winsA, winsB } = getSeriesScore(match.series);
  const isFinished = winsA >= winsNeeded || winsB >= winsNeeded;
  const tA = match.teamA || 'TBD';
  const tB = match.teamB || 'TBD';

  let line;
  if (isFinished) {
    const winnerName = winsA >= winsNeeded ? tA : tB;
    line = `🏆 <b>${winnerName}</b> побеждает в серии ${winsA}:${winsB}`;
  } else {
    const aStr = winsA > winsB ? `<b>${winsA}</b>` : `${winsA}`;
    const bStr = winsB > winsA ? `<b>${winsB}</b>` : `${winsB}`;
    line = `${tA} ${aStr} — ${bStr} ${tB}`;
  }

  const gamesText = games.length > 0 ? ` · карта ${games.length + (isFinished ? 0 : 1)}/${format === 'BO1' ? 1 : format === 'BO3' ? 3 : 5}` : '';
  return `${line}  [${format}${gamesText}]`;
}

/**
 * Список сыгранных карт для /matchgames.
 */
function formatGamesList(match) {
  if (!match.series?.games?.length) {
    return `Карт пока нет.\n\nДобавить первую карту через /manage или /addgame`;
  }

  const { format, winsNeeded, games } = match.series;
  const { winsA, winsB } = getSeriesScore(match.series);
  const tA = match.teamA || 'A';
  const tB = match.teamB || 'B';

  const lines = games.map(g => {
    const winnerName = g.winner === 'A' ? tA : tB;
    const db = g.dotabuff ? `\n   📊 ${g.dotabuff}` : '';
    return `<b>Карта ${g.gameNumber}:</b> победил <b>${winnerName}</b>${db}`;
  });

  const summary = `Счёт: <b>${winsA}:${winsB}</b>`;
  const status  = (winsA >= winsNeeded || winsB >= winsNeeded)
    ? `\n🏆 Победитель серии: <b>${winsA >= winsNeeded ? tA : tB}</b>`
    : `\nОжидается карта ${games.length + 1}`;

  return `${format} — ${tA} vs ${tB}\n${summary}${status}\n\n${lines.join('\n')}`;
}

/**
 * Проверить, можно ли ещё добавить карты.
 */
function canAddMoreGames(match) {
  if (!match.series) return false;
  const { winsNeeded, games, format } = match.series;
  const maxGames = FORMATS[format]?.maxGames ?? 3;
  const { winsA, winsB } = getSeriesScore(match.series);
  return games.length < maxGames && winsA < winsNeeded && winsB < winsNeeded;
}

module.exports = {
  FORMATS,
  initSeries,
  getSeriesScore,
  addGame,
  addDotabuffToGame,
  formatSeriesStatus,
  formatGamesList,
  canAddMoreGames,
};
