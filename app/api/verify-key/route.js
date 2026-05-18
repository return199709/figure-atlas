import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(req) {
  try {
    const { key } = await req.json();

    if (!key) {
      return Response.json({ valid: false, reason: 'missing_key' }, { status: 400 });
    }

    const normalised = key.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

    const { data, error } = await supabase
      .from('access_keys')
      .select('*')
      .eq('key', normalised)
      .single();

    if (error || !data) {
      return Response.json({ valid: false, reason: 'not_found' });
    }

    if (data.used) {
      return Response.json({ valid: false, reason: 'used' });
    }

    // Mark key consumed
    await supabase
      .from('access_keys')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('key', normalised);

    return Response.json({ valid: true });
  } catch (err) {
    console.error('verify-key error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
