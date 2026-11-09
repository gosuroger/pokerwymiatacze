import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../config/game';
import { addCustomPlayer, addPlayer, adjustBuyIn, changeReturn, changeWinner, removePlayer, undoBuyIn } from '../lib/gameActions';
import { calculateSettlement, totalBuyIns, validateSettlement } from '../lib/calculations';
import { createSession } from '../lib/storage';
import { parseMoneyInput } from '../lib/formatting';
import type { GameSession } from '../types/game';
import { createCustomPlayer } from '../lib/playerProfiles';

const start = () => createSession(
  ['kuba', 'adam', 'mati'],
  GAME_CONFIG.buyInAmountGrosze,
  new Date('2026-11-09T20:00:00.000Z'),
  (() => {
    let id = 0;
    return () => `id-${++id}`;
  })(),
);

describe('logika rozgrywki', () => {
  it('przypisuje każdemu graczowi pierwsze wkupienie', () => {
    const session = start();
    expect(session.players.map((player) => player.buyIns)).toEqual([1, 1, 1]);
    expect(session.history).toHaveLength(3);
    expect(session.history.every((entry) => entry.type === 'first_buyin')).toBe(true);
    expect(session.buyInAmountGrosze * totalBuyIns(session)).toBe(6000);
  });

  it('dodaje i cofa rebuy, zachowując korektę w historii', () => {
    const session = adjustBuyIn(start(), 'kuba', 1);
    expect(session.players[0].buyIns).toBe(2);
    expect(totalBuyIns(session)).toBe(4);
    const undone = undoBuyIn(session, { playerId: 'kuba', deltaBuyIns: 1 });
    expect(undone.players[0].buyIns).toBe(1);
    expect(undone.history).toHaveLength(5);
    expect(undone.history.at(-1)?.type).toBe('rebuy_correction');
    expect(undone.settlementConfirmed).toBe(false);
  });

  it('nie pozwala zejść poniżej jednego wkupienia', () => {
    expect(() => adjustBuyIn(start(), 'kuba', -1)).toThrow(/co najmniej jedno/);
  });

  it('dodaje i usuwa gracza, uwzględniając jego jedno wkupienie', () => {
    const session = addPlayer(start(), 'bartek', 10);
    expect(session.players).toHaveLength(4);
    expect(session.players.at(-1)?.buyIns).toBe(1);
    const removed = removePlayer(session, 'bartek');
    expect(removed.players).toHaveLength(3);
    expect(removed.history.at(-1)?.amountGrosze).toBe(-2000);
    expect(removed.history.at(-1)?.type).toBe('player_removed');
  });

  it('dodaje niestatycznego gracza do bieżącej sesji z jednym wkupieniem', () => {
    const guest = createCustomPlayer('Ola');
    const session = addCustomPlayer(start(), guest, 10);
    expect(session.customPlayers).toContainEqual(guest);
    expect(session.players.at(-1)).toMatchObject({
      playerId: guest.id,
      buyIns: 1,
      returnedGrosze: null,
    });
    expect(session.history.at(-1)).toMatchObject({
      playerId: guest.id,
      type: 'player_added',
      amountGrosze: 2000,
    });
  });

  it('odrzuca pustą nazwę i nieprawidłowe albo powtórzone profile dodatkowe', () => {
    expect(() => createCustomPlayer('   ')).toThrow(/Wpisz imię/);
    const guest = createCustomPlayer('Ola');
    expect(() => addCustomPlayer(start(), { ...guest, id: 'kuba' }, 10)).toThrow(/Nieprawidłowy profil/);
    const session = addCustomPlayer(start(), guest, 10);
    expect(() => addCustomPlayer(session, guest, 10)).toThrow(/już uczestniczy/);
  });

  it('czyści i zapisuje wybór usuniętego zwycięzcy all-ina', () => {
    let session: GameSession = { ...start(), stage: 'settlement' };
    session = changeWinner(session, 'kuba');
    session = { ...session, stage: 'playing' };
    const updated = removePlayer(session, 'kuba');
    expect(updated.winnerPlayerId).toBeNull();
    expect(updated.history.at(-1)).toMatchObject({
      type: 'winner_changed',
      previousPlayerId: 'kuba',
      newPlayerId: null,
    });
  });

  it('nie pozwala przekroczyć limitu graczy ani dodać duplikatu', () => {
    const ten = createSession(Array.from({ length: 10 }, (_, index) => `p${index}`), 2000);
    expect(() => addPlayer(ten, 'another', 10)).toThrow(/Limit/);
    expect(() => addPlayer(ten, 'p0', 10)).toThrow(/już uczestniczy/);
  });

  it('nie pozwala usunąć ostatniego uczestnika', () => {
    const one = { ...start(), players: [start().players[0]] };
    expect(() => removePlayer(one, 'kuba')).toThrow(/ostatniego/);
  });
});

