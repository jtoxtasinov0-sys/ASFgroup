const { prisma } = require('../database/connection');

const OrderModel = {
  create(data) {
    return prisma.order.create({ data, include: { user: true } });
  },

  findAll({ status, paymentStatus } = {}) {
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (paymentStatus && paymentStatus !== 'all') where.paymentStatus = paymentStatus;
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

  /** Mijozning eng oxirgi kartaga to'lanmagan (yoki cheki rad etilgan) buyurtmasi */
  findLatestUnpaid(telegramId) {
    return prisma.order.findFirst({
      where: {
        user: { telegramId: String(telegramId) },
        paymentMethod: 'card',
        paymentStatus: { in: ['unpaid', 'rejected'] },
        status: { not: 'cancelled' },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  },

  update(id, data) {
    return prisma.order.update({
      where: { id: Number(id) },
      data,
      include: { user: true },
    });
  },

  /** Barcha buyurtmalarni o'chiradi va raqamlashni #1 dan qayta boshlaydi */
  async clearAll() {
    const withReceipts = await prisma.order.findMany({
      where: { receiptUrl: { not: null } },
      select: { receiptUrl: true },
    });
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "orders" RESTART IDENTITY');
    return withReceipts.map((o) => o.receiptUrl);
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
    const [total, newCount, delivered, pendingPayments, sumAgg] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'new' } }),
      prisma.order.count({ where: { status: 'delivered' } }),
      prisma.order.count({ where: { paymentStatus: 'pending' } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'cancelled' } },
      }),
    ]);
    return { total, newCount, delivered, pendingPayments, revenue: sumAgg._sum.total || 0 };
  },
};

module.exports = OrderModel;
