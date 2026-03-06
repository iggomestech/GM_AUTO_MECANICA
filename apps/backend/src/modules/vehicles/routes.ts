import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";

const router = Router();

function normalizePlate(plate: string) {
  return plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

const schema = z.object({
  plate: z.string().min(6),
  model: z.string().min(2),
  brand: z.string().min(2),
  year: z.number().int().gte(1950).lte(2100),
  clientId: z.string().min(1)
});

router.get("/", async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" }
  });

  return res.json(vehicles);
});

router.get("/history/:plate", async (req, res) => {
  const normalizedPlate = normalizePlate(req.params.plate);

  const vehicle = await prisma.vehicle.findUnique({
    where: { plate: normalizedPlate },
    include: {
      client: true,
      workOrders: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!vehicle) {
    return res.status(404).json({ message: "Veiculo nao encontrado para a placa informada" });
  }

  return res.json(vehicle);
});

router.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ...parsed.data,
      plate: normalizePlate(parsed.data.plate)
    }
  });
  return res.status(201).json(vehicle);
});

export { router as vehicleRoutes };
