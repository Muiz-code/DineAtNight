import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { isValidCheckinKey, toCheckinTicket } from "@/lib/checkin";
import type { DanTicket } from "@/lib/firestore";

const MAX_LIMIT = 500;

/**
 * GET /api/checkin/tickets — paid and checked-in tickets for an external
 * check-in system (PULL). Auth: `Authorization: Bearer <CHECKIN_API_KEY>`.
 *
 * Query params:
 *   eventId — only this event's tickets (optional)
 *   limit   — page size, 1–500 (default 500)
 *   cursor  — `nextCursor` from the previous page
 *
 * Pages may hold fewer than `limit` tickets (pending ones are skipped);
 * keep requesting while `nextCursor` is not null.
 */
export async function GET(req: NextRequest) {
  if (!process.env.CHECKIN_API_KEY) {
    return NextResponse.json({ error: "Check-in API is not enabled" }, { status: 404 });
  }
  if (!isValidCheckinKey(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const eventId = params.get("eventId");
  const cursor = params.get("cursor");
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get("limit")) || MAX_LIMIT));
  if ((eventId && eventId.includes("/")) || (cursor && cursor.includes("/"))) {
    return NextResponse.json({ error: "Invalid parameter" }, { status: 400 });
  }

  try {
    // Single-field filters only, so no composite index is needed
    let q = eventId
      ? adminDb().collection("tickets").where("eventId", "==", eventId)
      : adminDb().collection("tickets").where("status", "in", ["paid", "confirmed"]);
    q = q.orderBy(FieldPath.documentId()).limit(limit);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    const tickets = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as DanTicket }))
      .filter(({ data }) => data.status === "paid" || data.status === "confirmed")
      .map(({ id, data }) => toCheckinTicket(id, data));

    const nextCursor = snap.size === limit ? snap.docs[snap.docs.length - 1].id : null;
    return NextResponse.json(
      { tickets, nextCursor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/checkin/tickets]", err);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }
}
