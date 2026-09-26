const { prisma } = require('../database/connection');

const SettingModel = {
  /** Barcha sozlamalarni { key: value } ko'rinishida qaytaradi */
  async getAll() {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },

  /** Donaga savdo yoqilganmi (Admin panel → Sozlamalar). Sozlanmagan bo'lsa — yoqilgan */
  async isRetailEnabled() {
    const row = await prisma.setting.findUnique({ where: { key: 'retailEnabled' } });
    return !row || row.value !== 'false';
  },

  /** Bir nechta sozlamani birdan saqlaydi */
  setMany(values) {
    return prisma.$transaction(
      Object.entries(values).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );
  },
};

module.exports = SettingModel;
