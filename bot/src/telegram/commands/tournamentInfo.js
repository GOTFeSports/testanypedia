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
      if (Array.isArray(t.prizePool) && t.prizePool.length) {
        const sorted = [...t.prizePool].sort((a,b) => (a.place||99) - (b.place||99));
        for (const p of sorted) {
          if (!p || typeof p !== 'object') continue;
          const placeLabel = p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : p.place === 3 ? '🥉' : `${p.place || '?'}.`;
          const amount  = typeof p.amount === 'string' ? p.amount : '';
          const team    = typeof p.team   === 'string' && p.team ? ` — <b>${p.team}</b>` : '';
          lines.push(`  ${placeLabel} ${amount || '—'}${team}`);
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
    // Безопасное формирование ссылок — проверяем что значение строка, не объект
    const links = [];
    const safeStr = v => (v && typeof v === 'string') ? v : null;
    const tg  = safeStr(t.links?.telegram) || safeStr(t.telegramLink);
    const dc  = safeStr(t.links?.discord)  || safeStr(t.discordLink);
    const reg = safeStr(t.links?.registration) || safeStr(t.registrationLink);
    const rl  = safeStr(t.links?.rules)    || safeStr(t.rulesLink);
    const db  = safeStr(t.links?.dotabuff) || safeStr(t.dotabuffLink);
    const be  = safeStr(t.links?.bracket)  || safeStr(t.bracketEmbed);
    if (tg)  links.push(`💬 Telegram: ${tg}`);
    if (dc)  links.push(`💬 Discord: ${dc}`);
    if (reg) links.push(`📝 Регистрация: ${reg}`);
    if (rl)  links.push(`📜 Правила: ${rl}`);
    if (db)  links.push(`📊 Dotabuff: ${db}`);
    if (be)  links.push(`🖼 Сетка: ${be}`);
    if (links.length) lines.push('', ...links);

    // Кастеры
    if (t.casters) {
      const castersStr = Array.isArray(t.casters)
        ? t.casters.filter(Boolean).join(', ')
        : typeof t.casters === 'string' ? t.casters : null;
      if (castersStr) lines.push('', `🎙 Кастеры: ${castersStr}`);
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
