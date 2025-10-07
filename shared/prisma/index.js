import { PrismaClient } from '../generated/prisma-client/index.js';
const prisma = new PrismaClient({
  engine: 'wasm', // 强制使用 WASM 引擎
});

export { prisma };