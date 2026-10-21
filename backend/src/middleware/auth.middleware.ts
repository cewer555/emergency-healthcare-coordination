import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../types";
import { AppError } from "./error.middleware";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  hospitalId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Check Authorization header or x-user-* headers
  const authHeader = req.headers["authorization"];
  const xRole = req.headers["x-user-role"] as UserRole | undefined;
  const xUserId = req.headers["x-user-id"] as string | undefined;
  const xHospitalId = req.headers["x-hospital-id"] as string | undefined;

  let user: AuthenticatedUser | undefined;

  if (xRole) {
    user = {
      id: xUserId || "dev-user-001",
      role: xRole,
      hospitalId: xHospitalId,
    };
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    // Support simple Bearer <role> or Bearer <role>:<userId> or JSON token
    try {
      if (token.startsWith("{")) {
        const parsed = JSON.parse(token);
        user = {
          id: parsed.id || parsed.userId || "user-token",
          role: parsed.role,
          hospitalId: parsed.hospitalId,
        };
      } else if (token.includes(":")) {
        const [role, id, hospitalId] = token.split(":");
        user = {
          id: id || "token-user",
          role: role as UserRole,
          hospitalId,
        };
      } else {
        user = {
          id: "token-user",
          role: token as UserRole,
          hospitalId: xHospitalId,
        };
      }
    } catch {
      user = {
        id: "bearer-user",
        role: "PARAMEDIC",
      };
    }
  }

  req.user = user;
  next();
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Authentication is required to access this resource"
    );
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Authentication is required to access this resource"
      );
    }

    // SYSTEM_ADMIN and STATE_COMMAND_CENTER have broad operational privileges
    if (
      req.user.role === "SYSTEM_ADMIN" ||
      req.user.role === "STATE_COMMAND_CENTER"
    ) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        403,
        "UNAUTHORIZED",
        `Access denied. Required roles: ${allowedRoles.join(", ")}`
      );
    }

    next();
  };
}
