import type { GameSession } from '../types/game';
import { GAME_CONFIG } from '../config/game';
import { validateSettlement } from './calculations';
import { createUniqueId } from './ids';
import type { Player } from '../data/players';

export const STORAGE_KEY = 'poker-bank-session-v1';

export function isGameSession(value: unknown): value is GameSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as GameSession;
  if (
    session.version !== 1 ||
    typeof session.id !== 'string' ||
    session.id.length === 0 ||
    typeof session.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(session.startedAt)) ||
    !Number.isSafeInteger(session.buyInAmountGrosze) ||
    (session.buyInAmountGrosze ?? 0) <= 0 ||
    !['playing', 'settlement', 'final'].includes(session.stage ?? '') ||
    !Array.isArray(session.players) ||
    !Array.isArray(session.history) ||
    (session.winnerPlayerId !== null && typeof session.winnerPlayerId !== 'string') ||
    typeof session.settlementConfirmed !== 'boolean'
  ) return false;
  if (session.settlementConfirmed && session.stage !== 'final') return false;
  if (session.stage === 'final' && !session.settlementConfirmed) return false;

  const playerIds = new Set<string>();
  for (const player of session.players) {
    if (
      !player ||
      typeof player.playerId !== 'string' ||
      player.playerId.length === 0 ||
      playerIds.has(player.playerId) ||
      !Number.isSafeInteger(player.buyIns) ||
      (player.buyIns ?? 0) < 1 ||
      (player.returnedGrosze !== null &&
        (
          !Number.isSafeInteger(player.returnedGrosze) ||
          (player.returnedGrosze ?? -1) < 0 ||
          (player.returnedGrosze ?? 0) % GAME_CONFIG.settlementStepGrosze !== 0
        ))
    ) return false;
    playerIds.add(player.playerId);
  }
  if (session.players.length < 1 || session.players.length > 10) return false;
  const customIds = new Set<string>();
  if (session.customPlayers !== undefined) {
    if (!Array.isArray(session.customPlayers)) return false;
    for (const player of session.customPlayers) {
      if (
        !player ||
        typeof player.id !== 'string' ||
        player.id.length === 0 ||
        customIds.has(player.id) ||
        typeof player.name !== 'string' ||
        player.name.trim().length === 0 ||
        player.name.length > 32 ||
        typeof player.avatar !== 'string' ||
        player.avatar !== ''
      ) return false;
      customIds.add(player.id);
    }
  }
  if ([...playerIds].some((id) => id.startsWith('custom-') && !customIds.has(id))) return false;
  if (session.winnerPlayerId !== null && !playerIds.has(session.winnerPlayerId)) return false;

  const historyIds = new Set<string>();
  const historyTypes = new Set([
    'first_buyin',
    'rebuy',
    'rebuy_correction',
    'player_added',
    'player_removed',
    'return_changed',
    'winner_changed',
  ]);
  const validHistory = session.history.every((entry) => {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      entry.id.length === 0 ||
      historyIds.has(entry.id) ||
      typeof entry.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(entry.timestamp)) ||
      (entry.playerId !== null && typeof entry.playerId !== 'string') ||
      !historyTypes.has(entry.type) ||
      (entry.amountGrosze !== undefined && !Number.isSafeInteger(entry.amountGrosze)) ||
      (entry.previousGrosze !== undefined && !Number.isSafeInteger(entry.previousGrosze)) ||
      (entry.newGrosze !== undefined && !Number.isSafeInteger(entry.newGrosze)) ||
      (entry.previousPlayerId !== undefined &&
        entry.previousPlayerId !== null &&
        typeof entry.previousPlayerId !== 'string') ||
      (entry.newPlayerId !== undefined &&
        entry.newPlayerId !== null &&
        typeof entry.newPlayerId !== 'string')
    ) return false;
    historyIds.add(entry.id);
    return true;
  });
  if (!validHistory) return false;
  return !session.settlementConfirmed || validateSettlement(session) === null;
}

export function readSession(storage: Pick<Storage, 'getItem'>): GameSession | null {
  const serialized = storage.getItem(STORAGE_KEY);
  if (!serialized) return null;
  const parsed: unknown = JSON.parse(serialized);
  if (!isGameSession(parsed)) throw new Error('Zapis gry ma nieprawidłowy format.');
  return parsed;
}

export function saveSession(storage: Pick<Storage, 'setItem'>, session: GameSession): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function createSession(
  playerIds: string[],
  buyInAmountGrosze: number,
  now = new Date(),
  createId: () => string = createUniqueId,
  customPlayers: Player[] = [],
): GameSession {
  if (playerIds.length < 2) throw new Error('Wybierz co najmniej dwóch graczy.');
  if (playerIds.length > 10) throw new Error('Możesz wybrać maksymalnie 10 graczy.');
  if (new Set(playerIds).size !== playerIds.length) throw new Error('Gracz nie może wystąpić dwa razy.');
  if (customPlayers.some((player) => !playerIds.includes(player.id))) {
    throw new Error('Profile dodatkowych graczy muszą należeć do uczestników sesji.');
  }
  const timestamp = now.toISOString();
  return {
    version: 1,
    id: createId(),
    startedAt: timestamp,
    buyInAmountGrosze,
    ...(customPlayers.length ? { customPlayers } : {}),
    stage: 'playing',
    players: playerIds.map((playerId) => ({ playerId, buyIns: 1, returnedGrosze: null })),
    history: playerIds.map((playerId) => ({
      id: createId(),
      timestamp,
      playerId,
      type: 'first_buyin',
      amountGrosze: buyInAmountGrosze,
    })),
    winnerPlayerId: null,
    settlementConfirmed: false,
  };
}
