/* ============================================================
   bracket-engine.js — Движок продвижения победителей по сетке
   ============================================================
   Чистые JS-функции без зависимостей от DOM, без Telegram-бота,
   без сети. Работают напрямую со структурой tournament.bracket
   (см. data.js — поле bracket у турнира).

   Назначение:
   - обновить счёт конкретного матча
   - определить победителя матча автоматически (scoreA>scoreB → teamA, и т.д.)
   - продвинуть победителя в следующий матч сетки (single elimination)
   - пересчитать финальный winner всего турнира из последнего матча

   Эти функции — основа для будущего Telegram-бота (Этап 6 roadmap),
   но уже сейчас могут использоваться где угодно: в консоли, в
   скриптах миграции data.js, в тестах. Никакого побочного состояния —
   все функции принимают bracket и возвращают новый/изменённый bracket,
   не читают global tournaments[] и не трогают DOM.

   Совместимость со схемой:
   bracket: {
     type: "single" | "double" | "group",
     stages: [
       {
         name: "1/4 финала",
         matches: [
           {
             id: "m1",
             round: 1,
             isFinal: false,
             teamA: "Team A",
             teamB: "Team B",
             scoreA: 0,
             scoreB: 0,
             status: "scheduled" | "live" | "finished",
             winner: null | "Team A" | "Team B",
             scheduledAt: "2026-06-21T12:00:00+03:00",

             // НОВЫЕ опциональные поля (если их нет — работает позиционный
             // фолбэк, см. resolveAdvancement ниже):
             nextMatchId: "m-final",      // id матча, в который продвигается победитель
             nextMatchSlot: "A"           // "A" или "B" — в какой слот вписать победителя
           }
         ]
       }
     ]
   }
   ============================================================ */

