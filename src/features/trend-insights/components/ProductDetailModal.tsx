import React, { useState, useEffect } from 'react';
import { TrendProduct } from '../services/TrendProductService';
import { TrendInvestigationService, InvestigationLevel } from '../services/TrendInvestigationService';
import { TrendUserNoteService, UserNote } from '../services/TrendUserNoteService';

interface ProductDetailModalProps {
  product: TrendProduct;
  onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const [investigations, setInvestigations] = useState<InvestigationLevel[]>([]);
  const [investigating, setInvestigating] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // 個別スコア (0-10点) の色分け
  const getIndividualScoreColor = (score: number): string => {
    if (score >= 7) return '#00ff88';   // 🟢 高スコア (70%以上)
    if (score >= 5) return '#ffd93d';   // 🟡 中スコア (50-69%)
    return '#6c7086';                   // ⚪ 低スコア (50%未満)
  };

  // 総合スコア (0-40点) の色分け
  const getTotalScoreColor = (totalScore: number): string => {
    if (totalScore >= 28) return '#00ff88';  // 🟢 高スコア (70%以上)
    if (totalScore >= 20) return '#ffd93d';  // 🟡 中スコア (50-69%)
    return '#6c7086';                        // ⚪ 低スコア (50%未満)
  };

  useEffect(() => {
    loadInvestigations();
    loadNotes();
  }, [product.id]);

  const loadInvestigations = async () => {
    const data = await TrendInvestigationService.getInvestigations(product.id);
    setInvestigations(data);
  };

