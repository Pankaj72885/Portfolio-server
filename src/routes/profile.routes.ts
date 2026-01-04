import { Request, Response, Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// Validation schema
const profileSchema = z.object({
  name: z.string().min(1),
  designation: z.string().min(1),
  bio: z.string().min(1),
  resumeUrl: z.string().url().optional().or(z.literal("")),
  socialLinks: z
    .object({
      github: z.string().optional(),
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      facebook: z.string().optional(),
      youtube: z.string().optional(),
    })
    .optional(),
  phone: z.string().optional(),
  email: z.string().email(),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

// GET /api/profile - Get profile (public)
router.get("/", async (_req: Request, res: Response) => {
  try {
    // Get first (and only) profile
    const profile = await prisma.profile.findFirst();

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// POST /api/profile - Create profile (admin only, if none exists)
router.post(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Check if profile already exists
      const existing = await prisma.profile.findFirst();
      if (existing) {
        res
          .status(400)
          .json({ error: "Profile already exists. Use PUT to update." });
        return;
      }

      const data = profileSchema.parse(req.body);

      const profile = await prisma.profile.create({
        data: {
          ...data,
          resumeUrl: data.resumeUrl || null,
          photoUrl: data.photoUrl || null,
        },
      });

      res.status(201).json({ profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Create profile error:", error);
      res.status(500).json({ error: "Failed to create profile" });
    }
  }
);

// PUT /api/profile - Update profile (admin only)
router.put(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const existing = await prisma.profile.findFirst();
      if (!existing) {
        res.status(404).json({ error: "Profile not found. Create one first." });
        return;
      }

      const data = profileSchema.partial().parse(req.body);

      const profile = await prisma.profile.update({
        where: { id: existing.id },
        data: {
          ...data,
          resumeUrl: data.resumeUrl || null,
          photoUrl: data.photoUrl || null,
        },
      });

      res.json({ profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

export default router;
