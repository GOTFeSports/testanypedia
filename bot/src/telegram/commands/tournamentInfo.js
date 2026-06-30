'use strict';

const { getFile } = require('../../github/client');
const { parseJsDataFile } = require('../../data/jsDataFile');
const { isTournamentComplete } = require('../../workflows/prizeAutoFill');
const REPO_PATHS = require('../../github/repoPaths');
const log = require('../../logger');

async function loadAllTournaments() {
  const file = await getFile(REPO_PATHS.DATA_JS);
  if (!file) throw new Error('data.js не найден');
  return parseJsDataFile(file.content, 'tournaments');
}

function getTournamentStatus(t) {
  if (t.bracket && isTournamentComplete(t.bracket)) return '✅ Завершён';
  if (t.bracket?.stages?.some(s => (s.matches || []).some(m => m.status === 'live'))) return '🔴 Идёт сейчас';

  const now = new Date();
  const start = t.start ? new Date(t.start) : null;
  const end   = t.end   ? new Date(t.end)   : null;

  if (start && now < start) return '🕐 Скоро';
  if (end && now > end)     return '🏁 Завершён (по датам)';
  return '🔴 Идёт сейчас';
}

/* ─── /tournament <id> — полная карточка ──────────────────────── */

async function tournamentCommand(ctx) {
  const parts = (ctx.message?.text || '').trim().split(/\s+/);
  const id    = parts[1];

  if (!id) {
    return ctx.reply(
      '❌ Укажите id турнира.\n\nИспользование: <code>/tournament &lt;id&gt;</code>\n\nСписок турниров: /tournaments',
      { parse_mode: 'HTML' }
    );
  }

  await ctx.sendChatAction('typing');

  try {
    const tournaments = await loadAllTournaments();
    const t = tournaments.find(x => x.id === id);

    if (!t) {
      return ctx.reply(`❌ Турнир <code>${id}</code> не найден.\n\nСписок: /tournaments`, { parse_mode: 'HTML' });
    }

    const status = getTournamentStatus(t);
    const teamsCount = t.bracket?.swissConfig?.teamCount
      || t.teams
      || (t.bracket?.stages?.[0]?.matches?.length ? t.bracket.stages[0].matches.length * 2 : '—');

    const lines = [
      `🏆 <b>${t.title}</b>`,
      `Статус: ${status}`,
      '',
      `📅 ${t.start || '—'} — ${t.end || '—'}`,
      t.startTime ? `🕐 Начало: ${t.startTime}` : null,
      `🎮 Формат: ${t.format || '—'}`,
      t.gameFormat ? `⚙️ ${t.gameFormat}` : null,
      `👥 Команд: ${teamsCount}`,
      `🏢 Организатор: ${t.organizer || '—'}`,
      t.limit ? `📊 Лимит: ${t.limit}` : null,
      t.location ? `📍 ${t.location}` : null,
    ].filter(v => v !== null);

    // Призовой фонд
    if (t.prize || (t.prizePool && t.prizePool.length)) {
      lines.push('', `<b>🏆 Призовой фонд:</b> ${t.prize || '—'}`);
      if (t.prizePool?.length) {
        const sorted = [...t.prizePool].sort((a,b) => (a.place||99) - (b.place||99));
        for (const p of sorted) {
          const placeLabel = p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : `${p.place}.`;
          const teamStr = p.team ? ` — <b>${p.team}</b>` : '';
          lines.push(`  ${placeLabel} ${p.amount || '—'}${teamStr}`);
        }
      }
    }

    if (t.winner) {
      lines.push('', `🏆 <b>Победитель: ${t.winner}</b>`);
    }

    if (t.description) {
      lines.push('', `📝 ${t.description}`);
    }

    // Ссылки
    const links = [];
    if (t.links?.telegram || t.telegramLink)         links.push(`💬 Telegram: ${t.links?.telegram || t.telegramLink}`);
    if (t.links?.discord)                            links.push(`💬 Discord: ${t.links.discord}`);
    if (t.links?.registration)                        links.push(`📝 Регистрация: ${t.links.registration}`);
    if (t.links?.rules)                                links.push(`📜 Правила: ${t.links.rules}`);
    if (t.links?.dotabuff)                             links.push(`📊 Dotabuff: ${t.links.dotabuff}`);
    if (links.length) lines.push('', ...links);

    // Кастеры
    if (t.casters?.length) {
      lines.push('', `🎙 Кастеры: ${t.casters.join(', ')}`);
    }

    lines.push('', `<code>/bracket ${id}</code> — сетка турнира`);

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });

  } catch (err) {
    log.error({ id, err: err.message }, 'tournament: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

/* ─── /tournaments — список ────────────────────────────────────── */

async function tournamentsCommand(ctx) {
  await ctx.sendChatAction('typing');

  try {
    const tournaments = await loadAllTournaments();

    if (!tournaments.length) {
      return ctx.reply('📋 Турниров пока нет.', { parse_mode: 'HTML' });
    }

    // Сортируем: сначала идущие, потом будущие, потом завершённые
    const withStatus = tournaments.map(t => ({ t, status: getTournamentStatus(t) }));
    const order = { '🔴 Идёт сейчас': 0, '🕐 Скоро': 1, '✅ Завершён': 2, '🏁 Завершён (по датам)': 2 };
    withStatus.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

    const lines = withStatus.slice(0, 25).map(({ t, status }) =>
      `${status.split(' ')[0]} <b>${t.title}</b>\n  <code>${t.id}</code> · ${t.start || '—'}`
    );

    await ctx.reply(
      `📋 <b>Турниры</b> (${tournaments.length}):\n\n` +
      lines.join('\n\n') +
      (tournaments.length > 25 ? `\n\n<i>...и ещё ${tournaments.length - 25}</i>` : '') +
      `\n\nПодробности: <code>/tournament &lt;id&gt;</code>`,
      { parse_mode: 'HTML' }
    );

  } catch (err) {
    log.error({ err: err.message }, 'tournaments: ошибка');
    await ctx.reply(`❌ ${err.message}`, { parse_mode: 'HTML' });
  }
}

module.exports = { tournamentCommand, tournamentsCommand, getTournamentStatus };
