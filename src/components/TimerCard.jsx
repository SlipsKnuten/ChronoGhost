import React, { useEffect, useRef } from 'react';
import { getSoundForTimer, playSound } from '../utils/soundManager';

// Color palette for timer names
const TIMER_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#eab308', // Yellow
];

const TimerCard = ({
  id,
  name,
  minutes,
  seconds,
  isRunning,
  initialMinutes,
  initialSeconds,
  isSelected,
  onUpdate,
  onRemove,
  onSelect,
  timerPosition,
  hasFinished,
  isPinned,
  isToolbarCollapsed,
  onExpandToolbar,
  muted
}) => {
  const intervalRef = useRef(null);
  const timerColor = TIMER_COLORS[timerPosition % TIMER_COLORS.length];

  // Clear finished state after animation
  useEffect(() => {
    if (hasFinished) {
      const timeout = setTimeout(() => {
        onUpdate(id, { hasFinished: false });
      }, 3000); // Clear after 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [hasFinished, id, onUpdate]);

  // Countdown logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        // Check if timer has reached zero
        if (minutes === 0 && seconds === 0) {
          clearInterval(intervalRef.current);
          onUpdate(id, {
            isRunning: false,
            hasFinished: true,
            minutes: initialMinutes,
            seconds: initialSeconds
          });
          // Play sound on completion (unless muted)
          if (!muted) {
            const soundPath = getSoundForTimer(timerPosition);
            playSound(soundPath);
          }
          return;
        }

        // Countdown logic
        let newMinutes = minutes;
        let newSeconds = seconds;

        if (newSeconds > 0) {
          newSeconds--;
        } else if (newMinutes > 0) {
          newMinutes--;
          newSeconds = 59;
        }

        onUpdate(id, {
          minutes: newMinutes,
          seconds: newSeconds
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, minutes, seconds, id, onUpdate, initialMinutes, initialSeconds, timerPosition, muted]);

  const formatTime = (value) => {
    return String(value).padStart(2, '0');
  };

  const incrementTime = (unit) => {
    if (isRunning) return;

    let updates = {};
    if (unit === 'minutes' && minutes < 99) {
      updates = { minutes: minutes + 1, initialMinutes: minutes + 1 };
    } else if (unit === 'seconds' && seconds < 59) {
      updates = { seconds: seconds + 1, initialSeconds: seconds + 1 };
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(id, updates);
    }
  };

  const decrementTime = (unit) => {
    if (isRunning) return;

    let updates = {};
    if (unit === 'minutes' && minutes > 0) {
      updates = { minutes: minutes - 1, initialMinutes: minutes - 1 };
    } else if (unit === 'seconds' && seconds > 0) {
      updates = { seconds: seconds - 1, initialSeconds: seconds - 1 };
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(id, updates);
    }
  };

  const toggleTimer = () => {
    // Don't start if all values are zero
    if (!isRunning && minutes === 0 && seconds === 0) {
      return;
    }

    onUpdate(id, { isRunning: !isRunning });
  };

  const resetTimer = () => {
    onUpdate(id, {
      minutes: initialMinutes,
      seconds: initialSeconds,
      isRunning: false,
    });
  };

  const handleNameChange = (e) => {
    onUpdate(id, { name: e.target.value });
  };

  const handleCardClick = () => {
    onSelect(id);
  };

  return (
    <div
      className={`timer-card ${isSelected ? 'selected' : ''} ${hasFinished ? 'finished' : ''}`}
      onClick={handleCardClick}
    >
      <div className="timer-name-bar">
        {isPinned && timerPosition === 0 && (
          <span className="lock-indicator" aria-label="Locked">
            🔒
          </span>
        )}
        {isToolbarCollapsed && !isPinned && timerPosition === 0 && (
          <button
            className="floating-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              onExpandToolbar();
            }}
            aria-label="Expand toolbar"
            title="Click to expand toolbar"
          >
            ▶
          </button>
        )}
        <input
          type="text"
          className="timer-name-input"
          value={name}
          onChange={handleNameChange}
          onClick={(e) => e.stopPropagation()}
          placeholder="Timer name"
          maxLength={20}
          style={{ color: timerColor, borderColor: `${timerColor}40` }}
        />
        <button
          className="delete-timer-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          aria-label="Delete timer"
        >
          ×
        </button>
      </div>

      <div className="timer-display">
        {formatTime(minutes)}:{formatTime(seconds)}
      </div>

      <div className="timer-controls">
        <div className="time-setter">
          <div className="time-unit">
            <button className="increment-btn" onClick={(e) => { e.stopPropagation(); incrementTime('minutes'); }} disabled={isRunning}>
              +
            </button>
            <div className="unit-label">Minutes</div>
            <button className="decrement-btn" onClick={(e) => { e.stopPropagation(); decrementTime('minutes'); }} disabled={isRunning}>
              -
            </button>
          </div>

          <div className="time-unit">
            <button className="increment-btn" onClick={(e) => { e.stopPropagation(); incrementTime('seconds'); }} disabled={isRunning}>
              +
            </button>
            <div className="unit-label">Seconds</div>
            <button className="decrement-btn" onClick={(e) => { e.stopPropagation(); decrementTime('seconds'); }} disabled={isRunning}>
              -
            </button>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className={`action-btn ${isRunning ? 'pause' : 'start'}`}
            onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            className="action-btn reset"
            onClick={(e) => { e.stopPropagation(); resetTimer(); }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerCard;
