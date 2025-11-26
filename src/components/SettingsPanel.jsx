import React, { useState, useEffect } from 'react';
import KeybindCapture from './KeybindCapture';
import { getModifierKey } from '../utils/platform';

const generateDefaultKeybinds = (modifierSymbol) => ({
  timerSlots: [
    { slotNumber: 1, toggle: { key: '1', modifiers: ['ctrl'], label: `${modifierSymbol}+1` }, reset: { key: '1', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+1` } },
    { slotNumber: 2, toggle: { key: '2', modifiers: ['ctrl'], label: `${modifierSymbol}+2` }, reset: { key: '2', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+2` } },
    { slotNumber: 3, toggle: { key: '3', modifiers: ['ctrl'], label: `${modifierSymbol}+3` }, reset: { key: '3', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+3` } },
    { slotNumber: 4, toggle: { key: '4', modifiers: ['ctrl'], label: `${modifierSymbol}+4` }, reset: { key: '4', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+4` } },
    { slotNumber: 5, toggle: { key: '5', modifiers: ['ctrl'], label: `${modifierSymbol}+5` }, reset: { key: '5', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+5` } },
    { slotNumber: 6, toggle: { key: '6', modifiers: ['ctrl'], label: `${modifierSymbol}+6` }, reset: { key: '6', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+6` } },
    { slotNumber: 7, toggle: { key: '7', modifiers: ['ctrl'], label: `${modifierSymbol}+7` }, reset: { key: '7', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+7` } },
    { slotNumber: 8, toggle: { key: '8', modifiers: ['ctrl'], label: `${modifierSymbol}+8` }, reset: { key: '8', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+8` } },
    { slotNumber: 9, toggle: { key: '9', modifiers: ['ctrl'], label: `${modifierSymbol}+9` }, reset: { key: '9', modifiers: ['ctrl', 'shift'], label: `${modifierSymbol}+Shift+9` } },
  ],
  selectedTimer: {
    toggle: { key: ' ', modifiers: ['ctrl'], label: `${modifierSymbol}+Space` },
    reset: { key: 'r', modifiers: ['ctrl'], label: `${modifierSymbol}+R` }
  }
});

