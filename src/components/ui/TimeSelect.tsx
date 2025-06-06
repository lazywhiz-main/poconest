import React, { useState } from 'react';

interface TimeSelectProps {
  value: { hour: number; minute: number };
  onChange: (val: { hour: number; minute: number }) => void;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange }) => {
  const [input, setInput] = useState(`${pad(value.hour)}:${pad(value.minute)}`);

  // 入力欄の変更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const match = val.match(/^(\d{1,2}):(\d{1,2})$/);
    if (match) {
      let hour = Math.max(0, Math.min(23, parseInt(match[1], 10)));
      let minute = Math.max(0, Math.min(59, parseInt(match[2], 10)));
      onChange({ hour, minute });
    }
  };

  // ボタン操作
  const adjust = (type: 'hour' | 'minute', delta: number) => {
    let hour = value.hour;
    let minute = value.minute;
    if (type === 'hour') hour = (hour + delta + 24) % 24;
    if (type === 'minute') minute = (minute + delta + 60) % 60;
    onChange({ hour, minute });
    setInput(`${pad(hour)}:${pad(minute)}`);
  };
  const setNow = () => {
    const now = new Date();
    onChange({ hour: now.getHours(), minute: now.getMinutes() });
    setInput(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };
  const reset = () => {
    onChange({ hour: 0, minute: 0 });
    setInput('00:00');
  };

  // valueが外部から変化した場合もinputを同期
  React.useEffect(() => {
    setInput(`${pad(value.hour)}:${pad(value.minute)}`);
  }, [value.hour, value.minute]);

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderRadius: 6,
      padding: 16,
      display: 'inline-block',
      minWidth: 180,
    }}>
      <div style={{ color: '#00ff88', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Time Select</div>
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        style={{
          background: '#0f0f23',
          border: '1px solid #333366',
          borderRadius: 4,
          padding: '8px 16px',
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 24,
          color: '#00ff88',
          marginBottom: 16,
          width: 120,
        }}
        maxLength={5}
        pattern="\d{2}:\d{2}"
        inputMode="numeric"
        aria-label="時刻入力"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <button style={btnStyle} onClick={() => adjust('hour', 1)}>H+</button>
        <button style={btnStyle} onClick={() => adjust('minute', 1)}>M+</button>
        <button style={btnStyle} onClick={reset}>RST</button>
        <button style={btnStyle} onClick={() => adjust('hour', -1)}>H-</button>
        <button style={btnStyle} onClick={() => adjust('minute', -1)}>M-</button>
        <button style={btnStyle} onClick={setNow}>NOW</button>
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: '#333366',
  border: '1px solid #45475a',
  borderRadius: 3,
  color: '#a6adc8',
  padding: '6px 0',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'JetBrains Mono, monospace',
  transition: 'all 0.15s',
};

export default TimeSelect; 