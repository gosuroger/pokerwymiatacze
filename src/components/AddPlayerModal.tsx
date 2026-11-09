import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { Player } from '../data/players';
import { Avatar } from './Avatar';

interface AddPlayerModalProps {
  players: Player[];
  onSelect: (playerId: string) => void;
  onAddCustom: (name: string) => void;
  onClose: () => void;
}

export function AddPlayerModal({ players, onSelect, onAddCustom, onClose }: AddPlayerModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function addCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Wpisz imię gracza.');
      return;
    }
    onAddCustom(name);
    setName('');
    setError('');
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="add-player-title">
        <div className="modal-heading">
          <h2 id="add-player-title">Dodaj gracza</h2>
          <button className="icon-button" type="button" aria-label="Zamknij" onClick={onClose}><X /></button>
        </div>
        {players.length > 0 && (
          <div className="add-player-list">
            {players.map((player) => (
              <button type="button" className="add-player-option" key={player.id} onClick={() => onSelect(player.id)}>
                <Avatar player={player} />
                <span>{player.name}</span>
              </button>
            ))}
          </div>
        )}
        {players.length === 0 && <p className="muted">Wszyscy zapisani gracze już uczestniczą w rozgrywce.</p>}
        <form className="custom-player-form" onSubmit={addCustom}>
          <label htmlFor="custom-player-name">Dodaj gracza spoza listy</label>
          <div>
            <input
              id="custom-player-name"
              maxLength={32}
              placeholder="Imię gracza"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
            />
            <button type="submit" className="primary-button" aria-label="Dodaj gracza spoza listy"><Plus size={19} /> Dodaj</button>
          </div>
          {error && <span className="form-error" role="alert">{error}</span>}
          <small>Ten profil będzie dostępny tylko w bieżącej sesji.</small>
        </form>
      </section>
    </div>
  );
}
