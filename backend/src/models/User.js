const { prisma } = require('../database/connection');

const UserModel = {
  /** Telegram foydalanuvchisini topadi yoki yaratadi */
  async findOrCreate(tgUser) {
    const telegramId = String(tgUser.id);
    const existing = await prisma.user.findUnique({ where: { telegramId } });

    if (existing) {
      return prisma.user.update({
        where: { telegramId },
        data: {
          firstName: tgUser.first_name ?? existing.firstName,
          lastName: tgUser.last_name ?? existing.lastName,
          username: tgUser.username ?? existing.username,
        },
      });
    }

    return prisma.user.create({
      data: {
        telegramId,
        firstName: tgUser.first_name || null,
        lastName: tgUser.last_name || null,
        username: tgUser.username || null,
        lang: tgUser.language_code === 'ru' ? 'ru' : 'uz',
      },
    });
  },

  findByTelegramId(telegramId) {
    return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  },

  update(telegramId, data) {
    return prisma.user.update({ where: { telegramId: String(telegramId) }, data });
  },

  count() {
    return prisma.user.count();
  },

  list() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
  },
};

module.exports = UserModel;
