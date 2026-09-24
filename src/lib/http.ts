import { clientIp, rateLimit } from "./rate-limit";

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

export function pageQuery(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || 20) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function limited(request: Request, bucket: string) {
  const ip = clientIp(request.headers.get("x-forwarded-for"));
  if (!rateLimit(`${bucket}:${ip}`, 180, 60 * 1000)) {
    return json({ error: "rate_limited" }, 429);
  }
  return null;
}
