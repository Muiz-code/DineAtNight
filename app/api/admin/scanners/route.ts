import { NextRequest, NextResponse } from "next/server";
import { adminNameFor, getAdminEmail } from "@/lib/session";
import { createScanner, getCheckinProgress, issueNewCode, listScanners, revokeScanner } from "@/lib/scanners";

/**
 * GET /api/admin/scanners — every scanner account (and admins who have
 * scanned) with counts, plus check-in progress for the upcoming event.
 */
export async function GET(req: NextRequest) {
  if (!(await getAdminEmail(req))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const [scanners, progress] = await Promise.all([
    listScanners(),
    // Progress is a nice-to-have — never let it break the accounts list
    getCheckinProgress().catch((err) => {
      console.error("[admin/scanners] check-in progress failed:", err);
      return null;
    }),
  ]);
  return NextResponse.json({ scanners, progress });
}

/**
 * POST /api/admin/scanners
 *   { action: "create", name }   → { id, code }
 *   { action: "new-code", id }   → { code }   (signs the old session out)
 *   { action: "revoke", id }     → { ok }
 * Codes are returned only here, once — they're stored hashed.
 */
export async function POST(req: NextRequest) {
  const adminEmail = await getAdminEmail(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";

  switch (body.action) {
    case "create": {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
      if (name.length < 2) {
        return NextResponse.json({ error: "Enter the person's name." }, { status: 400 });
      }
      return NextResponse.json(await createScanner(name, adminNameFor(adminEmail) ?? adminEmail));
    }
    case "new-code": {
      const result = await issueNewCode(id);
      if (!result) return NextResponse.json({ error: "Scanner not found." }, { status: 404 });
      return NextResponse.json(result);
    }
    case "revoke": {
      if (!(await revokeScanner(id))) {
        return NextResponse.json({ error: "Scanner not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
