import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FA-${seg()}-${seg()}`;
}

export async function POST(req) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return Response.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    // Verify payment actually succeeded with Stripe
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return Response.json({ error: 'Payment not confirmed' }, { status: 400 });
    }

    // Idempotency: return existing key if this payment was already processed
    const { data: existing } = await supabase
      .from('access_keys')
      .select('key')
      .eq('payment_intent_id', paymentIntentId)
      .single();

    if (existing) {
      return Response.json({ key: existing.key });
    }

    // Generate a unique key
    let key, attempts = 0;
    do {
      key = generateKey();
      const { data } = await supabase
        .from('access_keys')
        .select('key')
        .eq('key', key)
        .single();
      if (!data) break;
      attempts++;
    } while (attempts < 10);

    const { error: insertError } = await supabase.from('access_keys').insert({
      key,
      payment_intent_id: paymentIntentId,
      used: false,
    });

    if (insertError) throw insertError;

    return Response.json({ key });
  } catch (err) {
    console.error('confirm-payment error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
