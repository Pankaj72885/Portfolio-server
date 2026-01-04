import { Request, Response, Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// Validation schema
const experienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z
    .string()
    .optional()
    .transform((str) => (str ? new Date(str) : null)),
  description: z.string().min(1),
  current: z.boolean().optional(),
  order: z.number().optional(),
});

// GET /api/experience - Get all experiences (public)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const experiences = await prisma.experience.findMany({
      orderBy: [{ current: "desc" }, { startDate: "desc" }],
    });
    res.json({ experiences });
  } catch (error) {
    console.error("Get experiences error:", error);
    res.status(500).json({ error: "Failed to fetch experiences" });
  }
});

// GET /api/experience/:id - Get single experience (public)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const experience = await prisma.experience.findUnique({
      where: { id: req.params.id },
    });

    if (!experience) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }

    res.json({ experience });
  } catch (error) {
    console.error("Get experience error:", error);
    res.status(500).json({ error: "Failed to fetch experience" });
  }
});

// POST /api/experience - Create experience (admin only)
router.post(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = experienceSchema.parse(req.body);

      const experience = await prisma.experience.create({
        data,
      });

      res.status(201).json({ experience });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Create experience error:", error);
      res.status(500).json({ error: "Failed to create experience" });
    }
  }
);

// PUT /api/experience/:id - Update experience (admin only)
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = experienceSchema.partial().parse(req.body);

      const experience = await prisma.experience.update({
        where: { id: req.params.id },
        data,
      });

      res.json({ experience });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Update experience error:", error);
      res.status(500).json({ error: "Failed to update experience" });
    }
  }
);

// DELETE /api/experience/:id - Delete experience (admin only)
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      await prisma.experience.delete({
        where: { id: req.params.id },
      });

      res.json({ message: "Experience deleted successfully" });
    } catch (error) {
      console.error("Delete experience error:", error);
      res.status(500).json({ error: "Failed to delete experience" });
    }
  }
);

export default router;
