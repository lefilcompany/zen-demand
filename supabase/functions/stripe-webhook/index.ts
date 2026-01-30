import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(
          JSON.stringify({ error: "Webhook signature verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // For development, parse without verification
      event = JSON.parse(body);
      console.warn("Webhook signature not verified - development mode");
    }

    console.log("Received Stripe event:", event.type);

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { teamId, planId, userId } = session.metadata || {};

        if (!teamId || !planId) {
          console.error("Missing metadata in checkout session");
          break;
        }

        console.log("Processing checkout completion for team:", teamId);

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Check if subscription already exists
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("team_id", teamId)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          const { error: updateError } = await supabase
            .from("subscriptions")
            .update({
              plan_id: planId,
              status: "active",
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer as string,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq("team_id", teamId);

          if (updateError) {
            console.error("Error updating subscription:", updateError);
          } else {
            console.log("Subscription updated for team:", teamId);
          }
        } else {
          // Create new subscription
          const { error: insertError } = await supabase.from("subscriptions").insert({
            team_id: teamId,
            plan_id: planId,
            status: "active",
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

          if (insertError) {
            console.error("Error creating subscription:", insertError);
          } else {
            console.log("Subscription created for team:", teamId);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Get subscription to get metadata
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const teamId = subscription.metadata?.teamId;

        if (!teamId) {
          console.error("No teamId in subscription metadata");
          break;
        }

        // Update subscription period
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription after payment:", error);
        } else {
          console.log("Subscription renewed for team:", teamId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Mark subscription as past_due
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error("Error updating subscription on payment failure:", error);
        } else {
          console.log("Subscription marked as past_due:", subscriptionId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const teamId = subscription.metadata?.teamId;

        if (!teamId) {
          console.error("No teamId in subscription metadata");
          break;
        }

        // Mark subscription as canceled
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error canceling subscription:", error);
        } else {
          console.log("Subscription canceled for team:", teamId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update cancel_at_period_end status
        const { error } = await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating subscription:", error);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
