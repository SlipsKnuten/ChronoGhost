import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import WindowControls from './components/WindowControls';
import TimerCard from './components/TimerCard';
import SettingsPanel, { DEFAULT_KEYBINDS } from './components/SettingsPanel';
import FloatingExpandButton from './components/FloatingExpandButton';
import Toast from './components/Toast';

const STORAGE_KEY = 'chronoghost-timers';

function App() {
  console.log('[DEBUG] App component loaded at:', new Date().toISOString());

  const [timers, setTimers] = useState([]);
  const [selectedTimerId, setSelectedTimerId] = useState(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [keybinds, setKeybinds] = useState(DEFAULT_KEYBINDS);
  const [opacity, setOpacity] = useState(0.85);
  const [isPinned, setIsPinned] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Refs to hold latest state for global shortcut event listener
  // This prevents the listener from re-registering on every state change
  const timersRef = useRef([]);
  const selectedTimerIdRef = useRef(null);
  const lastToggleTimeRef = useRef(0);
  const originalWindowSizeRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    timersRef.current = timers;
    selectedTimerIdRef.current = selectedTimerId;
  }, [timers, selectedTimerId]);

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

        // Don't load toolbar collapsed state - always start expanded
        // (locking will auto-collapse it anyway)
        return;
      }
    } catch (error) {
      // Silent fail - use default timer
    }

    // Default: Create one timer
    const defaultTimer = createDefaultTimer(1);
    setTimers([defaultTimer]);
    setSelectedTimerId(defaultTimer.id);
  }, []);

  // Save to localStorage whenever timers, selection, keybinds, or opacity change
  // Note: We don't save isToolbarCollapsed since locking auto-collapses it
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
        // Silent fail
      }
    }
  }, [timers, selectedTimerId, keybinds, opacity]);

  // Send keybinds to Rust for global shortcuts
  useEffect(() => {
    const updateRustShortcuts = async () => {
      try {
        await invoke('update_global_shortcuts', {
          keybindsJson: JSON.stringify(keybinds)
        });
      } catch (error) {
        // Silent fail
      }
    };

    updateRustShortcuts();
  }, [keybinds]);

  const createDefaultTimer = (number) => ({
    id: Date.now() + number,
    name: `Timer ${number}`,
    minutes: 0,
    seconds: 0,
    isRunning: false,
    initialMinutes: 0,
    initialSeconds: 0,
    hasFinished: false,
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

  const handleTogglePin = async () => {
    console.log('[DEBUG] handleTogglePin called, current isPinned:', isPinned);
    const newPinnedState = !isPinned;
    console.log('[DEBUG] Setting new pinned state to:', newPinnedState);
    setIsPinned(newPinnedState);

    // Auto-collapse toolbar when locking, auto-expand when unlocking
    setIsToolbarCollapsed(newPinnedState);
    console.log('[DEBUG] Setting toolbar collapsed to:', newPinnedState);

    // Enable/disable click-through and resize window
    try {
      const window = await getCurrentWindow();
      const TOOLBAR_WIDTH = 90;

      if (newPinnedState) {
        // Locking - shrink window
        const size = await window.innerSize();
        originalWindowSizeRef.current = { width: size.width, height: size.height };
        await invoke('resize_window_native', {
          window,
          width: size.width - TOOLBAR_WIDTH,
          height: size.height
        });
        console.log('[DEBUG] Window shrunk by', TOOLBAR_WIDTH, 'px using native API');
      } else {
        // Unlocking - restore window
        if (originalWindowSizeRef.current) {
          await invoke('resize_window_native', {
            window,
            width: originalWindowSizeRef.current.width,
            height: originalWindowSizeRef.current.height
          });
          console.log('[DEBUG] Window restored to original size:', originalWindowSizeRef.current);
        }
      }

      await invoke('set_ignore_cursor_events', {
        window,
        ignore: newPinnedState
      });
      console.log('[DEBUG] Click-through set to:', newPinnedState);

      // Show toast notification
      setToastMessage(newPinnedState ? '🔒 Locked (Click-through enabled)' : '🔓 Unlocked');
      setToastVisible(true);
    } catch (error) {
      console.error('Failed to set click-through or resize:', error);
    }
  };

  const handleToggleToolbar = () => {
    // Only allow manual collapse/expand when NOT pinned
    if (!isPinned) {
      setIsToolbarCollapsed(prev => !prev);
    }
  };

  const handleExpandToolbar = () => {
    // Floating button only expands toolbar, doesn't unlock
    if (!isPinned) {
      setIsToolbarCollapsed(false);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const dismissToast = () => {
    setToastVisible(false);
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

  // Listen for timer actions from Rust global hotkeys
  // This effect runs ONCE on mount and persists for the app lifetime
  useEffect(() => {
    let unlisten;

    const setupListener = async () => {
      try {
        unlisten = await listen('timer-action', (event) => {
          // Use refs to get the latest state without re-registering the listener
          const currentTimers = timersRef.current;
          const currentSelectedTimerId = selectedTimerIdRef.current;

          const [action, timerIndex] = event.payload;

          if (action === 'toggle') {
            const timer = currentTimers[timerIndex];
            if (!timer) {
              return;
            }

            if (!timer.isRunning && timer.minutes === 0 && timer.seconds === 0) {
              return;
            }
            selectTimer(timer.id);
            updateTimer(timer.id, { isRunning: !timer.isRunning });
          } else if (action === 'reset') {
            const timer = currentTimers[timerIndex];
            if (!timer) {
              return;
            }

            selectTimer(timer.id);
            updateTimer(timer.id, {
              minutes: timer.initialMinutes,
              seconds: timer.initialSeconds,
              isRunning: false,
            });
          } else if (action === 'toggle-selected') {
            const selectedTimer = currentTimers.find(t => t.id === currentSelectedTimerId);
            if (!selectedTimer) {
              return;
            }

            if (!selectedTimer.isRunning && selectedTimer.minutes === 0 && selectedTimer.seconds === 0) {
              return;
            }
            updateTimer(currentSelectedTimerId, { isRunning: !selectedTimer.isRunning });
          } else if (action === 'reset-selected') {
            const selectedTimer = currentTimers.find(t => t.id === currentSelectedTimerId);
            if (!selectedTimer) {
              return;
            }

            updateTimer(currentSelectedTimerId, {
              minutes: selectedTimer.initialMinutes,
              seconds: selectedTimer.initialSeconds,
              isRunning: false,
            });
          }
        });
      } catch (err) {
        // Silent fail
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [updateTimer, selectTimer]); // Only re-register if callbacks change (which they don't)

  // Listen for Ctrl+Shift+L global hotkey from Rust
  useEffect(() => {
    let unlisten;

    const setupListener = async () => {
      try {
        unlisten = await listen('toggle-lock', async () => {
          console.log('[DEBUG] Global hotkey (Ctrl+Shift+L) triggered');

          // Debounce: Ignore events within 300ms of the last toggle
          const now = Date.now();
          const timeSinceLastToggle = now - lastToggleTimeRef.current;
          console.log('[DEBUG] Time since last toggle:', timeSinceLastToggle, 'ms');

          if (timeSinceLastToggle < 300) {
            console.log('[DEBUG] Ignoring duplicate hotkey event (debounced)');
            return;
          }

          lastToggleTimeRef.current = now;

          // Toggle pin state and handle click-through
          setIsPinned(prev => {
            console.log('[DEBUG] Global hotkey - previous isPinned:', prev);
            const newPinnedState = !prev;
            console.log('[DEBUG] Global hotkey - new isPinned:', newPinnedState);

            // Auto-collapse toolbar when locking, auto-expand when unlocking
            setIsToolbarCollapsed(newPinnedState);
            console.log('[DEBUG] Global hotkey - setting toolbar collapsed to:', newPinnedState);

            // Handle click-through and resize in async IIFE to avoid blocking state update
            (async () => {
              try {
                const window = await getCurrentWindow();
                const TOOLBAR_WIDTH = 90;

                if (newPinnedState) {
                  // Locking - shrink window
                  const size = await window.innerSize();
                  originalWindowSizeRef.current = { width: size.width, height: size.height };
                  await invoke('resize_window_native', {
                    window,
                    width: size.width - TOOLBAR_WIDTH,
                    height: size.height
                  });
                  console.log('[DEBUG] Global hotkey - window shrunk by', TOOLBAR_WIDTH, 'px');
                } else {
                  // Unlocking - restore window
                  if (originalWindowSizeRef.current) {
                    await invoke('resize_window_native', {
                      window,
                      width: originalWindowSizeRef.current.width,
                      height: originalWindowSizeRef.current.height
                    });
                    console.log('[DEBUG] Global hotkey - window restored to:', originalWindowSizeRef.current);
                  }
                }

                await invoke('set_ignore_cursor_events', {
                  window,
                  ignore: newPinnedState
                });
                console.log('[DEBUG] Global hotkey - click-through set to:', newPinnedState);

                // Show toast notification
                showToast(newPinnedState ? '🔒 Locked (Click-through enabled)' : '🔓 Unlocked');
              } catch (error) {
                console.error('Failed to set click-through or resize:', error);
              }
            })();

            return newPinnedState;
          });
        });
      } catch (err) {
        console.error('Failed to setup toggle-lock listener:', err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []); // Register once on mount - uses functional state updates

  // Manual drag handler for background-only dragging
  useEffect(() => {
    const handleMouseDown = async (e) => {
      // Don't drag if pinned
      if (isPinned) return;

      // Only handle left mouse button
      if (e.buttons !== 1) return;

      const clickedElement = e.target;

      // Check if clicked on background elements (draggable areas)
      const isBackground =
        clickedElement.classList.contains('app-container') ||
        clickedElement.classList.contains('timers-content') ||
        clickedElement.classList.contains('timers-grid') ||
        clickedElement.tagName === 'BODY';

      // Check if clicked on interactive content (non-draggable areas)
      const isInteractive =
        clickedElement.closest('.drag-handle') ||  // toolbar
        clickedElement.closest('.timer-card') ||   // timer cards
        clickedElement.closest('.settings-panel') || // settings
        clickedElement.tagName === 'BUTTON' ||
        clickedElement.tagName === 'INPUT';

      // Start dragging only if clicking background AND not clicking interactive elements
      if (isBackground && !isInteractive) {
        try {
          await getCurrentWindow().startDragging();
        } catch (error) {
          // Silent fail
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isPinned]);

  // Sync window resizability with pin state
  useEffect(() => {
    const syncResizability = async () => {
      console.log('[DEBUG] isPinned changed to:', isPinned);
      console.log('[DEBUG] Setting window resizable to:', !isPinned);

      try {
        const window = await getCurrentWindow();
        console.log('[DEBUG] Got window instance:', window);

        await window.setResizable(!isPinned);
        console.log('[DEBUG] setResizable succeeded! Window is now', !isPinned ? 'resizable' : 'not resizable');
      } catch (error) {
        console.error('[DEBUG] setResizable FAILED with error:', error);
        console.error('[DEBUG] Error details:', error.message, error.stack);
      }
    };

    syncResizability();
  }, [isPinned]);

  return (
    <div className={`app-container${isPinned ? ' pinned' : ''}${isToolbarCollapsed ? ' toolbar-collapsed' : ''}`} style={{ opacity: opacity }}>
      <WindowControls
        onSettingsClick={handleSettingsClick}
        onAddTimer={addTimer}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onCollapseToolbar={handleToggleToolbar}
        isCollapsed={isToolbarCollapsed}
      />

      <div className="timers-content">
        {isToolbarCollapsed && (
          <FloatingExpandButton
            isPinned={isPinned}
            onExpand={handleExpandToolbar}
          />
        )}
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
              hasFinished={timer.hasFinished}
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

      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onDismiss={dismissToast}
      />
    </div>
  );
}

export default App;
