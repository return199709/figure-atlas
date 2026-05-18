import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 199,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { product: 'figure-atlas' },
    });

    return Response.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('create-payment error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
