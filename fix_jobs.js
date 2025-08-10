import { createClient } from '@supabase/supabase-js';

// Supabase設定
const supabaseUrl = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcWtmY2d0bWFidGZvemZjdmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Njk2MTcyNCwiZXhwIjoyMDYyNTM3NzI0fQ.BdZf3m0kfnrNi4seLvqiZSrnfnmM_6E5lJrHC4FcfO8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProcessingJobs() {
  try {
    console.log('🔧 処理中のジョブを確認中...');
    
    // 処理中のジョブを取得
    const { data: processingJobs, error: fetchError } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('status', 'processing')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('ジョブ取得エラー:', fetchError);
      return;
    }
    
    console.log(`🔍 処理中のジョブ数: ${processingJobs?.length || 0}`);
    
    if (processingJobs && processingJobs.length > 0) {
      processingJobs.forEach(job => {
        console.log(`- ${job.job_id} (作成日時: ${job.created_at})`);
      });
      
      // 処理中のジョブを完了に変更
      const { data, error } = await supabase
        .from('transcription_jobs')
        .update({
          status: 'completed',
          transcript: '手動完了通知',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'processing')
        .select();
      
      if (error) {
        console.error('更新エラー:', error);
        return;
      }
      
      console.log(`✅ ${data?.length || 0} 件のジョブを完了に変更しました`);
    } else {
      console.log('✅ 処理中のジョブはありません');
    }
    
    // 最新のジョブ一覧を表示
    const { data: allJobs, error: allError } = await supabase
      .from('transcription_jobs')
      .select('job_id, status, meeting_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error('全ジョブ取得エラー:', allError);
      return;
    }
    
    console.log('\n📋 最新のジョブ一覧:');
    allJobs?.forEach(job => {
      console.log(`${job.job_id}: ${job.status} (${job.created_at})`);
    });
    
  } catch (error) {
    console.error('スクリプト実行エラー:', error);
  }
}

fixProcessingJobs();
