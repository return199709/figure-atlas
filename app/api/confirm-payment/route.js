import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FA-${seg()}-${seg()}`;
}

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return Response.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    // Verify payment succeeded with Stripe
    console.log('[confirm-payment] retrieving payment intent:', paymentIntentId);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('[confirm-payment] payment intent status:', pi.status);

    if (pi.status !== 'succeeded') {
      return Response.json({ error: `Payment status is "${pi.status}", not yet confirmed.` }, { status: 400 });
    }

    // Idempotency: return existing key if already issued for this payment
    const { data: existing, error: selectError } = await supabase
      .from('access_keys')
      .select('key')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (selectError) {
      console.error('[confirm-payment] supabase select error:', selectError);
      return Response.json({ error: `Database error: ${selectError.message}` }, { status: 500 });
    }

    if (existing) {
      console.log('[confirm-payment] returning existing key for idempotency');
      return Response.json({ key: existing.key });
    }

    // Generate a unique key (collision extremely unlikely but guarded)
    let key, attempts = 0;
    do {
      key = generateKey();
      const { data } = await supabase.from('access_keys').select('key').eq('key', key).maybeSingle();
      if (!data) break;
      attempts++;
    } while (attempts < 10);

    console.log('[confirm-payment] inserting key:', key);
    const { error: insertError } = await supabase.from('access_keys').insert({
      key,
      payment_intent_id: paymentIntentId,
      used: false,
    });

    if (insertError) {
      console.error('[confirm-payment] supabase insert error:', insertError);
      return Response.json({ error: `Database error: ${insertError.message}` }, { status: 500 });
    }

    console.log('[confirm-payment] success, key issued');
    return Response.json({ key });
  } catch (err) {
    console.error('[confirm-payment] unexpected error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
