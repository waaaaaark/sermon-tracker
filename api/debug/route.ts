import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  // Test the connection directly
  let testResult = null;
  let testError = null;
  if (url && token) {
    try {
      const res = await fetch(`${url}/set/debug-test/hello`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      testResult = await res.json();
    } catch (e) {
      testError = String(e);
    }
  }

  return NextResponse.json({
    hasUrl: !!url,
    hasToken: !!token,
    urlPrefix: url ? url.slice(0, 30) + "..." : null,
    testResult,
    testError,
  });
}