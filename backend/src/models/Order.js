const { prisma } = require('../database/connection');

const OrderModel = {
  create(data) {
    return prisma.order.create({ data, include: { user: true } });
  },

  findAll({ status } = {}) {
    const where = {};
    if (status && status !== 'all') where.status = status;
    return prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  },

  findById(id) {
    return prisma.order.findUnique({ where: { id: Number(id) }, include: { user: true } });
  },

  findByTelegramId(telegramId) {
    return prisma.order.findMany({
      where: { user: { telegramId: String(telegramId) } },
      orderBy: { createdAt: 'desc' },
    });
  },

  updateStatus(id, status) {
    return prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: { user: true },
    });
  },

  remove(id) {
    return prisma.order.delete({ where: { id: Number(id) } });
  },

  async stats() {
    const [total, newCount, delivered, sumAgg] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'new' } }),
      prisma.order.count({ where: { status: 'delivered' } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'cancelled' } },
      }),
    ]);
    return { total, newCount, delivered, revenue: sumAgg._sum.total || 0 };
  },
};

module.exports = OrderModel;
