import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";

const router = Router();

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  street: z.string().min(3),
  number: z.string().min(1),
  neighborhood: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
  zipCode: z.string().min(8),
  complement: z.string().optional(),
  email: z.string().email().optional()
});

router.get("/", async (_req, res) => {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } });
  return res.json(clients);
});

router.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const data = {
    ...parsed.data,
    state: parsed.data.state.toUpperCase(),
    zipCode: parsed.data.zipCode,
    complement: parsed.data.complement ?? "",
    address: `${parsed.data.street}, ${parsed.data.number}`
  };

  const client = await prisma.client.create({ data });
  return res.status(201).json(client);
});

export { router as clientRoutes };
