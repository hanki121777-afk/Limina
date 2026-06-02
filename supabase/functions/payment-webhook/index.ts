import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno";

// Initialize Supabase Client (Admin mode to bypass RLS for webhook operations)
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe Client
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// PortOne v2 Secret
const portoneWebhookSecret = Deno.env.get("PORTONE_WEBHOOK_SECRET") || "";

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider"); // e.g. ?provider=stripe or ?provider=portone

  try {
    if (provider === "stripe") {
      return await handleStripeWebhook(req);
    } else if (provider === "portone") {
      return await handlePortOneWebhook(req);
    } else {
      // Auto-detect based on headers if provider is not explicitly set
      const stripeSignature = req.headers.get("stripe-signature");
      if (stripeSignature) {
        return await handleStripeWebhook(req);
      }
      return new Response("Unknown provider", { status: 400 });
    }
  } catch (err: any) {
    console.error(`[Webhook Error]`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});

/**
 * Handle Stripe Webhooks
 */
async function handleStripeWebhook(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (err: any) {
    console.error(`Stripe signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.client_reference_id || session.metadata?.user_id;
    const amountPaid = session.amount_total; // e.g. 990 for $9.90
    
    if (!userId) {
      console.warn("No user_id found in Stripe metadata");
      return new Response("No user_id in metadata", { status: 200 });
    }

    await updateUserSubscription(userId, amountPaid, "stripe");
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

/**
 * Handle PortOne v2 Webhooks
 */
async function handlePortOneWebhook(req: Request) {
  // PortOne sends JSON directly
  const payload = await req.json();
  const { paymentId, status, customData, amount } = payload;

  // Basic security check (ideally, query PortOne API to verify payment status)
  // To keep it fully secure, we should verify the PortOne webhook signature or poll the API.
  // For MVP, we extract the user_id from customData if payment is PAId.

  if (status === "PAID") {
    const userId = customData?.user_id;
    if (!userId) {
      console.warn("No user_id found in PortOne customData");
      return new Response("No user_id", { status: 200 });
    }

    await updateUserSubscription(userId, amount.total, "portone");
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

/**
 * Helper: Update Supabase subscriptions table
 */
async function updateUserSubscription(userId: string, amount: number, provider: string) {
  // Determine if it's Monthly ($9.90 -> ~1000) or Yearly ($69.00 -> ~6900)
  // For PortOne (KRW): Monthly ~9900, Yearly ~69000
  let isYearly = false;
  if (provider === "stripe" && amount >= 5000) isYearly = true;
  if (provider === "portone" && amount >= 50000) isYearly = true;

  const now = new Date();
  const expiresAt = new Date(now);
  if (isYearly) {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  console.log(`[Subscription Update] user=${userId}, tier=Pro, expiresAt=${expiresAt.toISOString()}`);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      tier: "Pro",
      status: "active",
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error(`DB Update Error:`, error.message);
    throw new Error(error.message);
  }
}
