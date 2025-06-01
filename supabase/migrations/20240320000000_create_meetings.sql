-- Create meetings table
CREATE TABLE meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  uploaded_files JSONB DEFAULT '[]'::jsonb,
  recording_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON meetings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON meetings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON meetings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON meetings
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create storage bucket for meeting files
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-files', 'meeting-files', true);

-- Create storage policies
CREATE POLICY "Enable read access for authenticated users" ON storage.objects
  FOR SELECT USING (bucket_id = 'meeting-files' AND auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'meeting-files' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON storage.objects
  FOR UPDATE USING (bucket_id = 'meeting-files' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON storage.objects
  FOR DELETE USING (bucket_id = 'meeting-files' AND auth.role() = 'authenticated'); 