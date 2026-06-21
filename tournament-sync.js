/* ============================================================
   tournament-sync.js — Синхронизация tournament.winner с сеткой
   ============================================================
   Тонкая обёртка над bracket-engine.js. Сам движок (bracket-engine.js)
   работает только с объектом bracket и ничего не знает о турнире
   целиком — это сделано намеренно, чтобы движок был независим от
   формата data.js. Этот файл — то самое связующее звено: принимает
   ВЕСЬ объект турнира (как он лежит в data.js), мутирует только
   tournament.winner (и только если у турнира есть bracket), не
   трогая остальные поля.

   Контракт поля winner НЕ меняется: оно остаётся той же строкой,
   которую сейчас читает фронт (index.html, tournament.html,
   organizer.js). Меняется только то, кто его заполняет:
   - турниры без bracket — winner продолжает быть ручным полем,
     этот файл их не трогает вообще;
   - турниры с bracket — winner вычисляется и пишется сюда
     автоматически при завершении финального матча сетки.

   Зависимость: bracket-engine.js должен быть загружен раньше
   (или передан явно через опцию engine, см. ниже) — как в Node,
   так и в браузере.
   ============================================================ */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node / CommonJS — берём bracket-engine как обычную зависимость.
    module.exports = factory(require('./bracket-engine.js'));
  } else {
    // Браузер — ожидаем, что bracket-engine.js уже подключён тегом
    // <script> раньше и положил BracketEngine в window.
    root.TournamentSync = factory(root.BracketEngine);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (BracketEngine) {
  'use strict';

  if (!BracketEngine) {
    throw new Error('tournament-sync.js требует bracket-engine.js — подключите его раньше этого файла');
  }

  /* ------------------------------------------------------------
     ВНУТРЕННЯЯ ЛОГИКА СИНХРОНИЗАЦИИ
     ------------------------------------------------------------ */

  /**
   * Пересчитывает tournament.winner из tournament.bracket и записывает
   * результат прямо в переданный объект турнира (мутация на месте —
   * как и у функций bracket-engine.js, никаких копий не создаётся).
   *
   * Поведение по полям:
   * - нет tournament.bracket вообще → ничего не делаем, winner не трогаем
   *   (legacy-турнир, поле заполняется человеком как раньше)
   * - tournament.bracket есть, но финал ещё не завершён → winner не трогаем
   *   (если там уже стояло пустое значение/незаполнено — оставляем как есть,
   *   если там стояло какое-то старое значение — тоже не трогаем: эта функция
   *   только ПОДТВЕРЖДАЕТ победителя по сетке, никогда не "обнуляет" вручную
   *   введённые данные на полпути)
   * - финал завершён и bracket даёт чёткого победителя → записываем его
   *   в tournament.winner (перезаписывая то, что там было — это и есть
   *   автоматизация, ради которой всё затевалось)
   *
   * @param {object} tournament - объект турнира из data.js (мутируется)
   * @returns {{ changed: boolean, winner: string|null, reason: string }}
   */
  function syncTournamentWinner(tournament) {
    if (!tournament || typeof tournament !== 'object') {
      return { changed: false, winner: null, reason: 'Передан некорректный объект турнира' };
    }

    if (!tournament.bracket) {
      return { changed: false, winner: tournament.winner ?? null, reason: 'У турнира нет bracket — legacy-режим, winner не трогаем' };
    }

    const computedWinner = BracketEngine.computeTournamentWinner(tournament.bracket);

    if (!computedWinner) {
      return { changed: false, winner: tournament.winner ?? null, reason: 'Финальный матч сетки ещё не завершён — winner не трогаем' };
    }

    const alreadyCorrect = tournament.winner === computedWinner;
    tournament.winner = computedWinner;

    return {
      changed: !alreadyCorrect,
      winner: computedWinner,
      reason: alreadyCorrect
        ? 'tournament.winner уже совпадал с результатом сетки'
        : 'tournament.winner обновлён по результату финального матча сетки',
    };
  }

  /**
   * Полный цикл на уровне турнира: обновляет счёт конкретного матча
   * через BracketEngine.reportMatchResult, и если это привело к
   * определению победителя всего турнира — сразу синхронизирует
   * tournament.winner. Это основная функция, которую будет вызывать
   * Telegram-бот (Этап 4 roadmap): один вызов — от ввода счёта до
   * актуального состояния турнира целиком, включая верхнеуровневое
   * поле winner, которое уже умеет читать весь существующий фронт.
   *
   * @param {object} tournament - объект турнира из data.js (мутируется)
   * @param {string} matchId
   * @param {number} scoreA
   * @param {number} scoreB
   * @param {object} [options] - передаётся как есть в reportMatchResult
   * @returns {{
   *   ok: boolean,
   *   match: object|null,
   *   winner: string|null,
   *   advanced: object|null,
   *   tournamentWinner: string|null,
   *   warning: string|null,
   *   error: string|null,
   *   syncResult: { changed: boolean, winner: string|null, reason: string } | null
   * }}
   */
  function reportTournamentMatchResult(tournament, matchId, scoreA, scoreB, options) {
    if (!tournament || !tournament.bracket) {
      return {
        ok: false, match: null, winner: null, advanced: null,
        tournamentWinner: null, warning: null,
        error: 'У турнира нет bracket — обновление матчей недоступно для legacy-турниров',
        syncResult: null,
      };
    }

    const result = BracketEngine.reportMatchResult(tournament.bracket, matchId, scoreA, scoreB, options);
    if (!result.ok) {
      return Object.assign({ syncResult: null }, result);
    }

    // reportMatchResult сам определяет tournamentWinner если это был финал,
    // но синхронизируем через syncTournamentWinner ради единого пути записи
    // в tournament.winner (а не дублирования логики "записать поле" в двух местах).
    const syncResult = syncTournamentWinner(tournament);

    return Object.assign({ syncResult }, result);
  }

  /**
   * Массовая синхронизация — пробегает по списку турниров (например,
   * по всему tournaments[] из data.js) и для каждого, у кого есть
   * bracket, пытается подтвердить/обновить winner. Полезно как
   * разовый скрипт миграции или как проверка целостности перед
   * коммитом в репозиторий — не предполагает регулярного использования
   * в проде (там winner синхронизируется точечно через
   * reportTournamentMatchResult в момент ввода счёта).
   *
   * @param {object[]} tournaments
   * @returns {Array<{ id: string, changed: boolean, winner: string|null, reason: string }>}
   */
  function syncAllTournaments(tournaments) {
    if (!Array.isArray(tournaments)) return [];
    return tournaments
      .filter(t => t && t.bracket)
      .map(t => {
        const result = syncTournamentWinner(t);
        return Object.assign({ id: t.id || null }, result);
      });
  }

  /* ------------------------------------------------------------
     ЭКСПОРТ
     ------------------------------------------------------------ */

  return {
    syncTournamentWinner,
    reportTournamentMatchResult,
    syncAllTournaments,
  };
});
