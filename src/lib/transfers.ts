import type { SettlementRowData } from '../types/game';

export interface Transfer {
  fromPlayerId: string;
  toPlayerId: string;
  amountGrosze: number;
}

export function calculateTransfers(
  rows: Pick<SettlementRowData, 'playerId' | 'finalBalanceGrosze'>[],
): Transfer[] {
  const ids = new Set(rows.map((row) => row.playerId));
  if (
    ids.size !== rows.length ||
    rows.length > 10 ||
    rows.some((row) => row.finalBalanceGrosze === null || !Number.isSafeInteger(row.finalBalanceGrosze))
  ) {
    throw new Error('Plan przelewów wymaga kompletnych sald w groszach dla maksymalnie 10 graczy.');
  }
  const balances = rows.map((row) => row.finalBalanceGrosze ?? 0);
  if (
    !Number.isSafeInteger(balances.reduce((sum, value) => sum + Math.abs(value), 0)) ||
    balances.reduce((sum, value) => sum + value, 0) !== 0
  ) {
    throw new Error('Nie można wyznaczyć przelewów: suma sald musi wynosić dokładnie 0 zł.');
  }

  const debtors = rows
    .filter((row) => (row.finalBalanceGrosze ?? 0) < 0)
    .sort((a, b) => (a.finalBalanceGrosze ?? 0) - (b.finalBalanceGrosze ?? 0));
  const creditors = rows.filter((row) => (row.finalBalanceGrosze ?? 0) > 0);
  const memo = new Map<string, Transfer[]>();

  function better(candidate: Transfer[], best: Transfer[]): boolean {
    if (candidate.length !== best.length) return candidate.length < best.length;
    for (const debtor of debtors) {
      const count = candidate.filter((transfer) => transfer.fromPlayerId === debtor.playerId).length;
      const bestCount = best.filter((transfer) => transfer.fromPlayerId === debtor.playerId).length;
      if (count !== bestCount) return count > bestCount;
    }
    return false;
  }

  function solve(debts: number[], credits: number[]): Transfer[] {
    const key = `${debts.join(',')}|${credits.join(',')}`;
    const cached = memo.get(key);
    if (cached) return cached;
    if (debts.every((amount) => amount === 0)) return [];

    let best: Transfer[] | null = null;
    // Enumerating every pair also finds solutions that a largest-balance greedy
    // match misses. Each step settles at least one participant completely.
    for (let from = 0; from < debts.length; from += 1) {
      if (debts[from] === 0) continue;
      for (let to = 0; to < credits.length; to += 1) {
        if (credits[to] === 0) continue;
        const amountGrosze = Math.min(debts[from], credits[to]);
        const nextDebts = [...debts];
        const nextCredits = [...credits];
        nextDebts[from] -= amountGrosze;
        nextCredits[to] -= amountGrosze;
        const candidate = [
          {
            fromPlayerId: debtors[from].playerId,
            toPlayerId: creditors[to].playerId,
            amountGrosze,
          },
          ...solve(nextDebts, nextCredits),
        ];
        if (best === null || better(candidate, best)) best = candidate;
      }
    }
    if (best === null) throw new Error('Nie udało się wyznaczyć planu przelewów.');
    memo.set(key, best);
    return best;
  }

  const transfers = solve(
    debtors.map((row) => -(row.finalBalanceGrosze ?? 0)),
    creditors.map((row) => row.finalBalanceGrosze ?? 0),
  );
  const debtorOrder = new Map(debtors.map((row, index) => [row.playerId, index]));
  return [...transfers].sort(
    (a, b) => (debtorOrder.get(a.fromPlayerId) ?? 0) - (debtorOrder.get(b.fromPlayerId) ?? 0),
  );
}
