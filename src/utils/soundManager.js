// Sound files mapped to timer positions (0-5)
const SOUND_LIBRARY = [
  '/sounds/mixkit-dry-pop-up-notification-alert-2356.wav',
  '/sounds/mixkit-long-pop-2358.wav',
  '/sounds/mixkit-tile-game-reveal-960.wav',
  '/sounds/mixkit-elevator-tone-2863.wav',
  '/sounds/preview.mp3',
  '/sounds/preview (1).mp3'
];

/**
 * Get sound file path for a timer based on its position
 * @param {number} timerPosition - The position/index of the timer (0-based)
 * @returns {string} - Path to the sound file
 */
export const getSoundForTimer = (timerPosition) => {
  // Cycle through available sounds if position exceeds library size
  const index = timerPosition % SOUND_LIBRARY.length;
  return SOUND_LIBRARY[index];
};

/**
 * Play a sound file
 * @param {string} soundPath - Path to the sound file
 */
export const playSound = (soundPath) => {
  if (!soundPath) return;

  try {
    const audio = new Audio(soundPath);
    audio.play().catch(() => {
      // Silent error handling
    });
  } catch {
    // Silent error handling
  }
};
