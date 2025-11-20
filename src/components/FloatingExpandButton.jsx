export default function FloatingExpandButton({ isPinned, onExpand }) {
  return (
    <button
      className={`floating-expand-btn ${isPinned ? 'locked' : 'unlocked'}`}
      onClick={onExpand}
      title={isPinned ? "Locked - Press Ctrl+Shift+L to unlock" : "Click to expand toolbar"}
    >
      {isPinned ? '🔒' : '🔓'}
    </button>
  );
}
