import { expect, it } from 'vitest';
import { createSession } from '../lib/storage';
import { buildBalancesOnly, buildFullResults } from '../lib/sharing';
import { changeReturn, changeWinner } from '../lib/gameActions';
import type { Player } from '../data/players';

const players: Player[] = [
  { id: 'kuba', name: 'Kuba', avatar: '' },
  { id: 'adam', name: 'Adam', avatar: '' },
];

it('generuje pełne podsumowanie i krótki tekst samych sald', () => {
  let session = createSession(['kuba', 'adam'], 2000, new Date('2026-11-09T10:00:00Z'));
  session = { ...session, stage: 'settlement' };
  session = changeReturn(session, 'kuba', 3000);
  session = changeReturn(session, 'adam', 0);
  session = changeWinner(session, 'adam');
  const full = buildFullResults(session, players);
  const brief = buildBalancesOnly(session, players);
  expect(full).toContain('🃏 POKER — 09.11.2026');
  expect(full).toContain('🏆 Zwycięzca all-ina: Adam');
  expect(full.replaceAll('\u00a0', ' ')).toContain('✅ Bilans: 0,00 zł');
  expect(brief.replaceAll('\u00a0', ' ')).toContain('Kuba: +10,00 zł');
  expect(brief.replaceAll('\u00a0', ' ')).toContain('Adam: −10,00 zł');
  expect(brief).not.toContain('All-in');
});
