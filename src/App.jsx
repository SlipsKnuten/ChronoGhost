import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import WindowControls from './components/WindowControls';
import TimerCard from './components/TimerCard';
import SettingsPanel, { generateDefaultKeybinds } from './components/SettingsPanel';
import Toast from './components/Toast';
import UpdateNotification from './components/UpdateNotification';
import { getModifierKey } from './utils/platform';

const STORAGE_KEY = 'chronoghost-timers';

function App() {
  const [timers, setTimers] = useState([]);
  const [selectedTimerId, setSelectedTimerId] = useState(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [keybinds, setKeybinds] = useState(null);
  const [opacity, setOpacity] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Refs to hold latest state for global shortcut event listener
  // This prevents the listener from re-registering on every state change
  const timersRef = useRef([]);
  const selectedTimerIdRef = useRef(null);
  const lastToggleTimeRef = useRef(0);
  const toolbarRef = useRef(null);
  const toolbarWidthRef = useRef(80); // Store measured width in ref for immediate access
  const [toolbarWidth, setToolbarWidth] = useState(80); // Default fallback, will be measured
  const calculateAndResizeWindowRef = useRef(null); // Ref for resize function (used in event listeners)
  const hasInitialResizeRef = useRef(false); // Track if initial resize has been done

  // Keep refs in sync with state
  useEffect(() => {
    timersRef.current = timers;
    selectedTimerIdRef.current = selectedTimerId;
  }, [timers, selectedTimerId]);

  // Measure actual toolbar width after render
  // IMPORTANT: In Tauri, window.innerSize() returns physical pixels that already account for DPI.
  // We need to convert CSS pixels to physical pixels, but devicePixelRatio is unreliable in Tauri.
  // Solution: Use offsetWidth (which gives us the actual rendered size) and scale it appropriately.
  useEffect(() => {
    const measureToolbar = async () => {
      if (toolbarRef.current) {
        const cssWidth = toolbarRef.current.getBoundingClientRect().width;
        const dpr = window.devicePixelRatio || 1;

        // For Tauri, we need to account for the fact that the window size is already in physical pixels
        // but getBoundingClientRect returns CSS pixels. The actual relationship depends on the monitor DPI.
        // Based on testing: 4K@150% needs ~90px, 2K@100% needs ~59px
        // The pattern: CSS width * DPR + offset for borders/padding
        const baseWidth = Math.round(cssWidth * dpr);
        // Offset varies by DPI: 0px for high DPI (4K), -1px for standard DPI (2K)
        const physicalWidth = baseWidth + (dpr > 1 ? 0 : -1);

        toolbarWidthRef.current = physicalWidth; // Store in ref for immediate access
        setToolbarWidth(physicalWidth);
      }
    };

    // Measure on mount
    measureToolbar();

    // Also measure after a short delay to ensure DOM is fully rendered
    const timer = setTimeout(measureToolbar, 100);

    // Remeasure when window is moved (DPI might change between screens)
    const handleResize = () => {
      measureToolbar();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize platform-specific keybinds on mount
  useEffect(() => {
    const symbol = getModifierKey();
    const defaults = generateDefaultKeybinds(symbol);

    // Try to load saved data from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);

        // Load keybinds (use saved if available, otherwise use platform defaults)
        if (data.keybinds) {
          setKeybinds(data.keybinds);
        } else {
          setKeybinds(defaults);
        }
      } else {
        // No saved data, use platform defaults
        setKeybinds(defaults);
      }
    } catch (error) {
      // If loading fails, use platform defaults
      setKeybinds(defaults);
    }
  }, []);

  // Load timers and settings from localStorage on mount
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

        // Load opacity
        if (data.opacity !== undefined) {
          setOpacity(data.opacity);
        }

        // Load muted state
        if (data.muted !== undefined) {
          setMuted(data.muted);
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

  // Save to localStorage whenever timers, selection, keybinds, opacity, or muted change
  // Note: We don't save isToolbarCollapsed since locking auto-collapses it
  useEffect(() => {
    if (timers.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          timers,
          selectedTimerId,
          keybinds,
          opacity,
          muted
        }));
      } catch (error) {
        // Silent fail
      }
    }
  }, [timers, selectedTimerId, keybinds, opacity, muted]);

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

  // Calculate and apply window width based on timer count and toolbar state
  const calculateAndResizeWindow = useCallback(async (timerCount, isCollapsed = isToolbarCollapsed) => {
    try {
      const windowInstance = await getCurrentWindow();
      const dpr = window.devicePixelRatio || 1;

      // CSS dimensions (in CSS pixels)
      const cardWidth = 200;
      const gap = 11;
      const gridPaddingLeft = 10;
      const gridPaddingRight = 10;

      // Get current window size (to preserve height)
      const size = await windowInstance.innerSize();

      // Single row - all timers horizontal
      const contentWidth = gridPaddingLeft +
                           (timerCount * cardWidth) +
                           (Math.max(0, timerCount - 1) * gap) +
                           gridPaddingRight;

      // Toolbar width is already in physical pixels (from toolbarWidthRef)
      // Content needs conversion from CSS to physical pixels
      const toolbarContribution = isCollapsed ? 0 : toolbarWidthRef.current;
      const contentPhysical = Math.round(contentWidth * dpr);
      const totalWidth = toolbarContribution + contentPhysical;

      // Clamp to min/max bounds from tauri.conf.json (scaled by DPI since we're in physical pixels)
      const minWidth = Math.round(291 * dpr);
      const maxWidth = Math.round(1920 * dpr);
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, totalWidth));

      await invoke('resize_window_native', {
        window: windowInstance,
        width: clampedWidth,
        height: size.height
      });
    } catch (error) {
      // Silent fail
    }
  }, [isToolbarCollapsed]);

  // Keep the resize function ref updated for use in event listeners
  useEffect(() => {
    calculateAndResizeWindowRef.current = calculateAndResizeWindow;
  }, [calculateAndResizeWindow]);

  // Initial resize on load - resize window to fit saved timers
  useEffect(() => {
    if (!hasInitialResizeRef.current && timers.length > 0 && toolbarWidthRef.current > 0) {
      hasInitialResizeRef.current = true;
      // Delay to ensure toolbar is measured and DOM is fully rendered
      const resizeTimer = setTimeout(() => {
        calculateAndResizeWindow(timers.length);
      }, 200);
      return () => clearTimeout(resizeTimer);
    }
  }, [timers.length, calculateAndResizeWindow]);

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
    setTimers(prev => {
      const newTimers = [...prev, newTimer];
      // Resize window after adding timer
      setTimeout(() => {
        calculateAndResizeWindow(newTimers.length);
      }, 0);
      return newTimers;
    });
    setSelectedTimerId(newTimer.id);
  }, [timers, calculateAndResizeWindow]);

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
      // Resize window after removing timer
      setTimeout(() => {
        calculateAndResizeWindow(newTimers.length);
      }, 0);
      return newTimers;
    });
  }, [timers.length, selectedTimerId, calculateAndResizeWindow]);

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

  const handleMutedChange = (newMuted) => {
    setMuted(newMuted);
  };

  const handleTogglePin = async () => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);

    // Show toast notification (toolbar button doesn't enable click-through)
    setToastMessage(newPinnedState ? '🔒 Locked' : '🔓 Unlocked');
    setToastVisible(true);
  };

  const handleToggleToolbar = async () => {
    // Only allow manual collapse/expand when NOT pinned
    if (!isPinned) {
      const newCollapsedState = !isToolbarCollapsed;
      setIsToolbarCollapsed(newCollapsedState);

      // Resize window based on timer count and new collapsed state
      await calculateAndResizeWindow(timers.length, newCollapsedState);
    }
  };

  const handleExpandToolbar = async () => {
    // Floating button only expands toolbar, doesn't unlock
    if (!isPinned) {
      setIsToolbarCollapsed(false);

      // Resize window with toolbar visible
      await calculateAndResizeWindow(timers.length, false);
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
          // Debounce: Ignore events within 300ms of the last toggle
          const now = Date.now();
          const timeSinceLastToggle = now - lastToggleTimeRef.current;

          if (timeSinceLastToggle < 300) {
            return;
          }

          lastToggleTimeRef.current = now;

          // Toggle pin state and handle click-through
          setIsPinned(prev => {
            const newPinnedState = !prev;

            // Auto-collapse toolbar when locking, auto-expand when unlocking
            setIsToolbarCollapsed(newPinnedState);

            // Handle click-through and resize in async IIFE to avoid blocking state update
            (async () => {
              try {
                const window = await getCurrentWindow();

                // Use ref to get the latest resize function (handles timer count dynamically)
                if (calculateAndResizeWindowRef.current) {
                  await calculateAndResizeWindowRef.current(timersRef.current.length, newPinnedState);
                }

                await invoke('set_ignore_cursor_events', {
                  window,
                  ignore: newPinnedState
                });

                // Show toast notification
                showToast(newPinnedState ? '🔒 Locked (Click-through enabled)' : '🔓 Unlocked');
              } catch (error) {
                // Silent fail
              }
            })();

            return newPinnedState;
          });
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
      try {
        const window = await getCurrentWindow();
        await window.setResizable(!isPinned);
      } catch (error) {
        // Silent fail
      }
    };

    syncResizability();
  }, [isPinned]);

  // Disable right-click context menu and DevTools shortcuts
  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault();

    const disableDevTools = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        return;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("contextmenu", disableContextMenu);
    window.addEventListener("keydown", disableDevTools);

    return () => {
      window.removeEventListener("contextmenu", disableContextMenu);
      window.removeEventListener("keydown", disableDevTools);
    };
  }, []);

  return (
    <div className={`app-container${isPinned ? ' pinned' : ''}${isToolbarCollapsed ? ' toolbar-collapsed' : ''}`} style={{ opacity: opacity }}>
      <WindowControls
        ref={toolbarRef}
        onSettingsClick={handleSettingsClick}
        onAddTimer={addTimer}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onCollapseToolbar={handleToggleToolbar}
        isCollapsed={isToolbarCollapsed}
      />

      <div className="timers-content">
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
              isPinned={isPinned}
              isToolbarCollapsed={isToolbarCollapsed}
              onExpandToolbar={handleExpandToolbar}
              muted={muted}
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
        muted={muted}
        onMutedChange={handleMutedChange}
      />

      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onDismiss={dismissToast}
      />

      <UpdateNotification />
    </div>
  );
}

export default App;
