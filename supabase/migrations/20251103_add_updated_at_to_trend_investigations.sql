-- Add updated_at column to trend_investigations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'trend_investigations' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE trend_investigations
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Set initial values to executed_at for existing records
    UPDATE trend_investigations
    SET updated_at = executed_at
    WHERE updated_at IS NULL;
  END IF;
END $$;