const SettingsPanel = ({ isOpen, onClose, keybinds, onSaveKeybinds, opacity, onOpacityChange, muted, onMutedChange }) => {
  const modifierSymbol = getModifierKey();
  const defaultKeybinds = generateDefaultKeybinds(modifierSymbol);
  const [localKeybinds, setLocalKeybinds] = useState(keybinds || defaultKeybinds);
  const [localOpacity, setLocalOpacity] = useState(opacity || 0.85);
  const [localMuted, setLocalMuted] = useState(muted || false);

  useEffect(() => {
    if (keybinds && defaultKeybinds) {
      // Migrate old F-key bindings to new Ctrl-based bindings
      const migratedKeybinds = { ...keybinds };
      let needsMigration = false;

      // Check timer slots for F1-F9 keys
      migratedKeybinds.timerSlots = keybinds.timerSlots.map((slot, index) => {
        const defaultSlot = defaultKeybinds.timerSlots[index];
        if (!defaultSlot) return slot;

        const migratedSlot = { ...slot };

        // Migrate toggle keybind if it uses F-key
        if (slot.toggle && slot.toggle.key && slot.toggle.key.toLowerCase().match(/^f\d$/)) {
          migratedSlot.toggle = defaultSlot.toggle;
          needsMigration = true;
        }

        // Migrate reset keybind if it uses F-key
        if (slot.reset && slot.reset.key && slot.reset.key.toLowerCase().match(/^f\d$/)) {
          migratedSlot.reset = defaultSlot.reset;
          needsMigration = true;
        }

        return migratedSlot;
      });

      // Migrate selected timer reset keybind if it doesn't have modifiers
      if (migratedKeybinds.selectedTimer &&
          migratedKeybinds.selectedTimer.reset &&
          migratedKeybinds.selectedTimer.reset.modifiers &&
          migratedKeybinds.selectedTimer.reset.modifiers.length === 0) {
        migratedKeybinds.selectedTimer.reset = defaultKeybinds.selectedTimer.reset;
        needsMigration = true;
      }

      setLocalKeybinds(migratedKeybinds);

      // Auto-save migrated keybinds
      if (needsMigration && onSaveKeybinds) {
        onSaveKeybinds(migratedKeybinds);
      }
    }
  }, [keybinds, defaultKeybinds]);

  useEffect(() => {
    if (opacity !== undefined) {
      setLocalOpacity(opacity);
    }
  }, [opacity]);

  useEffect(() => {
    if (muted !== undefined) {
      setLocalMuted(muted);
    }
  }, [muted]);

  // Get all current keybinds for duplicate checking
  const getAllKeybinds = () => {
    const all = [];
    localKeybinds.timerSlots.forEach(slot => {
      if (slot.toggle) all.push(slot.toggle);
      if (slot.reset) all.push(slot.reset);
    });
    if (localKeybinds.selectedTimer.toggle) all.push(localKeybinds.selectedTimer.toggle);
    if (localKeybinds.selectedTimer.reset) all.push(localKeybinds.selectedTimer.reset);
    return all;
  };

  const handleSlotKeybindChange = (slotNumber, action, newKeybind) => {
    setLocalKeybinds(prev => ({
      ...prev,
      timerSlots: prev.timerSlots.map(slot =>
        slot.slotNumber === slotNumber
          ? { ...slot, [action]: newKeybind }
          : slot
      )
    }));
  };

  const handleSelectedTimerKeybindChange = (action, newKeybind) => {
    setLocalKeybinds(prev => ({
      ...prev,
      selectedTimer: {
        ...prev.selectedTimer,
        [action]: newKeybind
      }
    }));
  };

  const handleRestoreDefaults = () => {
    if (defaultKeybinds) {
      setLocalKeybinds(defaultKeybinds);
    }
    setLocalOpacity(0.85);
    setLocalMuted(false);
  };

  const handleOpacityChange = (e) => {
    setLocalOpacity(parseFloat(e.target.value));
  };

  const handleSave = () => {
    onSaveKeybinds(localKeybinds);
    if (onOpacityChange) {
      onOpacityChange(localOpacity);
    }
    if (onMutedChange) {
      onMutedChange(localMuted);
    }
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className={`settings-backdrop ${isOpen ? 'open' : ''}`}
        onClick={handleBackdropClick}
      />
      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Sound Notifications</h3>
            <p className="settings-description">
              Play a sound when a timer finishes.
            </p>
            <div className="toggle-container">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!localMuted}
                  onChange={(e) => setLocalMuted(!e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">{localMuted ? 'Muted' : 'Enabled'}</span>
            </div>
          </div>

          <div className="settings-section">
            <h3>Transparency</h3>
            <p className="settings-description">
              Adjust the opacity of the entire app. Useful for competitive gaming overlays.
            </p>
            <div className="opacity-slider-container">
              <div className="opacity-labels">
                <span className="opacity-label">Transparent (30%)</span>
                <span className="opacity-value">{Math.round(localOpacity * 100)}%</span>
                <span className="opacity-label">Opaque (100%)</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={localOpacity}
                onChange={handleOpacityChange}
                className="opacity-slider"
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>Selected Timer Keybinds</h3>
            <p className="settings-description">
              These keybinds control whichever timer is currently selected (highlighted).
            </p>
            <KeybindCapture
              label="Reset"
              currentKeybind={localKeybinds.selectedTimer.reset}
              onCapture={(kb) => handleSelectedTimerKeybindChange('reset', kb)}
              existingKeybinds={getAllKeybinds()}
            />
          </div>

          <div className="settings-section">
            <h3>Per-Timer Keybinds</h3>
            <p className="settings-description">
              Assign keybinds to specific timer positions. Pressing the key selects and controls that timer.
            </p>
            {localKeybinds.timerSlots.map((slot) => (
              <div key={slot.slotNumber} className="timer-slot-group">
                <h4>Timer Slot {slot.slotNumber}</h4>
                <KeybindCapture
                  label="Toggle"
                  currentKeybind={slot.toggle}
                  onCapture={(kb) => handleSlotKeybindChange(slot.slotNumber, 'toggle', kb)}
                  existingKeybinds={getAllKeybinds()}
                />
                <KeybindCapture
                  label="Reset"
                  currentKeybind={slot.reset}
                  onCapture={(kb) => handleSlotKeybindChange(slot.slotNumber, 'reset', kb)}
                  existingKeybinds={getAllKeybinds()}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-btn-secondary" onClick={handleRestoreDefaults}>
            Restore Defaults
          </button>
          <button className="settings-btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </>
  );
};

export { generateDefaultKeybinds };
export default SettingsPanel;
