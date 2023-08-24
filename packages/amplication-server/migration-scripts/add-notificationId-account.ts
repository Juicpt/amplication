import { PrismaClient } from "../src/prisma";
import cuid from "cuid";

async function main() {
  const client = new PrismaClient();
  await client.account.updateMany({
    data: {
      notificationId: cuid(),
    },
  });
  await client.$disconnect();
}

main().catch(console.error);
