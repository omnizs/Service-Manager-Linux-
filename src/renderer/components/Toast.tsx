import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

// React 19 optimization: Memoized toast hook with queue management
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Optimized toast addition with queue limit
  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = Date.now();
    
    setToasts(prev => {
      // Limit toast queue to 5 items
      const updated = [...prev, { id, message, type, timestamp }];
      return updated.slice(-5);
    });

    // Auto-remove with cleanup tracking
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timerRefs.current.delete(id);
    }, 4000);
    
    timerRefs.current.set(id, timer);
  }, []);

  // Optimized manual removal
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    
    // Clear associated timer
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(timer => clearTimeout(timer));
      timerRefs.current.clear();
    };
  }, []);

  return { toasts, addToast, removeToast };
};

// Memoized individual toast component for better performance
const ToastItem = React.memo<{ toast: ToastMessage; onRemove: (id: string) => void }>(
  ({ toast, onRemove }) => {
    const typeStyles: Record<ToastType, string> = {
      info: 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600',
      success: 'bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600',
      error: 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600',
      warning: 'bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-500 dark:to-orange-600',
    };

    const icons: Record<ToastType, JSX.Element> = {
      info: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      success: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      error: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
      warning: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
    };

    return (
      <div
        className={`${typeStyles[toast.type]} px-4 py-3 rounded-xl shadow-2xl max-w-md pointer-events-auto animate-slide-in-right backdrop-blur-sm border border-white/10`}
        role="alert"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 text-white">{icons[toast.type]}</div>
            <p className="text-sm font-medium text-white truncate">{toast.message}</p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95 cursor-pointer p-1 rounded-lg hover:bg-white/10"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
);

ToastItem.displayName = 'ToastItem';

const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default React.memo(Toast);

