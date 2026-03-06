import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";

const router = Router();

const serviceTypeEnum = z.enum([
  "TROCA_OLEO",
  "REVISAO_GERAL",
  "ALINHAMENTO_BALANCEAMENTO",
  "ESCAPAMENTO",
  "FREIOS",
  "SUSPENSAO",
  "EMBREAGEM",
  "AR_CONDICIONADO",
  "INJECAO_ELETRONICA",
  "ELETRICA",
  "TROCA_CORREIA_DENTADA",
  "PROBLEMA_MOTOR",
  "OUTROS"
]);

const schema = z.object({
  serviceType: serviceTypeEnum,
  description: z.string().min(3),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).default("OPEN"),
  totalCents: z.number().int().nonnegative(),
  expectedEnd: z.coerce.date().optional(),
  vehicleId: z.string().min(1)
});

const diagnosisSchema = z.object({
  diagnosis: z.string().min(3),
  partsType: z.string().min(2),
  partsCostCents: z.number().int().nonnegative(),
  laborCostCents: z.number().int().nonnegative(),
  markAsDone: z.boolean().optional().default(false)
});

function upsertDiagnosisSection(description: string, section: string) {
  const markerRegex = /\n\[DIAGNOSTICO\][\s\S]*$/;
  if (markerRegex.test(description)) {
    return description.replace(markerRegex, `\n${section}`);
  }
  return `${description}\n${section}`;
}

router.get("/", async (_req, res) => {
  const orders = await prisma.workOrder.findMany({
    include: {
      vehicle: {
        include: { client: true }
      }
    },
    orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }]
  });

  return res.json(orders);
});

router.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const order = await prisma.workOrder.create({ data: parsed.data });
  return res.status(201).json(order);
});

router.patch("/:id/close", async (req, res) => {
  const order = await prisma.workOrder.findUnique({ where: { id: req.params.id } });

  if (!order) {
    return res.status(404).json({ message: "Ordem de servico nao encontrada" });
  }

  const updated = await prisma.workOrder.update({
    where: { id: req.params.id },
    data: { status: "DONE" }
  });

  return res.json(updated);
});

router.patch("/:id/diagnosis", async (req, res) => {
  const parsed = diagnosisSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const order = await prisma.workOrder.findUnique({ where: { id: req.params.id } });
  if (!order) {
    return res.status(404).json({ message: "Ordem de servico nao encontrada" });
  }

  const totalCents = parsed.data.partsCostCents + parsed.data.laborCostCents;
  const section = [
    "[DIAGNOSTICO]",
    `Analise e diagnostico da oficina: ${parsed.data.diagnosis}`,
    `Peca: ${parsed.data.partsType}`,
    `Valor peca: R$ ${(parsed.data.partsCostCents / 100).toFixed(2)}`,
    `Mao de obra: R$ ${(parsed.data.laborCostCents / 100).toFixed(2)}`,
    `Valor final: R$ ${(totalCents / 100).toFixed(2)}`,
    `Atualizado em: ${new Date().toLocaleDateString("pt-BR")}`
  ].join("\n");

  const updated = await prisma.workOrder.update({
    where: { id: req.params.id },
    data: {
      description: upsertDiagnosisSection(order.description, section),
      totalCents,
      status: parsed.data.markAsDone ? "DONE" : "IN_PROGRESS"
    }
  });

  return res.json(updated);
});

export { router as workOrderRoutes };
