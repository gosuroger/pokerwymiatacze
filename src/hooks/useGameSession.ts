import { useCallback, useEffect, useRef, useState } from 'react';
import { readSession, saveSession } from '../lib/storage';
import type { GameSession } from '../types/game';

interface StoredState {
  session: GameSession | null;
  loadError: string | null;
}

export function useGameSession() {
  const [stored, setStored] = useState<StoredState>(() => {
    try {
      return { session: readSession(window.localStorage), loadError: null };
    } catch (error) {
      return {
        session: null,
        loadError: error instanceof Error ? error.message : 'Nie udało się odczytać zapisu gry.',
      };
    }
  });
  const sessionRef = useRef(stored.session);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!stored.session) return;
    try {
      saveSession(window.localStorage, stored.session);
      setSaveError(null);
    } catch {
      setSaveError('Nie udało się zapisać gry. Sprawdź dostępne miejsce w pamięci przeglądarki.');
    }
  }, [stored.session]);

  const updateSession = useCallback((update: (session: GameSession) => GameSession) => {
    if (!sessionRef.current) return;
    const nextSession = update(sessionRef.current);
    sessionRef.current = nextSession;
    setStored({ session: nextSession, loadError: null });
  }, []);

  const setSession = useCallback((session: GameSession) => {
    sessionRef.current = session;
    setStored({ session, loadError: null });
  }, []);

  return {
    session: stored.session,
    loadError: stored.loadError,
    saveError,
    setSession,
    updateSession,
  };
}
