import { useState, useCallback } from 'react';
import { useNest } from '../../contexts/NestContext';
import { useAuth } from '@contexts/AuthContext';
import { Alert, Platform } from 'react-native';
import { NestPrivacySettings } from '../../settings/types/settings.types';

// NEST作成用の入力データ型
export interface CreateNestData {
  name: string;
  description?: string;
  color?: string;
  privacy?: NestPrivacySettings;
  initialMembers?: string[]; // メールアドレスのリスト
}

// NEST作成ステップの定義
export enum CreateNestStep {
  BASIC_INFO = 0,
  PRIVACY = 1,
  INVITE = 2,
  SUMMARY = 3,
}

/**
 * NEST作成処理を扱うカスタムフック
 */
export const useCreateNest = () => {
  const { createNest, inviteMember, loading: nestLoading, error: nestError } = useNest();
  const { user } = useAuth();
  
  // ステップと入力データの状態管理
  const [currentStep, setCurrentStep] = useState<CreateNestStep>(CreateNestStep.BASIC_INFO);
  const [nestData, setNestData] = useState<CreateNestData>({
    name: '',
    description: '',
    color: '#3498db', // デフォルトカラー
    privacy: {
      visibility: 'private',
      searchable: false,
      memberListVisibility: 'members_only'
    },
    initialMembers: []
  });
  
  // 処理状態の管理
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [createdNestId, setCreatedNestId] = useState<string | null>(null);
  
  /**
   * 基本情報の更新
   */
  const updateBasicInfo = useCallback((data: Partial<CreateNestData>) => {
    setNestData(prev => ({ ...prev, ...data }));
  }, []);
  
  /**
   * プライバシー設定の更新
   */
  const updatePrivacySettings = useCallback((privacy: Partial<NestPrivacySettings>) => {
    setNestData(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy!,
        ...privacy
      }
    }));
  }, []);
  
  /**
   * メンバー招待リストの更新
   */
  const updateInitialMembers = useCallback((members: string[]) => {
    setNestData(prev => ({ ...prev, initialMembers: members }));
  }, []);
  
  /**
   * 入力バリデーション
   */
  const validateInput = useCallback((): { valid: boolean; message?: string } => {
    // 基本情報のバリデーション
    if (!nestData.name || nestData.name.trim().length === 0) {
      return { valid: false, message: 'NEST名を入力してください' };
    }
    
    if (nestData.name.trim().length < 3) {
      return { valid: false, message: 'NEST名は3文字以上で入力してください' };
    }
    
    // メールアドレスのバリデーション
    if (nestData.initialMembers && nestData.initialMembers.length > 0) {
      const invalidEmails = nestData.initialMembers.filter(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(email);
      });
      
      if (invalidEmails.length > 0) {
        return { 
          valid: false, 
          message: `無効なメールアドレスがあります: ${invalidEmails.join(', ')}` 
        };
      }
    }
    
    return { valid: true };
  }, [nestData]);
  
  /**
   * 次のステップに進む
   */
  const nextStep = useCallback(() => {
    // 現在のステップのバリデーション
    if (currentStep === CreateNestStep.BASIC_INFO) {
      if (!nestData.name || nestData.name.trim().length === 0) {
        setError('NEST名を入力してください');
        return;
      }
    }
    
    // ステップを進める
    setError(null);
    if (currentStep < CreateNestStep.SUMMARY) {
      setCurrentStep(prevStep => (prevStep + 1) as CreateNestStep);
    }
  }, [currentStep, nestData]);
  
  /**
   * 前のステップに戻る
   */
  const prevStep = useCallback(() => {
    if (currentStep > CreateNestStep.BASIC_INFO) {
      setCurrentStep(prevStep => (prevStep - 1) as CreateNestStep);
    }
    setError(null);
  }, [currentStep]);
  
  /**
   * 特定のステップに移動
   */
  const goToStep = useCallback((step: CreateNestStep) => {
    setCurrentStep(step);
    setError(null);
  }, []);
  
  /**
   * NESTを作成する
   */
  const createNewNest = useCallback(async () => {
    // 入力のバリデーション
    const { valid, message } = validateInput();
    if (!valid) {
      setError(message || 'バリデーションエラー');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // NEST作成
      const { error, nest } = await createNest({
        name: nestData.name.trim(),
        description: nestData.description?.trim(),
        color: nestData.color
        // Note: APIではプライバシー設定は別のエンドポイントで設定される可能性がある
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!nest) {
        throw new Error('NESTの作成に失敗しました');
      }
      
      // 作成されたNESTのIDを保存
      setCreatedNestId(nest.id);
      
      // 初期メンバーの招待（設定されている場合）
      if (nestData.initialMembers && nestData.initialMembers.length > 0) {
        for (const email of nestData.initialMembers) {
          // エラーが発生しても処理を続行
          try {
            await inviteMember(nest.id, email);
          } catch (inviteError) {
            console.error(`Failed to invite ${email}:`, inviteError);
          }
        }
      }
      
      // 成功
      setSuccess(true);
      
      // 成功メッセージ（アプリ内通知）
      if (Platform.OS !== 'web') {
        Alert.alert(
          'NESTを作成しました',
          `「${nest.name}」が正常に作成されました。`,
          [{ text: 'OK' }]
        );
      }
      
      return nest;
    } catch (err: any) {
      setError(err.message || 'NESTの作成に失敗しました');
      setSuccess(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [createNest, inviteMember, nestData, validateInput]);
  
  /**
   * 入力をリセットして初期状態に戻す
   */
  const resetForm = useCallback(() => {
    setCurrentStep(CreateNestStep.BASIC_INFO);
    setNestData({
      name: '',
      description: '',
      color: '#3498db',
      privacy: {
        visibility: 'private',
        searchable: false,
        memberListVisibility: 'members_only'
      },
      initialMembers: []
    });
    setError(null);
    setSuccess(false);
    setCreatedNestId(null);
  }, []);
  
  return {
    currentStep,
    nestData,
    loading: loading || nestLoading,
    error: error || nestError,
    success,
    createdNestId,
    updateBasicInfo,
    updatePrivacySettings,
    updateInitialMembers,
    nextStep,
    prevStep,
    goToStep,
    createNewNest,
    resetForm,
    validateInput
  };
}; 