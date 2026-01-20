/**
 * VARO POS - Configuración de Base de Datos
 * Cliente Prisma singleton
 */

const { PrismaClient } = require('@prisma/client');

// Crear instancia singleton de Prisma
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Middleware para soft delete automático
prisma.$use(async (params, next) => {
  // Filtrar registros eliminados en consultas find
  if (params.action === 'findUnique' || params.action === 'findFirst') {
    if (params.model && hasDeletedAt(params.model)) {
      params.action = 'findFirst';
      params.args.where = { ...params.args.where, deletedAt: null };
    }
  }
  
  if (params.action === 'findMany') {
    if (params.model && hasDeletedAt(params.model)) {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }
  }

  return next(params);
});

// Modelos con soft delete
const modelsWithDeletedAt = [
  'User', 'Branch', 'Category', 'Product', 'Supplier', 
  'Customer', 'Sale', 'Purchase', 'Promotion'
];

function hasDeletedAt(model) {
  return modelsWithDeletedAt.includes(model);
}

module.exports = prisma;
