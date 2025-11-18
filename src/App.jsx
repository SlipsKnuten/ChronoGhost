import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import WindowControls from './components/WindowControls';
import TimerCard from './components/TimerCard';
import SettingsPanel, { DEFAULT_KEYBINDS } from './components/SettingsPanel';

const STORAGE_KEY = 'chronoghost-timers';

function App() {
  const [timers, setTimers] = useState([]);
  const [selectedTimerId, setSelectedTimerId] = useState(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [keybinds, setKeybinds] = useState(DEFAULT_KEYBINDS);
  const [opacity, setOpacity] = useState(0.85);
  const [isPinned, setIsPinned] = useState(false);

  // Load timers and keybinds from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);

        // Load timers
        if (data.timers && Array.isArray(data.timers) && data.timers.length > 0) {
          setTimers(data.timers);
          setSelectedTimerId(data.selectedTimerId || data.timers[0].id);
        } else {
          // Default: Create one timer
          const defaultTimer = createDefaultTimer(1);
          setTimers([defaultTimer]);
          setSelectedTimerId(defaultTimer.id);
        }

        // Load keybinds
        if (data.keybinds) {
          setKeybinds(data.keybinds);
        }

        // Load opacity
        if (data.opacity !== undefined) {
          setOpacity(data.opacity);
        }
        return;
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }

    // Default: Create one timer
    const defaultTimer = createDefaultTimer(1);
    setTimers([defaultTimer]);
    setSelectedTimerId(defaultTimer.id);
  }, []);

  // Save to localStorage whenever timers, selection, keybinds, or opacity change
  useEffect(() => {
    if (timers.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          timers,
          selectedTimerId,
          keybinds,
          opacity
        }));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }, [timers, selectedTimerId, keybinds, opacity]);

  const createDefaultTimer = (number) => ({
    id: Date.now() + number,
    name: `Timer ${number}`,
    minutes: 0,
    seconds: 0,
    isRunning: false,
    initialMinutes: 0,
    initialSeconds: 0,
  });

  const updateTimer = useCallback((id, updates) => {
    setTimers(prev => prev.map(timer =>
      timer.id === id ? { ...timer, ...updates } : timer
    ));
  }, []);


  const addTimer = useCallback(() => {
    // Extract all existing timer numbers from timer names
    const existingNumbers = new Set();
    timers.forEach(timer => {
      const match = timer.name.match(/Timer (\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        existingNumbers.add(num);
      }
    });

    // Find the first available number starting from 1
    let newNumber = 1;
    while (existingNumbers.has(newNumber)) {
      newNumber++;
    }

    const newTimer = createDefaultTimer(newNumber);
    setTimers(prev => [...prev, newTimer]);
    setSelectedTimerId(newTimer.id);
  }, [timers]);

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

  const handleSettingsClick = () => {
    setSettingsPanelOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsPanelOpen(false);
  };

  const handleSettingsSave = (newKeybinds) => {
    setKeybinds(newKeybinds);
  };

  const handleOpacityChange = (newOpacity) => {
    setOpacity(newOpacity);
  };

  const handleTogglePin = () => {
    setIsPinned(prev => !prev);
  };

  // Helper function to check if event matches a keybind
  const matchesKeybind = (event, keybind) => {
    if (!keybind || event.key !== keybind.key) return false;

    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;

    const needsCtrl = keybind.modifiers.includes('ctrl');
    const needsShift = keybind.modifiers.includes('shift');
    const needsAlt = keybind.modifiers.includes('alt');

    return hasCtrl === needsCtrl && hasShift === needsShift && hasAlt === needsAlt;
  };

  // Keyboard handler with per-timer keybinds support
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger if user is typing in an input or settings panel is open
      if (event.target.tagName === 'INPUT' || settingsPanelOpen) {
        return;
      }

      // Check per-timer slot keybinds first (priority over selected timer)
      for (let i = 0; i < timers.length && i < keybinds.timerSlots.length; i++) {
        const timer = timers[i];
        const slot = keybinds.timerSlots[i];

        // Check toggle keybind for this slot
        if (matchesKeybind(event, slot.toggle)) {
          event.preventDefault();
          // Don't start if timer is all zeros
          if (!timer.isRunning && timer.minutes === 0 && timer.seconds === 0) {
            return;
          }
          selectTimer(timer.id);
          updateTimer(timer.id, { isRunning: !timer.isRunning });
          return;
        }

        // Check reset keybind for this slot
        if (matchesKeybind(event, slot.reset)) {
          event.preventDefault();
          selectTimer(timer.id);
          updateTimer(timer.id, {
            minutes: timer.initialMinutes,
            seconds: timer.initialSeconds,
            isRunning: false,
          });
          return;
        }
      }

      // Then check selected timer keybinds
      const selectedTimer = timers.find(t => t.id === selectedTimerId);
      if (!selectedTimer) {
        return;
      }

      // Check toggle keybind for selected timer
      if (matchesKeybind(event, keybinds.selectedTimer.toggle)) {
        event.preventDefault();
        // Don't start if all zeros
        if (!selectedTimer.isRunning &&
            selectedTimer.minutes === 0 &&
            selectedTimer.seconds === 0) {
          return;
        }
        updateTimer(selectedTimerId, { isRunning: !selectedTimer.isRunning });
        return;
      }

      // Check reset keybind for selected timer
      if (matchesKeybind(event, keybinds.selectedTimer.reset)) {
        event.preventDefault();
        updateTimer(selectedTimerId, {
          minutes: selectedTimer.initialMinutes,
          seconds: selectedTimer.initialSeconds,
          isRunning: false,
        });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timers, selectedTimerId, keybinds, settingsPanelOpen, updateTimer, selectTimer]);

  // Listen for timer actions from inputbot (Rust global hotkeys)
  useEffect(() => {
    let unlisten;

    const setupListener = async () => {
      console.log('🟢 [REACT] Setting up timer-action event listener');
      console.log(`[REACT] Current timers state: ${JSON.stringify(timers.map(t => ({id: t.id, running: t.isRunning})))}`);

      try {
        unlisten = await listen('timer-action', (event) => {
          console.log(`🎯 [REACT] Raw event received:`, event);
          console.log(`[REACT] Event payload type: ${typeof event.payload}, value:`, event.payload);

          const [action, timerIndex] = event.payload;
          console.log(`🎯 [REACT] Timer action received: action='${action}', timerIndex=${timerIndex}`);

          if (action === 'toggle') {
            const timer = timers[timerIndex];
            console.log(`[REACT] Toggle action - Timer at index ${timerIndex}:`, timer);
            if (!timer) {
              console.error(`[REACT] Timer not found at index ${timerIndex}`);
              return;
            }

            if (!timer.isRunning && timer.minutes === 0 && timer.seconds === 0) {
              console.log('⚠️ [REACT] Timer is at 00:00, not starting');
              return;
            }
            console.log(`[REACT] Selecting timer ${timer.id} and toggling isRunning to ${!timer.isRunning}`);
            selectTimer(timer.id);
            updateTimer(timer.id, { isRunning: !timer.isRunning });
            console.log(`[REACT] Timer ${timer.id} toggled successfully`);
          } else if (action === 'reset') {
            const timer = timers[timerIndex];
            console.log(`[REACT] Reset action - Timer at index ${timerIndex}:`, timer);
            if (!timer) {
              console.error(`[REACT] Timer not found at index ${timerIndex}`);
              return;
            }

            console.log(`[REACT] Resetting timer ${timer.id} to ${timer.initialMinutes}:${timer.initialSeconds}`);
            selectTimer(timer.id);
            updateTimer(timer.id, {
              minutes: timer.initialMinutes,
              seconds: timer.initialSeconds,
              isRunning: false,
            });
            console.log(`[REACT] Timer ${timer.id} reset successfully`);
          } else if (action === 'toggle-selected') {
            const selectedTimer = timers.find(t => t.id === selectedTimerId);
            console.log(`[REACT] Toggle-selected action - Selected timer:`, selectedTimer);
            if (!selectedTimer) {
              console.error(`[REACT] Selected timer not found (selectedTimerId: ${selectedTimerId})`);
              return;
            }

            if (!selectedTimer.isRunning && selectedTimer.minutes === 0 && selectedTimer.seconds === 0) {
              console.log('[REACT] Selected timer is at 00:00, not starting');
              return;
            }
            console.log(`[REACT] Toggling selected timer ${selectedTimerId}`);
            updateTimer(selectedTimerId, { isRunning: !selectedTimer.isRunning });
            console.log(`[REACT] Selected timer toggled successfully`);
          } else if (action === 'reset-selected') {
            const selectedTimer = timers.find(t => t.id === selectedTimerId);
            console.log(`[REACT] Reset-selected action - Selected timer:`, selectedTimer);
            if (!selectedTimer) {
              console.error(`[REACT] Selected timer not found (selectedTimerId: ${selectedTimerId})`);
              return;
            }

            console.log(`[REACT] Resetting selected timer ${selectedTimerId}`);
            updateTimer(selectedTimerId, {
              minutes: selectedTimer.initialMinutes,
              seconds: selectedTimer.initialSeconds,
              isRunning: false,
            });
            console.log(`[REACT] Selected timer reset successfully`);
          }
        });
        console.log('✅ [REACT] Event listener registered successfully');
      } catch (err) {
        console.error(`[REACT] Failed to setup event listener:`, err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [timers, selectedTimerId, updateTimer, selectTimer]);

  return (
    <div className="app-container" style={{ opacity: opacity }}>
      <WindowControls
        onSettingsClick={handleSettingsClick}
        onAddTimer={addTimer}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
      />

      <div className="timers-content">
        <div
          className="drag-bar"
          data-tauri-drag-region={!isPinned}
          style={{ WebkitAppRegion: isPinned ? 'no-drag' : 'drag', appRegion: isPinned ? 'no-drag' : 'drag' }}
        ></div>
        <div className="timers-grid">
          {timers.map((timer, index) => (
            <TimerCard
              key={timer.id}
              id={timer.id}
              name={timer.name}
              minutes={timer.minutes}
              seconds={timer.seconds}
              isRunning={timer.isRunning}
              initialMinutes={timer.initialMinutes}
              initialSeconds={timer.initialSeconds}
              isSelected={timer.id === selectedTimerId}
              onUpdate={updateTimer}
              onRemove={removeTimer}
              onSelect={selectTimer}
              timerPosition={index}
            />
          ))}
        </div>
      </div>

      <SettingsPanel
        isOpen={settingsPanelOpen}
        onClose={handleSettingsClose}
        keybinds={keybinds}
        onSaveKeybinds={handleSettingsSave}
        opacity={opacity}
        onOpacityChange={handleOpacityChange}
      />
    </div>
  );
}

export default App;
