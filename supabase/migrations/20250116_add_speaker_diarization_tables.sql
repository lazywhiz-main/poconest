-- 話者分割機能のためのテーブル作成

-- 話者情報テーブル
CREATE TABLE IF NOT EXISTS public.meeting_speakers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_tag integer NOT NULL,
  name text,
  total_time text, -- "15:30" 形式
  word_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meeting_speakers_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_speakers_unique UNIQUE (meeting_id, speaker_tag)
);

-- 発言詳細テーブル
CREATE TABLE IF NOT EXISTS public.meeting_utterances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_tag integer NOT NULL,
  word text NOT NULL,
  start_time numeric NOT NULL, -- 秒単位
  end_time numeric NOT NULL, -- 秒単位
  confidence numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meeting_utterances_pkey PRIMARY KEY (id)
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_meeting_speakers_meeting_id ON public.meeting_speakers(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_speakers_speaker_tag ON public.meeting_speakers(speaker_tag);
CREATE INDEX IF NOT EXISTS idx_meeting_utterances_meeting_id ON public.meeting_utterances(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_utterances_speaker_tag ON public.meeting_utterances(speaker_tag);
CREATE INDEX IF NOT EXISTS idx_meeting_utterances_start_time ON public.meeting_utterances(start_time);

-- RLSポリシー設定
ALTER TABLE public.meeting_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_utterances ENABLE ROW LEVEL SECURITY;

-- meeting_speakersのRLSポリシー
CREATE POLICY "Users can view meeting speakers for their nests" ON public.meeting_speakers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.nest_members nm ON m.nest_id = nm.nest_id
      WHERE m.id = meeting_speakers.meeting_id
      AND nm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meeting speakers for their nests" ON public.meeting_speakers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.nest_members nm ON m.nest_id = nm.nest_id
      WHERE m.id = meeting_speakers.meeting_id
      AND nm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meeting speakers for their nests" ON public.meeting_speakers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.nest_members nm ON m.nest_id = nm.nest_id
      WHERE m.id = meeting_speakers.meeting_id
      AND nm.user_id = auth.uid()
    )
  );

-- meeting_utterancesのRLSポリシー
CREATE POLICY "Users can view meeting utterances for their nests" ON public.meeting_utterances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.nest_members nm ON m.nest_id = nm.nest_id
      WHERE m.id = meeting_utterances.meeting_id
      AND nm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meeting utterances for their nests" ON public.meeting_utterances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.nest_members nm ON m.nest_id = nm.nest_id
      WHERE m.id = meeting_utterances.meeting_id
      AND nm.user_id = auth.uid()
    )
  );

-- 話者情報更新時のトリガー
CREATE OR REPLACE FUNCTION update_meeting_speakers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meeting_speakers_updated_at_trigger
  BEFORE UPDATE ON public.meeting_speakers
  FOR EACH ROW EXECUTE FUNCTION update_meeting_speakers_updated_at();

-- 話者情報更新時のNEST updated_at更新トリガー
CREATE TRIGGER update_nest_on_meeting_speaker
  AFTER INSERT OR UPDATE ON public.meeting_speakers
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at();

-- 発言詳細更新時のNEST updated_at更新トリガー
CREATE TRIGGER update_nest_on_meeting_utterance
  AFTER INSERT OR UPDATE ON public.meeting_utterances
  FOR EACH ROW EXECUTE FUNCTION update_nest_updated_at(); 