-- NESTのupdated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_nest_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- nest_idを取得（テーブルによって異なる）
  DECLARE
    target_nest_id uuid;
  BEGIN
    -- テーブルに応じてnest_idを取得
    IF TG_TABLE_NAME = 'chat_messages' THEN
      -- chat_messages -> chat_rooms -> spaces -> nests
      SELECT s.nest_id INTO target_nest_id
      FROM chat_rooms cr
      JOIN spaces s ON cr.space_id = s.id
      WHERE cr.id = NEW.chat_id;
    ELSIF TG_TABLE_NAME = 'meetings' THEN
      -- meetings直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'board_cards' THEN
      -- board_cards -> boards -> nests
      SELECT b.nest_id INTO target_nest_id
      FROM boards b
      WHERE b.id = NEW.board_id;
    ELSIF TG_TABLE_NAME = 'boards' THEN
      -- boards直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'spaces' THEN
      -- spaces直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'nest_members' THEN
      -- nest_members直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'nest_settings' THEN
      -- nest_settings直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'scheduled_meetings' THEN
      -- scheduled_meetings直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'ai_usage_logs' THEN
      -- ai_usage_logs直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'insights' THEN
      -- insights直接
      target_nest_id := NEW.nest_id;
    ELSIF TG_TABLE_NAME = 'board_card_relations' THEN
      -- board_card_relations -> board_cards -> boards -> nests
      SELECT b.nest_id INTO target_nest_id
      FROM board_cards bc
      JOIN boards b ON bc.board_id = b.id
      WHERE bc.id = NEW.card_id;
    ELSIF TG_TABLE_NAME = 'relationship_suggestions' THEN
      -- relationship_suggestions -> board_cards -> boards -> nests
      SELECT b.nest_id INTO target_nest_id
      FROM board_cards bc
      JOIN boards b ON bc.board_id = b.id
      WHERE bc.id = NEW.source_card_id;
    END IF;

    -- nest_idが取得できた場合のみ更新
    IF target_nest_id IS NOT NULL THEN
      UPDATE nests 
      SET updated_at = NOW() 
      WHERE id = target_nest_id;
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定

-- チャットメッセージ
CREATE TRIGGER update_nest_on_chat_message
  AFTER INSERT OR UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- ミーティング（文字起こし完了時も含む）
CREATE TRIGGER update_nest_on_meeting
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW 
  WHEN (NEW.transcript IS NOT NULL AND (OLD.transcript IS NULL OR OLD.transcript != NEW.transcript))
  EXECUTE FUNCTION update_nest_updated_at();

-- ミーティング（その他の更新）
CREATE TRIGGER update_nest_on_meeting_general
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- ボードカード
CREATE TRIGGER update_nest_on_board_card
  AFTER INSERT OR UPDATE ON board_cards
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- ボード
CREATE TRIGGER update_nest_on_board
  AFTER INSERT OR UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- スペース
CREATE TRIGGER update_nest_on_space
  AFTER INSERT OR UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- ネストメンバー
CREATE TRIGGER update_nest_on_nest_member
  AFTER INSERT OR UPDATE OR DELETE ON nest_members
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- ネスト設定
CREATE TRIGGER update_nest_on_nest_setting
  AFTER INSERT OR UPDATE ON nest_settings
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- 予約ミーティング
CREATE TRIGGER update_nest_on_scheduled_meeting
  AFTER INSERT OR UPDATE ON scheduled_meetings
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- AI使用ログ
CREATE TRIGGER update_nest_on_ai_usage_log
  AFTER INSERT OR UPDATE ON ai_usage_logs
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- インサイト
CREATE TRIGGER update_nest_on_insight
  AFTER INSERT OR UPDATE ON insights
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- ボードカード関係
CREATE TRIGGER update_nest_on_board_card_relation
  AFTER INSERT OR UPDATE ON board_card_relations
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- 関係性提案
CREATE TRIGGER update_nest_on_relationship_suggestion
  AFTER INSERT OR UPDATE ON relationship_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- バックグラウンドジョブ（重要な完了時のみ）
CREATE TRIGGER update_nest_on_background_job_complete
  AFTER UPDATE ON background_jobs
  FOR EACH ROW 
  WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION update_nest_updated_at();

-- 文字起こしジョブ完了時の特別処理
CREATE OR REPLACE FUNCTION update_nest_on_transcription_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- 文字起こしジョブが完了した場合、関連するミーティングのNESTを更新
  IF NEW.type = 'transcription' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- ミーティングIDからNEST IDを取得して更新
    UPDATE nests 
    SET updated_at = NOW() 
    WHERE id = (
      SELECT m.nest_id 
      FROM meetings m 
      WHERE m.id = NEW.meeting_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nest_on_transcription_job_complete
  AFTER UPDATE ON background_jobs
  FOR EACH ROW 
  WHEN (NEW.type = 'transcription' AND NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_nest_on_transcription_complete(); 