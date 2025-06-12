import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svlvmxklzuqnlzunvhvw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2bHZteGtsenVxbmx6dW52aHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4NDYzMzUsImV4cCI6MjAzNjQyMjMzNX0.DwMl8S8A6tHH5H8QwmBFZChYLe7d0lmQP5HJ3vOI8GA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugInvite(token) {
  console.log('=== Debug Invitation ===');
  console.log('Token:', token);
  
  try {
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', user?.email || 'Not authenticated');
    if (userError) console.log('User error:', userError);
    
    // Check invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('nest_invitations')
      .select(`
        id, 
        nest_id, 
        invited_email,
        invited_by,
        is_accepted,
        expires_at,
        token,
        nests:nest_id (
          id,
          name,
          owner_id
        )
      `)
      .eq('token', token);
    
    console.log('Invitation query result:', invitation);
    if (inviteError) console.log('Invitation error:', inviteError);
    
    if (invitation && invitation.length > 0) {
      const inv = invitation[0];
      console.log('Invitation details:');
      console.log('- ID:', inv.id);
      console.log('- Nest ID:', inv.nest_id);
      console.log('- Email:', inv.invited_email);
      console.log('- Accepted:', inv.is_accepted);
      console.log('- Expires:', inv.expires_at);
      console.log('- Current time:', new Date().toISOString());
      
      // Check if user is already a member
      if (user) {
        const { data: member, error: memberError } = await supabase
          .from('nest_members')
          .select('id, role, joined_at')
          .eq('nest_id', inv.nest_id)
          .eq('user_id', user.id);
        
        console.log('Existing membership:', member);
        if (memberError) console.log('Member check error:', memberError);
      }
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Extract token from URL or use the provided one
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = window.location.pathname.split('/invite/')[1];
const token = tokenFromUrl || urlParams.get('invite') || 'b916a781-5817-45b8-9b35-d93f93572df9';

debugInvite(token); 