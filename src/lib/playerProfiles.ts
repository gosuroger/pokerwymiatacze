import type { Player } from '../data/players';
import { createUniqueId } from './ids';

export function createCustomPlayer(name: string): Player {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Wpisz imię gracza.');
  if (trimmedName.length > 32) throw new Error('Imię gracza może mieć maksymalnie 32 znaki.');
  return {
    id: `custom-${createUniqueId()}`,
    name: trimmedName,
    avatar: '',
  };
}
