import React, { useState, useEffect } from 'react';
import { getModifierKey } from '../utils/platform';

const KeybindCapture = ({ label, currentKeybind, onCapture, existingKeybinds = [] }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const modifierSymbol = getModifierKey();

  useEffect(() => {
    if (!isCapturing) return;

    const handleKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Allow Escape to cancel capture
      if (event.key === 'Escape') {
        setIsCapturing(false);
        setError('');
        return;
      }

      // Ignore modifier-only keys (Control, Shift, Alt, Meta, AltGraph)
      const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'];
      if (modifierKeys.includes(event.key)) {
        return; // Don't capture, wait for actual key press
      }

      // Build modifiers array
      const modifiers = [];
      if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
      if (event.shiftKey) modifiers.push('shift');
      if (event.altKey) modifiers.push('alt');

      // Create keybind object
      const newKeybind = {
        key: event.key,
        modifiers,
        label: formatKeybindLabel(event.key, modifiers)
      };

      // Check for duplicates
      const isDuplicate = existingKeybinds.some(kb =>
        kb.key === newKeybind.key &&
        JSON.stringify(kb.modifiers.sort()) === JSON.stringify(newKeybind.modifiers.sort())
      );

      if (isDuplicate) {
        setError('This keybind is already in use');
        setTimeout(() => setError(''), 2000);
        setIsCapturing(false);
        return;
      }

      // Capture successful
      onCapture(newKeybind);
      setIsCapturing(false);
      setError('');
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isCapturing, onCapture, existingKeybinds]);

  const formatKeybindLabel = (key, modifiers) => {
    const parts = [];

    if (modifiers.includes('ctrl')) parts.push(modifierSymbol);
    if (modifiers.includes('shift')) parts.push('Shift');
    if (modifiers.includes('alt')) parts.push('Alt');

    // Format the key name
    let keyName = key;
    if (key === ' ') keyName = 'Space';
    else if (key === 'Escape') keyName = 'Esc';
    else if (key === 'ArrowUp') keyName = '↑';
    else if (key === 'ArrowDown') keyName = '↓';
    else if (key === 'ArrowLeft') keyName = '←';
    else if (key === 'ArrowRight') keyName = '→';
    else if (key.length === 1) keyName = key.toUpperCase();

    parts.push(keyName);
    return parts.join('+');
  };

  const handleClick = () => {
    setIsCapturing(true);
    setError('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onCapture(null);
  };

  return (
    <div className="keybind-capture-row">
      <label className="keybind-label">{label}</label>
      <div className="keybind-input-group">
        <button
          className={`keybind-capture-btn ${isCapturing ? 'capturing' : ''} ${error ? 'error' : ''}`}
          onClick={handleClick}
          type="button"
        >
          {isCapturing
            ? 'Press any key...'
            : currentKeybind
              ? currentKeybind.label
              : 'Not set'}
        </button>
        {currentKeybind && !isCapturing && (
          <button
            className="keybind-clear-btn"
            onClick={handleClear}
            type="button"
            aria-label="Clear keybind"
          >
            ×
          </button>
        )}
      </div>
      {error && <div className="keybind-error">{error}</div>}
    </div>
  );
};

export default KeybindCapture;