describe('rozliczenie', () => {
  it('parsuje kwoty PLN do całkowitych groszy bez zaokrąglania', () => {
    expect(parseMoneyInput('20,00')).toBe(2000);
    expect(parseMoneyInput('10.5')).toBe(1050);
    expect(parseMoneyInput('20.001')).toBeNull();
  });

  function baseSettlement() {
    let session = start();
    session = { ...session, stage: 'settlement' };
    session = changeReturn(session, 'kuba', 10000);
    session = changeReturn(session, 'adam', 3000);
    session = changeReturn(session, 'mati', 3000);
    return session;
  }

  it('liczy zwroty, saldo podstawowe i pulę all-in w groszach', () => {
    const totals = calculateSettlement(baseSettlement());
    expect(totals.totalPaidGrosze).toBe(6000);
    expect(totals.totalReturnedGrosze).toBe(16000);
    expect(totals.allInPoolGrosze).toBe(-10000);
    expect(totals.rows.map((row) => row.baseBalanceGrosze)).toEqual([8000, 1000, 1000]);
  });

  it('rejestruje edycję zwrotu i unieważnia zatwierdzenie', () => {
    const session = { ...start(), stage: 'settlement' as const, settlementConfirmed: true };
    const updated = changeReturn(session, 'kuba', 10000);
    expect(updated.players[0].returnedGrosze).toBe(10000);
    expect(updated.history.at(-1)).toMatchObject({
      type: 'return_changed',
      previousGrosze: 0,
      newGrosze: 10000,
    });
    expect(updated.settlementConfirmed).toBe(false);
  });

  it('odrzuca zwroty, które nie są pełnymi wielokrotnościami 10 zł', () => {
    const session: GameSession = { ...start(), stage: 'settlement' };
    expect(() => changeReturn(session, 'kuba', 500)).toThrow(/wielokrotnością 10 zł/);
  });

  it('blokuje brakujące zwroty i nadmierną sumę zwrotów', () => {
    const incomplete = { ...start(), stage: 'settlement' as const };
    expect(validateSettlement(incomplete)).toMatch(/każdego gracza/);
    let excessive: GameSession = changeReturn(incomplete, 'kuba', 4000);
    excessive = changeReturn(excessive, 'adam', 3000);
    excessive = changeReturn(excessive, 'mati', 0);
    expect(validateSettlement(excessive)).toMatch(/przekraczać/);
  });

  it('wymaga wybranego zwycięzcy i przypisuje mu pulę tylko raz', () => {
    let session: GameSession = { ...start(), stage: 'settlement' };
    session = changeReturn(session, 'kuba', 0);
    session = changeReturn(session, 'adam', 0);
    session = changeReturn(session, 'mati', 0);
    expect(validateSettlement(session)).toMatch(/Wybierz zwycięzcę/);
    session = changeWinner(session, 'adam');
    expect(validateSettlement(session)).toBeNull();
    expect(calculateSettlement(session).rows.find((row) => row.playerId === 'adam')?.finalBalanceGrosze).toBe(4000);
    session = changeWinner(session, 'kuba');
    const totals = calculateSettlement(session);
    expect(totals.rows.find((row) => row.playerId === 'adam')?.allInBonusGrosze).toBe(0);
    expect(totals.rows.find((row) => row.playerId === 'kuba')?.allInBonusGrosze).toBe(6000);
    expect(totals.finalBalanceGrosze).toBe(0);
  });

  it('nie wymaga zwycięzcy przy zerowej puli all-in', () => {
    let session: GameSession = { ...start(), stage: 'settlement' };
    session = changeReturn(session, 'kuba', 2000);
    session = changeReturn(session, 'adam', 2000);
    session = changeReturn(session, 'mati', 2000);
    expect(calculateSettlement(session).allInPoolGrosze).toBe(0);
    expect(validateSettlement(session)).toBeNull();
  });

  it('unieważnia potwierdzenie po zmianie zwycięzcy i wkupienia', () => {
    let session: GameSession = { ...start(), stage: 'settlement', settlementConfirmed: true };
    session = changeWinner(session, 'adam');
    expect(session.settlementConfirmed).toBe(false);
    session = { ...session, stage: 'playing', settlementConfirmed: true };
    session = adjustBuyIn(session, 'kuba', 1);
    expect(session.settlementConfirmed).toBe(false);
  });
});
