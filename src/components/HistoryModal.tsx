import { X } from 'lucide-react';
import type { Player } from '../data/players';
import type { HistoryEntry } from '../types/game';
import { formatMoney, formatTimestamp } from '../lib/formatting';

interface HistoryModalProps {
  entries: HistoryEntry[];
  players: Player[];
  onClose: () => void;
}

function describe(entry: HistoryEntry, players: Player[]): string {
  const name = players.find((player) => player.id === entry.playerId)?.name ?? 'Gra';
  switch (entry.type) {
    case 'first_buyin': return `${name} — pierwsze wkupienie +${formatMoney(entry.amountGrosze ?? 0)}`;
    case 'rebuy': return `${name} — rebuy +${formatMoney(entry.amountGrosze ?? 0)}`;
    case 'rebuy_correction': {
      const amount = entry.amountGrosze ?? 0;
      return `${name} — korekta ${amount > 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
    }
    case 'player_added': return `${name} — dołączył do gry +${formatMoney(entry.amountGrosze ?? 0)}`;
    case 'player_removed': return `${name} — usunięty z gry −${formatMoney(Math.abs(entry.amountGrosze ?? 0))}`;
    case 'return_changed':
      return `${name} — zwrot zmieniony z ${formatMoney(entry.previousGrosze ?? 0)} na ${formatMoney(entry.newGrosze ?? 0)}`;
    case 'winner_changed': {
      const previous = players.find((player) => player.id === entry.previousPlayerId)?.name ?? 'brak';
      const winner = players.find((player) => player.id === entry.newPlayerId)?.name ?? 'brak';
      return `Zwycięzca all-ina zmieniony z ${previous} na ${winner}`;
    }
  }
}

export function HistoryModal({ entries, players, onClose }: HistoryModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div className="modal-heading">
          <h2 id="history-title">Historia operacji</h2>
          <button className="icon-button" type="button" aria-label="Zamknij historię" onClick={onClose}><X /></button>
        </div>
        <ol className="history-list">
          {[...entries].reverse().map((entry) => (
            <li key={entry.id}>
              <time>{formatTimestamp(entry.timestamp)}</time>
              <span>{describe(entry, players)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
