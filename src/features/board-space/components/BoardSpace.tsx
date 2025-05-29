import React, { useState, useEffect, Suspense } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, useWindowDimensions } from 'react-native';
// import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import theme from '../../../styles/theme';
import Card from '../../../components/Card';
import { BoardItem, BoardColumnType, useBoardContext } from '../contexts/BoardContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Markdown from 'react-markdown';
import { createPortal } from 'react-dom';
import SourceSuggestInput from '@/components/board/SourceSuggestInput';
import { Source, addBoardCards } from '@/services/BoardService';
import { Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../services/supabase/client';

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
  visible: boolean;
  onClose: () => void;
  onSave: (card: Partial<BoardItem> & { sources?: Source[]; related_card_ids?: string[] }) => void;
  initialData?: Partial<BoardItem>;
  columnType: BoardColumnType;
  setColumnType: (col: BoardColumnType) => void;
  boardId: string;
}

// Markdownカスタムスタイル共通定義
const markdownComponents = {
  h1: ({node, ...props}: any) => <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', margin: '16px 0 8px 0' }} {...props} />, 
  h2: ({node, ...props}: any) => <h2 style={{ fontSize: 17, fontWeight: 600, color: '#444', margin: '14px 0 7px 0' }} {...props} />, 
  h3: ({node, ...props}: any) => <h3 style={{ fontSize: 15, fontWeight: 600, color: '#555', margin: '12px 0 6px 0' }} {...props} />, 
  ul: ({node, ...props}: any) => {
    const level = node?.depth || 1;
    return <ul style={{ paddingLeft: 8 * level, margin: '8px 0' }} {...props} />;
  }, 
  ol: ({node, ...props}: any) => {
    const level = node?.depth || 1;
    return <ol style={{ paddingLeft: 8 * level, margin: '8px 0' }} {...props} />;
  }, 
  li: ({ checked, children, ...props }: any) => (
    <li
      style={{
        fontSize: 13,
        marginBottom: 4,
        listStyle: 'none',
        display: 'flex',
        alignItems: 'flex-start',
        position: 'relative',
        paddingLeft: 8,
      }}
      {...props}
    >
      <span style={{
        color: '#1976d2',
        fontWeight: 700,
        fontSize: 16,
        lineHeight: 1,
        marginRight: 8,
        flexShrink: 0,
      }}>
        ・
      </span>
      <span>{children}</span>
    </li>
  ),
  blockquote: ({node, ...props}: any) => <blockquote style={{ borderLeft: '4px solid #90caf9', background: '#f1f8ff', margin: '8px 0', padding: '8px 16px', color: '#1976d2', fontStyle: 'italic', borderRadius: 6 }} {...props} />, 
  code: ({node, inline, className, children, ...props}: any) =>
    inline
      ? <code style={{ background: '#f5f5f5', borderRadius: 4, padding: '2px 6px', fontSize: 13, fontFamily: 'monospace' }}>{children}</code>
      : <pre style={{ background: '#263238', color: '#fff', borderRadius: 8, padding: 12, fontSize: 13, overflowX: 'auto' }}><code>{children}</code></pre>,
  table: ({node, ...props}: any) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0' }} {...props} />, 
  th: ({node, ...props}: any) => <th style={{ border: '1px solid #ccc', padding: 8, background: '#f5f5f5', fontWeight: 700, fontSize: 13 }} {...props} />, 
  td: ({node, ...props}: any) => <td style={{ border: '1px solid #ccc', padding: 8, fontSize: 13 }} {...props} />, 
  tr: ({node, ...props}: any) => <tr {...props} />, 
  a: ({node, ...props}: any) => <a style={{ color: '#1976d2', textDecoration: 'underline' }} {...props} />, 
  hr: (props: any) => <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} {...props} />,
  img: ({node, ...props}: any) => <img style={{ maxWidth: '100%', borderRadius: 8, margin: '8px 0' }} {...props} />,
};

