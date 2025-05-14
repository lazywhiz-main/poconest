import { FileObject } from '@supabase/storage-js';
import { Platform } from 'react-native';
import { supabase } from './client';
import { ApiResponse } from './types';
import { v4 as uuidv4 } from 'uuid';

// デフォルトのバケット名
const DEFAULT_BUCKET = 'avatars';

// Supabaseのファイル応答型
interface SupabaseFileResponse {
  id: string;
  path: string;
  fullPath: string;
}

/**
 * ファイルアップロード用ユーティリティ
 * @param bucket バケット名
 * @param path ファイルパス
 * @param file ファイルデータ（ブラウザのFileまたはバイナリデータ）
 * @param fileOptions ファイルオプション
 * @returns アップロード結果
 */
export const uploadFile = async (
  file: File | Blob | ArrayBuffer | FormData,
  path?: string,
  bucket: string = DEFAULT_BUCKET,
  fileOptions?: { contentType?: string; cacheControl?: string }
): Promise<ApiResponse<SupabaseFileResponse>> => {
  try {
    // ファイル拡張子を取得
    let fileExt = '';
    let contentType = fileOptions?.contentType;
    
    if (file instanceof File) {
      fileExt = file.name.split('.').pop() || '';
      contentType = contentType || file.type;
    }
    
    // ファイルパスの生成（指定がなければランダム生成）
    const filePath = path || `${uuidv4()}${fileExt ? `.${fileExt}` : ''}`;
    
    // アップロード処理
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: fileOptions?.cacheControl || '3600',
        upsert: true,
        contentType
      });
    
    if (error) {
      throw error;
    }
    
    return { data: data as SupabaseFileResponse, error: null };
  } catch (error: any) {
    console.error('ファイルアップロードエラー:', error.message);
    return { data: null, error: new Error(error.message || 'ファイルアップロード中にエラーが発生しました') };
  }
};

/**
 * プロフィール画像のアップロード
 * @param userId ユーザーID
 * @param file ファイルデータ
 * @returns アップロード結果とURLを含むオブジェクト
 */
export const uploadProfileImage = async (
  userId: string,
  file: File | Blob
): Promise<ApiResponse<{ path: string; url: string }>> => {
  try {
    // プロフィール画像用のパスを生成
    const filePath = `${userId}/profile${file instanceof File ? `.${file.name.split('.').pop()}` : ''}`;
    
    // アップロード実行
    const { data, error } = await uploadFile(file, filePath, 'avatars', {
      contentType: file instanceof File ? file.type : 'image/jpeg',
      cacheControl: '3600'
    });
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('アップロードに失敗しました');
    }
    
    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    return {
      data: { path: filePath, url: publicUrl },
      error: null
    };
  } catch (error: any) {
    console.error('プロフィール画像アップロードエラー:', error.message);
    return { data: null, error: new Error(error.message || 'プロフィール画像アップロード中にエラーが発生しました') };
  }
};

/**
 * メッセージ添付ファイルのアップロード
 * @param chatRoomId チャットルームID
 * @param userId ユーザーID
 * @param file ファイルデータ
 * @returns アップロード結果とURLを含むオブジェクト
 */
export const uploadChatAttachment = async (
  chatRoomId: string,
  userId: string,
  file: File | Blob
): Promise<ApiResponse<{ path: string; url: string }>> => {
  try {
    // ファイル名の取得
    const fileName = file instanceof File 
      ? file.name 
      : `file-${Date.now()}${Platform.OS === 'web' ? '.bin' : ''}`;
    
    // チャット添付ファイル用のパスを生成
    const filePath = `${chatRoomId}/${userId}/${Date.now()}-${fileName}`;
    
    // アップロード実行
    const { data, error } = await uploadFile(file, filePath, 'attachments', {
      contentType: file instanceof File ? file.type : undefined,
      cacheControl: '3600'
    });
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('アップロードに失敗しました');
    }
    
    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);
    
    return {
      data: { path: filePath, url: publicUrl },
      error: null
    };
  } catch (error: any) {
    console.error('チャット添付ファイルアップロードエラー:', error.message);
    return { data: null, error: new Error(error.message || 'チャット添付ファイルアップロード中にエラーが発生しました') };
  }
};

/**
 * ファイル削除
 * @param path ファイルパス
 * @param bucket バケット名
 * @returns 削除結果
 */
export const deleteFile = async (
  path: string,
  bucket: string = DEFAULT_BUCKET
): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      throw error;
    }
    
    return { data: undefined, error: null };
  } catch (error: any) {
    console.error('ファイル削除エラー:', error.message);
    return { data: null, error: new Error(error.message || 'ファイル削除中にエラーが発生しました') };
  }
};

/**
 * ファイルのURLを取得
 * @param path ファイルパス
 * @param bucket バケット名
 * @param options オプション（ダウンロード有効期限など）
 * @returns ファイルのURL
 */
export const getFileUrl = (
  path: string,
  bucket: string = DEFAULT_BUCKET,
  options?: { download?: boolean }
): string => {
  if (options?.download) {
    // ダウンロード用URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path, {
        download: true
      });
    return data.publicUrl;
  } else {
    // 公開URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  }
};

/**
 * ファイルの一覧を取得
 * @param path ディレクトリパス
 * @param bucket バケット名
 * @returns ファイル一覧
 */
export const listFiles = async (
  path?: string,
  bucket: string = DEFAULT_BUCKET
): Promise<ApiResponse<FileObject[]>> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path || '');
    
    if (error) {
      throw error;
    }
    
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('ファイル一覧取得エラー:', error.message);
    return { data: null, error: new Error(error.message || 'ファイル一覧取得中にエラーが発生しました') };
  }
};

/**
 * ファイルをダウンロード
 * @param path ファイルパス
 * @param bucket バケット名
 * @returns ファイルデータとメタデータ
 */
export const downloadFile = async (
  path: string,
  bucket: string = DEFAULT_BUCKET
): Promise<ApiResponse<{ data: Blob; filename: string }>> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('ファイルが見つかりませんでした');
    }
    
    // ファイル名を取得
    const filename = path.split('/').pop() || 'download';
    
    return { data: { data, filename }, error: null };
  } catch (error: any) {
    console.error('ファイルダウンロードエラー:', error.message);
    return { data: null, error: new Error(error.message || 'ファイルダウンロード中にエラーが発生しました') };
  }
};

/**
 * Base64エンコードされた画像をアップロード
 * @param base64 Base64エンコードされた画像データ
 * @param path ファイルパス
 * @param bucket バケット名
 * @param contentType コンテンツタイプ（image/jpeg など）
 * @returns アップロード結果
 */
export const uploadBase64Image = async (
  base64: string,
  path?: string,
  bucket: string = DEFAULT_BUCKET,
  contentType: string = 'image/jpeg'
): Promise<ApiResponse<SupabaseFileResponse>> => {
  try {
    // Base64データをBlobに変換
    const base64Data = base64.split(',')[1] || base64;
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    const blob = new Blob(byteArrays, { type: contentType });
    
    // アップロード
    return await uploadFile(blob, path, bucket, { contentType });
  } catch (error: any) {
    console.error('Base64画像アップロードエラー:', error.message);
    return { data: null, error: new Error(error.message || 'Base64画像アップロード中にエラーが発生しました') };
  }
}; 