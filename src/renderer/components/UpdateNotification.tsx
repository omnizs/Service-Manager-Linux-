import React, { useEffect, useState } from 'react';
import type { UpdateInfo, UpdateProgress } from '../../types/service';

export const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Listen for update available events
    const unsubscribe = window.serviceAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setShowNotification(true);
    });

    // Listen for download progress
    const unsubscribeProgress = window.serviceAPI.onUpdateProgress((prog) => {
      setProgress(prog);
    });

    return () => {
      unsubscribe();
      unsubscribeProgress();
    };
  }, []);

  const handleCopyCommand = () => {
    if (updateInfo?.updateCommand) {
      navigator.clipboard.writeText(updateInfo.updateCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification || !updateInfo) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #000000',
        padding: '20px',
        width: '400px',
        maxWidth: 'calc(100vw - 40px)',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          {updateInfo.installMethod === 'npm' ? '📦 Update Available' : '🚀 Update Ready'}
        </h3>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: 1.6 }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Current:</strong> v{updateInfo.currentVersion}
          <br />
          <strong>Latest:</strong> v{updateInfo.latestVersion}
        </p>

        {updateInfo.installMethod === 'npm' && (
          <>
            <p style={{ margin: '8px 0', color: '#666' }}>
              Run this command in your terminal to update:
            </p>
            <div
              style={{
                backgroundColor: '#f5f5f5',
                padding: '8px 12px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                wordBreak: 'break-all',
                marginBottom: '12px',
              }}
            >
              {updateInfo.updateCommand}
            </div>
            <button
              onClick={handleCopyCommand}
              style={{
                backgroundColor: copied ? '#4CAF50' : '#000000',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {copied ? '✓ Copied!' : '📋 Copy Command'}
            </button>
          </>
        )}

        {updateInfo.installMethod === 'packaged' && progress && (
          <>
            <p style={{ margin: '8px 0', color: '#666' }}>
              Downloading update... {Math.round(progress.percent)}%
            </p>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  backgroundColor: '#000000',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </>
        )}

        {updateInfo.installMethod === 'packaged' && !progress && (
          <p style={{ margin: '8px 0', color: '#666' }}>
            The update will install automatically when you close the application.
          </p>
        )}
      </div>

      {updateInfo.installMethod === 'npm' && (
        <div style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
          <a
            href="https://github.com/omnizs/Service-Manager/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000000', textDecoration: 'underline' }}
          >
            View Release Notes
          </a>
        </div>
      )}
    </div>
  );
};

