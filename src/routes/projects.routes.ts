import { Request, Response, Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// Validation schema
const projectSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  image: z.string().optional(),
  technologies: z.array(z.string()),
  description: z.string().min(1),
  liveLink: z.string().url().optional().or(z.literal("")),
  repoLink: z.string().url().optional().or(z.literal("")),
  challenges: z.string().optional(),
  improvements: z.string().optional(),
  featured: z.boolean().optional(),
  order: z.number().optional(),
});

// GET /api/projects - Get all projects (public)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { featured } = req.query;

    const projects = await prisma.project.findMany({
      where: featured === "true" ? { featured: true } : undefined,
      orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    });

    res.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/:slug - Get single project by slug (public)
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: req.params.slug },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// POST /api/projects - Create project (admin only)
router.post(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = projectSchema.parse(req.body);

      const project = await prisma.project.create({
        data: {
          ...data,
          liveLink: data.liveLink || null,
          repoLink: data.repoLink || null,
        },
      });

      res.status(201).json({ project });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Create project error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  }
);

// PUT /api/projects/:id - Update project (admin only)
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = projectSchema.partial().parse(req.body);

      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          ...data,
          liveLink: data.liveLink || null,
          repoLink: data.repoLink || null,
        },
      });

      res.json({ project });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Update project error:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  }
);

// DELETE /api/projects/:id - Delete project (admin only)
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      await prisma.project.delete({
        where: { id: req.params.id },
      });

      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  }
);

export default router;
