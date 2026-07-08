import { NextRequest } from "next/server";
import {
  getEntitlement,
  getUserFromRequest,
  paywallEnabled,
  PRICE_LABEL,
} from "@/lib/server/billing";

export const runtime = "nodejs";

/** Client-facing snapshot of the paywall state for the current user. */
export async function GET(req: NextRequest) {
  if (!paywallEnabled()) {
    return Response.json({ enabled: false });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return Response.json({ enabled: true, signedIn: false, priceLabel: PRICE_LABEL });
  }
  const ent = await getEntitlement(user.id);
  return Response.json({
    enabled: true,
    signedIn: true,
    email: user.email,
    plan: ent.plan,
    chaptersUsed: ent.chaptersUsed,
    freeLimit: ent.freeLimit,
    priceLabel: PRICE_LABEL,
  });
}
