import type { GameSession, SettlementTotals } from '../types/game';
import { GAME_CONFIG } from '../config/game';

export function totalBuyIns(session: GameSession): number {
  return session.players.reduce((sum, player) => sum + player.buyIns, 0);
}

export function totalPaidGrosze(session: GameSession): number {
  return totalBuyIns(session) * session.buyInAmountGrosze;
}

export function calculateSettlement(session: GameSession): SettlementTotals {
  const totalCount = totalBuyIns(session);
  const paid = totalCount * session.buyInAmountGrosze;
  const allReturnsEntered = session.players.every((player) => player.returnedGrosze !== null);
  const returned = allReturnsEntered
    ? session.players.reduce((sum, player) => sum + (player.returnedGrosze ?? 0), 0)
    : null;
  const allInPool = returned === null ? null : paid - returned;
  const rows = session.players.map((player) => {
    const paidGrosze = player.buyIns * session.buyInAmountGrosze;
    const baseBalance = player.returnedGrosze === null ? null : player.returnedGrosze - paidGrosze;
    const bonus = allInPool !== null && session.winnerPlayerId === player.playerId
      ? allInPool
      : 0;
    return {
      playerId: player.playerId,
      buyIns: player.buyIns,
      paidGrosze,
      returnedGrosze: player.returnedGrosze,
      baseBalanceGrosze: baseBalance,
      allInBonusGrosze: bonus,
      finalBalanceGrosze: baseBalance === null || allInPool === null
        ? null
        : baseBalance + bonus,
    };
  });
  const finalBalance = rows.every((row) => row.finalBalanceGrosze !== null)
    ? rows.reduce((sum, row) => sum + (row.finalBalanceGrosze ?? 0), 0)
    : null;

  return {
    totalBuyIns: totalCount,
    totalPaidGrosze: paid,
    totalReturnedGrosze: returned,
    allInPoolGrosze: allInPool,
    finalBalanceGrosze: finalBalance,
    rows,
  };
}

export function validateSettlement(session: GameSession): string | null {
  const totals = calculateSettlement(session);
  if (session.players.some((player) => player.returnedGrosze === null)) {
    return 'Uzupełnij zwrot dla każdego gracza.';
  }
  if (session.players.some(
    (player) =>
      (player.returnedGrosze ?? 0) % GAME_CONFIG.settlementStepGrosze !== 0 ||
      (player.returnedGrosze ?? -1) < 0,
  )) {
    return 'Zwroty muszą być nieujemne i stanowić wielokrotność 10 zł.';
  }
  if ((totals.allInPoolGrosze ?? -1) < 0) {
    return 'Suma zwrotów nie może przekraczać sumy wkupień.';
  }
  if ((totals.allInPoolGrosze ?? 0) > 0 && !session.winnerPlayerId) {
    return 'Wybierz zwycięzcę końcowego all-ina.';
  }
  if (totals.finalBalanceGrosze !== 0) {
    return 'Suma sald końcowych musi wynosić dokładnie 0 zł.';
  }
  return null;
}
