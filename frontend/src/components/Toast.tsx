// src/components/Toast.tsx
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'error' | 'success';
  onDismiss: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onDismiss, duration = 3500 }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  const icon = type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ';

  return (
    <div className="toast-container">
      <div className={`nav-toast ${type}`}>
        <span>{icon}</span>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default Toast;
