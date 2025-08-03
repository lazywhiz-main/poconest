import React, { useState } from 'react';
import { TranscriptionService } from '../../../services/TranscriptionService';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs';
import { supabase } from '../../../services/supabase/client';

const TranscriptionTest: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { createJob } = useBackgroundJobs();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setResult('');
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError('');
    setResult('');

    try {
      // ファイルサイズと形式をチェック
      setProgress(10);
      const qualityCheck = await TranscriptionService.checkAudioQuality(
        await file.arrayBuffer(),
        file.type
      );

      if (!qualityCheck.isValid) {
        console.warn('🔧 [TranscriptionTest] ファイル品質警告:', qualityCheck.issues);
        console.log('🔧 [TranscriptionTest] 大きなファイルのため、Edge Functionで分割処理を実行します');
        // 警告があっても処理を続行（エラーにはしない）
      }

      setProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 文字起こし実行（テスト用のダミーmeetingId）
      setProgress(25);
      const transcriptionResult = await TranscriptionService.transcribeAudio(
        await file.arrayBuffer(),
        file.name,
        file.type,
        'test-meeting-id',
        'test-nest-id'
      );

      setProgress(100);
      setResult(transcriptionResult.transcript);

      console.log('🔧 [TranscriptionTest] 文字起こし完了:', transcriptionResult);

    } catch (err) {
      console.error('🔧 [TranscriptionTest] エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // 手動でテストジョブを作成
  const createTestJob = async () => {
    try {
      console.log('🔧 [TranscriptionTest] テストジョブ作成開始');
      
      // 既存のミーティングを取得
      let { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, nest_id, title')
        .limit(1);
      
      if (meetingsError) {
        console.error('🔧 [TranscriptionTest] ミーティング取得エラー:', meetingsError);
        setError(`ミーティング取得エラー: ${meetingsError.message}`);
        return;
      }
      
      if (!meetings || meetings.length === 0) {
        console.log('🔧 [TranscriptionTest] ミーティングが存在しません。テストミーティングを作成します。');
        
        // テスト用ミーティングを作成
        const { data: newMeeting, error: createError } = await supabase
          .from('meetings')
          .insert([{
            title: 'テストミーティング',
            description: '文字起こしテスト用',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(), // 1時間後
            nest_id: (await supabase.from('nests').select('id').limit(1)).data?.[0]?.id || crypto.randomUUID(),
            status: 'completed'
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('🔧 [TranscriptionTest] テストミーティング作成エラー:', createError);
          setError(`テストミーティング作成エラー: ${createError.message}`);
          return;
        }
        
        console.log('🔧 [TranscriptionTest] テストミーティング作成完了:', newMeeting);
        meetings = [newMeeting];
      }
      
      const meeting = meetings[0];
      console.log('🔧 [TranscriptionTest] 使用するミーティング:', meeting);
      
      const job = await createJob(
        'transcription',
        meeting.id,
        {
          fileName: 'test-audio.mp3',
          fileType: 'audio/mp3',
          storagePath: 'test/path.mp3',
          nestId: meeting.nest_id,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      );
      
      console.log('🔧 [TranscriptionTest] テストジョブ作成完了:', job);
      setResult(`テストジョブが作成されました: ${job?.id}`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] テストジョブ作成エラー:', error);
      setError(`テストジョブ作成エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 実際のファイルでテストジョブを作成
  const createTestJobWithFile = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    try {
      console.log('🔧 [TranscriptionTest] ファイル付きテストジョブ作成開始');
      
      // 既存のミーティングを取得
      let { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, nest_id, title')
        .limit(1);
      
      if (meetingsError) {
        console.error('🔧 [TranscriptionTest] ミーティング取得エラー:', meetingsError);
        setError(`ミーティング取得エラー: ${meetingsError.message}`);
        return;
      }
      
      if (!meetings || meetings.length === 0) {
        console.log('🔧 [TranscriptionTest] ミーティングが存在しません。テストミーティングを作成します。');
        
        // テスト用ミーティングを作成
        const { data: newMeeting, error: createError } = await supabase
          .from('meetings')
          .insert([{
            title: 'テストミーティング',
            description: '文字起こしテスト用',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(), // 1時間後
            nest_id: (await supabase.from('nests').select('id').limit(1)).data?.[0]?.id || crypto.randomUUID(),
            status: 'completed'
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('🔧 [TranscriptionTest] テストミーティング作成エラー:', createError);
          setError(`テストミーティング作成エラー: ${createError.message}`);
          return;
        }
        
        console.log('🔧 [TranscriptionTest] テストミーティング作成完了:', newMeeting);
        meetings = [newMeeting];
      }
      
      const meeting = meetings[0];
      console.log('🔧 [TranscriptionTest] 使用するミーティング:', meeting);
      
      // ファイルをSupabase Storageにアップロード
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${file.name}`;
      const filePath = `meetings/${meeting.id}/${uniqueFileName}`;
      console.log('🔧 [TranscriptionTest] ファイルアップロード開始:', filePath);
      
      const { error: uploadError } = await supabase.storage
        .from('meeting-files')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('🔧 [TranscriptionTest] ファイルアップロードエラー:', uploadError);
        setError(`ファイルアップロードエラー: ${uploadError.message}`);
        return; // アップロードエラー時はジョブ作成を停止
      }
      
      console.log('🔧 [TranscriptionTest] ファイルアップロード完了');
      
      const metadata = {
        fileName: file.name,
        fileType: file.type,
        storagePath: filePath,
        nestId: meeting.nest_id,
        userId: (await supabase.auth.getUser()).data.user?.id
      };
      
      console.log('🔧 [TranscriptionTest] ジョブ作成用メタデータ:', metadata);
      
      const job = await createJob(
        'transcription',
        meeting.id,
        metadata
      );
      
      console.log('🔧 [TranscriptionTest] ファイル付きテストジョブ作成完了:', job);
      console.log('🔧 [TranscriptionTest] ジョブID:', job?.id);
      console.log('🔧 [TranscriptionTest] ジョブステータス:', job?.status);
      setResult(`ファイル付きテストジョブが作成されました: ${job?.id}`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] ファイル付きテストジョブ作成エラー:', error);
      setError(`ファイル付きテストジョブ作成エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // ジョブの詳細を確認
  const checkJobStatus = async () => {
    try {
      console.log('🔧 [TranscriptionTest] ジョブステータス確認開始');
      
      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('🔧 [TranscriptionTest] ジョブ取得エラー:', error);
        setError(`ジョブ取得エラー: ${error.message}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] 最新のジョブ一覧:', jobs);
      
      if (jobs && jobs.length > 0) {
        const jobDetails = jobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          meeting_id: job.meeting_id,
          created_at: job.created_at,
          progress: job.progress,
          error_message: job.error_message
        }));
        
        setResult(`最新のジョブ一覧:\n${JSON.stringify(jobDetails, null, 2)}`);
      } else {
        setResult('ジョブが見つかりません');
      }
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] ジョブステータス確認エラー:', error);
      setError(`ジョブステータス確認エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 手動でジョブ処理をトリガー
  const triggerJobProcessing = async () => {
    try {
      console.log('🔧 [TranscriptionTest] 手動ジョブ処理トリガー開始');
      
      // 最新のpending状態のジョブを取得
      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'pending')
        .eq('type', 'transcription')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('🔧 [TranscriptionTest] ジョブ取得エラー:', error);
        setError(`ジョブ取得エラー: ${error.message}`);
        return;
      }
      
      if (!jobs || jobs.length === 0) {
        console.log('🔧 [TranscriptionTest] pending状態のジョブが見つかりません');
        setError('pending状態のジョブが見つかりません');
        return;
      }
      
      const job = jobs[0];
      console.log('🔧 [TranscriptionTest] 処理対象ジョブ:', job);
      
      // ジョブをrunning状態に更新
      const { error: updateError } = await supabase
        .from('background_jobs')
        .update({ 
          status: 'running',
          progress: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      if (updateError) {
        console.error('🔧 [TranscriptionTest] ジョブステータス更新エラー:', updateError);
        setError(`ジョブステータス更新エラー: ${updateError.message}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] ジョブをrunning状態に更新しました');
      setResult(`ジョブ ${job.id} をrunning状態に更新しました。BackgroundJobWorkerが検出するはずです。`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] 手動ジョブ処理トリガーエラー:', error);
      setError(`手動ジョブ処理トリガーエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // failed状態のジョブをリセット
  const resetFailedJobs = async () => {
    try {
      console.log('🔧 [TranscriptionTest] failed状態のジョブリセット開始');
      
      // failed状態のジョブをpendingにリセット
      const { data, error } = await supabase
        .from('background_jobs')
        .update({ 
          status: 'pending',
          progress: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('status', 'failed')
        .eq('type', 'transcription')
        .select();
      
      if (error) {
        console.error('🔧 [TranscriptionTest] ジョブリセットエラー:', error);
        setError(`ジョブリセットエラー: ${error.message}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] リセットされたジョブ:', data);
      setResult(`${data?.length || 0}個のfailed状態のジョブをpendingにリセットしました。`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] ジョブリセットエラー:', error);
      setError(`ジョブリセットエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 特定のジョブをpendingに戻す
  const resetSpecificJob = async () => {
    const jobId = prompt('リセットしたいジョブIDを入力してください:');
    if (!jobId) return;
    
    try {
      console.log('🔧 [TranscriptionTest] 特定ジョブリセット開始:', jobId);
      
      // 指定されたジョブをpendingにリセット
      const { data, error } = await supabase
        .from('background_jobs')
        .update({ 
          status: 'pending',
          progress: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('type', 'transcription')
        .select();
      
      if (error) {
        console.error('🔧 [TranscriptionTest] 特定ジョブリセットエラー:', error);
        setError(`特定ジョブリセットエラー: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('🔧 [TranscriptionTest] 指定されたジョブが見つかりません:', jobId);
        setError(`指定されたジョブが見つかりません: ${jobId}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] 特定ジョブリセット完了:', data);
      setResult(`ジョブ ${jobId} をpending状態にリセットしました。`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] 特定ジョブリセットエラー:', error);
      setError(`特定ジョブリセットエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 現在のジョブ状況を詳細確認
  const checkCurrentJobStatus = async () => {
    try {
      console.log('🔧 [TranscriptionTest] 現在のジョブ状況確認開始');
      
      // 最新のジョブを取得
      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('type', 'transcription')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('🔧 [TranscriptionTest] ジョブ取得エラー:', error);
        setError(`ジョブ取得エラー: ${error.message}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] 最新のtranscriptionジョブ:', jobs);
      
      if (!jobs || jobs.length === 0) {
        setResult('transcriptionジョブが見つかりません');
        return;
      }
      
      // 各ジョブの詳細を表示
      const jobDetails = jobs.map((job, index) => ({
        index: index + 1,
        id: job.id,
        status: job.status,
        progress: job.progress,
        created_at: job.created_at,
        error_message: job.error_message,
        metadata: job.metadata
      }));
      
      console.log('🔧 [TranscriptionTest] ジョブ詳細:', jobDetails);
      
      const resultText = jobDetails.map(job => 
        `ジョブ${job.index}: ${job.id}\n` +
        `ステータス: ${job.status}\n` +
        `進捗: ${job.progress}%\n` +
        `作成時刻: ${job.created_at}\n` +
        `エラー: ${job.error_message || 'なし'}\n` +
        `メタデータ: ${JSON.stringify(job.metadata, null, 2)}\n`
      ).join('\n');
      
      setResult(`最新のtranscriptionジョブ:\n\n${resultText}`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] ジョブ状況確認エラー:', error);
      setError(`ジョブ状況確認エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 現在のジョブの詳細メタデータ確認
  const checkJobMetadata = async () => {
    const jobId = prompt('確認したいジョブIDを入力してください:');
    if (!jobId) return;
    
    try {
      console.log('🔧 [TranscriptionTest] ジョブメタデータ確認開始:', jobId);
      
      // 指定されたジョブの詳細を取得
      const { data: job, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) {
        console.error('🔧 [TranscriptionTest] ジョブ取得エラー:', error);
        setError(`ジョブ取得エラー: ${error.message}`);
        return;
      }
      
      if (!job) {
        console.log('🔧 [TranscriptionTest] 指定されたジョブが見つかりません:', jobId);
        setError(`指定されたジョブが見つかりません: ${jobId}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] ジョブ詳細:', job);
      
      const resultText = 
        `ジョブID: ${job.id}\n` +
        `タイプ: ${job.type}\n` +
        `ステータス: ${job.status}\n` +
        `進捗: ${job.progress}%\n` +
        `作成時刻: ${job.created_at}\n` +
        `更新時刻: ${job.updated_at}\n` +
        `エラー: ${job.error_message || 'なし'}\n` +
        `メタデータ: ${JSON.stringify(job.metadata, null, 2)}\n` +
        `ミーティングID: ${job.meeting_id}\n` +
        `ユーザーID: ${job.user_id}`;
      
      setResult(`ジョブ詳細:\n\n${resultText}`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] ジョブメタデータ確認エラー:', error);
      setError(`ジョブメタデータ確認エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 既存のジョブのメタデータを修正
  const fixJobMetadata = async () => {
    const jobId = prompt('修正したいジョブIDを入力してください:');
    if (!jobId) return;
    
    try {
      console.log('🔧 [TranscriptionTest] ジョブメタデータ修正開始:', jobId);
      
      // ジョブの現在の情報を取得
      const { data: job, error: fetchError } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (fetchError || !job) {
        console.error('🔧 [TranscriptionTest] ジョブ取得エラー:', fetchError);
        setError(`ジョブ取得エラー: ${fetchError?.message || 'ジョブが見つかりません'}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] 現在のジョブ情報:', job);
      
      // ファイル情報を手動で設定
      const fixedMetadata = {
        fileName: 'audio1511385667.m4a', // 実際のファイル名に変更
        fileType: 'audio/x-m4a',
        storagePath: `meetings/${job.meeting_id}/1754236630016_audio1511385667.m4a`, // 実際のパスに変更
        nestId: job.nest_id || '572a451a-e9ec-4c84-ad1c-bf67ca05654f', // 実際のnest_idに変更
        userId: job.user_id
      };
      
      console.log('🔧 [TranscriptionTest] 修正用メタデータ:', fixedMetadata);
      
      // ジョブのメタデータを更新
      const { data: updatedJob, error: updateError } = await supabase
        .from('background_jobs')
        .update({ 
          metadata: fixedMetadata,
          status: 'pending', // pending状態に戻す
          progress: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single();
      
      if (updateError) {
        console.error('🔧 [TranscriptionTest] ジョブ更新エラー:', updateError);
        setError(`ジョブ更新エラー: ${updateError.message}`);
        return;
      }
      
      console.log('🔧 [TranscriptionTest] ジョブメタデータ修正完了:', updatedJob);
      setResult(`ジョブ ${jobId} のメタデータを修正しました。\n\n修正内容:\n${JSON.stringify(fixedMetadata, null, 2)}`);
      
    } catch (error) {
      console.error('🔧 [TranscriptionTest] ジョブメタデータ修正エラー:', error);
      setError(`ジョブメタデータ修正エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>文字起こしテスト</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ marginBottom: '10px' }}
        />
        <div style={{ fontSize: '12px', color: '#666' }}>
          推奨サイズ: 25MB以下（大きなファイルは自動分割）
          <br />
          処理時間: 1時間の音声で約5-10分程度
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleTranscribe}
          disabled={!file || isProcessing}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isProcessing ? '処理中...' : '文字起こし実行'}
        </button>

        <button
          onClick={createTestJob}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          テストジョブ作成
        </button>

        <button
          onClick={createTestJobWithFile}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          ファイル付きテストジョブ作成
        </button>

        <button
          onClick={checkJobStatus}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ジョブステータス確認
        </button>

        <button
          onClick={triggerJobProcessing}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          ジョブ処理をトリガー
        </button>

        <button
          onClick={resetFailedJobs}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffc107',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          failed状態のジョブをリセット
        </button>

        <button
          onClick={resetSpecificJob}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          特定のジョブをpendingに戻す
        </button>

        <button
          onClick={checkCurrentJobStatus}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          現在のジョブ状況を詳細確認
        </button>

        <button
          onClick={checkJobMetadata}
          style={{
            padding: '10px 20px',
            backgroundColor: '#495057',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          ジョブメタデータ確認
        </button>

        <button
          onClick={fixJobMetadata}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e83e8c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          ジョブメタデータを修正
        </button>
      </div>

      {progress > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '5px' }}>進捗: {progress}%</div>
          <div style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#f0f0f0',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px',
          whiteSpace: 'pre-line'
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          padding: '10px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          marginBottom: '20px',
          whiteSpace: 'pre-line',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          <strong>文字起こし結果:</strong>
          <br />
          {result}
        </div>
      )}
    </div>
  );
};

export default TranscriptionTest; 