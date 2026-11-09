import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Clock3,
  Plus,
  RotateCcw,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { AddPlayerModal } from './components/AddPlayerModal';
import { FinalSummary } from './components/FinalSummary';
import { HistoryModal } from './components/HistoryModal';
import { PlayerCard } from './components/PlayerCard';
import { PlayerSelector } from './components/PlayerSelector';
import { SettlementRow } from './components/SettlementRow';
import { GAME_CONFIG } from './config/game';
import { PLAYERS } from './data/players';
import { useGameSession } from './hooks/useGameSession';
import { calculateSettlement, totalBuyIns, validateSettlement } from './lib/calculations';
import { addCustomPlayer, addPlayer, adjustBuyIn, changeReturn, changeWinner, removePlayer, undoBuyIn } from './lib/gameActions';
import { formatMoney } from './lib/formatting';
import { createCustomPlayer } from './lib/playerProfiles';
import { buildBalancesOnly, buildFullResults } from './lib/sharing';
import { createSession } from './lib/storage';
import type { GameSession } from './types/game';

export default function App() {
  const { session, loadError, saveError, setSession, updateSession } = useGameSession();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftCustomPlayers, setDraftCustomPlayers] = useState<typeof PLAYERS>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [startingNew, setStartingNew] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [toast, setToast] = useState('');
  const [undoAction, setUndoAction] = useState<{ playerId: string; deltaBuyIns: 1 | -1 } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const availableProfiles = useMemo(
    () => [...PLAYERS, ...(!session || startingNew ? draftCustomPlayers : session.customPlayers ?? [])],
    [draftCustomPlayers, session, startingNew],
  );
  const participantProfiles = useMemo(
    () => new Map(availableProfiles.map((player) => [player.id, player])),
    [availableProfiles],
  );
  const toastMessage = (message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(''), 3500);
  };
  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);
  const reportError = (error: unknown) => {
    toastMessage(error instanceof Error ? error.message : 'Operacja nie powiodła się.');
  };

  function startGame() {
    if (selectedIds.length < 2) return;
    if (loadError && !session && !window.confirm('Zapis gry jest uszkodzony. Rozpoczęcie nowej gry zastąpi ten zapis. Kontynuować?')) return;
    try {
      const selectedCustomPlayers = draftCustomPlayers.filter((player) => selectedIds.includes(player.id));
      setSession(createSession(
        selectedIds,
        GAME_CONFIG.buyInAmountGrosze,
        new Date(),
        undefined,
        selectedCustomPlayers,
      ));
      setStartingNew(false);
      setSelectedIds([]);
      setDraftCustomPlayers([]);
      setNewPlayerName('');
      setUndoAction(null);
    } catch (error) {
      reportError(error);
    }
  }

  function beginNewGame() {
    const reminder = session?.settlementConfirmed
      ? ' Przed zastąpieniem możesz skopiować lub udostępnić wyniki.'
      : '';
    if (!window.confirm(`Rozpocząć nową grę? Bieżąca sesja zostanie zastąpiona.${reminder}`)) return;
    setStartingNew(true);
    setSelectedIds([]);
    setDraftCustomPlayers([]);
    setNewPlayerName('');
  }

  function update(updateFn: (current: GameSession) => GameSession) {
    try {
      updateSession(updateFn);
    } catch (error) {
      reportError(error);
    }
  }

  function adjustPlayer(playerId: string, delta: 1 | -1) {
    const timestamp = new Date().toISOString();
    try {
      updateSession((current) => adjustBuyIn(current, playerId, delta, timestamp));
      setUndoAction({ playerId, deltaBuyIns: delta });
      const name = participantProfiles.get(playerId)?.name ?? playerId;
      toastMessage(`${name} ${delta > 0 ? '+' : '−'}${formatMoney(session?.buyInAmountGrosze ?? GAME_CONFIG.buyInAmountGrosze)} — Cofnij`);
    } catch (error) {
      reportError(error);
    }
  }

  function undoLastAction() {
    if (!session || !undoAction) return;
    update((current) => undoBuyIn(current, undoAction));
    setUndoAction(null);
    toastMessage('Ostatnia operacja została cofnięta.');
  }

  function handleAddPlayer(playerId: string) {
    try {
      updateSession((current) => addPlayer(current, playerId, GAME_CONFIG.maxPlayers));
      setShowAddPlayer(false);
      setUndoAction(null);
      toastMessage(`${participantProfiles.get(playerId)?.name ?? playerId} dołącza do gry.`);
    } catch (error) {
      reportError(error);
    }
  }

  function addCustomPlayerToSession(name: string) {
    try {
      const player = createCustomPlayer(name);
      updateSession((current) => addCustomPlayer(current, player, GAME_CONFIG.maxPlayers));
      setShowAddPlayer(false);
      setUndoAction(null);
      toastMessage(`${player.name} dołącza do gry.`);
    } catch (error) {
      reportError(error);
    }
  }

  function addCustomPlayerToSelection() {
    if (selectedIds.length >= GAME_CONFIG.maxPlayers) {
      toastMessage(`Możesz wybrać maksymalnie ${GAME_CONFIG.maxPlayers} graczy.`);
      return;
    }
    try {
      const player = createCustomPlayer(newPlayerName);
      setDraftCustomPlayers((current) => [...current, player]);
      setSelectedIds((current) => [...current, player.id]);
      setNewPlayerName('');
    } catch (error) {
      reportError(error);
    }
  }

  function changeStage(stage: GameSession['stage']) {
    if (!session) return;
    update((current) => ({
      ...current,
      stage,
      settlementConfirmed: stage === 'final' ? current.settlementConfirmed : false,
    }));
    setUndoAction(null);
  }

  async function copyText(text: string, successMessage: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Schowek nie jest dostępny w tej przeglądarce.');
      await navigator.clipboard.writeText(text);
      toastMessage(successMessage);
    } catch (error) {
      reportError(error);
    }
  }

  async function shareResults() {
    if (!session) return;
    const text = buildFullResults(session, availableProfiles);
    if (!navigator.share) {
      await copyText(text, 'Wyniki skopiowano — możesz je wkleić do wiadomości.');
      return;
    }
    try {
      await navigator.share({ title: 'Wyniki Poker Bank', text });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toastMessage('Udostępnianie anulowano.');
      } else {
        reportError(error);
      }
    }
  }

  function exportSession() {
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poker-bank-${session.startedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toastMessage('Eksport sesji został pobrany.');
  }

  if (!session || startingNew) {
    return (
      <div className="app-shell selection-screen">
        <header className="selection-header">
          <div className="brand-mark">♠</div>
          <div><p className="eyebrow">Poker Bank</p><h1>{startingNew ? 'Nowa rozgrywka' : 'Wybierz graczy'}</h1></div>
        </header>
        {(loadError && !startingNew) && (
          <div className="notice error-notice" role="alert">
            <strong>Nie udało się przywrócić zapisanej gry.</strong> {loadError} Zapis nie został usunięty.
          </div>
        )}
        {saveError && <div className="notice error-notice" role="alert">{saveError}</div>}
        <div className="selection-info">
          <span>Wybierz uczestników</span>
          <strong>{selectedIds.length}/{GAME_CONFIG.maxPlayers}</strong>
        </div>
        <PlayerSelector
          players={availableProfiles}
          selectedIds={selectedIds}
          maxPlayers={GAME_CONFIG.maxPlayers}
          onToggle={(playerId) => setSelectedIds((current) =>
            current.includes(playerId)
              ? current.filter((id) => id !== playerId)
              : current.length < GAME_CONFIG.maxPlayers ? [...current, playerId] : current,
          )}
        />
        <form className="selection-custom-form" onSubmit={(event) => {
          event.preventDefault();
          addCustomPlayerToSelection();
        }}>
          <label htmlFor="selection-custom-name">Dodaj gracza spoza listy</label>
          <div>
            <input
              id="selection-custom-name"
              maxLength={32}
              placeholder="Wpisz imię gracza"
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
            />
            <button type="submit" className="secondary-button"><Plus size={18} /> Dodaj</button>
          </div>
          <small>Dodatkowe profile są zapisywane tylko w tej rozgrywce.</small>
        </form>
        <div className="selection-footer">
          <p>Każdy gracz rozpoczyna z wkupieniem {formatMoney(GAME_CONFIG.buyInAmountGrosze)}.</p>
          <button className="primary-button start-button" type="button" disabled={selectedIds.length < 2} onClick={startGame}>
            Rozpocznij grę <span aria-hidden="true">→</span>
          </button>
          {session && startingNew && <button className="text-button" type="button" onClick={() => setStartingNew(false)}>Wróć do bieżącej gry</button>}
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  const totalCount = totalBuyIns(session);
  const totalPaid = totalCount * session.buyInAmountGrosze;

  if (session.stage === 'final' && session.settlementConfirmed) {
    return (
      <div className="app-shell">
        <FinalSummary
          session={session}
          players={availableProfiles}
          onShare={shareResults}
          onCopyFull={() => copyText(buildFullResults(session, availableProfiles), 'Wyniki skopiowano do schowka.')}
          onCopyBalances={() => copyText(buildBalancesOnly(session, availableProfiles), 'Salda skopiowano do schowka.')}
          onExport={exportSession}
          onEdit={() => changeStage('settlement')}
          onNewGame={beginNewGame}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  if (session.stage === 'settlement' || session.stage === 'final') {
    const totals = calculateSettlement(session);
    const validationError = validateSettlement(session);
    return (
      <div className="app-shell settlement-screen">
        <header className="compact-header settlement-header">
          <button className="icon-button" type="button" aria-label="Wróć do rozgrywki" onClick={() => changeStage('playing')}><ArrowLeft /></button>
          <div><p className="eyebrow">Poker Bank</p><h1>Rozliczenie gry</h1></div>
          <button className="icon-button" type="button" aria-label="Historia operacji" onClick={() => setShowHistory(true)}><Clock3 /></button>
        </header>
        {saveError && <div className="notice error-notice" role="alert">{saveError}</div>}
        <p className="settlement-intro">Wpisz kwotę żetonów zwróconych do banku. Kwota musi być wielokrotnością 10 zł.</p>
        <section className="settlement-list">
          {session.players.map((record) => {
            const player = participantProfiles.get(record.playerId);
            const row = totals.rows.find((item) => item.playerId === record.playerId);
            return player && row ? (
              <SettlementRow
                key={record.playerId}
                player={player}
                row={row}
                onCommit={(value) => update((current) => changeReturn(current, record.playerId, value))}
                onError={toastMessage}
              />
            ) : null;
          })}
        </section>
        <section className="allin-panel">
          <p className="eyebrow">Końcowy all-in</p>
          <strong className="allin-amount">{totals.allInPoolGrosze === null ? '—' : formatMoney(totals.allInPoolGrosze)}</strong>
          <p>Do rozegrania w końcowym all-inie</p>
          {totals.allInPoolGrosze !== null && totals.allInPoolGrosze > 0 && (
            <div className="winner-selector">
              <strong>Wybierz zwycięzcę całej puli</strong>
              <div>
                {session.players.map((record) => {
                  const player = participantProfiles.get(record.playerId);
                  if (!player) return null;
                  return (
                    <button
                      type="button"
                      key={record.playerId}
                      className={`winner-option ${session.winnerPlayerId === record.playerId ? 'chosen' : ''}`}
                      aria-pressed={session.winnerPlayerId === record.playerId}
                      onClick={() => update((current) => changeWinner(current, record.playerId))}
                    >
                      {player.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
        <section className="settlement-totals">
          <div><span>Łączne wkupienia</span><strong>{totalCount}</strong></div>
          <div><span>Suma wpłat</span><strong>{formatMoney(totalPaid)}</strong></div>
          <div><span>Suma zwrotów</span><strong>{totals.totalReturnedGrosze === null ? 'Niekompletna' : formatMoney(totals.totalReturnedGrosze)}</strong></div>
          {totals.finalBalanceGrosze !== null && <div><span>Suma sald po all-inie</span><strong className={totals.finalBalanceGrosze === 0 ? 'positive' : 'negative'}>{formatMoney(totals.finalBalanceGrosze)}</strong></div>}
        </section>
        {validationError && <p className="validation-message" role="status">{validationError}</p>}
        {!validationError && (
          <p className="confirmation-note">
            Cała nierozliczona kwota {formatMoney(totals.allInPoolGrosze ?? 0)} zostanie przypisana wybranemu zwycięzcy.
          </p>
        )}
        <div className="settlement-footer">
          <button className="secondary-button" type="button" onClick={() => changeStage('playing')}>Wróć do gry</button>
          <button
            className="primary-button"
            type="button"
            disabled={Boolean(validationError)}
            onClick={() => {
              const error = validateSettlement(session);
              if (error) return toastMessage(error);
              if (!window.confirm(`Cała nierozliczona kwota ${formatMoney(totals.allInPoolGrosze ?? 0)} zostanie przypisana wybranemu zwycięzcy. Zatwierdzić rozliczenie?`)) return;
              update((current) => ({ ...current, stage: 'final', settlementConfirmed: true }));
            }}
          >
            Zatwierdź i pokaż wyniki
          </button>
        </div>
        {showHistory && <HistoryModal entries={session.history} players={availableProfiles} onClose={() => setShowHistory(false)} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  const availablePlayers = availableProfiles.filter((player) => !session.players.some((record) => record.playerId === player.id));
  return (
    <div className="app-shell game-screen">
      <header className="game-header">
        <div className="brand-line"><span className="brand-mark">♠</span><div><p className="eyebrow">POKER BANK</p><h1>Rozgrywka</h1></div></div>
        <div className="game-stats">
          <div><Wallet size={17} /><span>Pula</span><strong>{formatMoney(totalPaid)}</strong></div>
          <div><UsersRound size={17} /><span>Wkupienia</span><strong>{totalCount}</strong></div>
        </div>
      </header>
      {saveError && <div className="notice error-notice" role="alert">{saveError}</div>}
      <section className={`players-grid count-${session.players.length}`} aria-label="Uczestnicy rozgrywki">
        {session.players.map((record) => {
          const player = participantProfiles.get(record.playerId);
          if (!player) return null;
          return (
            <PlayerCard
              key={record.playerId}
              player={player}
              record={record}
              buyInAmountGrosze={session.buyInAmountGrosze}
              onAdjust={(delta) => adjustPlayer(record.playerId, delta)}
              onRemove={() => {
                updateSession((current) => removePlayer(current, record.playerId));
                setUndoAction(null);
              }}
              onError={toastMessage}
            />
          );
        })}
      </section>
      <footer className="action-bar">
        <button type="button" className="action-button" onClick={() => setShowHistory(true)}><Clock3 size={19} /><span>Historia</span></button>
        <button
          type="button"
          className="action-button"
          disabled={session.players.length >= GAME_CONFIG.maxPlayers || availablePlayers.length === 0}
          onClick={() => setShowAddPlayer(true)}
        ><Plus size={19} /><span>Dodaj gracza</span></button>
        <button type="button" className="action-button settle-action" onClick={() => changeStage('settlement')}><RotateCcw size={19} /><span>Rozlicz grę</span></button>
      </footer>
      {undoAction && (
        <button className="undo-toast" type="button" onClick={undoLastAction}>
          <span>{participantProfiles.get(undoAction.playerId)?.name ?? 'Gracz'} — Cofnij</span>
          <strong>Cofnij</strong>
        </button>
      )}
      {showHistory && <HistoryModal entries={session.history} players={availableProfiles} onClose={() => setShowHistory(false)} />}
      {showAddPlayer && (
        <AddPlayerModal
          players={availablePlayers}
          onSelect={handleAddPlayer}
          onAddCustom={addCustomPlayerToSession}
          onClose={() => setShowAddPlayer(false)}
        />
      )}
      {toast && !undoAction && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
