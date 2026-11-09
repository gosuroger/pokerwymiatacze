import type { GameSession, HistoryEntry } from '../types/game';
import { GAME_CONFIG } from '../config/game';
import { createUniqueId } from './ids';
import type { Player } from '../data/players';

export interface UndoAction {
  playerId: string;
  deltaBuyIns: number;
}

function historyEntry(
  playerId: string | null,
  type: HistoryEntry['type'],
  timestamp: string,
  values: Partial<HistoryEntry> = {},
): HistoryEntry {
  return { id: createUniqueId(), timestamp, playerId, type, ...values };
}

export function adjustBuyIn(
  session: GameSession,
  playerId: string,
  deltaBuyIns: 1 | -1,
  timestamp = new Date().toISOString(),
): GameSession {
  const player = session.players.find((item) => item.playerId === playerId);
  if (!player) throw new Error('Nie znaleziono gracza w tej rozgrywce.');
  if (session.stage !== 'playing') throw new Error('Wróć do rozgrywki, aby zmienić wkupienia.');
  if (deltaBuyIns < 0 && player.buyIns <= 1) throw new Error('Każdy gracz musi mieć co najmniej jedno wkupienie.');
  const type = deltaBuyIns > 0 ? 'rebuy' : 'rebuy_correction';
  return {
    ...session,
    settlementConfirmed: false,
    players: session.players.map((item) =>
      item.playerId === playerId ? { ...item, buyIns: item.buyIns + deltaBuyIns } : item,
    ),
    history: [
      ...session.history,
      historyEntry(playerId, type, timestamp, {
        amountGrosze: deltaBuyIns * session.buyInAmountGrosze,
      }),
    ],
  };
}

export function undoBuyIn(
  session: GameSession,
  action: UndoAction,
  timestamp = new Date().toISOString(),
): GameSession {
  const player = session.players.find((item) => item.playerId === action.playerId);
  if (!player) throw new Error('Nie można cofnąć operacji: gracz nie bierze już udziału.');
  const reversal = action.deltaBuyIns * -1;
  if (player.buyIns + reversal < 1) throw new Error('Cofnięcie nie może usunąć ostatniego wkupienia.');
  return {
    ...session,
    settlementConfirmed: false,
    players: session.players.map((item) =>
      item.playerId === action.playerId ? { ...item, buyIns: item.buyIns + reversal } : item,
    ),
    history: [
      ...session.history,
      historyEntry(action.playerId, 'rebuy_correction', timestamp, {
        amountGrosze: reversal * session.buyInAmountGrosze,
      }),
    ],
  };
}

export function addPlayer(
  session: GameSession,
  playerId: string,
  maxPlayers: number,
  timestamp = new Date().toISOString(),
): GameSession {
  return addParticipant(session, playerId, maxPlayers, timestamp);
}

export function addCustomPlayer(
  session: GameSession,
  player: Player,
  maxPlayers: number,
  timestamp = new Date().toISOString(),
): GameSession {
  if (!player.id.startsWith('custom-') || !player.name.trim() || player.avatar !== '') {
    throw new Error('Nieprawidłowy profil dodatkowego gracza.');
  }
  return addParticipant(session, player.id, maxPlayers, timestamp, player);
}

function addParticipant(
  session: GameSession,
  playerId: string,
  maxPlayers: number,
  timestamp: string,
  customPlayer?: Player,
): GameSession {
  if (session.stage !== 'playing') throw new Error('Wróć do rozgrywki, aby dodać gracza.');
  if (session.players.some((player) => player.playerId === playerId)) throw new Error('Ten gracz już uczestniczy w grze.');
  if (session.players.length >= maxPlayers) throw new Error(`Limit uczestników wynosi ${maxPlayers}.`);
  if (customPlayer && session.customPlayers?.some((player) => player.id === playerId)) {
    throw new Error('Ten dodatkowy profil już istnieje w tej sesji.');
  }
  return {
    ...session,
    ...(customPlayer
      ? { customPlayers: [...(session.customPlayers ?? []), customPlayer] }
      : {}),
    settlementConfirmed: false,
    players: [...session.players, { playerId, buyIns: 1, returnedGrosze: null }],
    history: [
      ...session.history,
      historyEntry(playerId, 'player_added', timestamp, {
        amountGrosze: session.buyInAmountGrosze,
      }),
    ],
  };
}

export function removePlayer(
  session: GameSession,
  playerId: string,
  timestamp = new Date().toISOString(),
): GameSession {
  if (session.stage !== 'playing') throw new Error('Wróć do rozgrywki, aby usunąć gracza.');
  if (session.players.length <= 1) throw new Error('Nie można usunąć ostatniego uczestnika.');
  const player = session.players.find((item) => item.playerId === playerId);
  if (!player) throw new Error('Nie znaleziono gracza w tej rozgrywce.');
  const removedWinner = session.winnerPlayerId === playerId;
  return {
    ...session,
    settlementConfirmed: false,
    winnerPlayerId: removedWinner ? null : session.winnerPlayerId,
    players: session.players.filter((item) => item.playerId !== playerId),
    history: [
      ...session.history,
      historyEntry(playerId, 'player_removed', timestamp, {
        amountGrosze: -player.buyIns * session.buyInAmountGrosze,
      }),
      ...(removedWinner ? [historyEntry(null, 'winner_changed', timestamp, {
        previousPlayerId: playerId,
        newPlayerId: null,
      })] : []),
    ],
  };
}

export function changeReturn(
  session: GameSession,
  playerId: string,
  returnedGrosze: number,
  timestamp = new Date().toISOString(),
): GameSession {
  if (session.stage !== 'settlement') throw new Error('Zwroty można zmienić na ekranie rozliczenia.');
  if (
    !Number.isSafeInteger(returnedGrosze) ||
    returnedGrosze < 0 ||
    returnedGrosze % GAME_CONFIG.settlementStepGrosze !== 0
  ) {
    throw new Error('Zwrot musi być nieujemną wielokrotnością 10 zł.');
  }
  const player = session.players.find((item) => item.playerId === playerId);
  if (!player) throw new Error('Nie znaleziono gracza w tej rozgrywce.');
  if (player.returnedGrosze === returnedGrosze) return session;
  const previous = player.returnedGrosze;
  return {
    ...session,
    settlementConfirmed: false,
    players: session.players.map((item) =>
      item.playerId === playerId ? { ...item, returnedGrosze } : item,
    ),
    history: [
      ...session.history,
      historyEntry(playerId, 'return_changed', timestamp, {
        previousGrosze: previous ?? 0,
        newGrosze: returnedGrosze,
      }),
    ],
  };
}

export function changeWinner(
  session: GameSession,
  winnerPlayerId: string | null,
  timestamp = new Date().toISOString(),
): GameSession {
  if (session.stage !== 'settlement') throw new Error('Zwycięzcę można wybrać na ekranie rozliczenia.');
  if (winnerPlayerId && !session.players.some((player) => player.playerId === winnerPlayerId)) {
    throw new Error('Zwycięzca musi uczestniczyć w bieżącej grze.');
  }
  if (session.winnerPlayerId === winnerPlayerId) return session;
  return {
    ...session,
    settlementConfirmed: false,
    winnerPlayerId,
    history: [
      ...session.history,
      historyEntry(winnerPlayerId, 'winner_changed', timestamp, {
        previousPlayerId: session.winnerPlayerId,
        newPlayerId: winnerPlayerId,
      }),
    ],
  };
}
