import type { Request, Response, NextFunction } from "express";
import type { OutgoingHttpHeaders } from "http";

interface CachedResponse {
  statusCode: number;
  body: unknown;
  headers: OutgoingHttpHeaders;
}

const idempotencyStore = new Map<string, CachedResponse>();

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only inspect mutating operations
  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
    return next();
  }

  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
  if (!idempotencyKey) {
    return next();
  }

  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    res.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENT");
    res.status(cached.statusCode).json(cached.body);
    return;
  }

  // Intercept json response
  const originalJson = res.json.bind(res);
  res.json = (body: unknown): Response => {
    // Only cache successful or intentional responses
    if (res.statusCode < 500) {
      idempotencyStore.set(idempotencyKey, {
        statusCode: res.statusCode,
        body,
        headers: res.getHeaders(),
      });
    }
    return originalJson(body);
  };

  next();
}
