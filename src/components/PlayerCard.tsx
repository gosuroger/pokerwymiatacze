import { Minus, Plus, UserRoundX } from 'lucide-react';
import type { Player } from '../data/players';
import { formatMoney } from '../lib/formatting';
import type { SessionPlayer } from '../types/game';
import { Avatar } from './Avatar';

interface PlayerCardProps {
  player: Player;
  record: SessionPlayer;
  buyInAmountGrosze: number;
  onAdjust: (delta: 1 | -1) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}

export function PlayerCard({
  player,
  record,
  buyInAmountGrosze,
  onAdjust,
  onRemove,
  onError,
}: PlayerCardProps) {
  return (
    <article className="player-card">
      <button
        className="remove-player"
        type="button"
        aria-label={`Opcje gracza ${player.name}`}
        title="Usuń z rozgrywki"
        onClick={() => {
          if (window.confirm(`Usunąć ${player.name} z tej rozgrywki? Jego wkupienia zostaną odjęte od puli.`)) {
            try {
              onRemove();
            } catch (error) {
              onError(error instanceof Error ? error.message : 'Nie udało się usunąć gracza.');
            }
          }
        }}
      >
        <UserRoundX size={17} />
      </button>
      <Avatar player={player} size="large" />
      <strong className="player-name">{player.name}</strong>
      <strong className="player-amount">
        {formatMoney(record.buyIns * buyInAmountGrosze)}
        <span className="player-count"> · {record.buyIns}×</span>
      </strong>
      <div className="buyin-actions">
        <button
          type="button"
          className="buyin-button minus"
          aria-label={`Odejmij wkupienie graczowi ${player.name}`}
          disabled={record.buyIns <= 1}
          onClick={() => onAdjust(-1)}
        >
          <Minus size={22} />
        </button>
        <button
          type="button"
          className="buyin-button plus"
          aria-label={`Dodaj wkupienie graczowi ${player.name}`}
          onClick={() => onAdjust(1)}
        >
          <Plus size={24} />
        </button>
      </div>
    </article>
  );
}
