import React, { useState, useEffect, useCallback } from 'react';
import WindowControls from './components/WindowControls';
import TimerCard from './components/TimerCard';

const STORAGE_KEY = 'chronoghost-timers';

function App() {
  const [timers, setTimers] = useState([]);
  const [selectedTimerId, setSelectedTimerId] = useState(null);

  // Load timers from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.timers && Array.isArray(data.timers) && data.timers.length > 0) {
          setTimers(data.timers);
          setSelectedTimerId(data.selectedTimerId || data.timers[0].id);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load timers from localStorage:', error);
    }

    // Default: Create one timer
    const defaultTimer = {
      id: Date.now(),
      name: 'Timer 1',
      hours: 0,
      minutes: 0,
      seconds: 0,
      isRunning: false,
      initialHours: 0,
      initialMinutes: 0,
      initialSeconds: 0,
    };
    setTimers([defaultTimer]);
    setSelectedTimerId(defaultTimer.id);
  }, []);

  // Save to localStorage whenever timers or selection changes
  useEffect(() => {
    if (timers.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          timers,
          selectedTimerId
        }));
      } catch (error) {
        console.error('Failed to save timers to localStorage:', error);
      }
    }
  }, [timers, selectedTimerId]);

  const updateTimer = useCallback((id, updates) => {
    setTimers(prev => prev.map(timer =>
      timer.id === id ? { ...timer, ...updates } : timer
    ));
  }, []);

  const addTimer = useCallback(() => {
    const newTimer = {
      id: Date.now(),
      name: `Timer ${timers.length + 1}`,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isRunning: false,
      initialHours: 0,
      initialMinutes: 0,
      initialSeconds: 0,
    };
    setTimers(prev => [...prev, newTimer]);
    setSelectedTimerId(newTimer.id);
  }, [timers.length]);

  const removeTimer = useCallback((id) => {
    // Prevent removing the last timer
    if (timers.length <= 1) {
      return;
    }

    setTimers(prev => {
      const newTimers = prev.filter(timer => timer.id !== id);
      // If we removed the selected timer, select the first one
      if (selectedTimerId === id && newTimers.length > 0) {
        setSelectedTimerId(newTimers[0].id);
      }
      return newTimers;
    });
  }, [timers.length, selectedTimerId]);

  const selectTimer = useCallback((id) => {
    setSelectedTimerId(id);
  }, []);

  // Keyboard shortcuts for selected timer
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger if user is typing in an input
      if (event.target.tagName === 'INPUT') {
        return;
      }

      const { key } = event;
      const selectedTimer = timers.find(t => t.id === selectedTimerId);

      if (!selectedTimer) {
        return;
      }

      if (key === ' ') {
        event.preventDefault();
        // Toggle selected timer
        if (!selectedTimer.isRunning &&
            selectedTimer.hours === 0 &&
            selectedTimer.minutes === 0 &&
            selectedTimer.seconds === 0) {
          return; // Don't start if all zeros
        }
        updateTimer(selectedTimerId, { isRunning: !selectedTimer.isRunning });
        return;
      }

      if (key === 'r' || key === 'R' || key === 'Escape') {
        event.preventDefault();
        // Reset selected timer
        updateTimer(selectedTimerId, {
          hours: selectedTimer.initialHours,
          minutes: selectedTimer.initialMinutes,
          seconds: selectedTimer.initialSeconds,
          isRunning: false,
        });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timers, selectedTimerId, updateTimer]);

  return (
    <div className="app-container">
      <WindowControls />

      <div className="timers-grid">
        {timers.map(timer => (
          <TimerCard
            key={timer.id}
            id={timer.id}
            name={timer.name}
            hours={timer.hours}
            minutes={timer.minutes}
            seconds={timer.seconds}
            isRunning={timer.isRunning}
            initialHours={timer.initialHours}
            initialMinutes={timer.initialMinutes}
            initialSeconds={timer.initialSeconds}
            isSelected={timer.id === selectedTimerId}
            onUpdate={updateTimer}
            onRemove={removeTimer}
            onSelect={selectTimer}
          />
        ))}
      </div>

      <div className="add-timer-container">
        <button className="add-timer-btn" onClick={addTimer}>
          + Add Timer
        </button>
      </div>
    </div>
  );
}

export default App;
