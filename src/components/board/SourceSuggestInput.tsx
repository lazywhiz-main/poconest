import React, { useState, useEffect, useRef } from 'react';
import { suggestSources, Source, addSource } from '@/services/BoardService';
import { createPortal } from 'react-dom';
import { Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface SourceSuggestInputProps {
  value: Source[];
  onChange: (sources: Source[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SourceSuggestInput: React.FC<SourceSuggestInputProps> = ({ value, onChange, placeholder = '参照するflow情報を検索・追加', disabled }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Source[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [suggestPos, setSuggestPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (input.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    let active = true;
    suggestSources(input).then(res => {
      if (active && res.data) {
        setSuggestions(res.data.filter(s => !value.some(v => v.id === s.id)));
      }
    });
    return () => { active = false; };
  }, [input, value]);

  const handleSelect = (source: Source) => {
    onChange([...value, source]);
    setInput('');
    setShowSuggest(false);
  };

  const handleRemove = (id: string) => {
    onChange(value.filter(s => s.id !== id));
  };

  // URL判定用の正規表現
  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // 新規URL元ソース追加
  const handleAddUrlSource = async () => {
    if (!isUrl(input)) return;
    setIsAdding(true);
    try {
      const res = await addSource({ type: 'url', url: input, label: input });
      if (res.data) {
        onChange([...value, res.data]);
        setInput('');
        setShowSuggest(false);
      }
    } finally {
      setIsAdding(false);
    }
  };

  // サジェスト表示位置をinputの直下に
  const handleFocus = () => {
    setShowSuggest(true);
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setSuggestPos({ left: rect.left, top: rect.bottom, width: rect.width });
    }
  };

  // スクロールやリサイズ時も位置を再計算
  useEffect(() => {
    if (!showSuggest || !inputRef.current) return;
    const updatePos = () => {
      const rect = inputRef.current!.getBoundingClientRect();
      setSuggestPos({ left: rect.left, top: rect.bottom, width: rect.width });
    };
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    updatePos();
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [showSuggest]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', borderRadius: 8, border: '1px solid #e0e0e0', padding: 10, fontSize: 13, background: '#f7f8fa', boxSizing: 'border-box' }}
      />
      {showSuggest && suggestPos && createPortal(
        <div style={{
          position: 'fixed',
          top: suggestPos.top,
          left: suggestPos.left,
          width: suggestPos.width,
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: 12,
          zIndex: 99999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          padding: 16,
          minWidth: 260,
          boxSizing: 'border-box',
        }}>
          {suggestions.map(s => (
            <div key={s.id} style={{ padding: 10, cursor: 'pointer', fontSize: 13 }} onMouseDown={() => handleSelect(s)}>
              {s.label || s.url || s.ref_id || s.id}
            </div>
          ))}
          {/* 新規URL追加ボタン */}
          {input.trim() && isUrl(input) && !suggestions.some(s => s.url === input) && (
            <div style={{ padding: 10, cursor: isAdding ? 'wait' : 'pointer', fontSize: 13, color: '#1976d2', borderTop: '1px solid #eee', background: '#f7f8fa' }}
              onMouseDown={isAdding ? undefined : handleAddUrlSource}>
              {isAdding ? '追加中...' : `「${input}」を新規URLソースとして追加`}
            </div>
          )}
        </div>,
        document.body
      )}
      {/* 選択済み元ソースバッジ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {value.map(s => (
          <span key={s.id} style={{ background: '#e3f2fd', color: '#1976d2', borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {s.label || s.url || s.ref_id || s.id}
            <Tooltip 
              title={
                <div style={{ padding: '4px 0' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>ソースタイプ: {s.type}</div>
                  <div style={{ fontSize: 12 }}>
                    {s.type === 'url' ? (
                      'URLを直接入力して追加'
                    ) : s.type === 'insight' ? (
                      'インサイトから参照を追加'
                    ) : s.type === 'theme' ? (
                      'テーマから参照を追加'
                    ) : (
                      'その他のソース'
                    )}
                  </div>
                </div>
              }
              arrow
              placement="top"
            >
              <HelpOutlineIcon style={{ fontSize: 16, cursor: 'help', opacity: 0.7 }} />
            </Tooltip>
            <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => handleRemove(s.id)}>×</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default SourceSuggestInput; 