import React, { useState } from 'react';
import { supabase } from '../../../../services/supabase/client';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/Toast';
import Input from '../../../../components/ui/Input';
import Button from '../../../../components/common/Button';

interface ScheduledMeetingFormProps {
  nestId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormData {
  title: string;
  description: string;
  startTime: string;
  duration: number;
  platformType: 'zoom' | 'googlemeet' | 'teams';
  meetingUrl: string;
  participants: string[];
  autoJoin: boolean;
  autoTranscribe: boolean;
  autoSummarize: boolean;
  autoExtractCards: boolean;
}

const ScheduledMeetingForm: React.FC<ScheduledMeetingFormProps> = ({
  nestId,
  onCancel,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    startTime: '',
    duration: 60,
    platformType: 'zoom',
    meetingUrl: '',
    participants: [],
    autoJoin: false,
    autoTranscribe: true,
    autoSummarize: true,
    autoExtractCards: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participantEmail, setParticipantEmail] = useState('');

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addParticipant = () => {
    if (participantEmail.trim() && !formData.participants.includes(participantEmail.trim())) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participantEmail.trim()]
      }));
      setParticipantEmail('');
    }
  };

  const removeParticipant = (email: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== email)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      showToast({ title: 'エラー', message: 'ユーザー情報が取得できません。', type: 'error' });
      return;
    }

    if (!formData.title.trim() || !formData.startTime) {
      showToast({ title: 'エラー', message: 'タイトルと開始時間は必須です。', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .insert([{
          title: formData.title.trim(),
          description: formData.description.trim(),
          platform_type: formData.platformType,
          meeting_url: formData.meetingUrl.trim(),
          start_time: new Date(formData.startTime).toISOString(),
          duration: formData.duration,
          auto_join: formData.autoJoin,
          auto_transcribe: formData.autoTranscribe,
          auto_summarize: formData.autoSummarize,
          auto_extract_cards: formData.autoExtractCards,
          participants: formData.participants,
          metadata: {},
          nest_id: nestId,
          status: 'scheduled',
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      showToast({ 
        title: '成功', 
        message: '予約ミーティングを作成しました。', 
        type: 'success' 
      });

      onSuccess();
      onCancel();

    } catch (error) {
      console.error('予約ミーティング作成エラー:', error);
      showToast({ 
        title: 'エラー', 
        message: '予約ミーティングの作成に失敗しました。', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ color: '#e2e8f0' }}>
      {/* 基本情報 */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, color: '#f9e2af' }}>基本情報</h4>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
            タイトル *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="ミーティングタイトル"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
            説明
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="ミーティングの説明"
            style={{
              width: '100%',
              minHeight: 80,
              padding: '12px',
              backgroundColor: '#181825',
              border: '1px solid #39396a',
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
              開始時間 *
            </label>
            <Input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
              時間（分）
            </label>
            <select
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#181825',
                border: '1px solid #39396a',
                borderRadius: 4,
                color: '#e2e8f0',
                fontSize: 14,
              }}
            >
              <option value={30}>30分</option>
              <option value={60}>1時間</option>
              <option value={90}>1時間30分</option>
              <option value={120}>2時間</option>
            </select>
          </div>
        </div>
      </div>

      {/* プラットフォーム設定 */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, color: '#f9e2af' }}>プラットフォーム設定</h4>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
            プラットフォーム
          </label>
          <select
            value={formData.platformType}
            onChange={(e) => handleInputChange('platformType', e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#181825',
              border: '1px solid #39396a',
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: 14,
            }}
          >
            <option value="zoom">Zoom</option>
            <option value="googlemeet">Google Meet</option>
            <option value="teams">Microsoft Teams</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
            ミーティングURL
          </label>
          <Input
            value={formData.meetingUrl}
            onChange={(e) => handleInputChange('meetingUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      {/* 参加者 */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, color: '#f9e2af' }}>参加者</h4>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Input
            value={participantEmail}
            onChange={(e) => setParticipantEmail(e.target.value)}
            placeholder="参加者のメールアドレス"
            style={{ flex: 1 }}
          />
          <button
            onClick={addParticipant}
            disabled={!participantEmail.trim()}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            追加
          </button>
        </div>

        {formData.participants.length > 0 && (
          <div style={{ 
            backgroundColor: '#181825', 
            padding: 12, 
            borderRadius: 4,
            maxHeight: 120,
            overflowY: 'auto'
          }}>
            {formData.participants.map((email, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '4px 0',
                borderBottom: index < formData.participants.length - 1 ? '1px solid #39396a' : 'none'
              }}>
                <span style={{ fontSize: 14 }}>{email}</span>
                <button
                  type="button"
                  onClick={() => removeParticipant(email)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 4,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 自動化設定 */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16, color: '#f9e2af' }}>自動化設定</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.autoJoin}
              onChange={(e) => handleInputChange('autoJoin', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 14 }}>自動参加</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.autoTranscribe}
              onChange={(e) => handleInputChange('autoTranscribe', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 14 }}>自動文字起こし</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.autoSummarize}
              onChange={(e) => handleInputChange('autoSummarize', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 14 }}>自動要約</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.autoExtractCards}
              onChange={(e) => handleInputChange('autoExtractCards', e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 14 }}>自動カード抽出</span>
          </label>
        </div>
      </div>

      {/* ボタン */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{ 
            backgroundColor: '#39396a', 
            color: '#e2e8f0',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            marginRight: 8,
          }}
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ 
            backgroundColor: '#8b5cf6', 
            color: '#ffffff',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {isSubmitting ? '作成中...' : '予約作成'}
        </button>
      </div>
    </form>
  );
};

export default ScheduledMeetingForm; 