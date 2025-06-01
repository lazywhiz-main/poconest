import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number | string;
  style?: React.CSSProperties;
}

/**
 * デザインシステム準拠の共通モーダル
 */
const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  width = 400,
  style = {},
}) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15,18,34,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: '#232345',
        borderRadius: 4,
        border: '1px solid #39396a',
        width,
        minWidth: 320,
        maxWidth: '90vw',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        ...style,
      }}>
        {/* ヘッダー */}
        <div style={{
          background: '#39396a',
          padding: '14px 20px 10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 40,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', marginLeft: 12, lineHeight: 1 }}>×</button>
        </div>
        {/* 本体 */}
        <div style={{ padding: '18px 20px 20px 20px', background: '#232345', fontSize: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 