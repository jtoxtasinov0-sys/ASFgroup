const { prisma } = require('../database/connection');

const StoryModel = {
  findPublic() {
    return prisma.story.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  findAll() {
    return prisma.story.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] });
  },

  findById(id) {
    return prisma.story.findUnique({ where: { id: Number(id) } });
  },

  create(data) {
    return prisma.story.create({ data });
  },

  update(id, data) {
    return prisma.story.update({ where: { id: Number(id) }, data });
  },

  remove(id) {
    return prisma.story.delete({ where: { id: Number(id) } });
  },
};

module.exports = StoryModel;
