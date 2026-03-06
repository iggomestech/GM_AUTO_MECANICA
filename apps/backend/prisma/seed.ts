import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      name: "Administrador",
      password: defaultPassword
    },
    create: {
      name: "Administrador",
      username: "admin",
      password: defaultPassword
    }
  });

  await prisma.user.upsert({
    where: { username: "GM" },
    update: {
      name: "Usuario GM",
      password: defaultPassword
    },
    create: {
      name: "Usuario GM",
      username: "GM",
      password: defaultPassword
    }
  });

  await prisma.workOrder.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();

  const joao = await prisma.client.create({
    data: {
      name: "Joao Silva",
      phone: "11991234567",
      street: "Rua das Oficinas",
      number: "120",
      neighborhood: "Centro",
      address: "Rua das Oficinas, 120 - Centro",
      zipCode: "01001000",
      city: "Sao Paulo",
      state: "SP",
      complement: "",
      email: "joao.silva@email.com"
    }
  });

  const maria = await prisma.client.create({
    data: {
      name: "Maria Souza",
      phone: "11999887766",
      street: "Av. Principal",
      number: "845",
      neighborhood: "Jardim Sul",
      address: "Av. Principal, 845 - Jardim Sul",
      zipCode: "04707000",
      city: "Sao Paulo",
      state: "SP",
      complement: "",
      email: "maria.souza@email.com"
    }
  });

  const carroJoao = await prisma.vehicle.create({
    data: {
      plate: "ABC1234",
      model: "Civic",
      brand: "Honda",
      year: 2018,
      clientId: joao.id
    }
  });

  const carroMaria = await prisma.vehicle.create({
    data: {
      plate: "BRA2E19",
      model: "Onix",
      brand: "Chevrolet",
      year: 2021,
      clientId: maria.id
    }
  });

  await prisma.workOrder.createMany({
    data: [
      {
        serviceType: "TROCA_OLEO",
        description: "Troca de oleo e filtro",
        status: "DONE",
        totalCents: 22000,
        expectedEnd: new Date("2026-01-10T17:00:00.000Z"),
        vehicleId: carroJoao.id
      },
      {
        serviceType: "OUTROS",
        description: "Alinhamento e balanceamento",
        status: "DONE",
        totalCents: 18000,
        expectedEnd: new Date("2026-01-14T17:00:00.000Z"),
        vehicleId: carroJoao.id
      },
      {
        serviceType: "REVISAO_GERAL",
        description: "Revisao de freios",
        status: "IN_PROGRESS",
        totalCents: 35000,
        expectedEnd: new Date("2026-01-20T17:00:00.000Z"),
        vehicleId: carroMaria.id
      }
    ]
  });

  console.log("Seed concluido com sucesso.");
  console.log("Usuarios: admin / 123456 e GM / 123456");
  console.log("Placas de exemplo: ABC1234, BRA2E19");
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
