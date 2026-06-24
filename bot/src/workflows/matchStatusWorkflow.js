'use strict';

const { enqueueCommit } = require('../github/commitQueue');
const { buildJsMutateFn, findTournamentById } = require('../data/jsDataFile');
const { loadBracketEngine } = require('../data/bracketEngineBridge');
const { logAction } = require('../activityLog/logger');
const REPO_PATHS = require('../github/repoPaths');
const log = require('../logger');

/**
 * Найти матч внутри объекта турнира.
 * Возвращает ссылку на объект матча (мутируется in-place).
 */
function findMatchInTournament(tournament, matchId) {
  if (!tournament.bracket?.stages) return null;
  for (const stage of tournament.bracket.stages) {
    for (const match of (stage.matches || [])) {
      if (match.id === matchId) return match;
    }
  }
  return null;
}

/**
 * Изменить статус матча: scheduled → live.
 * Запрещено если матч уже finished.
 */
async function startMatchWorkflow({ tournamentId, matchId, actorTelegramId, actorRole }) {
  let matchSnapshot = null;

  const mutateFn = buildJsMutateFn(
    REPO_PATHS.DATA_JS,
    (tournaments) => {
      const tournament = findTournamentById(tournaments, tournamentId);
      if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);
      if (!tournament.bracket) throw new Error(`У турнира "${tournamentId}" нет сетки`);

      const match = findMatchInTournament(tournament, matchId);
      if (!match) throw new Error(`Матч "${matchId}" не найден в сетке турнира "${tournamentId}"`);
      if (match.status === 'finished') throw new Error(`Матч "${matchId}" уже завершён — изменение статуса невозможно`);
      if (match.status === 'live')     throw new Error(`Матч "${matchId}" уже идёт`);

      // Проверка TBD — нельзя запускать матч если соперники не определены
      const BE = loadBracketEngine();
      if (BE.isPlaceholderTeam(match.teamA) || BE.isPlaceholderTeam(match.teamB)) {
        throw new Error(`Нельзя запустить матч "${matchId}" — один или оба соперника ещё не определены (TBD)`);
      }

      match.status = 'live';
      matchSnapshot = { ...match };
      return tournaments;
    },
    `startmatch: ${tournamentId}/${matchId} → live (by tg:${actorTelegramId})`,
  );

  const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
  log.info({ tournamentId, matchId, commitSha }, 'startMatchWorkflow: матч запущен');

  try {
    await logAction({
      actorTelegramId, actorRole,
      action: 'match.started', targetType: 'tournament', targetId: tournamentId,
      details: { matchId, commitSha },
    });
  } catch (logErr) {
    log.error({ logErr: logErr.message }, 'startMatchWorkflow: ошибка activity-log');
  }

  return { match: matchSnapshot, commitSha };
}

/**
 * Изменить статус матча: live → finished.
 * Используется если счёт уже внесён через /match, но статус не сменился
 * (например матч застрял в live из-за ничьей).
 * Требует чтобы winner уже был определён (счёт не равный).
 */
async function endMatchWorkflow({ tournamentId, matchId, actorTelegramId, actorRole }) {
  let matchSnapshot = null;

  const mutateFn = buildJsMutateFn(
    REPO_PATHS.DATA_JS,
    (tournaments) => {
      const tournament = findTournamentById(tournaments, tournamentId);
      if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден`);

      const match = findMatchInTournament(tournament, matchId);
      if (!match) throw new Error(`Матч "${matchId}" не найден`);
      if (match.status === 'finished') throw new Error(`Матч "${matchId}" уже завершён`);
      if (match.status === 'scheduled') throw new Error(`Матч "${matchId}" ещё не запущен (scheduled). Сначала введите счёт через /match`);

      if (!match.winner) {
        throw new Error(
          `У матча "${matchId}" нет победителя (счёт ${match.scoreA}:${match.scoreB} — ничья или не введён). ` +
          `Введите счёт через /match перед завершением.`
        );
      }

      match.status = 'finished';
      matchSnapshot = { ...match };
      return tournaments;
    },
    `endmatch: ${tournamentId}/${matchId} → finished (by tg:${actorTelegramId})`,
  );

  const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
  log.info({ tournamentId, matchId, commitSha }, 'endMatchWorkflow: матч завершён');

  try {
    await logAction({
      actorTelegramId, actorRole,
      action: 'match.finished', targetType: 'tournament', targetId: tournamentId,
      details: { matchId, winner: matchSnapshot?.winner, commitSha },
    });
  } catch (logErr) {
    log.error({ logErr: logErr.message }, 'endMatchWorkflow: ошибка activity-log');
  }

  return { match: matchSnapshot, commitSha };
}

module.exports = { startMatchWorkflow, endMatchWorkflow, findMatchInTournament };
