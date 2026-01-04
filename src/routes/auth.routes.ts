import { Request, Response, Router } from "express";
import prisma from "../config/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// POST /api/auth/sync - Sync Firebase user with database
router.post("/sync", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// GET /api/auth/me - Get current user
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// PUT /api/auth/profile - Update user profile
router.put("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { name, photoUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        photoUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        photoUrl: true,
        role: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
