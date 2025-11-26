import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export default function UpdateNotification() {
  const [update, setUpdate] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, downloading, installing, error
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    const checkForUpdate = async () => {
      try {
        const available = await check();
        if (available) {
          console.log('[Update] Found update:', available.version);
          setUpdate(available);
        }
      } catch (error) {
        console.error('[Update] Check failed:', error);
      }
    };

    checkForUpdate();
  }, []);

  const handleUpdate = async () => {
    if (!update) return;

    try {
      setStatus('downloading');

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          console.log('[Update] Download started');
        } else if (event.event === 'Progress') {
          console.log('[Update] Download progress:', event.data.chunkLength);
        } else if (event.event === 'Finished') {
          console.log('[Update] Download finished');
          setStatus('installing');
        }
      });

      console.log('[Update] Installing...');
      await relaunch();
    } catch (error) {
      console.error('[Update] Failed:', error);
      setStatus('error');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if no update, dismissed, or already updating
  if (!update || dismissed) return null;

  return (
    <div className="update-notification">
      <div className="update-content">
        <span className="update-icon">
          {status === 'error' ? '!' : '\u2191'}
        </span>
        <span className="update-text">
          {status === 'idle' && `v${update.version} available`}
          {status === 'downloading' && 'Downloading...'}
          {status === 'installing' && 'Installing...'}
          {status === 'error' && 'Update failed'}
        </span>
      </div>
      <div className="update-actions">
        {status === 'idle' && (
          <>
            <button className="update-btn primary" onClick={handleUpdate}>
              Update
            </button>
            <button className="update-btn secondary" onClick={handleDismiss}>
              Later
            </button>
          </>
        )}
        {status === 'error' && (
          <button className="update-btn secondary" onClick={handleDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
