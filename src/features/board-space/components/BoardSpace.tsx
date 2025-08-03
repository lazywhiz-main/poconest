import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
// import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import theme from '../../../styles/theme';
import Card from '../../../components/Card';
import { BoardItem, useBoardContext } from '../contexts/BoardContext';
import { BoardColumnType } from 'src/types/board';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-markdown';
import { createPortal } from 'react-dom';
import SourceSuggestInput from '@/components/board/SourceSuggestInput';
import { Source, addBoardCards, suggestSources, addSource } from '@/services/BoardService';
import { Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../services/supabase/client';
import Modal from '../../../components/ui/Modal';
import { formatJapanDateTime } from '../../../utils/dateFormatter';

const EditIcon = ({ size = 14, color = "#888" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const DeleteIcon = ({ size = 18, color = "#ff6b6b" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 11v6M14 11v6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// dnd-kit（Webのみ）
// let DndContext: any, SortableContext: any, useSortable: any, arrayMove: any, CSS: any;
// if (typeof window !== 'undefined') {
//   // eslint-disable-next-line @typescript-eslint/no-var-requires
//   const dnd = require('@dnd-kit/core');
//   const sortable = require('@dnd-kit/sortable');
//   DndContext = dnd.DndContext;
//   SortableContext = sortable.SortableContext;
//   useSortable = sortable.useSortable;
//   arrayMove = sortable.arrayMove;
//   CSS = sortable.CSS;
// }

// Web用D&Dカラムを動的import
const SortableBoardColumn = typeof window !== 'undefined'
  ? React.lazy(() => import('./SortableBoardColumn'))
  : undefined;

interface BoardSpaceProps {
  nestId: string;
}

interface CardModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (card: Partial<BoardItem> & { sources?: Source[]; related_card_ids?: string[] }) => void;
  initialData?: Partial<BoardItem>;
  columnType: BoardColumnType;
  setColumnType: (col: BoardColumnType) => void;
  boardId: string;
}

// Markdownカスタムスタイル共通定義
const markdownComponents = {
  h1: (props: any) => <h1 {...props} />,
  h2: (props: any) => <h2 {...props} />,
  h3: (props: any) => <h3 {...props} />,
  h4: (props: any) => <h4 {...props} />,
  h5: (props: any) => <h5 {...props} />,
  h6: (props: any) => <h6 {...props} />,
  ul: (props: any) => (
    <ul 
      {...props} 
      style={{ 
        listStyle: 'none',
        paddingLeft: '1.5em',
        margin: '0.5em 0'
      }} 
    />
  ),
  ol: (props: any) => <ol {...props} />,
  li: (props: any) => (
    <li 
      {...props} 
      style={{ 
        position: 'relative',
        marginBottom: '0.25em',
        paddingLeft: '0.5em'
      }}
    >
      <span style={{ 
        position: 'absolute',
        left: '-1em',
        color: '#00ff88'
      }}>
        •
      </span>
      {props.children}
    </li>
  ),
  blockquote: (props: any) => <blockquote {...props} />,
  code: (props: any) => <code {...props} />,
  pre: (props: any) => <pre {...props} />,
  table: (props: any) => <table {...props} />,
  th: (props: any) => <th {...props} />,
  td: (props: any) => <td {...props} />,
  tr: (props: any) => <tr {...props} />,
  a: (props: any) => <a {...props} />,
  hr: (props: any) => <hr {...props} />,
  img: (props: any) => <img {...props} />,
};

const BOARD_COLUMN_TYPES = ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'] as const;

const CardModal: React.FC<CardModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  columnType,
  setColumnType,
  boardId,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [relatedCardIds, setRelatedCardIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { getCardsByColumn, state } = useBoardContext();
  const [relatedDropdownOpen, setRelatedDropdownOpen] = useState(false);
  const [relatedFilter, setRelatedFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownMaxHeight] = useState(180); // fixed
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState<Source[]>([]);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditingContent, setIsEditingContent] = useState(true);

  // 関連カードの候補を取得
  const allCardsForModal = useMemo(() => {
    // 全カラムのカードから自分自身を除外
    return state.cards.filter(card => card.id !== initialData?.id);
  }, [state.cards, initialData]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setRelatedDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // フィルタ適用
  const filteredCards = allCardsForModal.filter(card =>
    card.title.toLowerCase().includes(relatedFilter.toLowerCase())
  );

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const value = tagInput.trim();
      if (value && !tags.includes(value)) {
        setTags([...tags, value]);
      }
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };
  const handleTagRemove = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      title,
      content,
      tags,
      column_type: columnType,
      sources,
      related_card_ids: relatedCardIds,
    });
    setIsSaving(false);
    onClose();
  };

  // タグ追加
  const handleTagAdd = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) {
      setTags([...tags, value]);
      setTagInput('');
    } else {
      setTagInput('');
    }
  };

  // カード種別選択
  const handleColumnTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setColumnType(e.target.value as BoardColumnType);
  };

  // サジェスト取得
  useEffect(() => {
    if (!sourceDropdownOpen || !sourceFilter.trim()) {
      setSourceSuggestions([]);
      return;
    }
    let active = true;
    suggestSources(sourceFilter).then(res => {
      if (active && res.data) {
        setSourceSuggestions(res.data.filter(s => !sources.some(v => v.id === s.id)));
      }
    });
    return () => { active = false; };
  }, [sourceDropdownOpen, sourceFilter, sources]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!sourceDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sourceDropdownOpen]);

  // URL判定
  const isUrl = (str: string) => {
    try { new URL(str); return true; } catch { return false; }
  };

  // 新規URL追加
  const handleAddUrlSource = async () => {
    if (!isUrl(sourceFilter)) return;
    setIsAddingSource(true);
    try {
      const res = await addSource({ type: 'url', url: sourceFilter, label: sourceFilter });
      if (res.data) {
        setSources([...sources, res.data]);
        setSourceFilter('');
        setSourceDropdownOpen(false);
      }
    } finally {
      setIsAddingSource(false);
    }
  };

  // サイドパネル用スタイル
  const panelWidth = isMobile ? '100vw' : 500;

  const openDropdown = () => {
    setRelatedDropdownOpen(true);
  };

  // フォーム初期値を編集時にセット
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setContent(initialData.content || '');
      setTags(initialData.tags || []);
      setSources(initialData.sources || []);
      setRelatedCardIds(initialData.related_card_ids || (initialData.related_cards || []).map((c: any) => c.id) || []);
      setIsEditingContent(false);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
      setSources([]);
      setRelatedCardIds([]);
      setIsEditingContent(true);
    }
  }, [initialData]);

  // 本文エリアの高さを内容に合わせて自動調整
  useEffect(() => {
    if (isEditingContent && contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = (contentRef.current.scrollHeight || 80) + 'px';
    }
  }, [content, open, isEditingContent]);

  if (typeof window === 'undefined') return null;
  return (
    open ? (
      <>
        {/* オーバーレイ */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          transition: 'opacity 0.3s',
        }} onClick={onClose} />
        {/* サイドパネル本体 */}
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100vh',
            width: panelWidth,
            maxWidth: '100vw',
            background: '#232347',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
            zIndex: 2100,
            display: 'flex',
            flexDirection: 'column',
            transform: open ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 24px 0 24px',
            borderBottom: '1px solid #333366',
            minHeight: 64,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{initialData ? 'カードを編集' : '新しいカードを作成'}</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a6adc8', fontSize: 24, cursor: 'pointer', marginLeft: 8 }}>×</button>
          </div>
          {/* 本体フォーム */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 80px 24px', display: 'flex', flexDirection: 'column' }}>
            <form
              style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}
              onSubmit={e => { e.preventDefault(); handleSave(); }}
              autoComplete="off"
            >
              {/* メタ情報 */}
              {initialData && (
                <div style={{ marginBottom: 16, fontSize: 12, color: '#6c7086', fontFamily: 'JetBrains Mono, monospace' }}>
                  <div>作成者: {(initialData as any)?.createdByDisplayName || (initialData as any)?.created_by_display_name || '不明'}</div>
                  {initialData.created_at && (
                    <div>作成日: {formatJapanDateTime(initialData.created_at)}</div>
                  )}
                  {(initialData as any)?.updatedByDisplayName && (
                    <div>更新者: {(initialData as any)?.updatedByDisplayName}</div>
                  )}
                  {initialData.updated_at && (
                    <div>最終更新: {formatJapanDateTime(initialData.updated_at)}</div>
                  )}
                </div>
              )}
              {/* カード種別選択 */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>カード種別</label>
                <div style={{ display: 'flex', gap: 24, flexDirection: 'row', marginTop: 4 }}>
                  {BOARD_COLUMN_TYPES.map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <input
                        type="radio"
                        name="columnType"
                        value={type}
                        checked={columnType === (type as BoardColumnType)}
                        onChange={() => setColumnType(type as BoardColumnType)}
                      /> {type}
                    </label>
                  ))}
                </div>
              </div>
              {/* タイトル */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>タイトル</label>
                <input
                  className="form-input"
                  style={{ width: '100%', background: '#0f0f23', border: '1px solid #333366', borderRadius: 2, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', marginBottom: 2 }}
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="タイトルを入力"
                  required
                  autoFocus
                />
              </div>
              {/* 内容 */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1 }}>内容</label>
                  <button
                    type="button"
                    onClick={() => setIsEditingContent(!isEditingContent)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#a6adc8',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    <EditIcon size={14} color="#a6adc8" />
                    {isEditingContent ? 'プレビュー' : '編集'}
                  </button>
                </div>
                {isEditingContent ? (
                  <textarea
                    ref={contentRef}
                    className="form-input"
                    style={{
                      width: '100%',
                      background: '#0f0f23',
                      border: '1px solid #333366',
                      borderRadius: 2,
                      padding: '8px 12px',
                      color: '#e2e8f0',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      marginBottom: 2,
                      resize: 'none',
                      boxSizing: 'border-box',
                      minHeight: 80
                    }}
                    value={content}
                    onChange={e => {
                      setContent(e.target.value);
                      if (contentRef.current) {
                        contentRef.current.style.height = 'auto';
                        contentRef.current.style.height = (contentRef.current.scrollHeight || 80) + 'px';
                      }
                    }}
                    placeholder="内容を入力"
                    required
                    rows={4}
                  />
                ) : (
                  <div
                    className="markdown-preview"
                    style={{
                      width: '100%',
                      minHeight: 80,
                      marginBottom: 2,
                    }}
                  >
                    <Markdown components={markdownComponents}>{content || '（内容なし）'}</Markdown>
                  </div>
                )}
              </div>
              {/* タグ */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>タグ</label>
                <input
                  className="form-input"
                  style={{ width: '100%', background: '#0f0f23', border: '1px solid #333366', borderRadius: 2, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', marginBottom: 2 }}
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder={tags.length === 0 ? 'タグを入力' : ''}
                  autoComplete="off"
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ background: '#333366', color: '#a6adc8', borderRadius: 2, padding: '4px 10px', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {tag}
                      <span style={{ cursor: 'pointer', marginLeft: 4, color: '#a6adc8', fontWeight: 700, fontSize: 14 }} onClick={() => handleTagRemove(tag)}>×</span>
                    </span>
                  ))}
                </div>
              </div>
              {/* 出典（ソース）: カスタムドロップダウン */}
              <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>出典</label>
                {/* 選択済みソースタグ表示 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {sources.map(s => (
                    <span key={s.id} style={{ background: '#23243a', color: '#00ff88', borderRadius: 12, padding: '6px 14px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s.label || s.url || s.ref_id || s.id}
                      <span style={{ cursor: 'pointer', marginLeft: 4, color: '#00ff88', fontWeight: 700, fontSize: 15 }} onClick={() => setSources(sources.filter(ss => ss.id !== s.id))}>×</span>
                    </span>
                  ))}
                </div>
                {/* ドロップダウン本体 */}
                <div style={{ position: 'relative' }} ref={sourceDropdownRef}>
                  <button
                    type="button"
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid #333366', borderRadius: 2, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => setSourceDropdownOpen(v => !v)}
                  >
                    {sources.length === 0 ? '出典を選択・追加' : '出典を編集'}
                    <span style={{ float: 'right', color: '#888' }}>{sourceDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {sourceDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '110%',
                      left: 0,
                      width: '100%',
                      background: '#23243a',
                      border: '1px solid #333366',
                      borderRadius: 4,
                      zIndex: 100,
                      maxHeight: 220,
                      overflowY: 'auto',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                      padding: 8,
                    }}>
                      <input
                        type="text"
                        placeholder="検索またはURLを入力..."
                        value={sourceFilter}
                        onChange={e => setSourceFilter(e.target.value)}
                        style={{ width: '100%', marginBottom: 8, padding: '6px 8px', borderRadius: 2, border: '1px solid #333366', background: '#1a1a2e', color: '#e2e8f0', fontSize: 13 }}
                      />
                      {sourceSuggestions.length === 0 && !isUrl(sourceFilter) && (
                        <div style={{ color: '#888', fontSize: 13, padding: 8 }}>該当なし</div>
                      )}
                      {sourceSuggestions.map(s => (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderRadius: 2, cursor: 'pointer', background: sources.some(ss => ss.id === s.id) ? '#e3f2fd' : 'none', color: sources.some(ss => ss.id === s.id) ? '#1976d2' : '#e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={sources.some(ss => ss.id === s.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSources([...sources, s]);
                              } else {
                                setSources(sources.filter(ss => ss.id !== s.id));
                              }
                            }}
                            style={{ accentColor: '#1976d2' }}
                          />
                          <span style={{ fontSize: 13 }}>{s.label || s.url || s.ref_id || s.id}</span>
                        </label>
                      ))}
                      {/* 新規URL追加ボタン */}
                      {sourceFilter.trim() && isUrl(sourceFilter) && !sourceSuggestions.some(s => s.url === sourceFilter) && (
                        <div style={{ padding: 10, cursor: isAddingSource ? 'wait' : 'pointer', fontSize: 13, color: '#00ff88', borderTop: '1px solid #333366', background: '#1a1a2e' }}
                          onClick={isAddingSource ? undefined : handleAddUrlSource}>
                          {isAddingSource ? '追加中...' : `「${sourceFilter}」を新規URLソースとして追加`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* 関連カード（カスタムドロップダウン） */}
              <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>関連カード</label>
                {/* 選択済みカードタグ表示（バッジUI） */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {relatedCardIds.map(id => {
                    const card = allCardsForModal.find(c => c.id === id);
                    if (!card) return null;
                    return (
                      <span key={id} style={{
                        border: '1.5px solid #00ff88',
                        color: '#00ff88',
                        borderRadius: 3,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, marginRight: 4 }}>{card.column_type?.toUpperCase()}</span>
                        {card.title}
                        <span style={{ cursor: 'pointer', marginLeft: 6, color: '#00ff88', fontWeight: 700, fontSize: 14 }} onClick={() => setRelatedCardIds(relatedCardIds.filter(cid => cid !== id))}>×</span>
                      </span>
                    );
                  })}
                </div>
                {/* ドロップダウン本体（既存） */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
                    ref={dropdownButtonRef}
                    type="button"
                    style={{ width: '100%', background: '#0f0f23', border: '1px solid #333366', borderRadius: 2, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => setRelatedDropdownOpen(v => !v)}
                  >
                    {relatedCardIds.length === 0 ? '関連カードを選択' : '関連カードを編集'}
                    <span style={{ float: 'right', color: '#888' }}>{relatedDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {relatedDropdownOpen && (
                    <div style={{
                      width: '100%',
                      background: '#23243a',
                      border: '1px solid #333366',
                      borderRadius: 4,
                      zIndex: 100,
                      overflowY: 'auto',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                      padding: 8,
                      marginTop: 4,
                      marginBottom: 16,
                      maxHeight: 180,
                    }}>
                      <input
                        type="text"
                        placeholder="検索..."
                        value={relatedFilter}
                        onChange={e => setRelatedFilter(e.target.value)}
                        style={{ width: '100%', marginBottom: 8, padding: '6px 8px', borderRadius: 2, border: '1px solid #333366', background: '#1a1a2e', color: '#e2e8f0', fontSize: 13 }}
                      />
                      {filteredCards.length === 0 && (
                        <div style={{ color: '#888', fontSize: 13, padding: 8 }}>該当なし</div>
                      )}
                      {filteredCards.map(card => (
                        <label key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderRadius: 2, cursor: 'pointer', background: relatedCardIds.includes(card.id) ? '#333366' : 'none' }}>
                          <input
                            type="checkbox"
                            checked={relatedCardIds.includes(card.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setRelatedCardIds([...relatedCardIds, card.id]);
                              } else {
                                setRelatedCardIds(relatedCardIds.filter(id => id !== card.id));
                              }
                            }}
                            style={{ accentColor: '#00ff88' }}
                          />
                          <span style={{ background: '#00ff88', color: '#0f0f23', borderRadius: 2, fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>{card.column_type.toUpperCase()}</span>
                          <span style={{ fontSize: 13, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
          {/* フッター: サイドパネル下端に固定 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            background: 'rgba(35,35,71,0.98)',
            borderTop: '1px solid #333366',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            zIndex: 2200,
          }}>
            <button
              type="button"
              className="btn"
              style={{ padding: '8px 16px', border: '1px solid #333366', borderRadius: 2, background: '#1a1a2e', color: '#e2e8f0', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 0 }}
              onClick={onClose}
              disabled={isSaving}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn primary"
              style={{ padding: '8px 16px', border: '1px solid #00ff88', borderRadius: 2, background: '#00ff88', color: '#0f0f23', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: isSaving ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: 0.5, opacity: isSaving ? 0.7 : 1 }}
              disabled={isSaving}
              form={undefined} // prevent warning
              onClick={handleSave}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </>
    ) : null
  );
};

const BOARD_COLOR = theme.colors.spaces.board.primary;

/**
 * ボード空間コンポーネント
 * 
 * 4カラム（Inbox, Insights, Themes, Zoom）でカードを管理するインタフェースを提供
 */
const BoardSpace: React.FC<BoardSpaceProps> = ({ nestId }) => {
  const { 
    state,
    addCards,
    selectCard,
    searchCards,
    getCardsByColumn,
    updateCard,
    deleteCard,
    loadNestData,
    isLoading,
  } = useBoardContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BoardItem | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<BoardColumnType>('INBOX');
  const [previewCard, setPreviewCard] = useState<BoardItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetCardId, setDeleteTargetCardId] = useState<string | null>(null);

  // タブ定義
  const TABS = [
    { key: 'all', label: 'All' },
    { key: 'INBOX', label: 'INBOX' },
    { key: 'QUESTIONS', label: 'QUESTIONS' },
    { key: 'INSIGHTS', label: 'INSIGHTS' },
    { key: 'THEMES', label: 'THEMES' },
    { key: 'ACTIONS', label: 'ACTIONS' },
  ];
  const [activeTab, setActiveTab] = useState('all');

  const { user } = useAuth();

  // nestIdが未定義・nullの場合はAPIを呼ばない
  useEffect(() => {
    if (!nestId) return;
    loadNestData(nestId);
  }, [nestId, loadNestData]);

  // 3カラムのみ取得
  const inboxCards = getCardsByColumn('INBOX');
  const insightCards = getCardsByColumn('INSIGHTS');
  const themeCards = getCardsByColumn('THEMES');

  // D&D用のローカル状態を同期
  // useEffect(() => {
  //   setInboxCardsState([...inboxCards].sort((a, b) => a.order_index - b.order_index));
  // }, [inboxCards]);

  // 並び替え時のorder_index更新
  const handleOrderChange = (columnType: BoardColumnType) => (newOrder: BoardItem[]) => {
    newOrder.forEach((card, idx) => {
      if (card.order_index !== idx) {
        updateCard({ ...card, order_index: idx, id: card.id });
      }
    });
  };

  // ＋ボタン押下時のカラム初期値をタブに応じてセット
  const handleCreateCard = () => {
    let initialColumn: BoardColumnType = 'INBOX';
    if (activeTab === 'INBOX') initialColumn = 'INBOX';
    else if (activeTab === 'INSIGHTS') initialColumn = 'INSIGHTS';
    else if (activeTab === 'THEMES') initialColumn = 'THEMES';
    setSelectedColumn(initialColumn);
    setSelectedCard(null);
    setIsCardModalVisible(true);
  };

  const handleEditCard = (card: BoardItem) => {
    // related_card_idsがなければrelated_cardsから補完
    let cardForEdit = card;
    if ((!card.related_card_ids || card.related_card_ids.length === 0) && card.related_cards && card.related_cards.length > 0) {
      cardForEdit = {
        ...card,
        related_card_ids: card.related_cards.map(c => c.id),
      };
    }
    setSelectedCard(cardForEdit);
    setSelectedColumn(card.column_type);
    setIsCardModalVisible(true);
  };

  const handleSaveCard = async (cardData: Partial<BoardItem> & { sources?: Source[]; related_card_ids?: string[] }) => {
    if (!user || !user.id) {
      alert('ユーザー情報が取得できません。ログインし直してください。');
      return;
    }
    if (selectedCard) {
      // --- related_cardsも即時再構築して渡す ---
      let related_cards: BoardItem[] = [];
      if (cardData.related_card_ids && cardData.related_card_ids.length > 0) {
        related_cards = state.cards.filter(c => cardData.related_card_ids?.includes(c.id));
      }
      updateCard({
        ...selectedCard,
        ...cardData,
        related_cards,
      });
      // タグ更新: 一度削除→INSERT
      await supabase.from('board_card_tags').delete().eq('card_id', selectedCard.id);
      if (cardData.tags && cardData.tags.length > 0) {
        const tagRows = cardData.tags.map(tag => ({ card_id: selectedCard.id, tag }));
        await supabase.from('board_card_tags').insert(tagRows);
      }
      // 出典（sources）更新: 一度削除→INSERT
      await supabase.from('board_card_sources').delete().eq('card_id', selectedCard.id);
      if (cardData.sources && cardData.sources.length > 0) {
        const sourceRows = cardData.sources.map(s => ({ card_id: selectedCard.id, source_id: s.id }));
        await supabase.from('board_card_sources').insert(sourceRows);
      }
      // リレーション更新: 一度削除→INSERT
      await supabase.from('board_card_relations').delete().eq('card_id', selectedCard.id);
      if (cardData.related_card_ids && cardData.related_card_ids.length > 0) {
        const relationRows = cardData.related_card_ids.map((relatedId: string) => ({
          card_id: selectedCard.id,
          related_card_id: relatedId,
        }));
        console.log('[BoardSpace] relationRows to insert:', relationRows);
        const { error: relationError, data: relationData } = await supabase.from('board_card_relations').insert(relationRows);
        console.log('[BoardSpace] relation insert result:', { relationError, relationData });
      }
    } else {
      // 新規カードの作成
      if (!state.boardId) {
        alert('ボードIDが取得できません。ページを再読み込みしてください。');
        return;
      }
      
      const newCard = {
        board_id: state.boardId,
        title: cardData.title || '',
        content: cardData.content || '',
        column_type: cardData.column_type || 'INBOX',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        order_index: 0,
        is_archived: false,
        metadata: {},
      };
      console.log('[BoardSpace] addBoardCards insert payload:', newCard, 'type:', typeof newCard, 'board_id:', typeof newCard.board_id, 'created_by:', typeof newCard.created_by);
      const { data, error } = await addBoardCards([newCard]);
      if (error) {
        alert('カードの作成に失敗しました');
        return;
      }
      // --- ここでrelated_cardsをローカルstateに即時反映 ---
      let related_cards: BoardItem[] = [];
      if (cardData.related_card_ids && cardData.related_card_ids.length > 0) {
        related_cards = state.cards.filter(c => cardData.related_card_ids?.includes(c.id));
      }
      // addCardsでrelated_cardsもセット
      addCards(data.map(card => ({ ...card, related_cards })));
      // タグ付与
      if (cardData.tags && cardData.tags.length > 0 && data && data[0]?.id) {
        const tagRows = cardData.tags.map(tag => ({ card_id: data[0].id, tag }));
        await supabase.from('board_card_tags').insert(tagRows);
      }
      // リレーション付与
      if (cardData.related_card_ids && cardData.related_card_ids.length > 0 && data && data[0]?.id) {
        const relationRows = cardData.related_card_ids.map((relatedId: string) => ({
          card_id: data[0].id,
          related_card_id: relatedId,
        }));
        console.log('[BoardSpace] relationRows to insert:', relationRows);
        const { error: relationError, data: relationData } = await supabase.from('board_card_relations').insert(relationRows);
        console.log('[BoardSpace] relation insert result:', { relationError, relationData });
      }
    }
    // --- ここでDBから再取得してstateを正規化 ---
    if (nestId) {
      await loadNestData(nestId);
    }
  };

  // カードの昇格ハンドラ
  const handlePromoteToInsights = (card: BoardItem) => {
    updateCard({ ...card, column_type: 'INSIGHTS', id: card.id });
  };
  const handlePromoteToThemes = (card: BoardItem) => {
    updateCard({ ...card, column_type: 'THEMES', id: card.id });
  };

  // タブごとのカードフィルタリング
  const filteredCards = (() => {
    if (activeTab === 'all') return state.cards;
    return state.cards.filter(card => card.column_type === activeTab);
  })();

  // --- カードグリッド描画直前でデバッグ出力 ---
  console.log('filteredCards', filteredCards);

  // Web用: デザインシステム完全準拠の新カードUI
  const renderCardWeb = (card: BoardItem) => {
    console.log('[BoardSpace] renderCardWeb card:', JSON.stringify(card, null, 2));
    const typeBadgeInfo: Record<string, { className: string; icon: string; label: string }> = {
      INBOX:      { className: 'type-inbox',     icon: '📥', label: 'Inbox' },
      INSIGHTS:   { className: 'type-insight',   icon: '💡', label: 'Insight' },
      THEMES:     { className: 'type-theme',     icon: '🎯', label: 'Theme' },
      QUESTIONS:  { className: 'type-question',  icon: '❓', label: 'Question' },
      ACTIONS:    { className: 'type-action',    icon: '⚡', label: 'Action' },
    };
    const badgeType = typeBadgeInfo[card.column_type] || typeBadgeInfo['INBOX'];
    const columnBadge = (
      <span className={`card-type-badge ${badgeType.className}`} key="type-badge">
        <span className="card-type-icon">{badgeType.icon}</span>
        {badgeType.label}
      </span>
    );
    const tagBadges = card.tags?.map(tag => (
      <span className="tag-badge" key={tag}>{tag}</span>
    )) || [];

    // --- 出典・関連カードバッジの合算省略ロジック ---
    const sourceLinks = card.sources?.map(source => (
      <a className="card-link" key={source.id} href={source.url || undefined} target="_blank" rel="noopener noreferrer">
        {source.label}
      </a>
    )) || [];
    const relatedLinks = card.related_cards?.map(rc => (
      <span className="card-link" key={rc.id}>{rc.title}</span>
    )) || [];
    const allLinks = [...sourceLinks, ...relatedLinks];
    const MAX_LINKS = 3;
    const visibleLinks = allLinks.slice(0, MAX_LINKS);
    const hiddenCount = allLinks.length - MAX_LINKS;

    return (
      <div className="card" style={{ height: 330, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', position: 'relative' }} onClick={() => handleEditCard(card)}>
        {/* 右上にDELETEボタン */}
        <button
          className="card-delete-btn"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            zIndex: 2,
          }}
          title="Delete Card"
          onClick={e => {
            e.stopPropagation();
            handleDeleteClick(card.id);
          }}
        >
          <DeleteIcon size={20} color="#ff6b6b" />
        </button>
        {/* タイトル */}
        <div className="card-title">{card.title}</div>
        {/* タイプバッジ＋タグ */}
        <div className="card-tags" style={{ marginTop: 6, marginBottom: 8 }}>
          {columnBadge}
          {tagBadges}
        </div>
        {/* 本文 */}
        <div className="card-content" style={{ flex: 1, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{card.content}</div>
        {/* 出典・関連カードリンク（省略+N対応） */}
        {(allLinks.length > 0) && (
          <div className="card-links" style={{ marginBottom: 12 }}>
            {visibleLinks}
            {hiddenCount > 0 && (
              <span className="card-link" key="more-links">+{hiddenCount}</span>
            )}
          </div>
        )}
        {/* メタ情報 */}
        <div className="card-meta" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <span>{`Created: ${new Date(card.created_at).toLocaleDateString()} | ${card.created_by_display_name || '不明'}`}</span>
          <span>{`Updated: ${new Date(card.updated_at).toLocaleDateString()} | ${card.updated_by_display_name || card.created_by_display_name || '不明'}`}</span>
        </div>
      </div>
    );
  };

  const renderColumn = (title: string, cards: BoardItem[], type: BoardColumnType) => {
    return (
      <View style={styles.column}>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => handleCreateCard()}
          >
            <Text style={styles.iconText}>＋</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.columnContent}>
          {cards.map(card => renderCardWeb(card))}
        </ScrollView>
      </View>
    );
  };

  // --- BoardSpace Web用タブUI: デザインシステム完全準拠 ---
  const renderTabs = () => (
    <>
      <style>{`
        .tab-container {
          display: flex;
          background: #1a1a2e;
          border-bottom: 1.5px solid #333366;
          padding: 0;
          margin: 0;
          border-radius: 0;
        }
        .tab {
          padding: 16px 24px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
          letter-spacing: 1px;
          border: none;
          background: none;
          border-radius: 0;
          text-transform: none;
          transition: background 0.2s, color 0.2s;
          position: relative;
          font-family: 'Space Grotesk', sans-serif;
          box-shadow: none;
          cursor: pointer;
        }
        .tab:not(.active):hover {
          background: #23243a;
          color: #fff;
        }
        .tab.active {
          background: #333366;
          color: #00ff88;
          border-bottom: 2px solid #00ff88;
          z-index: 2;
          box-shadow: none;
        }
      `}</style>
      <div className="tab-container">
        {TABS.map(tab => (
          <div
            key={tab.key}
            className={"tab" + (activeTab === tab.key ? " active" : "")}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </div>
        ))}
      </div>
    </>
  );

  const handleDeleteClick = (cardId: string) => {
    setDeleteTargetCardId(cardId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetCardId) {
      await deleteCard(deleteTargetCardId);
      if (nestId) {
        await loadNestData(nestId);
      }
    }
    setIsDeleteModalOpen(false);
    setDeleteTargetCardId(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteTargetCardId(null);
  };

  return (
    <>
      <style>{`
        /* ===== バッジデザイン: final_badge_component準拠 ===== */
        .card-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #333366;
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'JetBrains Mono', monospace;
          border: 1px solid #45475a;
          flex-shrink: 0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-type-badge.type-inbox {
          background: rgba(117,117,117,0.2);
          color: #6c7086;
          border-color: #6c7086;
        }
        .card-type-badge.type-insight {
          background: rgba(156,39,176,0.2);
          color: #9c27b0;
          border-color: #9c27b0;
        }
        .card-type-badge.type-theme {
          background: rgba(100,181,246,0.2);
          color: #64b5f6;
          border-color: #64b5f6;
        }
        .card-type-badge.type-question {
          background: rgba(255,211,61,0.2);
          color: #ffd93d;
          border-color: #ffd93d;
        }
        .card-type-badge.type-action {
          background: rgba(255,165,0,0.2);
          color: #ffa500;
          border-color: #ffa500;
        }
        .card-type-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,255,136,0.2);
        }
        .card-type-icon {
          font-size: 10px;
        }
        .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #333366;
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'JetBrains Mono', monospace;
          border: 1px solid #45475a;
          color: #a6adc8;
          flex-shrink: 0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tag-badge:hover {
          transform: translateY(-1px);
          background: #00ff88;
          color: #fff;
          border-color: #00ff88;
          box-shadow: 0 4px 12px rgba(0,255,136,0.3);
        }
        .tag-badge.category-ux {
          background: rgba(100,181,246,0.08);
          color: rgba(100,181,246,0.8);
          border-color: rgba(100,181,246,0.3);
        }
        .tag-badge.category-psychology {
          background: rgba(156,39,176,0.08);
          color: rgba(156,39,176,0.8);
          border-color: rgba(156,39,176,0.3);
        }
        .tag-badge.category-design {
          background: rgba(255,165,0,0.08);
          color: rgba(255,165,0,0.8);
          border-color: rgba(255,165,0,0.3);
        }
        .tag-badge.category-research {
          background: rgba(38,198,218,0.08);
          color: rgba(38,198,218,0.8);
          border-color: rgba(38,198,218,0.3);
        }
        .tag-badge.category-tech {
          background: rgba(0,255,136,0.08);
          color: rgba(0,255,136,0.8);
          border-color: rgba(0,255,136,0.3);
        }
      `}</style>
      {renderTabs()}
      <div className="card-list-grid">
        {filteredCards.map(card => (
          <React.Fragment key={card.id}>{renderCardWeb(card)}</React.Fragment>
        ))}
      </div>
      <button
        className="floating-add-btn"
        onClick={handleCreateCard}
        style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#00ff88',
          color: '#0f0f23',
          fontSize: 36,
          fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="新しいカードを作成"
      >
        ＋
      </button>
      <CardModal
        open={isCardModalVisible}
        onClose={() => setIsCardModalVisible(false)}
        onSave={handleSaveCard}
        initialData={selectedCard || undefined}
        columnType={selectedColumn}
        setColumnType={setSelectedColumn}
        boardId={state.boardId ?? ''}
      />
      {/* 削除確認モーダル */}
      <Modal open={isDeleteModalOpen} onClose={handleCancelDelete} title="カードの削除確認" width={380}>
        <div style={{ marginBottom: 18, color: '#e2e8f0', fontSize: 15 }}>
          本当にこのカードを削除しますか？この操作は元に戻せません。
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            className="btn"
            style={{ padding: '8px 16px', border: '1px solid #333366', borderRadius: 2, background: '#1a1a2e', color: '#e2e8f0', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}
            onClick={handleCancelDelete}
          >キャンセル</button>
          <button
            className="btn danger"
            style={{ padding: '8px 16px', border: '1px solid #ff6b6b', borderRadius: 2, background: '#ff6b6b', color: '#fff', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}
            onClick={handleConfirmDelete}
          >削除</button>
        </div>
      </Modal>
    </>
  );
};

// プレビュー用モーダル
const RelatedCardPreviewModal: React.FC<{ card: BoardItem | null; onClose: () => void }> = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <Modal open={!!card} onClose={onClose} title={card.title} width={480}>
      <div style={{ marginBottom: 12 }}>
        <Markdown components={markdownComponents}>{card.content}</Markdown>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>作成日: {new Date(card.created_at).toLocaleString()}</div>
      <button
        className="btn"
        style={{ float: 'right', marginTop: 8, background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #333366', borderRadius: 2, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        onClick={onClose}
      >閉じる</button>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.background.paper,
  },
  searchInput: {
    height: 48,
    backgroundColor: theme.colors.background.paper,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  boardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    backgroundColor: theme.colors.background.default,
    gap: 24,
  },
  column: {
    flex: 1,
    margin: 0,
    backgroundColor: theme.colors.background.paper,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    minWidth: 280,
    maxWidth: 420,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BOARD_COLOR,
    letterSpacing: 0.5,
  },
  addCardButton: {
    padding: 8,
    backgroundColor: theme.colors.action,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: {
    fontSize: 20,
    color: theme.colors.background.paper,
    textAlign: 'center',
    width: 20,
    height: 20,
  },
  columnContent: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: theme.colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.3,
  },
  cardContent: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  tag: {
    backgroundColor: BOARD_COLOR + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: BOARD_COLOR,
    letterSpacing: 0.2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  promoteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.action,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.background.paper,
    letterSpacing: 0.2,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 640,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: theme.colors.background.default,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  modalTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.background.default,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  modalButtonSave: {
    backgroundColor: theme.colors.action,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.3,
  },
  modalButtonTextSave: {
    color: theme.colors.background.paper,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  boardHeader: {
    padding: 16,
    backgroundColor: theme.colors.spaces.board.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boardHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  boardHeaderSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    maxWidth: 320,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sidePanelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1000,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  sidePanelContent: {
    width: 640,
    padding: 24,
    backgroundColor: theme.colors.background.paper,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    boxSizing: 'border-box',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
});

export { CardModal };
export default BoardSpace; 