(function (root) {
  'use strict';

  /* ------------------------------------------------------------
     ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ПОИСКА ВНУТРИ BRACKET
     ------------------------------------------------------------ */

  /** Список всех матчей всех стадий, с привязкой к stageIndex для удобства. */
  function flattenMatches(bracket) {
    const stages = Array.isArray(bracket && bracket.stages) ? bracket.stages : [];
    const out = [];
    stages.forEach((stage, stageIndex) => {
      (stage.matches || []).forEach((match, matchIndex) => {
        out.push({ stageIndex, matchIndex, stage, match });
      });
    });
    return out;
  }

  /** Найти матч по id в любой стадии. Возвращает {stageIndex, matchIndex, stage, match} | null. */
  function findMatchById(bracket, matchId) {
    if (!matchId) return null;
    const all = flattenMatches(bracket);
    return all.find(entry => entry.match.id === matchId) || null;
  }

  /* ------------------------------------------------------------
     ВЫЧИСЛЕНИЕ ПОБЕДИТЕЛЯ МАТЧА
     ------------------------------------------------------------ */

  /**
   * Названия-плейсхолдеры, которые ещё не являются реальной командой
   * (слот ждёт результата предыдущего матча). Победителем матча не
   * может стать команда с таким именем — даже если по чистой логике
   * "у кого больше счёт" формально выходит она.
   */
  const PLACEHOLDER_NAMES = new Set(['tbd', 'tba', '']);

  function isPlaceholderTeam(name) {
    return PLACEHOLDER_NAMES.has(String(name || '').trim().toLowerCase());
  }

  /**
   * Возвращает имя команды-победителя матча по чистому правилу
   * scoreA > scoreB → teamA; scoreB > scoreA → teamB; равенство → null.
   * Если "победившая" по счёту сторона — пустой слот-плейсхолдер
   * (TBD/TBA/не задано), winner не определяется (возвращается null) —
   * это защита от ситуации, когда счёт введён раньше, чем оба соперника
   * матча стали известны (например, ошибочный ранний ввод).
   */
  function computeMatchWinner(match) {
    if (!match) return null;
    const a = Number(match.scoreA) || 0;
    const b = Number(match.scoreB) || 0;
    if (a > b) return isPlaceholderTeam(match.teamA) ? null : (match.teamA || null);
    if (b > a) return isPlaceholderTeam(match.teamB) ? null : (match.teamB || null);
    return null;
  }

  /* ------------------------------------------------------------
     ОБНОВЛЕНИЕ СЧЁТА МАТЧА
     ------------------------------------------------------------ */

  /**
   * Обновляет счёт конкретного матча в bracket и автоматически
   * пересчитывает его winner и status.
   *
   * @param {object} bracket - объект tournament.bracket (мутируется на месте)
   * @param {string} matchId - id матча
   * @param {number} scoreA
   * @param {number} scoreB
   * @param {object} [options]
   * @param {string} [options.status] - явно задать статус ("live"/"finished").
   *        Если не передан: winner определён → "finished", иначе → "live"
   *        (если матч уже был "scheduled", обновление счёта переводит его в игру).
   * @returns {{ ok: boolean, match: object|null, winner: string|null, error: string|null, warning: string|null }}
   */
  function updateMatchScore(bracket, matchId, scoreA, scoreB, options) {
    const opts = options || {};
    const found = findMatchById(bracket, matchId);
    if (!found) {
      return { ok: false, match: null, winner: null, error: `Матч с id "${matchId}" не найден в сетке` };
    }

    const match = found.match;
    match.scoreA = Number(scoreA) || 0;
    match.scoreB = Number(scoreB) || 0;

    const winner = computeMatchWinner(match);
    match.winner = winner;

    if (opts.status) {
      match.status = opts.status;
    } else {
      match.status = winner ? 'finished' : 'live';
    }

    const hasUndeterminedOpponent = isPlaceholderTeam(match.teamA) || isPlaceholderTeam(match.teamB);
    const warning = (!winner && hasUndeterminedOpponent)
      ? 'У матча есть незаполненный соперник (TBD) — победитель не может быть определён, пока не сыграет матч-источник'
      : null;

    return { ok: true, match, winner, error: null, warning };
  }

  /* ------------------------------------------------------------
     ПРОДВИЖЕНИЕ ПОБЕДИТЕЛЯ В СЛЕДУЮЩИЙ МАТЧ
     ------------------------------------------------------------ */

  /**
   * Определяет, куда должен быть продвинут победитель данного матча.
   * Сначала проверяет явные поля nextMatchId/nextMatchSlot (надёжный путь
   * для сеток, сгенерированных ботом). Если их нет — использует
   * позиционный фолбэк: пара соседних матчей раунда N (по индексу
   * 2k и 2k+1 в пределах стадии) продвигается в матч k раунда N+1
   * той же стадии. Если в стадии больше нет раундов — победитель
   * матча уходит в первый матч ПЕРВОГО раунда СЛЕДУЮЩЕЙ стадии
   * (типичная схема: групповой этап → плейофф, или раунд плейоффа →
   * следующий раунд плейоффа в отдельной "стадии").
   *
   * @returns {{ matchId: string, slot: 'A'|'B' } | null} null если
   *          продвигать некуда (это финальный матч турнира).
   */
  function resolveAdvancement(bracket, matchId) {
    const found = findMatchById(bracket, matchId);
    if (!found) return null;
    const { match, stage, stageIndex } = found;

    // Финальный матч — продвигать некуда, это конец сетки.
    if (match.isFinal) return null;

    // 1) Явная связь — приоритетный путь.
    if (match.nextMatchId) {
      const slot = match.nextMatchSlot === 'B' ? 'B' : 'A';
      return { matchId: match.nextMatchId, slot };
    }

    // 2) Позиционный фолбэк внутри той же стадии.
    const stageMatches = stage.matches || [];
    const round = match.round ?? 1;
    const roundMatches = stageMatches.filter(m => (m.round ?? 1) === round);
    const idxInRound = roundMatches.indexOf(match);

    if (idxInRound === -1) return null;

    const nextRound = round + 1;
    const nextRoundMatches = stageMatches.filter(m => (m.round ?? 1) === nextRound);

    if (nextRoundMatches.length) {
      const targetIndex = Math.floor(idxInRound / 2);
      const targetMatch = nextRoundMatches[targetIndex];
      if (targetMatch) {
        const slot = idxInRound % 2 === 0 ? 'A' : 'B';
        return { matchId: targetMatch.id, slot };
      }
      return null;
    }

    // 3) В этой стадии больше раундов нет — ищем следующую стадию.
    const stages = bracket.stages || [];
    const nextStage = stages[stageIndex + 1];
    if (!nextStage || !nextStage.matches || !nextStage.matches.length) return null;

    // Продвигаем в первый матч первого раунда следующей стадии.
    const firstRound = Math.min(...nextStage.matches.map(m => m.round ?? 1));
    const firstRoundMatches = nextStage.matches.filter(m => (m.round ?? 1) === firstRound);
    const targetIndex = Math.floor(idxInRound / 2);
    const targetMatch = firstRoundMatches[targetIndex] || firstRoundMatches[0];
    if (!targetMatch) return null;

    const slot = idxInRound % 2 === 0 ? 'A' : 'B';
    return { matchId: targetMatch.id, slot };
  }

  /**
   * Вписывает имя команды-победителя в нужный слот (teamA/teamB)
   * целевого матча. Если целевой матч уже имел заполненный слот
   * с другим значением — перезаписывает (на случай пересчёта после
   * правки счёта более раннего матча).
   */
  function placeTeamInSlot(bracket, matchId, slot, teamName) {
    const found = findMatchById(bracket, matchId);
    if (!found) return false;
    if (slot === 'B') {
      found.match.teamB = teamName;
    } else {
      found.match.teamA = teamName;
    }
    return true;
  }

  /**
   * Полный цикл: обновляет счёт матча, определяет победителя,
   * и если победитель определён — автоматически продвигает его
   * в следующий матч сетки (заполняет teamA/teamB там, где раньше
   * было "TBD" или предыдущее значение).
   *
   * Это основная функция, которую будет вызывать Telegram-бот
   * на команду вида "/match m1 2:1" — один вызов делает всё:
   * счёт → winner → продвижение.
   *
   * @returns {{
   *   ok: boolean,
   *   match: object|null,
   *   winner: string|null,
   *   advanced: { matchId: string, slot: string, team: string } | null,
   *   tournamentWinner: string|null,  // заполняется только если это был финал
   *   warning: string|null,
   *   error: string|null
   * }}
   */
  function reportMatchResult(bracket, matchId, scoreA, scoreB, options) {
    const updateResult = updateMatchScore(bracket, matchId, scoreA, scoreB, options);
    if (!updateResult.ok) {
      return { ok: false, match: null, winner: null, advanced: null, tournamentWinner: null, warning: null, error: updateResult.error };
    }

    const { match, winner, warning } = updateResult;
    let advanced = null;
    let tournamentWinner = null;

    if (winner) {
      if (match.isFinal) {
        // Финальный матч сыгран — это победитель всего турнира.
        tournamentWinner = winner;
      } else {
        const target = resolveAdvancement(bracket, matchId);
        if (target) {
          placeTeamInSlot(bracket, target.matchId, target.slot, winner);
          advanced = { matchId: target.matchId, slot: target.slot, team: winner };
        }
      }
    }

    return { ok: true, match, winner, advanced, tournamentWinner, warning, error: null };
  }

  /* ------------------------------------------------------------
     ВЫЧИСЛЕНИЕ ПОБЕДИТЕЛЯ ВСЕГО ТУРНИРА ИЗ СЕТКИ
     ------------------------------------------------------------ */

  /**
   * Находит финальный матч сетки (isFinal: true) и возвращает его
   * winner, если матч завершён. Не мутирует bracket — чистая функция
   * для вызова "а кто сейчас победитель турнира по текущим данным сетки".
   * Используется и движком, и (в будущем) при синхронизации поля
   * tournament.winner на верхнем уровне объекта турнира.
   */
  function computeTournamentWinner(bracket) {
    const all = flattenMatches(bracket);
    const finalEntry = all.find(entry => entry.match.isFinal);
    if (!finalEntry) return null;
    if (finalEntry.match.status !== 'finished') return null;
    return finalEntry.match.winner || null;
  }

  /* ------------------------------------------------------------
     ВАЛИДАЦИЯ СЕТКИ (полезно перед сохранением/коммитом)
     ------------------------------------------------------------ */

  /**
   * Проверяет базовую целостность bracket: уникальность id матчей,
   * существование stages/matches, отсутствие висячих nextMatchId.
   * Возвращает список проблем (пустой массив = всё ок). Не бросает
   * исключений — вызывающий код сам решает, что делать с ошибками.
   */
  function validateBracket(bracket) {
    const errors = [];
    if (!bracket || !Array.isArray(bracket.stages)) {
      errors.push('bracket.stages должен быть массивом');
      return errors;
    }

    const seenIds = new Set();
    const allIds = new Set();
    flattenMatches(bracket).forEach(({ match }) => {
      if (!match.id) {
        errors.push('Найден матч без id');
        return;
      }
      if (seenIds.has(match.id)) {
        errors.push(`Дублирующийся id матча: "${match.id}"`);
      }
      seenIds.add(match.id);
      allIds.add(match.id);
    });

    flattenMatches(bracket).forEach(({ match }) => {
      if (match.nextMatchId && !allIds.has(match.nextMatchId)) {
        errors.push(`Матч "${match.id}" ссылается на несуществующий nextMatchId "${match.nextMatchId}"`);
      }
    });

    const finals = flattenMatches(bracket).filter(({ match }) => match.isFinal);
    if (finals.length === 0) {
      errors.push('В сетке не найден ни один матч с isFinal: true');
    } else if (finals.length > 1) {
      errors.push(`В сетке несколько матчей с isFinal: true (${finals.length}) — должен быть ровно один`);
    }

    return errors;
  }

  /* ------------------------------------------------------------
     ЭКСПОРТ
     ------------------------------------------------------------ */

  const BracketEngine = {
    computeMatchWinner,
    updateMatchScore,
    resolveAdvancement,
    placeTeamInSlot,
    reportMatchResult,
    computeTournamentWinner,
    validateBracket,
    findMatchById,
    flattenMatches,
    isPlaceholderTeam,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BracketEngine;
  }
  root.BracketEngine = BracketEngine;

})(typeof window !== 'undefined' ? window : globalThis);
