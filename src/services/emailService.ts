import { supabase } from './supabase/client';

export const sendInvitationEmail = async (invitationData: InvitationData): Promise<boolean> => {
  try {
    console.log('🔍 [emailService] send-invitation Edge Function呼び出し開始:', {
      functionName: 'send-invitation',
      timestamp: new Date().toISOString(),
      invitationId: invitationData.invitationId,
      stackTrace: new Error().stack
    });
    
    const { data, error } = await supabase.functions.invoke('send-invitation', {
      body: { email, nestName, inviterEmail, inviteLink },
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error };
  }
}; 