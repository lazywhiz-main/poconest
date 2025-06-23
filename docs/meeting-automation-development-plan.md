# ミーティングページ改善 開発計画

## 🎯 概要

ミーティングページの2つの主要改善：
1. **非同期処理**: AI要約・カード抽出の裏回し処理とページ離脱対応
2. **ミーティング自動化**: 事前登録からAI処理まで完全自動化

## 📋 Phase 1: 非同期処理アーキテクチャ実装

### 1.1 バックグラウンドジョブシステム設計

```typescript
interface BackgroundJob {
  id: string;
  type: 'ai_summary' | 'card_extraction' | 'transcription';
  status: 'pending' | 'running' | 'completed' | 'failed';
  meetingId: string;
  userId: string;
  progress: number; // 0-100
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedCompletion?: Date;
}

class JobQueueService {
  async enqueue(job: Omit<BackgroundJob, 'id' | 'createdAt'>): Promise<string>
  async getJobStatus(jobId: string): Promise<BackgroundJob>
  async getUserJobs(userId: string): Promise<BackgroundJob[]>
  async cancelJob(jobId: string): Promise<boolean>
}
```

### 1.2 データベース設計

```sql
-- ジョブテーブル
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  meeting_id UUID REFERENCES meetings(id),
  user_id UUID REFERENCES users(id),
  progress INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_completion TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_background_jobs_user_status ON background_jobs(user_id, status);
CREATE INDEX idx_background_jobs_meeting ON background_jobs(meeting_id);
```

### 1.3 UI状態表示戦略

**推奨: スケルトン + プログレス の組み合わせ**

```typescript
const ProcessingStates = {
  ai_summary: {
    skeleton: "AIが会議内容を分析中...",
    progressSteps: [
      "音声データ解析中", 
      "キーポイント抽出中", 
      "要約生成中"
    ]
  },
  card_extraction: {
    skeleton: "アクションアイテムを抽出中...",
    progressSteps: [
      "発言内容分析中",
      "タスク候補抽出中", 
      "カード生成中"
    ]
  },
  transcription: {
    skeleton: "音声を文字起こし中...",
    progressSteps: [
      "音声解析中",
      "文字変換中", 
      "精度向上処理中"
    ]
  }
};
```

### 1.4 リアルタイム通知システム

```typescript
class JobNotificationService {
  async subscribeToUserJobs(userId: string, callback: (job: BackgroundJob) => void)
  async notifyJobProgress(jobId: string, progress: number)
  async notifyJobCompletion(jobId: string, result: any)
}
```

## 📋 Phase 2: ミーティング自動化システム

### 2.1 ミーティング予約システム

```typescript
interface ScheduledMeeting {
  id: string;
  title: string;
  platformType: 'zoom' | 'googlemeet' | 'teams';
  meetingUrl: string;
  startTime: Date;
  duration: number; // minutes
  autoJoin: boolean;
  autoTranscribe: boolean;
  autoSummarize: boolean;
  autoExtractCards: boolean;
  participants: string[];
  nestId: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

class MeetingAutomationService {
  async scheduleAutoMeeting(config: ScheduledMeeting): Promise<string>
  async joinMeetingAutomatically(meetingId: string): Promise<void>
  async startAutoTranscription(meetingId: string): Promise<string> // jobId
  async processCompletedMeeting(meetingId: string): Promise<void>
}
```

### 2.2 プラットフォーム別統合

| プラットフォーム | 統合方法 | 難易度 | 推奨度 |
|------------------|----------|--------|--------|
| **Zoom** | Zoom SDK / Bot | 中 | ⭐⭐⭐⭐⭐ |
| **Google Meet** | Chrome Extension + API | 高 | ⭐⭐⭐ |
| **Teams** | Teams Bot Framework | 高 | ⭐⭐⭐ |

**推奨アプローチ: Zoom優先実装**

```typescript
class ZoomIntegrationService {
  async createMeetingBot(meetingUrl: string): Promise<string>
  async joinAsBot(meetingId: string): Promise<void>
  async startRecording(meetingId: string): Promise<void>
  async getTranscription(meetingId: string): Promise<string>
}
```

### 2.3 ワークフロー設計

```typescript
class MeetingWorkflow {
  async executeAutoWorkflow(meetingId: string) {
    // 1. 自動参加
    await this.autoJoin(meetingId);
    
    // 2. 文字起こし開始（バックグラウンド）
    const transcriptionJob = await this.startTranscription(meetingId);
    
    // 3. ミーティング終了後の自動処理
    await this.onMeetingEnd(meetingId, async () => {
      // 4. AI要約（バックグラウンド）
      const summaryJob = await this.startAISummary(meetingId);
      
      // 5. カード抽出（バックグラウンド）
      const extractionJob = await this.startCardExtraction(meetingId);
      
      // 6. 完了通知
      await this.notifyCompletion(meetingId, [summaryJob, extractionJob]);
    });
  }
}
```

