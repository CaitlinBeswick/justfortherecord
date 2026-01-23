import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecallRequest {
  app_update_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { app_update_id }: RecallRequest = await req.json();

    if (!app_update_id) {
      return new Response(
        JSON.stringify({ error: 'Missing app_update_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete all notifications for this app update
    // We need to match on the JSONB data field
    const { data: deleted, error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'app_update')
      .filter('data->>app_update_id', 'eq', app_update_id)
      .select('id');

    if (deleteError) {
      throw new Error(`Failed to delete notifications: ${deleteError.message}`);
    }

    const deletedCount = deleted?.length || 0;

    // Reset the broadcast status on the app_updates record
    const { error: updateError } = await supabase
      .from('app_updates')
      .update({
        broadcasted_at: null,
        broadcast_count: 0,
      })
      .eq('id', app_update_id);

    if (updateError) {
      console.error('Failed to reset broadcast status:', updateError);
    }

    console.log(`Recalled ${deletedCount} notifications for app update ${app_update_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsDeleted: deletedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recall-app-update function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
