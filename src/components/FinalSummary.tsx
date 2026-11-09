import { CheckCircle2, Download, Share2, Copy } from 'lucide-react';
import type { Player } from '../data/players';
import { formatMoney, formatSignedMoney } from '../lib/formatting';
import { calculateSettlement } from '../lib/calculations';
import { calculateTransfers } from '../lib/transfers';
import type { GameSession } from '../types/game';
import { Avatar } from './Avatar';

interface FinalSummaryProps {
  session: GameSession;
  players: Player[];
  onShare: () => void;
  onCopyFull: () => void;
  onCopyBalances: () => void;
  onExport: () => void;
  onEdit: () => void;
  onNewGame: () => void;
}

export function FinalSummary({
  session,
  players,
  onShare,
  onCopyFull,
  onCopyBalances,
  onExport,
  onEdit,
  onNewGame,
}: FinalSummaryProps) {
  const totals = calculateSettlement(session);
  const transfers = calculateTransfers(totals.rows);
  const playerName = (id: string) => players.find((player) => player.id === id)?.name ?? id;
  const winner = (totals.allInPoolGrosze ?? 0) > 0
    ? players.find((player) => player.id === session.winnerPlayerId)
    : undefined;
  return (
    <main className="final-screen">
      <div className="final-title">
        <CheckCircle2 size={26} className="green-icon" />
        <div><p className="eyebrow">Gra rozliczona</p><h1>Wyniki końcowe</h1></div>
      </div>
      <section className="final-rows" aria-label="Wyniki graczy">
        {totals.rows.map((row) => {
          const player = players.find((item) => item.id === row.playerId);
          if (!player) return null;
          const balance = row.finalBalanceGrosze ?? 0;
          return (
            <div className="final-row" key={row.playerId}>
              <div className="final-player"><Avatar player={player} /><strong>{player.name}</strong></div>
              <div className="final-details">
                <span>{row.buyIns}× · {formatMoney(row.paidGrosze)} wpł.</span>
                <span>{formatMoney(row.returnedGrosze ?? 0)} zwrot</span>
                {row.allInBonusGrosze > 0 && <span className="winner-tag">All-in +{formatMoney(row.allInBonusGrosze)}</span>}
              </div>
              <strong className={`final-balance ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'}`}>
                {formatSignedMoney(balance)}
              </strong>
            </div>
          );
        })}
      </section>
      <section className="final-totals">
        <div><span>Łączna pula wkupień</span><strong>{formatMoney(totals.totalPaidGrosze)}</strong></div>
        <div><span>Pula końcowego all-ina</span><strong>{formatMoney(totals.allInPoolGrosze ?? 0)}</strong></div>
        <div><span>Zwycięzca all-ina</span><strong>{winner?.name ?? 'Nie dotyczy'}</strong></div>
        <div className="balance-check"><span>Suma finalnych sald</span><strong>{formatMoney(totals.finalBalanceGrosze ?? 0)} — rozliczenie poprawne</strong></div>
      </section>
      <section className="transfer-plan" aria-labelledby="transfers-title">
        <h2 id="transfers-title">Kto komu przelewa?</h2>
        <p>Minimalna liczba przelewów: <strong>{transfers.length}</strong></p>
        {transfers.length ? (
          <ol>
            {transfers.map((transfer) => (
              <li key={`${transfer.fromPlayerId}-${transfer.toPlayerId}`}>
                <span>{playerName(transfer.fromPlayerId)} → {playerName(transfer.toPlayerId)}</span>
                <strong>{formatMoney(transfer.amountGrosze)}</strong>
              </li>
            ))}
          </ol>
        ) : <p>Wszyscy są rozliczeni — przelewy nie są potrzebne.</p>}
        <p>Po wykonaniu przelewów saldo każdego gracza wyniesie 0 zł.</p>
      </section>
      <div className="share-actions">
        <button className="primary-button" type="button" onClick={onShare}><Share2 size={18} /> Udostępnij wyniki</button>
        <button className="secondary-button" type="button" onClick={onCopyFull}><Copy size={17} /> Kopiuj wyniki</button>
        <button className="secondary-button" type="button" onClick={onCopyBalances}>Kopiuj tylko salda</button>
        <button className="secondary-button" type="button" onClick={onExport}><Download size={17} /> Eksport JSON</button>
      </div>
      <div className="final-footer">
        <button className="text-button" type="button" onClick={onEdit}>Wróć do edycji rozliczenia</button>
        <button className="text-button" type="button" onClick={onNewGame}>Rozpocznij nową grę</button>
      </div>
    </main>
  );
}
