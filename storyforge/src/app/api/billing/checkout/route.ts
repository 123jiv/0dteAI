import { NextRequest } from "next/server";
import { ensureCustomer, getStripe, getUserFromRequest, paywallEnabled } from "@/lib/server/billing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!paywallEnabled()) {
    return Response.json({ error: "Billing is not configured." }, { status: 503 });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: "Sign in first.", code: "auth" }, { status: 401 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const customer = await ensureCustomer(user);
  const session = await getStripe().checkout.sessions.create({
    customer,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/login?upgraded=1`,
    cancel_url: `${origin}/login`,
  });

  return Response.json({ url: session.url });
}
