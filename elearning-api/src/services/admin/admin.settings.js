const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getSetting = async (key, defaultValue = '[]') => {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  if (!setting) return JSON.parse(defaultValue);
  try {
    return JSON.parse(setting.value);
  } catch (err) {
    return JSON.parse(defaultValue);
  }
};

const updateSetting = async (key, items) => {
  const valueStr = JSON.stringify(items);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: valueStr },
    create: { key, value: valueStr }
  });
  return items;
};

module.exports = {
  getSetting,
  updateSetting
};
