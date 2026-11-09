import type { Player } from '../data/players';

export type GameStage = 'playing' | 'settlement' | 'final';

export interface SessionPlayer {
  playerId: string;
  buyIns: number;
  returnedGrosze: number | null;
}

export type HistoryType =
  | 'first_buyin'
  | 'rebuy'
  | 'rebuy_correction'
  | 'player_added'
  | 'player_removed'
  | 'return_changed'
  | 'winner_changed';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  playerId: string | null;
  type: HistoryType;
  amountGrosze?: number;
  previousGrosze?: number;
  newGrosze?: number;
  previousPlayerId?: string | null;
  newPlayerId?: string | null;
}

export interface GameSession {
  version: 1;
  id: string;
  startedAt: string;
  buyInAmountGrosze: number;
  customPlayers?: Player[];
  stage: GameStage;
  players: SessionPlayer[];
  history: HistoryEntry[];
  winnerPlayerId: string | null;
  settlementConfirmed: boolean;
}

export interface SettlementRowData {
  playerId: string;
  buyIns: number;
  paidGrosze: number;
  returnedGrosze: number | null;
  baseBalanceGrosze: number | null;
  allInBonusGrosze: number;
  finalBalanceGrosze: number | null;
}

export interface SettlementTotals {
  totalBuyIns: number;
  totalPaidGrosze: number;
  totalReturnedGrosze: number | null;
  allInPoolGrosze: number | null;
  finalBalanceGrosze: number | null;
  rows: SettlementRowData[];
}
