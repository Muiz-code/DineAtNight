import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  // Debug log for env variables (remove in production)
  console.log("IG_ACCESS_TOKEN:", token);
  console.log("IG_USER_ID:", userId);

  if (!token || !userId) {
    return NextResponse.json({ error: "Missing IG env vars" }, { status: 500 });
  }

  // IG API call temporarily disabled until valid token is available
  // try {
  //   const res = await fetch(
  //     `https://graph.facebook.com/v19.0/${userId}?fields=followers_count&access_token=${token}`,
  //     { next: { revalidate: 300 } } // 5 min cache to avoid rate limits
  //   );
  //
  //   if (!res.ok) {
  //     const body = await res.text();
  //     console.error("IG API error", res.status, body);
  //     return NextResponse.json({ error: "IG API error" }, { status: res.status });
  //   }
  //
  //   const data = await res.json();
  //   return NextResponse.json({ followers: data.followers_count ?? null });
  // } catch (err) {
  //   console.error("IG fetch failed", err);
  //   return NextResponse.json({ error: "Server error" }, { status: 500 });
  // }
  return NextResponse.json({
    followers: null,
    message: "IG API temporarily disabled. Awaiting valid token.",
  });
}
