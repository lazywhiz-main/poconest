import React from 'react';
import { BoardCardUI } from '../../../types/board';
import { formatJapanDate } from '../../../utils/dateFormatter';

interface BoardCardWebProps {
  card: BoardCardUI;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
  showDeleteButton?: boolean;
}

const DeleteIcon = ({ size = 20, color = "#ff6b6b" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 11v6M14 11v6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const typeBadgeInfo: Record<string, { className: string; icon: string; label: string }> = {
  INBOX:      { className: 'type-inbox',     icon: '📥', label: 'Inbox' },
  INSIGHTS:   { className: 'type-insight',   icon: '💡', label: 'Insight' },
  THEMES:     { className: 'type-theme',     icon: '🎯', label: 'Theme' },
  QUESTIONS:  { className: 'type-question',  icon: '❓', label: 'Question' },
  ACTIONS:    { className: 'type-action',    icon: '⚡', label: 'Action' },
};

const BoardCardWeb: React.FC<BoardCardWebProps> = ({ card, onDelete, onClick, showDeleteButton = false }) => {
  const badgeType = typeBadgeInfo[card.columnType] || typeBadgeInfo['INBOX'];
  const columnBadge = (
    <span className={`card-type-badge ${badgeType.className}`} key="type-badge">
      <span className="card-type-icon">{badgeType.icon}</span>
      {badgeType.label}
    </span>
  );
  const tagBadges = (card.metadata?.tags || []).map((tag: string) => (
    <span className="tag-badge" key={tag}>{tag}</span>
  ));
  const sourceLinks = (card.sources || []).map((source: any) => {
    // ミーティングソースの場合、metadata.meeting_titleを優先
    let displayLabel = source.label;
    if (source.type === 'meeting' && card.metadata?.meeting_title) {
      displayLabel = card.metadata.meeting_title;
    }
    
    return (
      <a className="card-link" key={source.id} href={source.url || undefined} target="_blank" rel="noopener noreferrer">
        {displayLabel}
      </a>
    );
  });
  // 関連カードリンクも表示
  const relatedCardLinks = (card.relatedCards || []).map((relatedCard: any) => (
    <span className="related-card-link" key={relatedCard.id}>
      {relatedCard.title || relatedCard.label || '関連カード'}
    </span>
  ));
  const allLinks = [...sourceLinks, ...relatedCardLinks];
  const MAX_LINKS = 3;
  const visibleLinks = allLinks.slice(0, MAX_LINKS);
  const hiddenCount = allLinks.length - MAX_LINKS;

  return (
    <div className="card" style={{ height: 330, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', position: 'relative', cursor: onClick ? 'pointer' : undefined }} onClick={() => onClick?.(card.id)}>
      <style>{`
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
        .related-card-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(100,181,246,0.2);
          color: #64b5f6;
          border: 1px solid #64b5f6;
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'JetBrains Mono', monospace;
          flex-shrink: 0;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .related-card-link:hover {
          transform: translateY(-1px);
          background: #64b5f6;
          color: #fff;
          box-shadow: 0 4px 12px rgba(100,181,246,0.3);
        }
      `}</style>
      {/* 削除ボタン */}
      {showDeleteButton && (
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
            onDelete?.(card.id);
          }}
        >
          <DeleteIcon size={20} color="#ff6b6b" />
        </button>
      )}
      {/* タイトル */}
      <div className="card-title" style={{ fontWeight: 600, fontSize: 16, color: '#e2e8f0', marginBottom: 6 }}>{card.title}</div>
      {/* タイプバッジ＋タグ */}
      <div className="card-tags" style={{ marginTop: 6, marginBottom: 8 }}>
        {columnBadge}
        {tagBadges}
      </div>
      {/* 本文 */}
      <div className="card-content" style={{ flex: 1, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', color: '#a6adc8', fontSize: 13 }}>{card.content}</div>
      {/* 出典リンク（省略+N対応） */}
      {(allLinks.length > 0) && (
        <div className="card-links" style={{ marginBottom: 12 }}>
          {visibleLinks}
          {hiddenCount > 0 && (
            <span className="card-link" key="more-links">+{hiddenCount}</span>
          )}
        </div>
      )}
      {/* メタ情報 */}
      <div className="card-meta" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 0, fontSize: 11, color: '#6c7086' }}>
        <span>{`Created: ${formatJapanDate(card.createdAt)} | ${card.createdByDisplayName || card.createdBy}`}</span>
        <span>{`Updated: ${formatJapanDate(card.updatedAt)} | ${card.updatedByDisplayName || card.updatedBy || card.createdByDisplayName || card.createdBy}`}</span>
      </div>
    </div>
  );
};

export default BoardCardWeb; 