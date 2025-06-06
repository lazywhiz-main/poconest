import React, { useState } from 'react';
import { addBoardCards, getOrCreateMeetingSource, addCardSource, BoardCardInsert } from '@/services/BoardService';

interface CardCandidate {
  title: string;
  content: string;
  column_type: string;
  tags?: string[];
}

interface MeetingCardExtractPanelProps {
  meetingId: string;
  meetingTitle: string;
  boardId: string;
  onCardsSaved?: () => void;
}

const MeetingCardExtractPanel: React.FC<MeetingCardExtractPanelProps> = ({ meetingId, meetingTitle, boardId, onCardsSaved }) => {
  const [candidates, setCandidates] = useState<CardCandidate[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // カード抽出API呼び出し
  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/functions/v1/extract-cards-from-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '抽出に失敗しました');
      setCandidates(data.cards);
      setSelected(data.cards.map((_: any, i: number) => i)); // デフォルト全選択
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 保存処理
  const handleSave = async (indices: number[]) => {
    console.log('handleSave called', indices, candidates);
    setSaving(true);
    setError(null);
    try {
      // ミーティングsourceを取得or作成
      let meetingSource;
      try {
        meetingSource = await getOrCreateMeetingSource(meetingId, meetingTitle);
        console.log('meetingSource:', meetingSource);
      } catch (err) {
        console.error('getOrCreateMeetingSource error:', err);
        const errMsg = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err);
        throw new Error('sourcesテーブルへのInsert/取得に失敗しました: ' + errMsg);
      }
      // 保存するカードデータを整形
      const validTypes = ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'];
      const cardsToSave: BoardCardInsert[] = indices.map(i => {
        const c = candidates[i];
        return {
          title: c.title,
          content: c.content,
          column_type: validTypes.includes((c.column_type || '').toUpperCase()) ? c.column_type.toUpperCase() : 'INBOX',
          sources: [meetingSource],
          metadata: {
            meeting_id: meetingId,
            meeting_title: meetingTitle,
            source: 'meeting_extraction'
          },
          created_by: 'system', // システムで生成されたカード
          board_id: boardId,
          order_index: 0,
          is_archived: false,
        };
      });
      console.log('cardsToSave:', cardsToSave);
      // カード保存
      const savedCards = await addBoardCards(cardsToSave);
      console.log('savedCards:', savedCards);
      // board_card_sourcesへの紐付け
      if (savedCards && Array.isArray(savedCards)) {
        const results = await Promise.all(savedCards.map(async card => {
          const res = await addCardSource({ card_id: card.id, source_id: meetingSource.id });
          console.log('addCardSource result:', res, 'for card:', card.id, 'source:', meetingSource.id);
          if (res.error) throw new Error(`addCardSource failed for card ${card.id}: ${res.error.message}`);
          return res;
        }));
        console.log('addCardSource all results:', results);
      }
      if (onCardsSaved) onCardsSaved();
      setCandidates([]);
      setSelected([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#181830', borderRadius: 8 }}>
      <h3 style={{ color: '#00ff88', marginBottom: 12 }}>AIカード抽出</h3>
      <button onClick={handleExtract} disabled={loading} style={{ marginBottom: 16 }}>
        {loading ? '抽出中...' : 'カード抽出'}
      </button>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {candidates.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => handleSave(selected)} disabled={saving || selected.length === 0}>
              {saving ? '保存中...' : '選択したカードを保存'}
            </button>
            <button onClick={() => handleSave(candidates.map((_, i) => i))} disabled={saving} style={{ marginLeft: 12 }}>
              {saving ? '保存中...' : '全て保存'}
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {candidates.map((card, i) => (
              <li key={i} style={{ marginBottom: 16, background: '#232347', borderRadius: 6, padding: 12, border: selected.includes(i) ? '2px solid #00ff88' : '1px solid #333366' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(i)}
                    onChange={e => {
                      setSelected(sel => e.target.checked ? [...sel, i] : sel.filter(idx => idx !== i));
                    }}
                  />
                  <span style={{ fontWeight: 600, color: '#fff' }}>{card.title}</span>
                  <span style={{ fontSize: 11, color: '#a6adc8', marginLeft: 8 }}>{card.column_type}</span>
                </label>
                <div style={{ color: '#a6adc8', fontSize: 13, marginTop: 4 }}>{card.content}</div>
                {card.tags && card.tags.length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {card.tags.map(tag => (
                      <span key={tag} style={{ background: '#333366', color: '#a6adc8', borderRadius: 2, padding: '2px 8px', fontSize: 11 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default MeetingCardExtractPanel; 