import { useState } from 'react';
import type { Player } from '../data/players';

interface AvatarProps {
  player: Player;
  size?: 'small' | 'large';
}

export function Avatar({ player, size = 'small' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === 'large' ? 'avatar-large' : 'avatar-small';
  return (
    <span className={`avatar ${sizeClass}`} aria-label={player.name}>
      {!failed && player.avatar ? (
        <img
          src={`${import.meta.env.BASE_URL}${player.avatar}`}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{player.name.charAt(0).toLocaleUpperCase('pl-PL')}</span>
      )}
    </span>
  );
}
