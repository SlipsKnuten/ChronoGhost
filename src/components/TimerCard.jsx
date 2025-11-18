import React, { useEffect, useRef } from 'react';

const TimerCard = ({
  id,
  name,
  hours,
  minutes,
  seconds,
  isRunning,
  initialHours,
  initialMinutes,
  initialSeconds,
  isSelected,
  onUpdate,
  onRemove,
  onSelect
}) => {
  const intervalRef = useRef(null);

  // Countdown logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        // Check if timer has reached zero
        if (hours === 0 && minutes === 0 && seconds === 0) {
          clearInterval(intervalRef.current);
          onUpdate(id, { isRunning: false });
          return;
        }

        // Countdown logic
        let newHours = hours;
        let newMinutes = minutes;
        let newSeconds = seconds;

        if (newSeconds > 0) {
          newSeconds--;
        } else if (newMinutes > 0) {
          newMinutes--;
          newSeconds = 59;
        } else if (newHours > 0) {
          newHours--;
          newMinutes = 59;
          newSeconds = 59;
        }

        onUpdate(id, {
          hours: newHours,
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
  }, [isRunning, hours, minutes, seconds, id, onUpdate]);

  const formatTime = (value) => {
    return String(value).padStart(2, '0');
  };

  const incrementTime = (unit) => {
    if (isRunning) return;

    let updates = {};
    if (unit === 'hours' && hours < 99) {
      updates = { hours: hours + 1, initialHours: hours + 1 };
    } else if (unit === 'minutes' && minutes < 59) {
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
    if (unit === 'hours' && hours > 0) {
      updates = { hours: hours - 1, initialHours: hours - 1 };
    } else if (unit === 'minutes' && minutes > 0) {
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
    if (!isRunning && hours === 0 && minutes === 0 && seconds === 0) {
      return;
    }

    onUpdate(id, { isRunning: !isRunning });
  };

  const resetTimer = () => {
    onUpdate(id, {
      hours: initialHours,
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
      className={`timer-card ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
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

      <input
        type="text"
        className="timer-name-input"
        value={name}
        onChange={handleNameChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Timer name"
        maxLength={20}
      />

      <div className="timer-display">
        {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
      </div>

      <div className="timer-controls">
        <div className="time-setter">
          <div className="time-unit">
            <button className="increment-btn" onClick={(e) => { e.stopPropagation(); incrementTime('hours'); }} disabled={isRunning}>
              +
            </button>
            <div className="unit-label">Hours</div>
            <button className="decrement-btn" onClick={(e) => { e.stopPropagation(); decrementTime('hours'); }} disabled={isRunning}>
              -
            </button>
          </div>

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
