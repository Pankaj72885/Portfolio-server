import { NextFunction, Request, Response } from "express";
import { auth } from "../config/firebase";
import prisma from "../config/prisma";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: "ADMIN" | "USER";
        id: string;
      };
    }
  }
}

// Verify Firebase token and attach user to request
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Find or sync user in database
    // Find or sync user in database
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      // Check if user exists by email (to link existing admin/seeded accounts)
      if (decodedToken.email) {
        user = await prisma.user.findUnique({
          where: { email: decodedToken.email },
        });

        if (user) {
          // Link the existing user to this Firebase UID
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              firebaseUid: decodedToken.uid,
              photoUrl: user.photoUrl || decodedToken.picture,
              name: user.name || decodedToken.name,
            },
          });
        }
      }

      // If still no user, create new one
      if (!user) {
        user = await prisma.user.create({
          data: {
            firebaseUid: decodedToken.uid,
            email: decodedToken.email || "",
            name: decodedToken.name || null,
            photoUrl: decodedToken.picture || null,
          },
        });
      }
    }

    req.user = {
      uid: decodedToken.uid,
      email: user.email,
      role: user.role,
      id: user.id,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Check if user is admin
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (user) {
      req.user = {
        uid: decodedToken.uid,
        email: user.email,
        role: user.role,
        id: user.id,
      };
    }

    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
};
