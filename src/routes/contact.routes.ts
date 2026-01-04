import { Request, Response, Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// Validation schema
const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().min(10),
});

// POST /api/contact - Submit contact form (public)
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = contactSchema.parse(req.body);

    const contact = await prisma.contact.create({
      data,
    });

    res.status(201).json({
      message: "Message sent successfully",
      id: contact.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error("Contact form error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET /api/contact - Get all messages (admin only)
router.get(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { unread } = req.query;

      const contacts = await prisma.contact.findMany({
        where: unread === "true" ? { read: false } : undefined,
        orderBy: { createdAt: "desc" },
      });

      res.json({ contacts });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);

// PUT /api/contact/:id/read - Mark as read (admin only)
router.put(
  "/:id/read",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const contact = await prisma.contact.update({
        where: { id: req.params.id },
        data: { read: true },
      });

      res.json({ contact });
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  }
);

// DELETE /api/contact/:id - Delete message (admin only)
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      await prisma.contact.delete({
        where: { id: req.params.id },
      });

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  }
);

export default router;
