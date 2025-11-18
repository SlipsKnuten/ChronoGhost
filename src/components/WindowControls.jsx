import React, { useState, useEffect, useRef } from 'react';
import BlurText from './BlurText';

const WindowControls = () => {
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
          console.warn('Unable to obtain current Tauri window instance:', error);
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
        console.warn('Unable to get window reference:', error);
      }
    }

    try {
      switch (action) {
        case 'minimize':
          if (window.__TAURI__?.core?.invoke) {
            await window.__TAURI__.core.invoke('minimize_window');
          } else if (windowRef) {
            await windowRef.minimize();
          } else {
            console.error('Window reference not available for minimize action');
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
      console.error(`Failed window action '${action}':`, error);
    }
  };

  return (
    <div className="drag-handle" data-tauri-drag-region>
      <span className="label">
        <BlurText
          text="CHRONO GHOST"
          delay={0.5}
          animateBy="letters"
          className="phantom-title"
        />
      </span>
      <div className="window-controls" role="group" aria-label="Window controls">
        <button
          className="window-control minimize"
          type="button"
          onClick={() => executeWindowAction('minimize')}
          aria-label="Minimize"
        />
        <button
          className="window-control close"
          type="button"
          onClick={() => executeWindowAction('close')}
          aria-label="Close"
        />
      </div>
    </div>
  );
};

export default WindowControls;
