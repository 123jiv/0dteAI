import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, paywallEnabled, setPlanByCustomer } from "@/lib/server/billing";

export const runtime = "nodejs";

function periodEndOf(sub: Stripe.Subscription): number | null {
  // Newer Stripe API versions carry current_period_end on the subscription item.
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  return item?.current_period_end ?? legacy ?? null;
}

export async function POST(req: NextRequest) {
  if (!paywallEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      await req.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customer = session.customer as string | null;
      if (customer && session.mode === "subscription") {
        let periodEnd: number | null = null;
        if (typeof session.subscription === "string") {
          const sub = await getStripe().subscriptions.retrieve(session.subscription);
          periodEnd = periodEndOf(sub);
        }
        await setPlanByCustomer(customer, "pro", periodEnd);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
      await setPlanByCustomer(sub.customer as string, active ? "pro" : "free", periodEndOf(sub));
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await setPlanByCustomer(sub.customer as string, "free", null);
      break;
    }
  }

  return Response.json({ received: true });
}
