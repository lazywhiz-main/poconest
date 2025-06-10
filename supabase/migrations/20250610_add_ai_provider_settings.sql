-- AI Provider Settings for Nest
-- Add primary_ai_provider and ai_provider_settings columns to nest_settings table

ALTER TABLE public.nest_settings 
ADD COLUMN IF NOT EXISTS primary_ai_provider text DEFAULT 'openai' CHECK (primary_ai_provider IN ('openai', 'gemini')),
ADD COLUMN IF NOT EXISTS ai_provider_settings jsonb DEFAULT '{
  "enableFallback": true,
  "fallbackProviders": ["gemini"],
  "providerConfigs": {
    "openai": {
      "model": "gpt-4o",
      "embeddingModel": "text-embedding-3-small"
    },
    "gemini": {
      "model": "gemini-2.0-flash",
      "embeddingModel": "gemini-embedding-exp-03-07"
    }
  }
}'::jsonb;

-- Create index for AI provider queries
CREATE INDEX IF NOT EXISTS idx_nest_settings_primary_ai_provider 
ON public.nest_settings(primary_ai_provider);

-- Update existing records to have default AI provider settings
UPDATE public.nest_settings 
SET primary_ai_provider = 'openai',
    ai_provider_settings = '{
      "enableFallback": true,
      "fallbackProviders": ["gemini"],
      "providerConfigs": {
        "openai": {
          "model": "gpt-4o",
          "embeddingModel": "text-embedding-3-small"
        },
        "gemini": {
          "model": "gemini-2.0-flash",
          "embeddingModel": "gemini-embedding-exp-03-07"
        }
      }
    }'::jsonb
WHERE primary_ai_provider IS NULL OR ai_provider_settings IS NULL;

-- Create function to get AI provider for a nest
CREATE OR REPLACE FUNCTION get_nest_ai_provider(nest_id_param uuid)
RETURNS TABLE(
  primary_provider text,
  ai_settings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ns.primary_ai_provider, 'openai') as primary_provider,
    COALESCE(ns.ai_provider_settings, '{
      "enableFallback": true,
      "fallbackProviders": ["gemini"],
      "providerConfigs": {
        "openai": {
          "model": "gpt-4o",
          "embeddingModel": "text-embedding-3-small"
        },
        "gemini": {
          "model": "gemini-2.0-flash",
          "embeddingModel": "gemini-embedding-exp-03-07"
        }
      }
    }'::jsonb) as ai_settings
  FROM public.nest_settings ns
  WHERE ns.nest_id = nest_id_param;
  
  -- If no settings found, return defaults
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'openai'::text as primary_provider,
      '{
        "enableFallback": true,
        "fallbackProviders": ["gemini"],
        "providerConfigs": {
          "openai": {
            "model": "gpt-4o",
            "embeddingModel": "text-embedding-3-small"
          },
          "gemini": {
            "model": "gemini-2.0-flash",
            "embeddingModel": "gemini-embedding-exp-03-07"
          }
        }
      }'::jsonb as ai_settings;
  END IF;
END;
$$; 