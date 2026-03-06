import "dotenv/config";
import bcrypt from "bcryptjs";
import { app } from "./app.js";
import { prisma } from "./prisma.js";

const port = Number(process.env.PORT || 3001);

async function ensureDefaultUsers() {
  const defaultPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { name: "Administrador", password: defaultPassword },
    create: { name: "Administrador", username: "admin", password: defaultPassword }
  });

  await prisma.user.upsert({
    where: { username: "gm" },
    update: { name: "Usuario GM", password: defaultPassword },
    create: { name: "Usuario GM", username: "gm", password: defaultPassword }
  });
}

async function startServer() {
  await ensureDefaultUsers();

  app.listen(port, () => {
    console.log(`Backend online em http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Falha ao iniciar backend:", error);
  process.exit(1);
});
