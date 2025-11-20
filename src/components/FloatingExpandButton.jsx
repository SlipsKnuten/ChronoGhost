import { getModifierKey } from '../utils/platform';

export default function FloatingExpandButton({ isPinned, onExpand }) {
  const modifierSymbol = getModifierKey();

  return (
    <button
      className={`floating-expand-btn ${isPinned ? 'locked' : 'unlocked'}`}
      onClick={onExpand}
      title={isPinned ? `Locked - Press ${modifierSymbol}+Shift+L to unlock` : "Click to expand toolbar"}
    >
      {isPinned ? '🔒' : '🔓'}
    </button>
  );
}
