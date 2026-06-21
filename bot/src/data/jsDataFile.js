'use strict';

const vm = require('vm');
const log = require('../logger');

const FILE_CONFIGS = {
  'data.js':       { varName: 'tournaments', validate: validateTournaments },
  'teams.js':      { varName: 'teams',       validate: validateTeams },
  'organizers.js': { varName: 'organizers',  validate: validateOrganizers },
};

function parseJsDataFile(content, varName) {
  const wrapped = `(function() { ${content}; this._result = ${varName}; }).call(this);`;
  const sandbox = {};
  vm.createContext(sandbox);
  try {
    vm.runInContext(wrapped, sandbox, { timeout: 5000 });
  } catch (err) {
    throw new Error(`Синтаксическая ошибка при парсинге JS-файла (${varName}): ${err.message}`);
  }
  const arr = sandbox._result;
  if (!Array.isArray(arr))
    throw new Error(`Ожидался массив "${varName}", получено: ${typeof arr}`);
  return arr;
}

function serializeJsDataFile(arr, varName) {
  return `const ${varName} = ${JSON.stringify(arr, null, 2)};\n`;
}

function validateTournaments(arr) {
  const ids = [];
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i];
    if (!t || typeof t !== 'object') throw new Error(`tournaments[${i}]: ожидался объект`);
    if (!t.id)    throw new Error(`tournaments[${i}]: нет id`);
    if (!t.title) throw new Error(`tournaments[${i}] (id="${t.id}"): нет title`);
    if (!t.start || !t.end) throw new Error(`tournaments[${i}] (id="${t.id}"): нет start/end`);
    ids.push(t.id);
  }
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    throw new Error(`Дублирующиеся id: ${[...new Set(dupes)].join(', ')}`);
  }
}

function validateTeams(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (!arr[i]?.name) throw new Error(`teams[${i}]: нет name`);
  }
}

function validateOrganizers(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (!arr[i]?.name) throw new Error(`organizers[${i}]: нет name`);
  }
}

function buildJsMutateFn(filePath, mutateFn, commitMessage) {
  const basename = filePath.split('/').pop();
  const fileConfig = FILE_CONFIGS[basename];
  if (!fileConfig)
    throw new Error(`jsDataFile: неизвестный файл "${basename}". Поддерживаются: ${Object.keys(FILE_CONFIGS).join(', ')}`);
  const { varName, validate } = fileConfig;

  return async (currentContent) => {
    if (!currentContent)
      throw new Error(`jsDataFile: файл "${filePath}" не найден в репозитории`);
    const arr = parseJsDataFile(currentContent, varName);
    log.debug({ filePath, count: arr.length }, 'jsDataFile: распарсен');
    const newArr = await mutateFn(arr);
    if (!Array.isArray(newArr))
      throw new Error(`jsDataFile: mutateFn должна вернуть массив, получено: ${typeof newArr}`);
    validate(newArr);
    const newContent = serializeJsDataFile(newArr, varName);
    parseJsDataFile(newContent, varName); // повторный парсинг — финальная защита
    log.debug({ filePath }, 'jsDataFile: повторный парсинг OK');
    return { newContent, commitMessage };
  };
}

function findTournamentById(arr, id) {
  return arr.find(t => t.id === id) || null;
}

function isTournamentIdTaken(arr, id) {
  return arr.some(t => t.id === id);
}

module.exports = { parseJsDataFile, serializeJsDataFile, buildJsMutateFn, findTournamentById, isTournamentIdTaken };