## 📋 Phase 3: UI/UX改善

### 3.1 ジョブ状態表示コンポーネント

```typescript
const ProcessingIndicator: React.FC<{jobId: string}> = ({ jobId }) => {
  const job = useJobStatus(jobId);
  
  return (
    <div className="processing-container">
      {/* スケルトン表示 */}
      <ProcessingSkeleton type={job.type} />
      
      {/* プログレス表示 */}
      <ProgressBar 
        value={job.progress} 
        steps={ProcessingStates[job.type].progressSteps}
        currentStep={Math.floor(job.progress / 33)}
      />
      
      {/* 推定完了時間 */}
      <EstimatedCompletion time={job.estimatedCompletion} />
    </div>
  );
};

const useJobStatus = (jobId: string) => {
  const [job, setJob] = useState<BackgroundJob>();
  
  useEffect(() => {
    // Supabase Realtimeでジョブ状態を監視
    const subscription = jobNotificationService.subscribeToJob(
      jobId, 
      setJob
    );
    
    return () => subscription.unsubscribe();
  }, [jobId]);
  
  return job;
};
```

### 3.2 ミーティング予約UI

```typescript
const MeetingScheduler: React.FC = () => {
  return (
    <div className="meeting-scheduler">
      {/* 基本情報 */}
      <MeetingBasicInfo />
      
      {/* プラットフォーム選択 */}
      <PlatformSelector platforms={['zoom', 'googlemeet', 'teams']} />
      
      {/* 自動化設定 */}
      <AutomationSettings 
        options={[
          'auto_join',
          'auto_transcribe', 
          'auto_summarize',
          'auto_extract_cards'
        ]}
      />
      
      {/* スケジュール設定 */}
      <ScheduleSettings />
    </div>
  );
};
```

## 📅 実装スケジュール

### **Week 1-2: Phase 1基盤**
- [ ] バックグラウンドジョブシステム設計・実装
- [ ] データベーススキーマ作成
- [ ] ジョブキューサービス実装
- [ ] リアルタイム通知システム統合

### **Week 3-4: Phase 1 UI**
- [ ] 処理状態表示コンポーネント作成
- [ ] スケルトン・プログレスバーデザイン
- [ ] 既存のAI要約・カード抽出を非同期化
- [ ] エラーハンドリング・リトライ機能

### **Week 5-6: Phase 2基盤**
- [ ] ミーティング予約システム設計
- [ ] Zoom SDK統合調査・実装
- [ ] 自動参加ボット開発
- [ ] ワークフロー エンジン実装

### **Week 7-8: Phase 2統合**
- [ ] ミーティング予約UI実装
- [ ] 自動化ワークフロー統合
- [ ] テスト・デバッグ
- [ ] エラーケース対応

### **Week 9-10: 最適化**
- [ ] パフォーマンス最適化
- [ ] ユーザビリティテスト
- [ ] ドキュメント作成
- [ ] プロダクション対応

## 🎨 UI表示戦略

### **推奨: レイヤー化された状態表示**

1. **トップレベル**: 全体的な進行状況バー
2. **中間レベル**: 各段階のスケルトン表示
3. **詳細レベル**: リアルタイム進捗メッセージ

```typescript
<ProcessingOverlay>
  <GlobalProgress value={75} total={3} completed={2} />
  
  <ProcessingStage 
    name="文字起こし" 
    status="completed" 
    icon="✅"
  />
  
  <ProcessingStage 
    name="AI要約生成" 
    status="running" 
    progress={45}
    icon="🤖"
  />
  
  <ProcessingStage 
    name="カード抽出" 
    status="pending" 
    icon="⏳"
  />
  
  <RealtimeMessage>
    キーポイントを分析中... (残り約2分)
  </RealtimeMessage>
</ProcessingOverlay>
```

## 🔧 技術考慮事項

### セキュリティ
- [ ] OAuth 2.0による安全な認証
- [ ] AES-256による認証情報暗号化
- [ ] ミーティング録音の適切な権限管理

### パフォーマンス
- [ ] ジョブキューの効率的な処理
- [ ] リアルタイム更新の最適化
- [ ] 大量ミーティングデータの処理

### 拡張性
- [ ] 新しいプラットフォーム追加の容易さ
- [ ] ジョブタイプの拡張性
- [ ] ワークフロー設定の柔軟性

## 📝 進捗管理

- **現在の状況**: 計画策定完了
- **次のステップ**: Phase 1基盤実装開始
- **課題**: なし
- **メモ**: Zoom統合を優先、UI/UXは段階的改善

---

**最終更新**: 2025-01-08
**担当**: 開発チーム
**レビュー**: 承認済み 