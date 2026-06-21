'use strict';

const { enqueueCommit } = require('../github/commitQueue');
const { buildJsMutateFn, findTournamentById } = require('../data/jsDataFile');
const { loadTournamentSync } = require('../data/bracketEngineBridge');
const { logAction } = require('../activityLog/logger');
const REPO_PATHS = require('../github/repoPaths');
const log = require('../logger');

async function reportMatchWorkflow({ tournamentId, matchId, scoreA, scoreB, actorTelegramId, actorRole }) {
  const TournamentSync = loadTournamentSync();
  let engineResult = null;

  const mutateFn = buildJsMutateFn(
    REPO_PATHS.DATA_JS,
    (tournaments) => {
      const tournament = findTournamentById(tournaments, tournamentId);
      if (!tournament) throw new Error(`Турнир "${tournamentId}" не найден в data.js`);
      if (!tournament.bracket) throw new Error(`У турнира "${tournamentId}" нет сетки (bracket)`);

      const result = TournamentSync.reportTournamentMatchResult(tournament, matchId, scoreA, scoreB);
      if (!result.ok) throw new Error(result.error || 'Ошибка движка сетки');

      engineResult = {
        winner:           result.winner,
        advanced:         result.advanced,
        tournamentWinner: result.tournamentWinner,
        warning:          result.warning,
      };
      return tournaments;
    },
    `match: ${tournamentId}/${matchId} → ${scoreA}:${scoreB} (by tg:${actorTelegramId})`,
  );

  log.info({ tournamentId, matchId, scoreA, scoreB }, 'reportMatchWorkflow: коммит');
  const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);
  log.info({ tournamentId, matchId, commitSha }, 'reportMatchWorkflow: готово');

  try {
    await logAction({
      actorTelegramId, actorRole,
      action: 'match.updated', targetType: 'tournament', targetId: tournamentId,
      details: { matchId, scoreA, scoreB, winner: engineResult?.winner, commitSha },
    });
  } catch (logErr) {
    log.error({ logErr: logErr.message }, 'reportMatchWorkflow: ошибка activity-log (коммит уже выполнен)');
  }

  return { ...engineResult, commitSha };
}

module.exports = { reportMatchWorkflow };