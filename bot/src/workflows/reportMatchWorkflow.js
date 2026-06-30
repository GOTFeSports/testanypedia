'use strict';

const { enqueueCommit } = require('../github/commitQueue');
const { buildJsMutateFn, findTournamentById } = require('../data/jsDataFile');
const { loadTournamentSync, loadBracketEngine } = require('../data/bracketEngineBridge');
const { logAction } = require('../activityLog/logger');
const { autoFillPrizes, isTournamentComplete } = require('./prizeAutoFill');
const REPO_PATHS = require('../github/repoPaths');
const log = require('../logger');

/**
 * Полный цикл обновления результата матча.
 *
 * @param {object} params
 * @param {string}  params.tournamentId
 * @param {string}  params.matchId
 * @param {number}  params.scoreA
 * @param {number}  params.scoreB
 * @param {number}  params.actorTelegramId
 * @param {string}  params.actorRole
 * @param {boolean} [params.force=false]  — разрешить перезапись завершённого матча (только супер-admin)
 *
 * @returns {Promise<{
 *   winner: string|null,
 *   advanced: object|null,
 *   tournamentWinner: string|null,
 *   warning: string|null,
 *   commitSha: string
 * }>}
 */
async function reportMatchWorkflow({
  tournamentId, matchId, scoreA, scoreB,
  actorTelegramId, actorRole,
  force = false,
}) {
  const TournamentSync = loadTournamentSync();
  const BE             = loadBracketEngine();

  let engineResult = null;

  const mutateFn = buildJsMutateFn(
    REPO_PATHS.DATA_JS,
    (tournaments) => {
      const tournament = findTournamentById(tournaments, tournamentId);
      if (!tournament) {
        throw new Error(`Турнир "${tournamentId}" не найден в data.js`);
      }
      if (!tournament.bracket) {
        throw new Error(`У турнира "${tournamentId}" нет сетки (bracket)`);
      }

      // Найти матч для предварительных проверок
      const match = BE.findMatchById(tournament.bracket, matchId);
      if (!match) {
        throw new Error(`Матч "${matchId}" не найден в сетке турнира "${tournamentId}"`);
      }

      // Защита от изменения завершённого матча без force
      if (match.match.status === 'finished' && !force) {
        throw new Error(
          `Матч "${matchId}" уже завершён (${match.match.scoreA}:${match.match.scoreB}, победитель: ${match.match.winner}). ` +
          `Для исправления используйте /forcematch.`
        );
      }

      // Защита от ввода счёта для матча с TBD
      if (BE.isPlaceholderTeam(match.match.teamA) || BE.isPlaceholderTeam(match.match.teamB)) {
        throw new Error(
          `Матч "${matchId}" содержит неопределённого соперника (TBD). ` +
          `Дождитесь завершения предыдущих матчей.`
        );
      }

      const result = TournamentSync.reportTournamentMatchResult(
        tournament,
        matchId,
        scoreA,
        scoreB,
      );

      if (!result.ok) {
        throw new Error(result.error || 'Неизвестная ошибка движка сетки');
      }

      let prizeResult = null;

      // Автоматическое определение призёров, если турнир только что завершился
      // (финальный матч стал finished с определённым победителем).
      // Срабатывает независимо от формата сетки — Single/Double Elimination,
      // Swiss+Playoff, Group+Playoff — extractSingleElimPlaces ищет isFinal
      // в любой не-Swiss/не-Group стадии.
      if (isTournamentComplete(tournament.bracket)) {
        const fillRes = autoFillPrizes(tournament);
        if (fillRes.filled) {
          prizeResult = fillRes;
          log.info({ tournamentId, places: fillRes.places }, 'reportMatchWorkflow: призёры автозаполнены');
        }
      }

      engineResult = {
        winner:           result.winner,
        advanced:         result.advanced,
        tournamentWinner: result.tournamentWinner,
        warning:          result.warning,
        prizesAutoFilled: prizeResult,
      };

      return tournaments;
    },
    force
      ? `forcematch: ${tournamentId}/${matchId} → ${scoreA}:${scoreB} [FORCE] (by tg:${actorTelegramId})`
      : `match: ${tournamentId}/${matchId} → ${scoreA}:${scoreB} (by tg:${actorTelegramId})`,
  );

  log.info({ tournamentId, matchId, scoreA, scoreB, force }, 'reportMatchWorkflow: коммит');

  const { commitSha } = await enqueueCommit(REPO_PATHS.DATA_JS, mutateFn);

  log.info({ tournamentId, matchId, commitSha }, 'reportMatchWorkflow: готово');

  try {
    await logAction({
      actorTelegramId,
      actorRole,
      action:     force ? 'match.force_updated' : 'match.updated',
      targetType: 'tournament',
      targetId:   tournamentId,
      details: {
        matchId, scoreA, scoreB, force,
        winner:           engineResult?.winner          ?? null,
        tournamentWinner: engineResult?.tournamentWinner ?? null,
        prizesAutoFilled: engineResult?.prizesAutoFilled?.places ?? null,
        commitSha,
      },
    });
  } catch (logErr) {
    log.error({ tournamentId, matchId, logErr: logErr.message }, 'reportMatchWorkflow: ошибка activity-log');
  }

  return { ...engineResult, commitSha };
}

module.exports = { reportMatchWorkflow };
