import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

/**
 * Convert a ChronoGhost keybind to Tauri global shortcut format
 * ChronoGhost format: { key: "F1", modifiers: ["ctrl", "shift"], label: "..." }
 * Tauri format: "CommandOrControl+Shift+F1"
 */
export const convertKeybindToTauriFormat = (keybind) => {
  if (!keybind || !keybind.key) return null;

  const parts = [];

  // Map modifiers to Tauri format
  if (keybind.modifiers && keybind.modifiers.length > 0) {
    keybind.modifiers.forEach(mod => {
      switch (mod.toLowerCase()) {
        case 'ctrl':
          parts.push('CommandOrControl');
          break;
        case 'shift':
          parts.push('Shift');
          break;
        case 'alt':
          parts.push('Alt');
          break;
      }
    });
  }

  // Add the key
  parts.push(keybind.key);

  return parts.join('+');
};

/**
 * Register all global shortcuts for the app
 * @param {Object} keybinds - The keybinds object from App state
 * @param {Function} onToggle - Callback for toggle shortcut (timerId)
 * @param {Function} onReset - Callback for reset shortcut (timerId)
 * @param {Array} timers - Array of timer objects
 * @param {String} selectedTimerId - Currently selected timer ID
 */
export const registerGlobalShortcuts = async (keybinds, onToggle, onReset, timers, selectedTimerId) => {
  try {
    // Unregister all existing shortcuts first
    await unregisterAll();

    const registrations = [];

    // Register per-timer slot shortcuts
    for (let i = 0; i < keybinds.timerSlots.length && i < timers.length; i++) {
      const timer = timers[i];
      const slot = keybinds.timerSlots[i];

      // Register toggle keybind for this slot
      if (slot.toggle && slot.toggle.key) {
        const shortcut = convertKeybindToTauriFormat(slot.toggle);
        if (shortcut) {
          registrations.push(
            register(shortcut, () => {
              onToggle(timer.id);
            })
          );
        }
      }

      // Register reset keybind for this slot
      if (slot.reset && slot.reset.key) {
        const shortcut = convertKeybindToTauriFormat(slot.reset);
        if (shortcut) {
          registrations.push(
            register(shortcut, () => {
              onReset(timer.id);
            })
          );
        }
      }
    }

    // Register selected timer shortcuts
    if (keybinds.selectedTimer) {
      // Toggle shortcut for selected timer
      if (keybinds.selectedTimer.toggle && keybinds.selectedTimer.toggle.key) {
        const shortcut = convertKeybindToTauriFormat(keybinds.selectedTimer.toggle);
        if (shortcut) {
          registrations.push(
            register(shortcut, () => {
              onToggle(selectedTimerId);
            })
          );
        }
      }

      // Reset shortcut for selected timer
      if (keybinds.selectedTimer.reset && keybinds.selectedTimer.reset.key) {
        const shortcut = convertKeybindToTauriFormat(keybinds.selectedTimer.reset);
        if (shortcut) {
          registrations.push(
            register(shortcut, () => {
              onReset(selectedTimerId);
            })
          );
        }
      }
    }

    // Wait for all registrations to complete
    await Promise.all(registrations);
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Unregister all global shortcuts
 */
export const unregisterGlobalShortcuts = async () => {
  try {
    await unregisterAll();
  } catch (error) {
    // Silent error handling
  }
};
