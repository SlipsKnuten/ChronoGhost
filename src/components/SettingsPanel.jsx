import React, { useState, useEffect } from 'react';
import KeybindCapture from './KeybindCapture';

const DEFAULT_KEYBINDS = {
  timerSlots: [
    { slotNumber: 1, toggle: { key: 'F1', modifiers: [], label: 'F1' }, reset: { key: 'F1', modifiers: ['shift'], label: 'Shift+F1' } },
    { slotNumber: 2, toggle: { key: 'F2', modifiers: [], label: 'F2' }, reset: { key: 'F2', modifiers: ['shift'], label: 'Shift+F2' } },
    { slotNumber: 3, toggle: { key: 'F3', modifiers: [], label: 'F3' }, reset: { key: 'F3', modifiers: ['shift'], label: 'Shift+F3' } },
    { slotNumber: 4, toggle: { key: 'F4', modifiers: [], label: 'F4' }, reset: { key: 'F4', modifiers: ['shift'], label: 'Shift+F4' } },
    { slotNumber: 5, toggle: { key: 'F5', modifiers: [], label: 'F5' }, reset: { key: 'F5', modifiers: ['shift'], label: 'Shift+F5' } },
    { slotNumber: 6, toggle: { key: 'F6', modifiers: [], label: 'F6' }, reset: { key: 'F6', modifiers: ['shift'], label: 'Shift+F6' } },
    { slotNumber: 7, toggle: { key: 'F7', modifiers: [], label: 'F7' }, reset: { key: 'F7', modifiers: ['shift'], label: 'Shift+F7' } },
    { slotNumber: 8, toggle: { key: 'F8', modifiers: [], label: 'F8' }, reset: { key: 'F8', modifiers: ['shift'], label: 'Shift+F8' } },
    { slotNumber: 9, toggle: { key: 'F9', modifiers: [], label: 'F9' }, reset: { key: 'F9', modifiers: ['shift'], label: 'Shift+F9' } },
  ],
  selectedTimer: {
    toggle: { key: ' ', modifiers: [], label: 'Space' },
    reset: { key: 'r', modifiers: [], label: 'R' }
  }
};

const SettingsPanel = ({ isOpen, onClose, keybinds, onSaveKeybinds }) => {
  const [localKeybinds, setLocalKeybinds] = useState(keybinds || DEFAULT_KEYBINDS);

  useEffect(() => {
    if (keybinds) {
      setLocalKeybinds(keybinds);
    }
  }, [keybinds]);

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
    setLocalKeybinds(DEFAULT_KEYBINDS);
  };

  const handleSave = () => {
    onSaveKeybinds(localKeybinds);
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
            <h3>Selected Timer Keybinds</h3>
            <p className="settings-description">
              These keybinds control whichever timer is currently selected (highlighted).
            </p>
            <KeybindCapture
              label="Toggle (Start/Pause)"
              currentKeybind={localKeybinds.selectedTimer.toggle}
              onCapture={(kb) => handleSelectedTimerKeybindChange('toggle', kb)}
              existingKeybinds={getAllKeybinds()}
            />
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

export { DEFAULT_KEYBINDS };
export default SettingsPanel;