  const loadNotes = async () => {
    const data = await TrendUserNoteService.getNotes(product.id);
    setNotes(data);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const result = await TrendUserNoteService.addNote(product.id, newNote.trim());
      
      if (result.success) {
        setNewNote('');
        await loadNotes();
      } else {
        alert(`メモの追加に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('メモの追加中にエラーが発生しました');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('このメモを削除しますか？')) return;

    try {
      const result = await TrendUserNoteService.deleteNote(noteId);
      
      if (result.success) {
        await loadNotes();
      } else {
        alert(`メモの削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('メモの削除中にエラーが発生しました');
    }
  };

  const handleInvestigate = async () => {
    const nextLevel = TrendInvestigationService.getNextLevel(investigations);
    
    if (!nextLevel) {
      alert('すべてのレベルの調査が完了しています');
      return;
    }

    setInvestigating(true);

    try {
      const result = await TrendInvestigationService.investigateProduct(
        product.id,
        nextLevel,
        {
          title: product.title_ja,
          url: product.url,
          summary: product.summary_ja || '',
          category: product.category || '',
          brand_designer: product.brand_designer || '',
          scores: {
            concept_shift: product.score_concept_shift,
            category_disruption: product.score_category_disruption,
            philosophical_pricing: product.score_philosophical_pricing,
            experience_change: product.score_experience_change,
          },
        }
      );

      if (result.success) {
        await loadInvestigations();
        setExpandedLevel(nextLevel);
      } else {
        alert(`調査エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('Investigation error:', error);
      alert('調査中にエラーが発生しました');
    } finally {
      setInvestigating(false);
    }
  };

  const nextLevel = TrendInvestigationService.getNextLevel(investigations);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{product.title_ja}</h2>
            <a href={product.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
              元記事を開く →
            </a>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* スコアセクション */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>スコア詳細</h3>
          <div style={styles.scoreGrid}>
            {[
              { label: 'コンセプトシフト', value: product.score_concept_shift },
              { label: 'カテゴリー破壊', value: product.score_category_disruption },
              { label: '哲学的価格設定', value: product.score_philosophical_pricing },
              { label: '体験変化', value: product.score_experience_change },
            ].map((score) => (
              <div key={score.label} style={styles.scoreItem}>
                <div style={styles.scoreLabel}>{score.label}</div>
                <div style={{
                  ...styles.scoreValue,
                  color: getIndividualScoreColor(score.value),
                }}>{score.value.toFixed(1)}</div>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${(score.value / 10) * 100}%`,
                      background: getIndividualScoreColor(score.value),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={styles.totalScore}>
            総合スコア: <span style={{ color: getTotalScoreColor(product.score_total) }}>{product.score_total.toFixed(1)}</span> / 40
          </div>
          {product.reason_text && (
            <div style={styles.reasonText}>{product.reason_text}</div>
          )}
        </div>

        {/* サマリーセクション */}
        {product.summary_ja && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>製品サマリー</h3>
            <p style={styles.summaryText}>{product.summary_ja}</p>
          </div>
        )}

        {/* メタ情報 */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>メタ情報</h3>
          <div style={styles.metaGrid}>
            {product.category && (
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>カテゴリー:</span>
                <span>{product.category}</span>
              </div>
            )}
            {product.brand_designer && (
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>ブランド/デザイナー:</span>
                <span>{product.brand_designer}</span>
              </div>
            )}
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>発見日:</span>
              <span>{new Date(product.discovered_at).toLocaleDateString('ja-JP')}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>ステータス:</span>
              <span>{product.status}</span>
            </div>
          </div>
        </div>

        {/* 調査セクション */}
        <div style={styles.section}>
          <div style={styles.investigationHeader}>
            <h3 style={styles.sectionTitle}>段階的調査</h3>
            <button
              onClick={handleInvestigate}
              disabled={investigating || !nextLevel}
              style={{
                ...styles.investigateButton,
                ...(investigating || !nextLevel ? styles.investigateButtonDisabled : {}),
              }}
            >
              {investigating
                ? '調査中...'
                : nextLevel
                ? `Level ${nextLevel} 調査を実行`
                : '調査完了'}
            </button>
          </div>

          {investigations.length === 0 ? (
            <div style={styles.noInvestigations}>
              調査を実行すると、ここに結果が表示されます
            </div>
          ) : (
            <div style={styles.investigationList}>
              {[1, 2, 3].map((level) => {
                const investigation = investigations.find((inv) => inv.level === level);
                const isExpanded = expandedLevel === level;

                return (
                  <div key={level} style={styles.investigationItem}>
                    <button
                      onClick={() => setExpandedLevel(isExpanded ? null : level)}
                      style={{
                        ...styles.investigationToggle,
                        ...(investigation ? styles.investigationToggleComplete : {}),
                      }}
                      disabled={!investigation}
                    >
                      <span style={styles.levelBadge}>Level {level}</span>
                      <span style={styles.levelName}>
                        {level === 1 && '基本情報'}
                        {level === 2 && '文脈と背景'}
                        {level === 3 && '深層分析'}
                      </span>
                      {investigation && (
                        <span style={styles.levelStatus}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      {!investigation && (
                        <span style={styles.levelStatusPending}>未実施</span>
                      )}
                    </button>
                    {investigation && isExpanded && (
                      <div style={styles.investigationContent}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: investigation.result_text.replace(/\n/g, '<br />'),
                          }}
                        />
                        <div style={styles.investigationMeta}>
                          実行日時: {new Date(investigation.executed_at).toLocaleString('ja-JP')} 
                          ({investigation.duration_seconds}秒)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ユーザーメモセクション */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>ユーザーメモ</h3>
          
          {/* メモ追加フォーム */}
          <div style={styles.noteForm}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="製品についてのメモを追加..."
              style={styles.noteTextarea}
              rows={3}
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim()}
              style={{
                ...styles.addNoteButton,
                ...(addingNote || !newNote.trim() ? styles.addNoteButtonDisabled : {}),
              }}
            >
              {addingNote ? 'メモを追加中...' : 'メモを追加'}
            </button>
          </div>

          {/* メモリスト */}
          {notes.length === 0 ? (
            <div style={styles.noNotes}>
              まだメモがありません
            </div>
          ) : (
            <div style={styles.notesList}>
              {notes.map((note) => (
                <div key={note.id} style={styles.noteItem}>
                  <div style={styles.noteContent}>{note.note_content}</div>
                  <div style={styles.noteMeta}>
                    <span style={styles.noteDate}>
                      {new Date(note.created_at).toLocaleString('ja-JP')}
                    </span>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      style={styles.deleteNoteButton}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    border: '1px solid #333366',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  header: {
    padding: '24px 32px',
    borderBottom: '1px solid #333366',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#e2e8f0',
    margin: '0 0 8px 0',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  link: {
    fontSize: '13px',
    color: '#00ff88',
    textDecoration: 'none',
    fontFamily: 'JetBrains Mono, monospace',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#6c7086',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  section: {
    padding: '24px 32px',
    borderBottom: '1px solid #333366',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#00ff88',
    margin: '0 0 16px 0',
    fontFamily: 'Space Grotesk, sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  scoreItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  scoreValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#00ff88',
    fontFamily: 'JetBrains Mono, monospace',
  },
  scoreBar: {
    height: '6px',
    background: '#333366',
    borderRadius: '3px',
    overflow: 'hidden' as const,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'all 0.3s ease',
  },
  totalScore: {
    fontSize: '18px',
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '12px',
  },
  reasonText: {
    fontSize: '14px',
    color: '#a6adc8',
    lineHeight: '1.6',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  summaryText: {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: '1.7',
    fontFamily: 'Space Grotesk, sans-serif',
    margin: 0,
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  metaItem: {
    fontSize: '13px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  metaLabel: {
    color: '#6c7086',
    marginRight: '8px',
  },
  investigationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  investigateButton: {
    padding: '8px 16px',
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  investigateButtonDisabled: {
    backgroundColor: '#333366',
    color: '#6c7086',
    cursor: 'not-allowed',
  },
  noInvestigations: {
    padding: '32px',
    textAlign: 'center' as const,
    color: '#6c7086',
    fontSize: '14px',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  investigationList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  investigationItem: {
    border: '1px solid #333366',
    borderRadius: '4px',
    overflow: 'hidden' as const,
  },
  investigationToggle: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#0f0f23',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  investigationToggleComplete: {
    backgroundColor: '#1a1a2e',
  },
  levelBadge: {
    padding: '2px 8px',
    backgroundColor: '#333366',
    color: '#00ff88',
    borderRadius: '2px',
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase' as const,
  },
  levelName: {
    flex: 1,
    fontSize: '14px',
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  levelStatus: {
    fontSize: '12px',
    color: '#00ff88',
  },
  levelStatusPending: {
    fontSize: '11px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
  },
  investigationContent: {
    padding: '16px',
    backgroundColor: '#0f0f23',
    fontSize: '13px',
    color: '#e2e8f0',
    lineHeight: '1.7',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  investigationMeta: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #333366',
    fontSize: '11px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
  },
  // ユーザーメモスタイル
  noteForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '16px',
  },
  noteTextarea: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f0f23',
    border: '1px solid #333366',
    borderRadius: '4px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'Space Grotesk, sans-serif',
    lineHeight: '1.6',
    resize: 'vertical' as const,
    outline: 'none',
  },
  addNoteButton: {
    padding: '10px 16px',
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease',
  },
  addNoteButtonDisabled: {
    backgroundColor: '#333366',
    color: '#6c7086',
    cursor: 'not-allowed',
  },
  noNotes: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#6c7086',
    fontSize: '13px',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  noteItem: {
    padding: '12px',
    backgroundColor: '#0f0f23',
    border: '1px solid #333366',
    borderRadius: '4px',
  },
  noteContent: {
    fontSize: '14px',
    color: '#e2e8f0',
    lineHeight: '1.6',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '8px',
    whiteSpace: 'pre-wrap' as const,
  },
  noteMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #333366',
  },
  noteDate: {
    fontSize: '11px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
  },
  deleteNoteButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: '#ff6b6b',
    border: '1px solid #ff6b6b',
    borderRadius: '2px',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    transition: 'all 0.2s ease',
  },
};

export default ProductDetailModal;

