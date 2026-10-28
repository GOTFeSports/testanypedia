// Собирает tournaments/index.json из папок tournaments/<slug>/.
// GitHub Pages не умеет листать папки, поэтому список турниров лежит в одном файле.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TDIR = path.join(ROOT, 'tournaments');

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`✖ ${path.relative(ROOT, p)}: ошибка JSON — ${e.message}`);
    process.exitCode = 1;
    return null;
  }
}

const list = [];
const dirs = fs.existsSync(TDIR) ? fs.readdirSync(TDIR, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];

for (const d of dirs) {
  const dir = path.join(TDIR, d.name);
  const info = readJson(path.join(dir, 'information.json'));
  if (!info) {
    console.warn(`⚠ ${d.name}: нет information.json — пропущен`);
    continue;
  }
  const roster = readJson(path.join(dir, 'roster.json'));
  const result = readJson(path.join(dir, 'result.json'));
  const teams = roster?.teams ?? [];
  const placements = result?.placements ?? [];

  // Проверки, чтобы опечатки не доехали до сайта
  const names = new Set(teams.map((t) => t.name));
  for (const p of placements) {
    if (names.size && !names.has(p.team)) console.warn(`⚠ ${d.name}: в result есть "${p.team}", но нет в roster`);
  }
  if (info.pts_cap) {
    for (const t of teams) {
      const total = (t.players ?? []).reduce((s, p) => s + (Number(p.pts) || 0), 0);
      if (total > info.pts_cap) console.warn(`⚠ ${d.name}: "${t.name}" превышает лимит ПТС (${total} > ${info.pts_cap})`);
    }
  }

  list.push({
    slug: d.name,
    name: info.name ?? d.name,
    status: info.status ?? 'upcoming',
    date_start: info.date_start ?? null,
    date_end: info.date_end ?? null,
    organizer: info.organizer ?? '',
    prize_pool: info.prize_pool ?? '',
    pts_cap: info.pts_cap ?? null,
    teams_count: teams.length,
    winner: placements.find((p) => p.place === 1)?.team ?? null,
  });
}

list.sort((a, b) => String(b.date_start ?? '').localeCompare(String(a.date_start ?? '')));

fs.writeFileSync(path.join(TDIR, 'index.json'), JSON.stringify({ generated: new Date().toISOString(), tournaments: list }, null, 2) + '\n');
console.log(`✔ tournaments/index.json: ${list.length} турнир(ов)`);
