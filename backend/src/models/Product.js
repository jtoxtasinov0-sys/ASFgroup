const { prisma } = require('../database/connection');

const ProductModel = {
  /** Mini App uchun — faqat faol mahsulotlar */
  findPublic({ category, tag, search } = {}) {
    const where = { isActive: true };
    if (category && category !== 'all') where.category = category;
    if (tag && tag !== 'all') where.tag = tag;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameRu: { contains: search, mode: 'insensitive' } },
        { article: { contains: search, mode: 'insensitive' } },
      ];
    }
    return prisma.product.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  findById(id) {
    return prisma.product.findUnique({ where: { id: Number(id) } });
  },

  findManyByIds(ids) {
    return prisma.product.findMany({ where: { id: { in: ids.map(Number) } } });
  },

  /** Admin uchun — barchasi */
  findAll() {
    return prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] });
  },

  create(data) {
    return prisma.product.create({ data });
  },

  update(id, data) {
    return prisma.product.update({ where: { id: Number(id) }, data });
  },

  remove(id) {
    return prisma.product.delete({ where: { id: Number(id) } });
  },

  count() {
    return prisma.product.count();
  },
};

module.exports = ProductModel;
