import type { GameSession } from '../types/game';
import { calculateSettlement } from './calculations';
import { formatSignedMoney, formatMoney } from './formatting';
import type { Player } from '../data/players';
import { calculateTransfers } from './transfers';

export function buildFullResults(session: GameSession, profiles: Player[]): string {
  const totals = calculateSettlement(session);
  const date = new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(session.startedAt));
  const rows = totals.rows.map((row) => {
    const player = profiles.find((item) => item.id === row.playerId);
    const balance = row.finalBalanceGrosze ?? 0;
    const indicator = balance > 0 ? '🟢' : balance < 0 ? '🔴' : '⚪';
    return `${indicator} ${player?.name ?? row.playerId}: ${formatSignedMoney(balance)}`;
  });
  const winner = (totals.allInPoolGrosze ?? 0) > 0 && session.winnerPlayerId
    ? profiles.find((item) => item.id === session.winnerPlayerId)?.name ?? session.winnerPlayerId
    : 'Nie dotyczy';
  const transfers = calculateTransfers(totals.rows);
  const playerName = (id: string) => profiles.find((player) => player.id === id)?.name ?? id;
  return [
    `🃏 POKER — ${date}`,
    '',
    '🏆 WYNIKI KOŃCOWE',
    '',
    ...rows,
    '',
    `💰 Łączna pula: ${formatMoney(totals.totalPaidGrosze)}`,
    `🎯 Końcowy all-in: ${formatMoney(totals.allInPoolGrosze ?? 0)}`,
    `🏆 Zwycięzca all-ina: ${winner}`,
    `✅ Bilans: ${formatMoney(totals.finalBalanceGrosze ?? 0)}`,
    '',
    `💸 PRZELEWY — minimalna liczba: ${transfers.length}`,
    ...(transfers.length
      ? transfers.map((transfer) =>
        `${playerName(transfer.fromPlayerId)} → ${playerName(transfer.toPlayerId)}: ${formatMoney(transfer.amountGrosze)}`,
      )
      : ['Wszyscy są rozliczeni — przelewy nie są potrzebne.']),
    'Po wykonaniu przelewów saldo każdego gracza wyniesie 0 zł.',
  ].join('\n');
}

export function buildBalancesOnly(session: GameSession, profiles: Player[]): string {
  return [
    '🃏 Poker — wyniki',
    '',
    ...calculateSettlement(session).rows.map((row) => {
      const player = profiles.find((item) => item.id === row.playerId);
      return `${player?.name ?? row.playerId}: ${formatSignedMoney(row.finalBalanceGrosze ?? 0)}`;
    }),
  ].join('\n');
}
