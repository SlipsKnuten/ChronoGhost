import React, { useState, useEffect, useRef, forwardRef } from 'react';
import BlurText from './BlurText';

const WindowControls = forwardRef(({ onSettingsClick, onAddTimer, isPinned, onTogglePin, onCollapseToolbar, isCollapsed }, ref) => {
  const appWindowRef = useRef(null);

  // Initialize Tauri window reference
  useEffect(() => {
    const resolveAppWindow = async () => {
      if (appWindowRef.current) {
        return appWindowRef.current;
      }

      const tauriGlobal = window.__TAURI__;
      if (!tauriGlobal || !tauriGlobal.window) {
        return null;
      }

      const windowApi = tauriGlobal.window;

      if (windowApi.appWindow) {
        appWindowRef.current = windowApi.appWindow;
        return appWindowRef.current;
      }

      if (typeof windowApi.getCurrent === 'function') {
        try {
          const current = windowApi.getCurrent();
          const resolved = current && typeof current.then === 'function' ? await current : current;
          appWindowRef.current = resolved ?? null;
          return appWindowRef.current;
        } catch (error) {
          // Silent fail
        }
      }

      return null;
    };

    resolveAppWindow();

    if (window.__TAURI__?.event?.listen) {
      window.__TAURI__.event.listen('tauri://ready', () => {
        resolveAppWindow();
      });
    } else {
      window.addEventListener('tauri://ready', () => {
        resolveAppWindow();
      });
    }
  }, []);

  const executeWindowAction = async (action) => {
    if (!action) {
      return;
    }

    let windowRef = appWindowRef.current;

    // Try to get window reference if not already available
    if (!windowRef && window.__TAURI__?.window) {
      try {
        const windowApi = window.__TAURI__.window;
        if (windowApi.appWindow) {
          windowRef = windowApi.appWindow;
          appWindowRef.current = windowRef;
        } else if (typeof windowApi.getCurrent === 'function') {
          const current = windowApi.getCurrent();
          windowRef = current && typeof current.then === 'function' ? await current : current;
          appWindowRef.current = windowRef;
        }
      } catch (error) {
        // Silent fail
      }
    }

    try {
      switch (action) {
        case 'minimize':
          if (window.__TAURI__?.core?.invoke) {
            await window.__TAURI__.core.invoke('minimize_window');
          } else if (windowRef) {
            await windowRef.minimize();
          }
          break;
        case 'close':
          if (window.__TAURI__?.core?.invoke) {
            await window.__TAURI__.core.invoke('close_app');
          } else if (windowRef) {
            await windowRef.close();
          } else {
            window.close();
          }
          break;
        default:
          break;
      }
    } catch (error) {
      // Silent fail
    }
  };

  return (
    <div ref={ref} className={`drag-handle${isCollapsed ? ' collapsed' : ''}`}>
      <div className="window-controls" role="group" aria-label="Window controls">
        <button
          className="window-control collapse-toolbar"
          type="button"
          onClick={onCollapseToolbar}
          aria-label="Collapse Toolbar"
        >
          ◀
        </button>
        <button
          className="window-control add-timer"
          type="button"
          onClick={onAddTimer}
          disabled={isPinned}
          aria-label="Add Timer"
        >
          +
        </button>
        <button
          className={`window-control pin ${isPinned ? 'active' : ''}`}
          type="button"
          onClick={onTogglePin}
          aria-label={isPinned ? "Unlock Window" : "Lock Window"}
        >
          {isPinned ? '🔒' : '🔓'}
        </button>
        <button
          className="window-control settings"
          type="button"
          onClick={onSettingsClick}
          disabled={isPinned}
          aria-label="Settings"
        >
          ⚙
        </button>
        <button
          className="window-control minimize"
          type="button"
          onClick={() => executeWindowAction('minimize')}
          disabled={isPinned}
          aria-label="Minimize"
        />
        <button
          className="window-control close"
          type="button"
          onClick={() => executeWindowAction('close')}
          disabled={isPinned}
          aria-label="Close"
        />
      </div>
    </div>
  );
});

WindowControls.displayName = 'WindowControls';

export default WindowControls;
