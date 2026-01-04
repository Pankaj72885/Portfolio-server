import { Request, Response, Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { authenticate, optionalAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Validation schemas
const blogPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  coverImage: z.string().url().optional().or(z.literal("")),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  readTime: z.number().optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
});

// Helper: Calculate read time
const calculateReadTime = (content: string): number => {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

// GET /api/blog - Get all published posts (public)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { tag, limit } = req.query;

    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        ...(tag ? { tags: { has: tag as string } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit as string) : undefined,
      include: {
        _count: { select: { likes: true, comments: true } },
      },
    });

    res.json({ posts });
  } catch (error) {
    console.error("Get blog posts error:", error);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

// GET /api/blog/admin - Get all posts including drafts (admin)
router.get(
  "/admin",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const posts = await prisma.blogPost.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { likes: true, comments: true } },
        },
      });

      res.json({ posts });
    } catch (error) {
      console.error("Get admin blog posts error:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  }
);

// GET /api/blog/:slug - Get single post by slug (public)
router.get("/:slug", optionalAuth, async (req: Request, res: Response) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: {
        comments: {
          include: {
            user: {
              select: { id: true, name: true, photoUrl: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { likes: true } },
      },
    });

    if (!post || (!post.published && req.user?.role !== "ADMIN")) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    // Check if current user liked the post
    let userLiked = false;
    if (req.user) {
      const like = await prisma.like.findUnique({
        where: {
          userId_postId: { userId: req.user.id, postId: post.id },
        },
      });
      userLiked = !!like;
    }

    res.json({ post, userLiked });
  } catch (error) {
    console.error("Get blog post error:", error);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

// POST /api/blog - Create post (admin only)
router.post(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = blogPostSchema.parse(req.body);

      const post = await prisma.blogPost.create({
        data: {
          ...data,
          authorId: req.user!.id,
          readTime: data.readTime || calculateReadTime(data.content),
          coverImage: data.coverImage || null,
        },
      });

      res.status(201).json({ post });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Create blog post error:", error);
      res.status(500).json({ error: "Failed to create blog post" });
    }
  }
);

// PUT /api/blog/:id - Update post (admin only)
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const data = blogPostSchema.partial().parse(req.body);

      const post = await prisma.blogPost.update({
        where: { id: req.params.id },
        data: {
          ...data,
          readTime: data.content ? calculateReadTime(data.content) : undefined,
          coverImage: data.coverImage || null,
        },
      });

      res.json({ post });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Update blog post error:", error);
      res.status(500).json({ error: "Failed to update blog post" });
    }
  }
);

// DELETE /api/blog/:id - Delete post (admin only)
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      await prisma.blogPost.delete({
        where: { id: req.params.id },
      });

      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      console.error("Delete blog post error:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  }
);

// POST /api/blog/:id/like - Toggle like (authenticated)
router.post("/:id/like", authenticate, async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.user!.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      res.json({ liked: false });
    } else {
      // Like
      await prisma.like.create({
        data: { userId, postId },
      });
      res.json({ liked: true });
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// POST /api/blog/:id/comments - Add comment (authenticated)
router.post(
  "/:id/comments",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const data = commentSchema.parse(req.body);

      const comment = await prisma.comment.create({
        data: {
          content: data.content,
          userId: req.user!.id,
          postId: req.params.id,
        },
        include: {
          user: {
            select: { id: true, name: true, photoUrl: true },
          },
        },
      });

      res.status(201).json({ comment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Create comment error:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  }
);

// DELETE /api/blog/:postId/comments/:commentId - Delete comment (admin or owner)
router.delete(
  "/:postId/comments/:commentId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: req.params.commentId },
      });

      if (!comment) {
        res.status(404).json({ error: "Comment not found" });
        return;
      }

      // Only admin or comment owner can delete
      if (comment.userId !== req.user!.id && req.user!.role !== "ADMIN") {
        res
          .status(403)
          .json({ error: "Not authorized to delete this comment" });
        return;
      }

      await prisma.comment.delete({
        where: { id: req.params.commentId },
      });

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);

export default router;
