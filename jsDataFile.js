'use strict';

const vm = require('vm');
const log = require('../logger');

/**
 * Конфигурация для каждого JS-файла данных.
 * varName — имя JS-переменной внутри файла (const tournaments = [...]).
 * validate — пользовательская функция-валидатор: получает уже распарсенный
 *            массив и бросает Error если что-то не так.
 */
const FILE_CONFIGS = {
  'data.js': {
    varName: 'tournaments',
    validate: validateTournaments,
  },
  'teams.js': {
    varName: 'teams',
    validate: validateTeams,
  },
  'organizers.js': {
    varName: 'organizers',
    validate: validateOrganizers,
  },
};

/* ----------------------------------------------------------
   ПАРСИНГ
   ---------------------------------------------------------- */

/**
 * Распарсить содержимое JS-файла с данными и извлечь массив.
 * Использует Node vm для безопасного выполнения в изолированном контексте
 * (без доступа к require, process, fs и т.д.).
 *
 * @param {string} content  — utf-8 содержимое файла
 * @param {string} varName  — имя переменной ('tournaments' / 'teams' / 'organizers')
 * @returns {Array}
 * @throws  SyntaxError или Error при невалидном файле
 */
function parseJsDataFile(content, varName) {
  // ВАЖНО: data.js / teams.js / organizers.js используют `const X = [...]`.
  // В vm-контексте `const` — block-scoped переменная лексического окружения скрипта;
  // она НЕ попадает как свойство на объект-sandbox (в отличие от `var`).
  // Поэтому оборачиваем исполняемый код: после его выполнения присваиваем
  // значение на this._result, откуда и читаем его.
  const wrapped = `(function() { ${content}; this._result = ${varName}; }).call(this);`;
  const sandbox = {};
  vm.createContext(sandbox);

  try {
    vm.runInContext(wrapped, sandbox, { timeout: 5000 });
  } catch (err) {
    throw new Error(`Синтаксическая ошибка при парсинге JS-файла (${varName}): ${err.message}`);
  }

  const arr = sandbox._result;
  if (!Array.isArray(arr)) {
    throw new Error(`Ожидался массив "${varName}", получено: ${typeof arr}`);
  }

  return arr;
}

/* ----------------------------------------------------------
   ВАЛИДАТОРЫ СТРУКТУРЫ
   ---------------------------------------------------------- */

function validateTournaments(arr) {
  if (arr.length === 0) return; // пустой массив технически допустим
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i];
    if (!t || typeof t !== 'object') {
      throw new Error(`tournaments[${i}]: ожидался объект, получено ${typeof t}`);
    }
    if (!t.id || typeof t.id !== 'string') {
      throw new Error(`tournaments[${i}]: отсутствует или некорректен обязательный id`);
    }
    if (!t.title || typeof t.title !== 'string') {
      throw new Error(`tournaments[${i}] (id="${t.id}"): отсутствует обязательный title`);
    }
    if (!t.start || !t.end) {
      throw new Error(`tournaments[${i}] (id="${t.id}"): отсутствуют поля start/end`);
    }
  }

  // Проверка дублей id — самый опасный вид поломки сайта после синтаксических ошибок
  const ids = arr.map(t => t.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    throw new Error(`Дублирующиеся id в tournaments: ${[...new Set(dupes)].join(', ')}`);
  }
}

function validateTeams(arr) {
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i];
    if (!t || typeof t !== 'object') {
      throw new Error(`teams[${i}]: ожидался объект`);
    }
    if (!t.name || typeof t.name !== 'string') {
      throw new Error(`teams[${i}]: отсутствует обязательный name`);
    }
  }
}

function validateOrganizers(arr) {
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i];
    if (!o || typeof o !== 'object') {
      throw new Error(`organizers[${i}]: ожидался объект`);
    }
    if (!o.name || typeof o.name !== 'string') {
      throw new Error(`organizers[${i}]: отсутствует обязательный name`);
    }
  }
}

/* ----------------------------------------------------------
   СЕРИАЛИЗАЦИЯ
   ---------------------------------------------------------- */

