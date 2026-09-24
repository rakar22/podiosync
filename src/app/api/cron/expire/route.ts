import { runMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runMaintenance();
  return Response.json({ ok: true, ...result });
}

export function POST(request: Request) {
  return run(request);
}

export function GET(request: Request) {
  return run(request);
}
