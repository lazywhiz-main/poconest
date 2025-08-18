import { supabase } from './supabase/client';

interface InvitationData {
  invitationId: string;
  email: string;
  nestName: string;
  inviterEmail: string;
  inviteLink: string;
}

export const sendInvitationEmail = async (invitationData: InvitationData): Promise<boolean> => {
  try {
    console.log('🔍 [emailService] send-invitation Edge Function呼び出し開始:', {
      functionName: 'send-invitation',
      timestamp: new Date().toISOString(),
      invitationId: invitationData.invitationId,
      stackTrace: new Error().stack
    });
    
    const { data, error } = await supabase.functions.invoke('send-invitation', {
      body: { 
        email: invitationData.email, 
        nestName: invitationData.nestName, 
        inviterEmail: invitationData.inviterEmail, 
        inviteLink: invitationData.inviteLink 
      },
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}; 