const CardModal: React.FC<CardModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  columnType,
  setColumnType,
  boardId,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  // タグ: チップ型
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  // サジェスト候補（DBから動的取得）
  const [allInsights, setAllInsights] = useState<{ id: string; title: string; content?: string; created_at?: string }[]>([]);
  const [allThemes, setAllThemes] = useState<{ id: string; title: string; content?: string; created_at?: string }[]>([]);
  // 関連Insight/Theme: ID配列で管理
  const [insightIds, setInsightIds] = useState<string[]>(initialData?.insights?.map(i => i.id) || []);
  const [themeIds, setThemeIds] = useState<string[]>(initialData?.themes?.map(t => t.id) || []);
  // サジェスト入力用
  const [insightInput, setInsightInput] = useState('');
  const [themeInput, setThemeInput] = useState('');
  // 元ソース: サジェスト＋自由入力 → SourceSuggestInputに置き換え
  const [sources, setSources] = useState<Source[]>(initialData?.sources || []);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  // 追加: サジェストモーダル表示状態
  const [showInsightSuggest, setShowInsightSuggest] = useState(false);
  const [showThemeSuggest, setShowThemeSuggest] = useState(false);
  // サジェストUIの表示位置を管理
  const [insightAnchor, setInsightAnchor] = useState<{top: number, left: number} | null>(null);
  const [themeAnchor, setThemeAnchor] = useState<{top: number, left: number} | null>(null);
  // 本文テキストエリアref
  const contentTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const titleTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

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
  // タグ削除
  const handleTagRemove = (tag: string) => setTags(tags.filter(t => t !== tag));
  // Enter/カンマでタグ確定
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
  // Insight追加
  const handleInsightAdd = (val: string) => {
    if (val && !insightIds.includes(val)) setInsightIds([...insightIds, val]);
  };
  const handleInsightRemove = (val: string) => setInsightIds(insightIds.filter(i => i !== val));
  // Theme追加
  const handleThemeAdd = (val: string) => {
    if (val && !themeIds.includes(val)) setThemeIds([...themeIds, val]);
  };
  const handleThemeRemove = (val: string) => setThemeIds(themeIds.filter(t => t !== val));
  // サジェストフィルタ
  const filteredInsightSuggestions = allInsights.filter(i => i.title.includes(insightInput) && !insightIds.includes(i.id));
  const filteredThemeSuggestions = allThemes.filter(t => t.title.includes(themeInput) && !themeIds.includes(t.id));

  // ボードID取得
  useEffect(() => {
    if (!boardId) return;
    // insights取得
    supabase
      .from('board_cards')
      .select('id, title, content, created_at')
      .eq('board_id', boardId)
      .eq('column_type', 'insights')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAllInsights(data || []);
      });
    // themes取得
    supabase
      .from('board_cards')
      .select('id, title, content, created_at')
      .eq('board_id', boardId)
      .eq('column_type', 'themes')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAllThemes(data || []);
      });
  }, [boardId]);

  useEffect(() => {
    setTitle(initialData?.title || '');
    setContent(initialData?.content || '');
    setTags(initialData?.tags || []);
    setSources(initialData?.sources || []);
    setInsightIds(initialData?.insights?.map(i => i.id) || []);
    setThemeIds(initialData?.themes?.map(t => t.id) || []);
    // 本文テキストエリアの高さを内容に合わせて自動調整
    const contentRef = contentTextareaRef.current;
    if (contentRef) {
      contentRef.style.height = 'auto';
      contentRef.style.height = contentRef.scrollHeight + 'px';
    }
    const titleRef = titleTextareaRef.current;
    if (titleRef) {
      titleRef.style.height = 'auto';
      titleRef.style.height = titleRef.scrollHeight + 'px';
    }
  }, [initialData, visible]);

  // 編集モード突入時に高さ自動調整
  useEffect(() => {
    if (isEditingContent) {
      const contentRef = contentTextareaRef.current;
      if (contentRef) {
        setTimeout(() => {
          contentRef.style.height = 'auto';
          contentRef.style.height = contentRef.scrollHeight + 'px';
        }, 0);
      }
    }
    if (isEditingTitle) {
      const titleRef = titleTextareaRef.current;
      if (titleRef) {
        setTimeout(() => {
          titleRef.style.height = 'auto';
          titleRef.style.height = titleRef.scrollHeight + 'px';
        }, 0);
      }
    }
  }, [isEditingContent, isEditingTitle]);

  const handleSave = () => {
    onSave({
      title,
      content,
      tags,
      related_card_ids: [...insightIds, ...themeIds],
      insights: insightIds.map(id => ({ id, title: '' })), // UI表示用にtitleは空で仮置き
      themes: themeIds.map(id => ({ id, title: '' })),
      column_type: columnType,
      sources: sources,
    });
    onClose();
  };

  // カード種別選択
  const handleColumnTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setColumnType(e.target.value as BoardColumnType);
  };

  return (
    <Modal
      visible={visible}
      animationType={isMobile ? 'slide' : 'fade'}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={isMobile ? styles.modalOverlay : styles.sidePanelOverlay}>
        <View style={[isMobile ? styles.modalContent : styles.sidePanelContent, { display: 'flex', flexDirection: 'column', height: '100%' }]}> 
          {/* フォーム部分 */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
            {/* メタ情報表示（最上部に移動） */}
            {initialData && (
              <div style={{ marginBottom: 20, fontSize: 13, color: '#888' }}>
                {initialData.created_at && (
                  <div>作成日: {new Date(initialData.created_at).toLocaleString()}</div>
                )}
                {initialData.updated_at && (
                  <div>最終更新: {new Date(initialData.updated_at).toLocaleString()}</div>
                )}
                <div>作成者: {(initialData as any)?.created_by_display_name || initialData.created_by || '-'}</div>
              </div>
            )}
            {/* カード種別選択 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block' }}>カード種別</label>
              <div style={{ display: 'flex', gap: 24, flexDirection: 'row', marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" name="columnType" value="inbox" checked={columnType === BoardColumnType.INBOX} onChange={() => setColumnType(BoardColumnType.INBOX)} /> Inbox
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" name="columnType" value="insights" checked={columnType === BoardColumnType.INSIGHTS} onChange={() => setColumnType(BoardColumnType.INSIGHTS)} /> Insights
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" name="columnType" value="themes" checked={columnType === BoardColumnType.THEMES} onChange={() => setColumnType(BoardColumnType.THEMES)} /> Themes
                </label>
              </div>
            </div>
            {/* タイトル・本文を縦並び＆自動拡張テキストエリアに */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {/* タイトルラベル＋編集アイコン */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#222' }}>タイトル</span>
                <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setIsEditingTitle(true)} title="編集">
                  <EditIcon />
                </span>
              </div>
              {isEditingTitle ? (
                <textarea
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    padding: 10,
                    fontSize: 13,
                    background: '#f7f8fa',
                    color: '#222',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    marginBottom: 0,
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="タイトル"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  rows={1}
                  ref={titleTextareaRef}
                  autoFocus
                  onBlur={() => setIsEditingTitle(false)}
                  onInput={e => {
                    const textarea = e.currentTarget;
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    minHeight: 32,
                    background: '#f7f8fa',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    padding: 10,
                    fontSize: 13,
                    color: '#222',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsEditingTitle(true)}
                  tabIndex={0}
                  title="クリックして編集"
                >
                  {title
                    ? <Markdown components={markdownComponents}>{title}</Markdown>
                    : <span style={{ color: '#aaa' }}>ここをクリックして編集</span>
                  }
                </div>
              )}
              {/* 本文ラベル＋編集アイコン */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#222' }}>本文</span>
                <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setIsEditingContent(true)} title="編集">
                  <EditIcon />
                </span>
              </div>
              {isEditingContent ? (
                <textarea
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    padding: 10,
                    fontSize: 13,
                    background: '#f7f8fa',
                    color: '#222',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    minHeight: 80,
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="内容"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={3}
                  ref={contentTextareaRef}
                  autoFocus
                  onBlur={() => setIsEditingContent(false)}
                  onInput={e => {
                    const textarea = e.currentTarget;
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    minHeight: 80,
                    background: '#f7f8fa',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    padding: 10,
                    fontSize: 13,
                    color: '#222',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsEditingContent(true)}
                  tabIndex={0}
                  title="クリックして編集"
                >
                  {content
                    ? <Markdown components={markdownComponents}>{content}</Markdown>
                    : <span style={{ color: '#aaa' }}>ここをクリックして編集</span>
                  }
                </div>
              )}
            </div>
            {/* タグ入力欄＋バッジ */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.modalLabel}>タグ</Text>
              <input
                style={{ width: '100%', borderRadius: 8, border: '1px solid #e0e0e0', padding: 10, fontSize: 13, background: '#f7f8fa' }}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={tags.length === 0 ? 'タグを入力' : ''}
                autoComplete="off"
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {tags.map(tag => (
                  <span key={tag} style={{ background: '#e0f7fa', color: '#0097a7', borderRadius: 12, padding: '4px 12px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {tag}
                    <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => handleTagRemove(tag)}>×</span>
                  </span>
                ))}
              </div>
            </View>
            {/* 元ソース: サジェスト＋自由入力 */}
            <View style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>参照するFlowソース</span>
                <Tooltip
                  title={
                    <div style={{ padding: '4px 0' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>参照できるソースの種類</div>
                      <div style={{ fontSize: 13, marginBottom: 2 }}>・URL: 直接URLを入力して追加</div>
                      <div style={{ fontSize: 13, marginBottom: 2 }}>・Insight: インサイトから参照を追加</div>
                      <div style={{ fontSize: 13 }}>・Theme: テーマから参照を追加</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>「参照するflow情報を検索・追加」欄にURLやキーワードを入力してください。</div>
                    </div>
                  }
                  arrow
                  placement="top"
                  PopperProps={{
                    modifiers: [
                      {
                        name: 'zIndex',
                        enabled: true,
                        phase: 'write',
                        fn: ({ state }) => {
                          state.styles.popper.zIndex = '99999';
                        },
                      },
                    ],
                    style: { zIndex: '99999' },
                  }}
                >
                  <HelpOutlineIcon style={{ fontSize: 18, cursor: 'help', opacity: 0.7 }} />
                </Tooltip>
              </div>
              <SourceSuggestInput value={sources} onChange={setSources} />
            </View>
            {/* 関連Insight: カード参照UI＋追加ボタン */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.modalLabel}>関連Insight</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 32, position: 'relative' }}>
                {/* 選択済みInsightカード一覧 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {insightIds.map(i => (
                    <div key={i} style={{ background: '#e3f2fd', color: '#1976d2', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 4px rgba(25,118,210,0.08)', minWidth: 120 }}>
                      <span style={{ fontWeight: 700 }}>{allInsights.find(ins => ins.id === i)?.title || i}</span>
                      <span style={{ cursor: 'pointer', color: '#1976d2', fontSize: 15, marginLeft: 4 }} title="プレビュー">🔍</span>
                      <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => handleInsightRemove(i)}>×</span>
                    </div>
                  ))}
                </div>
                {/* 追加ボタン */}
                <button
                  type="button"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'transparent', color: '#1976d2', border: 'none', borderRadius: 8,
                    padding: 0, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 4, width: 'fit-content'
                  }}
                  onClick={e => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setInsightAnchor({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                    setShowInsightSuggest(true);
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700 }}>＋</span> 参照追加
                </button>
                {/* サジェストUI（Portalでbody直下に描画） */}
                {showInsightSuggest && insightAnchor && createPortal(
                  <div style={{ position: 'fixed', top: insightAnchor.top, left: insightAnchor.left, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, zIndex: '99999', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', padding: 16, minWidth: 260 }}>
                    <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Insightを検索・追加</div>
                    <input
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #e0e0e0', padding: 8, fontSize: 13, background: '#f7f8fa', marginBottom: 8 }}
                      value={insightInput}
                      onChange={e => setInsightInput(e.target.value)}
                      placeholder="キーワードで検索"
                      autoFocus
                    />
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {filteredInsightSuggestions.length > 0 ? (
                        filteredInsightSuggestions.map(i => (
                          <div key={i.id} style={{ padding: 8, cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s', fontSize: 13 }}
                            onClick={() => { handleInsightAdd(i.id); setShowInsightSuggest(false); setInsightAnchor(null); }}
                            onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
                            onMouseOut={e => e.currentTarget.style.background = '#fff'}
                          >
                            <div style={{ fontWeight: 700 }}>{i.title}</div>
                            {i.content && <div style={{ fontSize: 12, color: '#666', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{i.content.slice(0, 32)}</div>}
                            {i.created_at && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{new Date(i.created_at).toLocaleString()}</div>}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#888', fontSize: 13, padding: 8 }}>候補がありません</div>
                      )}
                    </div>
                    <button
                      type="button"
                      style={{ marginTop: 12, background: '#f7f8fa', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
                      onClick={() => { setShowInsightSuggest(false); setInsightAnchor(null); }}
                    >キャンセル</button>
                  </div>,
                  document.body
                )}
              </div>
            </View>
            {/* 関連Theme: カード参照UI＋追加ボタン */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.modalLabel}>関連Theme</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 32, position: 'relative' }}>
                {/* 選択済みThemeカード一覧 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {themeIds.map(t => (
                    <div key={t} style={{ background: '#e8f5e9', color: '#388e3c', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 4px rgba(56,142,60,0.08)', minWidth: 120 }}>
                      <span style={{ fontWeight: 700 }}>{allThemes.find(th => th.id === t)?.title || t}</span>
                      <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => handleThemeRemove(t)}>×</span>
                    </div>
                  ))}
                </div>
                {/* 追加ボタン */}
                <button
                  type="button"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'transparent', color: '#388e3c', border: 'none', borderRadius: 8,
                    padding: 0, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 4, width: 'fit-content'
                  }}
                  onClick={() => setShowThemeSuggest(true)}
                >
                  <span style={{ fontSize: 18, fontWeight: 700 }}>＋</span> 参照追加
                </button>
                {/* サジェストUI（モーダル風） */}
                {showThemeSuggest && (
                  <div style={{ position: 'absolute', top: 48, left: 0, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, zIndex: '99999', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', padding: 16, minWidth: 260 }}>
                    <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Themeを検索・追加</div>
                    <input
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #e0e0e0', padding: 8, fontSize: 13, background: '#f7f8fa', marginBottom: 8 }}
                      value={themeInput}
                      onChange={e => setThemeInput(e.target.value)}
                      placeholder="キーワードで検索"
                      autoFocus
                    />
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {filteredThemeSuggestions.length > 0 ? (
                        filteredThemeSuggestions.map(t => (
                          <div key={t.id} style={{ padding: 8, cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s' }}
                            onClick={() => { handleThemeAdd(t.id); setShowThemeSuggest(false); }}
                            onMouseOver={e => e.currentTarget.style.background = '#e8f5e9'}
                            onMouseOut={e => e.currentTarget.style.background = '#fff'}
                          >
                            <div style={{ fontWeight: 700 }}>{t.title}</div>
                            {t.content && <div style={{ fontSize: 12, color: '#666', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{t.content.slice(0, 32)}</div>}
                            {t.created_at && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{new Date(t.created_at).toLocaleString()}</div>}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#888', fontSize: 13, padding: 8 }}>候補がありません</div>
                      )}
                    </div>
                    <button
                      type="button"
                      style={{ marginTop: 12, background: '#f7f8fa', border: '1px solid #e0e0e0', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
                      onClick={() => setShowThemeSuggest(false)}
                    >キャンセル</button>
                  </div>
                )}
              </div>
            </View>
          </div>
          {/* フッター（アクションボタン） */}
          <View style={[styles.modalFooter, { flexShrink: 0 }]}> 
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={handleSave}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>
                保存
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// SortableCard（Webのみ）
// const SortableCard = (props: { card: BoardItem; onEdit: (card: BoardItem) => void }) => {
//   if (!useSortable) return null;
//   const { card, onEdit } = props;
//   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
//   return (
//     <div
//       ref={setNodeRef}
//       style={{
//         transform: CSS && transform ? CSS.Transform.toString(transform) : undefined,
//         transition: transition || undefined,
//         opacity: isDragging ? 0.5 : 1,
//         marginBottom: 8,
//       }}
//       {...attributes}
//       {...listeners}
//       onClick={() => onEdit(card)}
//     >
//       <Card style={styles.card} elevation="sm">
//         <View style={styles.cardHeader}>
//           <Text style={styles.cardTitle}>{card.title}</Text>
//         </View>
//         <Text style={styles.cardContent}>{card.content}</Text>
//         {card.tags && card.tags.length > 0 && (
//           <View style={styles.tagContainer}>
//             {card.tags.map(tag => (
//               <View key={tag} style={styles.tag}>
//                 <Text style={styles.tagText}>{tag}</Text>
//               </View>
//             ))}
//           </View>
//         )}
//       </Card>
//     </div>
//   );
// };

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
  const [selectedColumn, setSelectedColumn] = useState<BoardColumnType>(BoardColumnType.INBOX);
  const [previewCard, setPreviewCard] = useState<BoardItem | null>(null);
  // const [inboxCardsState, setInboxCardsState] = useState<BoardItem[]>([]);

  // タブ切り替え用の状態
  const [activeTab, setActiveTab] = useState<'all' | 'inbox' | 'insights' | 'themes'>('all');

  const { user } = useAuth();

  // nestIdが未定義・nullの場合はAPIを呼ばない
  useEffect(() => {
    if (!nestId) return;
    loadNestData(nestId);
  }, [nestId, loadNestData]);

  // 3カラムのみ取得
  const inboxCards = getCardsByColumn(BoardColumnType.INBOX);
  const insightCards = getCardsByColumn(BoardColumnType.INSIGHTS);
  const themeCards = getCardsByColumn(BoardColumnType.THEMES);

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
    let initialColumn: BoardColumnType = BoardColumnType.INBOX;
    if (activeTab === 'inbox') initialColumn = BoardColumnType.INBOX;
    else if (activeTab === 'insights') initialColumn = BoardColumnType.INSIGHTS;
    else if (activeTab === 'themes') initialColumn = BoardColumnType.THEMES;
    setSelectedColumn(initialColumn);
    setSelectedCard(null);
    setIsCardModalVisible(true);
  };

  const handleEditCard = (card: BoardItem) => {
    setSelectedCard(card);
    setSelectedColumn(card.column_type);
    setIsCardModalVisible(true);
  };

  const handleSaveCard = async (cardData: Partial<BoardItem> & { sources?: Source[]; related_card_ids?: string[] }) => {
    if (!user || !user.id) {
      alert('ユーザー情報が取得できません。ログインし直してください。');
      return;
    }
    if (selectedCard) {
      // 既存カードの更新
      updateCard({
        ...selectedCard,
        ...cardData,
      });
      // タグ更新: 一度削除→INSERT
      await supabase.from('board_card_tags').delete().eq('card_id', selectedCard.id);
      if (cardData.tags && cardData.tags.length > 0) {
        const tagRows = cardData.tags.map(tag => ({ card_id: selectedCard.id, tag }));
        await supabase.from('board_card_tags').insert(tagRows);
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
      const newCard = {
        board_id: state.boardId,
        title: cardData.title || '',
        content: cardData.content || '',
        column_type: cardData.column_type || BoardColumnType.INBOX,
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
      addCards(data);
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
  };

  // dnd-kit: 並び替え時のハンドラ
  // const handleInboxDragEnd = (event: any) => {
  //   const { active, over } = event;
  //   if (!over || active.id === over.id) return;
  //   const oldIndex = inboxCardsState.findIndex(card => card.id === active.id);
  //   const newIndex = inboxCardsState.findIndex(card => card.id === over.id);
  //   const reordered = arrayMove(inboxCardsState, oldIndex, newIndex);
  //   // order_indexを更新
  //   reordered.forEach((card: BoardItem, idx: number) => {
  //     if (card.order_index !== idx) {
  //       updateCard({ ...card, order_index: idx, id: card.id });
  //     }
  //   });
  //   setInboxCardsState(reordered);
  // };

  // カードの昇格ハンドラ
  const handlePromoteToInsights = (card: BoardItem) => {
    updateCard({ ...card, column_type: BoardColumnType.INSIGHTS, id: card.id });
  };
  const handlePromoteToThemes = (card: BoardItem) => {
    updateCard({ ...card, column_type: BoardColumnType.THEMES, id: card.id });
  };

  // タブごとのカードフィルタリング
  const filteredCards = (() => {
    if (activeTab === 'all') return [...inboxCards, ...insightCards, ...themeCards].sort((a, b) => a.order_index - b.order_index);
    if (activeTab === 'inbox') return inboxCards;
    if (activeTab === 'insights') return insightCards;
    if (activeTab === 'themes') return themeCards;
    return [];
  })();

  // 洗練されたタブUI
  const renderTabs = () => (
    <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '2px solid #e0e0e0', height: 48 }}>
      {[
        { key: 'all', label: '全体' },
        { key: 'inbox', label: 'Inbox' },
        { key: 'insights', label: 'Insights' },
        { key: 'themes', label: 'Themes' },
      ].map((tab, idx, arr) => (
        <button
          key={tab.key}
          style={{
            flex: 1,
            height: 48,
            border: 'none',
            outline: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: 15,
            color: activeTab === tab.key ? '#1976d2' : '#555',
            borderBottom: activeTab === tab.key ? '3px solid #1976d2' : '3px solid transparent',
            borderRadius: activeTab === tab.key ? '12px 12px 0 0' : '12px 12px 0 0',
            marginRight: idx < arr.length - 1 ? 8 : 0,
            transition: 'color 0.2s, border-bottom 0.2s, background 0.2s',
            backgroundColor: activeTab === tab.key ? '#f5faff' : 'transparent',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={() => setActiveTab(tab.key as any)}
          onMouseOver={e => e.currentTarget.style.backgroundColor = activeTab === tab.key ? '#f5faff' : '#f0f4f8'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = activeTab === tab.key ? '#f5faff' : 'transparent'}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // --- Utility for truncating content to 5 lines ---
  function getFirstNLines(text: string, n: number): { preview: string, truncated: boolean } {
    if (!text) return { preview: '', truncated: false };
    const lines = text.split(/\r?\n/);
    if (lines.length <= n) return { preview: text, truncated: false };
    return { preview: lines.slice(0, n).join('\n'), truncated: true };
  }

  // Web用: 設計通りの新デザイン
  const renderCardWeb = (card: BoardItem, columnType?: BoardColumnType) => {
    const { preview, truncated } = getFirstNLines(card.content, 5);
    return (
      <div
        id={card.id}
        onClick={() => handleEditCard(card)}
        style={{
          position: 'relative', // 追加
          padding: 16,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #eee',
          marginBottom: 12,
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        {/* ゴミ箱アイコン削除ボタン */}
        <button
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            zIndex: 2,
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          title="削除"
          onClick={e => {
            e.stopPropagation();
            deleteCard(card.id);
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '1')}
          onMouseOut={e => (e.currentTarget.style.opacity = '0.7')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="13" rx="2"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
        {/* タイトル */}
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{card.title}</div>
        {/* タグ */}
        {card.tags && card.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            {card.tags.map(tag => (
              <span key={tag} style={{ background: '#e0f7fa', borderRadius: 6, padding: '2px 10px', fontSize: 13, color: '#0097a7', fontWeight: 600 }}>{tag}</span>
            ))}
          </div>
        )}
        {/* 区切り線 */}
        <div style={{ height: 1, background: '#eee', margin: '8px 0' }} />
        {/* 本文（マークダウン, 5行まで） */}
        <div style={{ marginBottom: 8, fontSize: 13, minHeight: 20 }}>
          <Markdown components={markdownComponents}>{preview}</Markdown>
          {truncated && <span style={{ color: '#888', fontSize: 13 }}> ...</span>}
        </div>
        {/* 区切り線 */}
        <div style={{ height: 1, background: '#eee', margin: '8px 0' }} />
        {/* メタ情報 */}
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4, whiteSpace: 'pre-line' }}>
          {`作成日: ${card.created_at ? new Date(card.created_at).toLocaleString() : '-'}\n最終更新: ${card.updated_at ? new Date(card.updated_at).toLocaleString() : '-'}\n作成者: ${card.created_by_display_name || card.created_by || '-'}`}
        </div>
        {/* 元ソース（複数ソース対応・重複排除） */}
        {card.sources && card.sources.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {[...new Map(card.sources.map((s: any) => [s.id, s])).values()].map((source: any, idx: number) => (
              <span key={source.id || idx} style={{ background: '#e3f2fd', color: '#1976d2', borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                [{source.type}] {source.label}
              </span>
            ))}
          </div>
        )}
        {/* 区切り線 */}
        <div style={{ height: 1, background: '#eee', margin: '8px 0' }} />
        {/* 関連Insight/Theme */}
        {card.insights && card.insights.length > 0 && (
          <div style={{ fontSize: 12, color: '#1976d2', marginBottom: 2 }}>
            🧠 関連Insight: {card.insights.map(i => (
              <span key={i.id} style={{ textDecoration: 'underline', cursor: 'pointer', marginRight: 8 }}
                onClick={e => {
                  e.stopPropagation();
                  const el = document.getElementById(i.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >{i.title}</span>
            ))}
          </div>
        )}
        {card.themes && card.themes.length > 0 && (
          <div style={{ fontSize: 12, color: '#388e3c', marginBottom: 2 }}>
            🏷️ 関連Theme: {card.themes.map(t => (
              <span key={t.id} style={{ textDecoration: 'underline', cursor: 'pointer', marginRight: 8 }}
                onClick={e => {
                  e.stopPropagation();
                  const el = document.getElementById(t.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >{t.title}</span>
            ))}
          </div>
        )}
        {/* 区切り線 */}
        <div style={{ height: 1, background: '#eee', margin: '8px 0' }} />
        {/* 逆参照リスト */}
        {card.referencedBy && card.referencedBy.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: 'block' }}>このカードを参照しているカード:</span>
            {card.referencedBy.map((ref: { id: string; title: string; column_type: string }, idx: number) => (
              <span key={ref.id || idx} style={{ color: '#1976d2', textDecoration: 'underline', fontSize: 13, marginBottom: 2, cursor: 'pointer', display: 'block' }}
                onClick={e => {
                  e.stopPropagation();
                  const el = document.getElementById(ref.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >{ref.title}（{ref.column_type}）</span>
            ))}
          </div>
        )}
        {/* アクションボタン群（今後追加） */}
      </div>
    );
  };

  // ネイティブ用: 設計通りの新デザイン
  const renderCardNative = (card: BoardItem, columnType?: BoardColumnType, onEdit?: (card: BoardItem) => void) => {
    const { preview, truncated } = getFirstNLines(card.content, 5);
    return (
      <TouchableOpacity
        key={card.id}
        onPress={() => onEdit ? onEdit(card) : handleEditCard(card)}
        activeOpacity={0.9}
      >
        <View style={styles.card}>
          {/* タイトル */}
          <Text style={[styles.cardTitle, { marginBottom: 4 }]}>{card.title}</Text>
          {/* タグ */}
          {card.tags && card.tags.length > 0 && (
            <View style={[styles.tagContainer, { marginBottom: 4 }]}> 
              {card.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: '#e0f7fa', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 6 }]}> 
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0097a7' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {/* 区切り線 */}
          <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
          {/* 本文（マークダウン, 5行まで） */}
          <View style={{ marginBottom: 8 }}>
            <Markdown components={markdownComponents}>{preview}</Markdown>
            {truncated && <Text style={{ color: '#888', fontSize: 13 }}> ...</Text>}
          </View>
          {/* 区切り線 */}
          <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
          {/* メタ情報 */}
          <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            {`作成日: ${card.created_at ? new Date(card.created_at).toLocaleString() : '-'}\n最終更新: ${card.updated_at ? new Date(card.updated_at).toLocaleString() : '-'}\n作成者: ${(card as any)?.created_by_display_name || card.created_by || '-'}`}
          </Text>
          {/* 元ソース */}
          {card.sources && card.sources.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {[...new Map(card.sources.map((s: any) => [s.id, s])).values()].map((source: any, idx: number) => (
                <Text key={source.id || idx} style={{ backgroundColor: '#e3f2fd', color: '#1976d2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, fontSize: 13, fontWeight: '600', marginRight: 6 }}>
                  [{source.type}] {source.label}
                </Text>
              ))}
            </View>
          )}
          {/* 区切り線 */}
          <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
          {/* 関連Insight/Theme */}
          {card.insights && card.insights.length > 0 && (
            <Text style={{ fontSize: 12, color: '#1976d2', marginBottom: 2 }}>
              🧠 関連Insight: {card.insights.map(i => i.title).join(', ')}
            </Text>
          )}
          {card.themes && card.themes.length > 0 && (
            <Text style={{ fontSize: 12, color: '#388e3c', marginBottom: 2 }}>
              🏷️ 関連Theme: {card.themes.map(t => t.title).join(', ')}
            </Text>
          )}
          {/* 区切り線 */}
          <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
          {/* アクションボタン群（今後追加） */}
        </View>
      </TouchableOpacity>
    );
  };

  // カラムのレンダリング
  const renderColumn = (title: string, cards: BoardItem[], type: BoardColumnType) => {
    if (typeof window !== 'undefined' && SortableBoardColumn) {
      return (
        <Suspense fallback={<View style={styles.column}><Text>Loading...</Text></View>}>
          <SortableBoardColumn
            cards={cards}
            columnType={type}
            onEdit={handleEditCard}
            onOrderChange={handleOrderChange(type)}
            renderCard={card => renderCardWeb(card, type)}
            columnTitle={title}
            onAddCard={() => handleCreateCard()}
          />
        </Suspense>
      );
    }
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
          {cards.map(card => renderCardNative(card, type, handleEditCard))}
        </ScrollView>
      </View>
    );
  };

  // nestIdがなければローディングUIのみ返す
  if (!nestId) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>NEST空間IDがありません</Text>
      </View>
    );
  }

  // ローディング中の表示
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // Web用: タブ切り替えでカード表示
  if (typeof window !== 'undefined' && SortableBoardColumn) {
    return (
      <div style={{ background: '#f7f8fa', minHeight: '100vh', padding: 0 }}>
        {/* タブUI */}
        <div style={{
          width: '100%',
          background: '#fff',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          padding: '16px 32px',
          boxSizing: 'border-box',
        }}>
          {renderTabs()}
        </div>
        {/* カードリスト */}
        <div
          style={{
            width: '100%',
            padding: '32px 16px 0 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
            justifyItems: 'start',
            boxSizing: 'border-box',
            maxWidth: 1400,
            margin: '0 auto',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          {filteredCards.map(card => (
            <div style={{ width: '100%', maxWidth: 420, minWidth: 0 }} key={card.id}>
              {renderCardWeb(card)}
            </div>
          ))}
        </div>
        {/* 右下フローティングアクションボタン */}
        <button
          style={{
            position: 'fixed',
            right: 32,
            bottom: 32,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: theme.colors.action,
            color: '#fff',
            fontSize: 32,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            border: 'none',
            cursor: 'pointer',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onClick={() => {
            setSelectedColumn(BoardColumnType.INBOX);
            setSelectedCard(null);
            setIsCardModalVisible(true);
          }}
          aria-label="新しいカードを追加"
          title="新しいカードを追加"
        >
          ＋
        </button>
        {/* サイドパネル編集モーダル */}
        <CardModal
          visible={isCardModalVisible}
          onClose={() => setIsCardModalVisible(false)}
          onSave={handleSaveCard}
          initialData={selectedCard || undefined}
          columnType={selectedColumn}
          setColumnType={setSelectedColumn}
          boardId={state.boardId ?? ''}
        />
        {/* プレビューモーダル */}
        <RelatedCardPreviewModal card={previewCard} onClose={() => setPreviewCard(null)} />
      </div>
    );
  }

  return (
    <View style={styles.container}>
      {/* ボード空間ヘッダー */}
      <View style={styles.boardHeader}>
        <Text style={styles.boardHeaderTitle}>ボード空間</Text>
        <View style={styles.boardHeaderSearch}>
          <TextInput
            style={styles.searchInput}
            placeholder="カードを検索..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchCards(text);
            }}
          />
        </View>
      </View>
      <View style={styles.boardContent}>
        {renderColumn('Inbox', inboxCards, BoardColumnType.INBOX)}
        {renderColumn('Insights', insightCards, BoardColumnType.INSIGHTS)}
        {renderColumn('Themes', themeCards, BoardColumnType.THEMES)}
      </View>
      <CardModal
        visible={isCardModalVisible}
        onClose={() => setIsCardModalVisible(false)}
        onSave={handleSaveCard}
        initialData={selectedCard || undefined}
        columnType={selectedColumn}
        setColumnType={setSelectedColumn}
        boardId={state.boardId ?? ''}
      />
    </View>
  );
};

// プレビュー用モーダル
const RelatedCardPreviewModal: React.FC<{ card: BoardItem | null; onClose: () => void }> = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <Modal visible={!!card} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, minWidth: 320, maxWidth: 480 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>{card.title}</Text>
          <View style={{ marginBottom: 12 }}>
            <Markdown>{card.content}</Markdown>
          </View>
          <Text style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>作成日: {new Date(card.created_at).toLocaleString()}</Text>
          <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8 }} onPress={onClose}>
            <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 15 }}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
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

export default BoardSpace; 