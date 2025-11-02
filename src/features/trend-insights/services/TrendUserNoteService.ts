import { supabase } from '../../../services/supabase/client';

export interface UserNote {
  id: string;
  product_id: string;
  user_id: string;
  note_content: string;
  created_at: string;
  updated_at: string;
}

export const TrendUserNoteService = {
  /**
   * 製品のユーザーメモを取得
   */
  async getNotes(productId: string): Promise<UserNote[]> {
    try {
      const { data, error } = await supabase
        .from('trend_user_notes')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user notes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching user notes:', error);
      return [];
    }
  },

  /**
   * ユーザーメモを追加
   */
  async addNote(productId: string, noteContent: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('trend_user_notes')
        .insert({
          product_id: productId,
          user_id: user.id,
          note_content: noteContent,
        });

      if (error) {
        console.error('Error adding note:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception adding note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * ユーザーメモを更新
   */
  async updateNote(noteId: string, noteContent: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('trend_user_notes')
        .update({
          note_content: noteContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (error) {
        console.error('Error updating note:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception updating note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * ユーザーメモを削除
   */
  async deleteNote(noteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('trend_user_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('Error deleting note:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception deleting note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

