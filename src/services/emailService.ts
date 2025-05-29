import { supabase } from './supabase';

export const sendInvitationEmail = async ({
  email,
  nestName,
  inviterEmail,
  inviteLink,
}: {
  email: string;
  nestName: string;
  inviterEmail: string;
  inviteLink: string;
}) => {
  try {
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