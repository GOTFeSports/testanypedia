// Собирает tournaments/index.json из папок tournaments/<slug>/ и проверяет данные.
// GitHub Pages / Vercel не умеют листать папки, поэтому список турниров лежит в одном файле.
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

const isUrl = (s) => /^https?:\/\//i.test(s || '');

// Этапы: поддерживаем result.stages и старый формат groups / playoffs
function stagesOf(result) {
  if (result?.stages?.length) return result.stages;
  const out = [];
  if (result?.groups?.length) out.push({ type: 'groups', groups: result.groups });
  if (result?.playoffs?.rounds?.length) out.push({ type: 'single_elim', rounds: result.playoffs.rounds });
  return out;
}

const list = [];
const dirs = fs.existsSync(TDIR) ? fs.readdirSync(TDIR, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];

for (const d of dirs) {
  const dir = path.join(TDIR, d.name);
  const warn = (msg) => console.warn(`⚠ ${d.name}: ${msg}`);
  const info = readJson(path.join(dir, 'information.json'));
  if (!info) {
    warn('нет information.json — пропущен');
    continue;
  }
  const roster = readJson(path.join(dir, 'roster.json'));
  const result = readJson(path.join(dir, 'result.json'));
  const teams = roster?.teams ?? [];
  const placements = result?.placements ?? [];
  const known = new Set(teams.map((t) => t.name));

  // --- проверки, чтобы опечатки не доехали до сайта ---
  const used = new Set();
  placements.forEach((p) => used.add(p.team));

  const checkRounds = (rounds, where) => {
    const ids = new Set();
    for (const r of rounds) for (const m of r.matches ?? []) if (m.id) ids.add(m.id);
    for (const r of rounds) {
      for (const m of r.matches ?? []) {
        [m.team1, m.team2].forEach((t) => t && used.add(t));
        if (m.next && !ids.has(m.next)) warn(`${where}: матч "${m.id ?? '?'}" ведёт в несуществующий матч "${m.next}"`);
      }
    }
  };
  const checkMatches = (matches) => (matches ?? []).forEach((m) => [m.team1, m.team2].forEach((t) => t && used.add(t)));

  for (const st of stagesOf(result)) {
    const label = st.name || st.type;
    if (st.type === 'groups') {
      for (const g of st.groups ?? []) {
        (g.teams ?? []).forEach((t) => used.add(t));
        const f = g.format ?? 'round_robin';
        if (f === 'single_elim' || f === 'double_elim') checkRounds(g.rounds ?? [], `${label} / ${g.name ?? 'группа'}`);
        else if (f === 'swiss') (g.rounds ?? []).forEach((r) => checkMatches(r.matches));
        else checkMatches(g.matches);
      }
    } else if (st.type === 'swiss') {
      (st.teams ?? []).forEach((t) => used.add(t));
      (st.rounds ?? []).forEach((r) => checkMatches(r.matches));
    } else if (st.type === 'single_elim' || st.type === 'double_elim') {
      checkRounds(st.rounds ?? [], label);
    } else {
      warn(`неизвестный тип этапа "${st.type}"`);
    }
  }
  checkMatches(result?.matches);
  if (known.size) for (const t of used) if (!known.has(t)) warn(`"${t}" есть в result, но нет в roster`);

  const logos = [info.logo, ...teams.map((t) => t.logo)].filter((l) => l && !isUrl(l));
  for (const l of logos) if (!fs.existsSync(path.join(dir, l))) warn(`не найден файл логотипа "${l}"`);

  list.push({
    slug: d.name,
    name: info.name ?? d.name,
    logo: info.logo || null,
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
