import express from "express";
import cors from "cors";
import { authRoutes } from "./modules/auth/routes.js";
import { clientRoutes } from "./modules/clients/routes.js";
import { vehicleRoutes } from "./modules/vehicles/routes.js";
import { workOrderRoutes } from "./modules/work-orders/routes.js";
import { requireAuth } from "./auth.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/clients", requireAuth, clientRoutes);
app.use("/vehicles", requireAuth, vehicleRoutes);
app.use("/work-orders", requireAuth, workOrderRoutes);
