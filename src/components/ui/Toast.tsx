import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Icon, { IconName } from './Icon';

export interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  icon?: IconName;
}

interface ToastContextType {
  toasts: ToastConfig[];
  showToast: (config: Omit<ToastConfig, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const showToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastConfig = {
      id,
      duration: 4000,
      persistent: false,
      ...config,
    };

    setToasts(prev => [...prev, toast]);

    // 自動削除（persistent: falseの場合）
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastConfig[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastConfig;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // エントリーアニメーション
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // アニメーション時間
  }, [toast.id, onRemove]);

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: '#1a1a2e',
          borderColor: '#00ff88',
          borderLeft: '3px solid #00ff88',
          icon: 'ai-summary' as IconName,
          iconColor: '#00ff88'
        };
      case 'error':
        return {
          backgroundColor: '#1a1a2e',
          borderColor: '#ff6b6b',
          borderLeft: '3px solid #ff6b6b',
          icon: 'close' as IconName,
          iconColor: '#ff6b6b'
        };
      case 'warning':
        return {
          backgroundColor: '#1a1a2e',
          borderColor: '#f59e0b',
          borderLeft: '3px solid #f59e0b',
          icon: 'bell' as IconName,
          iconColor: '#f59e0b'
        };
      case 'info':
      default:
        return {
          backgroundColor: '#1a1a2e',
          borderColor: '#64b5f6',
          borderLeft: '3px solid #64b5f6',
          icon: 'analysis' as IconName,
          iconColor: '#64b5f6'
        };
    }
  };

  const typeStyles = getTypeStyles();
  const iconName = toast.icon || typeStyles.icon;

  return (
    <div
      className={`toast-item ${isVisible ? 'toast-enter' : ''} ${isExiting ? 'toast-exit' : ''}`}
      style={{
        backgroundColor: typeStyles.backgroundColor,
        border: `1px solid ${typeStyles.borderColor}`,
        borderLeft: typeStyles.borderLeft,
        borderRadius: '4px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
      onClick={handleClose}
    >
      <div className="toast-content">
        <div className="toast-icon">
          <Icon name={iconName} size={16} color={typeStyles.iconColor} />
        </div>
        <div className="toast-text">
          <div className="toast-title">{toast.title}</div>
          {toast.message && <div className="toast-message">{toast.message}</div>}
        </div>
        <button className="toast-close" onClick={handleClose}>
          <Icon name="close" size={14} color="#6c7086" />
        </button>
      </div>
    </div>
  );
};

// CSS追加のためのスタイル注入
const injectToastStyles = () => {
  if (document.getElementById('toast-styles')) return;

  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      min-width: 300px;
      max-width: 380px;
      padding: 12px 16px;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .toast-item.toast-enter {
      transform: translateX(0);
      opacity: 1;
    }

    .toast-item.toast-exit {
      transform: translateX(100%);
      opacity: 0;
    }

    .toast-content {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .toast-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast-text {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-size: 11px;
      font-weight: 600;
      color: #e2e8f0;
      line-height: 1.4;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .toast-message {
      font-size: 12px;
      font-weight: 400;
      color: #a6adc8;
      line-height: 1.4;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      border-radius: 2px;
      transition: all 0.2s;
      margin-top: -1px;
    }

    .toast-close:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    @media (max-width: 640px) {
      .toast-container {
        left: 16px;
        right: 16px;
        top: 16px;
      }

      .toast-item {
        min-width: auto;
        max-width: none;
      }
    }
  `;
  document.head.appendChild(style);
};

// スタイル注入を実行
if (typeof document !== 'undefined') {
  injectToastStyles();
}

export default ToastProvider; 