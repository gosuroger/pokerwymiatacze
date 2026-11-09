import { useEffect, useState } from 'react';
import type { Player } from '../data/players';
import { GAME_CONFIG } from '../config/game';
import { formatMoney, formatSignedMoney, parseMoneyInput } from '../lib/formatting';
import type { SettlementRowData } from '../types/game';
import { Avatar } from './Avatar';

interface SettlementRowProps {
  player: Player;
  row: SettlementRowData;
  onCommit: (value: number) => void;
  onError: (message: string) => void;
}

export function SettlementRow({ player, row, onCommit, onError }: SettlementRowProps) {
  const [draft, setDraft] = useState(row.returnedGrosze === null ? '' : String(row.returnedGrosze / 100));
  useEffect(() => {
    setDraft(row.returnedGrosze === null ? '' : String(row.returnedGrosze / 100));
  }, [row.returnedGrosze]);

  function commit() {
    const normalized = draft.trim().replace(',', '.');
    if (!normalized) {
      onError('Wpisz kwotę zwróconą do banku.');
      setDraft(row.returnedGrosze === null ? '' : String(row.returnedGrosze / 100));
      return;
    }
    const grosze = parseMoneyInput(normalized);
    if (
      grosze === null ||
      !Number.isSafeInteger(grosze) ||
      grosze < 0 ||
      grosze % GAME_CONFIG.settlementStepGrosze !== 0
    ) {
      onError('Wpisz nieujemną kwotę w pełnych dziesiątkach złotych.');
      setDraft(row.returnedGrosze === null ? '' : String(row.returnedGrosze / 100));
      return;
    }
    onCommit(grosze);
  }

  return (
    <div className="settlement-row">
      <div className="settlement-player">
        <Avatar player={player} />
        <div><strong>{player.name}</strong><small>{row.buyIns}× · wpłata {formatMoney(row.paidGrosze)}</small></div>
      </div>
      <label className="return-input">
        <span>Zwrócił do banku</span>
        <span className="input-with-suffix">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step={GAME_CONFIG.settlementStepGrosze / 100}
            placeholder="np. 40"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span>zł</span>
        </span>
      </label>
      <div className={`settlement-balance ${row.baseBalanceGrosze === null ? '' : row.baseBalanceGrosze > 0 ? 'positive' : row.baseBalanceGrosze < 0 ? 'negative' : 'neutral'}`}>
        <small>Saldo</small>
        <strong>{row.baseBalanceGrosze === null ? '—' : formatSignedMoney(row.baseBalanceGrosze)}</strong>
      </div>
    </div>
  );
}
