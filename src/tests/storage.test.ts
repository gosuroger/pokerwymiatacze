import { describe, expect, it } from 'vitest';
import { createSession, readSession, saveSession, STORAGE_KEY } from '../lib/storage';
import { createCustomPlayer } from '../lib/playerProfiles';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('localStorage', () => {
  it('zapisuje i przywraca poprawną sesję w wersjonowanym formacie', () => {
    const storage = memoryStorage();
    const session = createSession(['kuba', 'adam'], 2000);
    saveSession(storage, session);
    expect(readSession(storage)).toEqual(session);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').version).toBe(1);
  });

  it('zgłasza błąd uszkodzonego lub nieprawidłowego zapisu', () => {
    const malformedJson = { getItem: () => '{oops' };
    const invalidShape = { getItem: () => JSON.stringify({ version: 5 }) };
    expect(() => readSession(malformedJson)).toThrow();
    expect(() => readSession(invalidShape)).toThrow(/nieprawidłowy format/);
  });

  it('zachowuje profile dodatkowe w zapisanej sesji i przywraca je po odczycie', () => {
    const storage = memoryStorage();
    const guest = createCustomPlayer('  Ola  ');
    const session = createSession(
      ['kuba', guest.id],
      2000,
      new Date('2026-11-09T20:00:00.000Z'),
      undefined,
      [guest],
    );
    saveSession(storage, session);
    expect(readSession(storage)?.customPlayers).toEqual([{ ...guest, name: 'Ola' }]);
  });
});
