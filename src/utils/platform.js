import { platform } from '@tauri-apps/plugin-os';

let cachedPlatform = null;

/**
 * Get the current platform
 * @returns {'macos' | 'windows' | 'linux' | 'ios' | 'android'}
 */
export function getPlatform() {
  if (!cachedPlatform) {
    cachedPlatform = platform();
  }
  return cachedPlatform;
}

/**
 * Get the modifier key symbol for the current platform
 * @returns {'⌘' | 'Ctrl'}
 */
export function getModifierKey() {
  const plat = getPlatform();
  return plat === 'macos' ? '⌘' : 'Ctrl';
}

/**
 * Get the modifier key name for the current platform
 * @returns {'Cmd' | 'Ctrl'}
 */
export function getModifierKeyName() {
  const plat = getPlatform();
  return plat === 'macos' ? 'Cmd' : 'Ctrl';
}

/**
 * Format a keyboard shortcut for display on the current platform
 * Converts "Ctrl+X" to "⌘+X" on macOS, leaves it as-is on other platforms
 * @param {string} shortcut - The shortcut string (e.g., "Ctrl+Shift+L")
 * @returns {string}
 */
export function formatShortcut(shortcut) {
  const plat = getPlatform();

  if (plat === 'macos') {
    // Replace Ctrl with ⌘ on macOS
    return shortcut
      .replace(/Ctrl/g, '⌘')
      .replace(/ctrl/g, '⌘');
  }

  return shortcut;
}

/**
 * Format a keybind object for display on the current platform
 * @param {Object} keybind - The keybind object with modifiers array and key string
 * @returns {string}
 */
export function formatKeybind(keybind) {
  if (!keybind || !keybind.key) {
    return '';
  }

  const plat = getPlatform();
  const modifiers = keybind.modifiers || [];

  const formattedModifiers = modifiers.map(mod => {
    const lowerMod = mod.toLowerCase();
    if (lowerMod === 'ctrl' || lowerMod === 'control') {
      return plat === 'macos' ? '⌘' : 'Ctrl';
    }
    if (lowerMod === 'shift') {
      return 'Shift';
    }
    if (lowerMod === 'alt') {
      return plat === 'macos' ? '⌥' : 'Alt';
    }
    if (lowerMod === 'meta' || lowerMod === 'super' || lowerMod === 'cmd' || lowerMod === 'command') {
      return plat === 'macos' ? '⌘' : 'Meta';
    }
    return mod;
  });

  // Capitalize the key
  const key = keybind.key.length === 1
    ? keybind.key.toUpperCase()
    : keybind.key.charAt(0).toUpperCase() + keybind.key.slice(1);

  return [...formattedModifiers, key].join('+');
}

/**
 * Check if the current platform is macOS
 * @returns {boolean}
 */
export function isMac() {
  const plat = getPlatform();
  return plat === 'macos';
}

/**
 * Check if the current platform is Windows
 * @returns {boolean}
 */
export function isWindows() {
  const plat = getPlatform();
  return plat === 'windows';
}

/**
 * Check if the current platform is Linux
 * @returns {boolean}
 */
export function isLinux() {
  const plat = getPlatform();
  return plat === 'linux';
}
