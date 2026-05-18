export async function GET() {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500 });
  }
  return Response.json({ publishableKey: key });
}
