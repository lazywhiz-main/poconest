// Supabaseサービスのエントリーポイント
// 各モジュールからの機能をエクスポート

// クライアントからのエクスポート
export { supabase, createSupabaseClient } from './client';

// 認証関連機能のエクスポート
export {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  getCurrentSession,
  getCurrentUser,
  getUserProfile,
  createUserProfile,
  updateUserProfile
} from './auth';

// リアルタイム機能のエクスポート
export {
  subscribeToTable,
  unsubscribe,
  subscribeToChatMessages,
  subscribeToChatRooms,
  subscribeToBoardCards,
  trackPresence,
  untrackPresence
} from './realtime';

// ストレージ機能のエクスポート
export {
  uploadFile,
  uploadProfileImage,
  uploadChatAttachment,
  deleteFile,
  getFileUrl,
  listFiles,
  downloadFile,
  uploadBase64Image
} from './storage';

// 型定義のエクスポート
export * from './types';

// 共通データベース操作関数
import { supabase } from './client';
import { ApiResponse } from './types';

/**
 * データ取得用ユーティリティ
 * @param table テーブル名
 * @param queryBuilder クエリビルダー関数
 * @returns 取得結果
 */
export const fetchData = async <T>(
  table: string, 
  queryBuilder: (query: any) => any = (query) => query
): Promise<ApiResponse<T[]>> => {
  try {
    let query = supabase.from(table).select('*');
    query = queryBuilder(query);
    const { data, error } = await query;
    
    if (error) throw error;
    return { data: data as T[], error: null };
  } catch (error: any) {
    console.error(`Error fetching data from ${table}:`, error);
    return { data: null, error: new Error(error.message || 'データ取得中にエラーが発生しました') };
  }
};

/**
 * データ挿入用ユーティリティ
 * @param table テーブル名
 * @param data 挿入するデータ
 * @returns 挿入結果
 */
export const insertData = async <T>(
  table: string,
  data: Partial<T>
): Promise<ApiResponse<T>> => {
  try {
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    
    if (error) throw error;
    return { data: insertedData?.[0] as T, error: null };
  } catch (error: any) {
    console.error(`Error inserting data into ${table}:`, error);
    return { data: null, error: new Error(error.message || 'データ挿入中にエラーが発生しました') };
  }
};

/**
 * データ更新用ユーティリティ
 * @param table テーブル名
 * @param data 更新するデータ
 * @param match 更新条件
 * @returns 更新結果
 */
export const updateData = async <T>(
  table: string,
  data: Partial<T>,
  match: Record<string, any>
): Promise<ApiResponse<T>> => {
  try {
    let query = supabase.from(table).update(data);
    
    // 更新条件を適用
    Object.entries(match).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    const { data: updatedData, error } = await query.select();
    
    if (error) throw error;
    return { data: updatedData?.[0] as T, error: null };
  } catch (error: any) {
    console.error(`Error updating data in ${table}:`, error);
    return { data: null, error: new Error(error.message || 'データ更新中にエラーが発生しました') };
  }
};

/**
 * データ削除用ユーティリティ
 * @param table テーブル名
 * @param match 削除条件
 * @returns 削除結果
 */
export const deleteData = async (
  table: string,
  match: Record<string, any>
): Promise<{ error: Error | null }> => {
  try {
    let query = supabase.from(table).delete();
    
    // 削除条件を適用
    Object.entries(match).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
    
    const { error } = await query;
    
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error(`Error deleting data from ${table}:`, error);
    return { error: new Error(error.message || 'データ削除中にエラーが発生しました') };
  }
}; 