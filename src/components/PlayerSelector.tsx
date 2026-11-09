import type { Player } from '../data/players';
import { Avatar } from './Avatar';

interface PlayerSelectorProps {
  players: Player[];
  selectedIds: string[];
  onToggle: (playerId: string) => void;
  maxPlayers: number;
}

export function PlayerSelector({
  players,
  selectedIds,
  onToggle,
  maxPlayers,
}: PlayerSelectorProps) {
  return (
    <div className="selection-grid">
      {players.map((player) => {
        const selected = selectedIds.includes(player.id);
        const disabled = !selected && selectedIds.length >= maxPlayers;
        return (
          <button
            type="button"
            className={`select-player ${selected ? 'selected' : ''}`}
            aria-pressed={selected}
            disabled={disabled}
            key={player.id}
            onClick={() => onToggle(player.id)}
          >
            <Avatar player={player} size="large" />
            <span>{player.name}</span>
          </button>
        );
      })}
    </div>
  );
}
