import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { generateToken } from "../../auth.js";

const router = Router();

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

const registerSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(2).max(30),
  password: z.string().min(6)
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  const exists = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (exists) {
    return res.status(409).json({ message: "Usuario ja cadastrado" });
  }

  const password = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      username: normalizedUsername,
      password
    }
  });

  return res.status(201).json({ token: generateToken(user.id) });
});

const loginSchema = z.object({
  username: z.string().min(2).max(30),
  password: z.string().min(6)
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (!user) {
    return res.status(401).json({ message: "Credenciais invalidas" });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.password);
  if (!valid) {
    return res.status(401).json({ message: "Credenciais invalidas" });
  }

  return res.json({ token: generateToken(user.id) });
});

export { router as authRoutes };
