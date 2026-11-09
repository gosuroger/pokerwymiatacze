import { describe, expect, it } from 'vitest';
import { calculateTransfers } from '../lib/transfers';

function rows(balances: number[]) {
  return balances.map((finalBalanceGrosze, index) => ({
    playerId: `p${index}`,
    finalBalanceGrosze,
  }));
}

function verify(balances: number[]) {
  const transfers = calculateTransfers(rows(balances));
  const remaining = [...balances];
  for (const transfer of transfers) {
    const from = Number(transfer.fromPlayerId.slice(1));
    const to = Number(transfer.toPlayerId.slice(1));
    expect(transfer.amountGrosze).toBeGreaterThan(0);
    expect(Number.isSafeInteger(transfer.amountGrosze)).toBe(true);
    expect(balances[from]).toBeLessThan(0);
    expect(balances[to]).toBeGreaterThan(0);
    remaining[from] += transfer.amountGrosze;
    remaining[to] -= transfer.amountGrosze;
  }
  expect(remaining.every((balance) => balance === 0)).toBe(true);
  return transfers;
}

describe('minimalny plan przelewów', () => {
  it('nie wymaga przelewów dla sald zerowych', () => {
    expect(verify([0, 0, 0])).toEqual([]);
  });

  it('rozlicza prosty przelew i pomija gracza z zerowym saldem', () => {
    expect(verify([4000, -4000, 0])).toEqual([
      { fromPlayerId: 'p1', toPlayerId: 'p0', amountGrosze: 4000 },
    ]);
  });

  it('dzieli wpłatę jednego przegranego między kilku wygranych', () => {
    expect(verify([-9000, 2000, 3000, 4000])).toHaveLength(3);
  });

  it('pozwala kilku przegranym przelać pieniądze jednemu wygranemu', () => {
    expect(verify([-2000, -3000, -4000, 9000])).toHaveLength(3);
  });

  it('znajduje mniej przelewów niż zachłanne dopasowanie największych sald', () => {
    expect(verify([-8000, -7000, -5000, 10000, 8000, 2000])).toHaveLength(4);
  });

  it('przy remisie obciąża większą liczbą przelewów największego przegranego', () => {
    const transfers = verify([-6000, -4000, 5000, 3000, 2000]);
    expect(transfers).toHaveLength(4);
    expect(transfers.filter((transfer) => transfer.fromPlayerId === 'p0')).toHaveLength(3);
    expect(transfers.filter((transfer) => transfer.fromPlayerId === 'p1')).toHaveLength(1);
  });

  it('nie poświęca minimalnej liczby przelewów dla preferencji największego przegranego', () => {
    const transfers = verify([-6000, -4000, 6000, 4000]);
    expect(transfers).toHaveLength(2);
  });

  it('zachowuje dokładność pojedynczych groszy', () => {
    expect(verify([-101, -202, 100, 203])).toHaveLength(3);
  });

  it('odrzuca niekompletny i niezerowy bilans oraz ułamki groszy', () => {
    expect(() => calculateTransfers([{ playerId: 'a', finalBalanceGrosze: null }])).toThrow();
    expect(() => calculateTransfers(rows([-1000, 999]))).toThrow(/suma sald/);
    expect(() => calculateTransfers(rows([-0.5, 0.5]))).toThrow();
    expect(() => calculateTransfers([
      { playerId: 'a', finalBalanceGrosze: -1 },
      { playerId: 'a', finalBalanceGrosze: 1 },
    ])).toThrow();
  });

  it('potwierdza optimum dla wielu zestawów metodą niezależnego podziału na grupy zerowe', () => {
    // A group of k nonzero balances needs at least k-1 transfers. Maximizing
    // disjoint zero-sum groups gives an independent oracle for the minimum.
    function minimum(balances: number[]): number {
      const nonzero = balances.filter((balance) => balance !== 0);
      const sums = Array<number>(1 << nonzero.length).fill(0);
      const groups = Array<number>(sums.length).fill(0);
      for (let mask = 1; mask < sums.length; mask += 1) {
        for (let index = 0; index < nonzero.length; index += 1) {
          if (!(mask & (1 << index))) continue;
          const previous = mask ^ (1 << index);
          sums[mask] = sums[previous] + nonzero[index];
          groups[mask] = Math.max(groups[mask], groups[previous]);
        }
        if (sums[mask] === 0) groups[mask] += 1;
      }
      return nonzero.length - groups.at(-1)!;
    }
    let seed = 42;
    for (let sample = 0; sample < 60; sample += 1) {
      const balances = Array.from({ length: 9 }, () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed % 15 - 7) * 100;
      });
      balances.push(-balances.reduce((sum, value) => sum + value, 0));
      expect(verify(balances)).toHaveLength(minimum(balances));
    }
  });
});
