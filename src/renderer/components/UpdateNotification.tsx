import React, { useEffect, useMemo, useState } from 'react';
import type { UpdateInfo, UpdateProgress } from '../../types/service';

type NotificationPhase = 'available' | 'downloading' | 'ready';

export const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [phase, setPhase] = useState<NotificationPhase>('available');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadedVersion, setDownloadedVersion] = useState<string | null>(null);

  useEffect(() => {
    const offAvailable = window.serviceAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setPhase(info.installMethod === 'packaged' ? 'downloading' : 'available');
      setProgress(null);
      setDownloadedVersion(null);
      setVisible(true);
    });

    const offProgress = window.serviceAPI.onUpdateProgress((prog) => {
      setProgress(prog);
      setPhase('downloading');
      setVisible(true);
    });

    const offDownloaded = window.serviceAPI.onUpdateDownloaded(({ version }) => {
      setPhase('ready');
      setDownloadedVersion(version);
      setProgress(null);
      setVisible(true);
    });

    return () => {
      offAvailable();
      offProgress();
      offDownloaded();
    };
  }, []);

  const handleCopyCommand = () => {
    if (updateInfo?.updateCommand) {
      navigator.clipboard.writeText(updateInfo.updateCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setProgress(null);
  };

  const handleRestartNow = async () => {
    await window.serviceAPI.applyPendingUpdate();
  };

  const title = useMemo(() => {
    if (!updateInfo) return 'Update available';
    if (updateInfo.installMethod === 'npm') {
      return 'Update available';
    }
    if (phase === 'ready') {
      return 'Update ready to install';
    }
    if (phase === 'downloading') {
      return 'Downloading update';
    }
    return 'Update available';
  }, [updateInfo, phase]);

  if (!visible || !updateInfo) {
    return null;
  }

  const currentVersion = updateInfo.currentVersion ? `v${updateInfo.currentVersion}` : 'Current version';
  const latestVersion = updateInfo.latestVersion ? `v${updateInfo.latestVersion}` : 'Latest version';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '320px',
        maxWidth: 'calc(100vw - 48px)',
        padding: '18px 20px',
        borderRadius: '14px',
        background: '#0f172a',
        color: '#e2e8f0',
        boxShadow: '0 30px 70px rgba(15, 23, 42, 0.35)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        backdropFilter: 'blur(12px)',
        zIndex: 2000,
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>{title}</h3>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
            {updateInfo.installMethod === 'npm'
              ? 'A new version is available. Update using the command below.'
              : phase === 'ready'
              ? 'Restart the application to finish installing the update.'
              : 'The latest update is being downloaded in the background.'}
          </p>
        </div>
        <button
          onClick={handleClose}
          aria-label="Dismiss update notification"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '16px',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: '14px', fontSize: '12px', color: '#cbd5f5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>{currentVersion}</span>
          <span>{latestVersion}</span>
        </div>

        {updateInfo.installMethod === 'packaged' && phase === 'downloading' && progress && (
          <div style={{ marginTop: '10px' }}>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(148, 163, 184, 0.2)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(Math.round(progress.percent), 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38bdf8, #6366f1)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <span style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
              {Math.round(progress.percent)}% downloaded
            </span>
          </div>
        )}

        {updateInfo.installMethod === 'packaged' && phase === 'ready' && (
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={handleRestartNow}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                color: '#f8fafc',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Restart to Install {downloadedVersion ? `v${downloadedVersion}` : 'Update'}
            </button>
            <span style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
              Or close the application to install automatically.
            </span>
          </div>
        )}

        {updateInfo.installMethod === 'npm' && (
          <div style={{ marginTop: '12px' }}>
            <code
              style={{
                display: 'block',
                background: 'rgba(15, 118, 110, 0.12)',
                color: '#f1f5f9',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                lineHeight: 1.5,
                wordBreak: 'break-all',
                border: '1px solid rgba(45, 212, 191, 0.25)',
              }}
            >
              {updateInfo.updateCommand}
            </code>
            <button
              onClick={handleCopyCommand}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: copied ? '#10b981' : '#1f2937',
                color: '#f8fafc',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied' : 'Copy Command'}
            </button>
          </div>
        )}

        {updateInfo.installMethod === 'npm' && (
          <a
            href="https://github.com/omnizs/Service-Manager/releases/latest"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              marginTop: '10px',
              fontSize: '11px',
              color: '#38bdf8',
              textDecoration: 'none',
            }}
          >
            View release notes
          </a>
        )}
      </div>
    </div>
  );
};

