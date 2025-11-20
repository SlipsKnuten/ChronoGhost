import { useEffect } from 'react';

export default function Toast({ message, isVisible, onDismiss }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  return (
    <div className={`toast ${isVisible ? 'visible' : ''}`}>
      {message}
    </div>
  );
}
