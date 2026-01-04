import { Request, Response, Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// Validation schema
const skillSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  proficiency: z.number().min(0).max(100),
  icon: z.string().optional(),
  order: z.number().optional(),
});

// GET /api/skills - Get all skills (public)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });
    res.json({ skills });
  } catch (error) {
    console.error("Get skills error:", error);
    res.status(500).json({ error: "Failed to fetch skills" });
  }
});

// GET /api/skills/:id - Get single skill (public)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
    });

    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }

    res.json({ skill });
  } catch (error) {
    console.error("Get skill error:", error);
    res.status(500).json({ error: "Failed to fetch skill" });
  }
});

// POST /api/skills - Create skill (admin only)
router.post(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = skillSchema.parse(req.body);

      const skill = await prisma.skill.create({
        data,
      });

      res.status(201).json({ skill });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Create skill error:", error);
      res.status(500).json({ error: "Failed to create skill" });
    }
  }
);

// PUT /api/skills/:id - Update skill (admin only)
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = skillSchema.partial().parse(req.body);

      const skill = await prisma.skill.update({
        where: { id: req.params.id },
        data,
      });

      res.json({ skill });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Update skill error:", error);
      res.status(500).json({ error: "Failed to update skill" });
    }
  }
);

// DELETE /api/skills/:id - Delete skill (admin only)
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      await prisma.skill.delete({
        where: { id: req.params.id },
      });

      res.json({ message: "Skill deleted successfully" });
    } catch (error) {
      console.error("Delete skill error:", error);
      res.status(500).json({ error: "Failed to delete skill" });
    }
  }
);

export default router;