/**
 * Сериализовать массив обратно в JS-файл в формате, совместимом с фронтом.
 * Сохраняет точно такой же header "const X = [" и footer "];" как в оригинале,
 * плюс JSON.stringify с отступом 2 для читаемости в GitHub.
 *
 * ВАЖНО: результат перед коммитом снова прогоняется через parseJsDataFile —
 * если сериализатор вдруг сломался (что-то не escape-нулось и т.п.),
 * ошибка будет поймана до отправки в GitHub.
 */
function serializeJsDataFile(arr, varName) {
  const body = JSON.stringify(arr, null, 2);
  return `const ${varName} = ${body};\n`;
}

/* ----------------------------------------------------------
   ВЫСОКОУРОВНЕВЫЙ API
   ---------------------------------------------------------- */

/**
 * Прочитать, применить мутацию и вернуть новое содержимое файла в виде строки.
 * Это то, что передаётся как mutateFn в commitQueue.enqueueCommit.
 *
 * Полный цикл:
 *  1. parseJsDataFile(currentContent)   — распарсить
 *  2. mutateFn(arr)                     — изменить массив (мутация или замена)
 *  3. validateFn(newArr)                — структурная валидация
 *  4. serializeJsDataFile(newArr)       — сериализовать
 *  5. parseJsDataFile(serialized)       — ПОВТОРНЫЙ парсинг сериализованного (финальная проверка синтаксиса)
 *  6. return { newContent, commitMessage }
 *
 * @param {string}   filePath      — например, 'data.js'
 * @param {string}   currentContent — текущее содержимое файла (из commitQueue)
 * @param {Function} mutateFn      — (arr: Array) => Array  (возвращает новый/изменённый массив)
 * @param {string}   commitMessage
 * @returns {{ newContent: string, commitMessage: string }}
 */
function buildJsMutateFn(filePath, mutateFn, commitMessage) {
  // Определяем конфиг по имени файла (только basename)
  const basename = filePath.split('/').pop();
  const fileConfig = FILE_CONFIGS[basename];
  if (!fileConfig) {
    throw new Error(`jsDataFile: неизвестный JS-файл данных "${basename}". Поддерживаются: ${Object.keys(FILE_CONFIGS).join(', ')}`);
  }

  const { varName, validate } = fileConfig;

  // Возвращаем mutateFn-обёртку для commitQueue (принимает currentContent: string|null)
  return async (currentContent) => {
    if (!currentContent) {
      throw new Error(`jsDataFile: файл "${filePath}" не найден в репозитории — нельзя применить мутацию к несуществующему файлу`);
    }

    // Шаг 1: парсим
    const arr = parseJsDataFile(currentContent, varName);
    log.debug({ filePath, count: arr.length }, 'jsDataFile: распарсен');

    // Шаг 2: мутируем
    const newArr = await mutateFn(arr);
    if (!Array.isArray(newArr)) {
      throw new Error(`jsDataFile: mutateFn должна вернуть массив, получено: ${typeof newArr}`);
    }

    // Шаг 3: валидируем структуру
    validate(newArr);
    log.debug({ filePath, newCount: newArr.length }, 'jsDataFile: структурная валидация прошла');

    // Шаг 4: сериализуем
    const newContent = serializeJsDataFile(newArr, varName);

    // Шаг 5: повторный синтаксический парсинг сериализованного результата
    // (если что-то сломалось при сериализации — ловим здесь, до GitHub)
    parseJsDataFile(newContent, varName);
    log.debug({ filePath }, 'jsDataFile: повторный парсинг после сериализации — OK');

    return { newContent, commitMessage };
  };
}

/**
 * Найти турнир по id в распарсенном массиве.
 * Утилита для workflows.
 */
function findTournamentById(arr, id) {
  return arr.find(t => t.id === id) || null;
}

/**
 * Проверить уникальность нового id турнира (перед добавлением черновика).
 */
function isTournamentIdTaken(arr, id) {
  return arr.some(t => t.id === id);
}

module.exports = {
  parseJsDataFile,
  serializeJsDataFile,
  buildJsMutateFn,
  findTournamentById,
  isTournamentIdTaken,
};
