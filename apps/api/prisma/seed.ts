import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL } },
});

const questionnaireDefinition = {
  code: 'PRODUCT_INTAKE', schemaVersion: 1,
  sections: [
    { key: 'product', title: 'Produto', fields: ['name', 'brand', 'categoryId', 'unitOfMeasure', 'packageContent', 'salePrice', 'automaticPromotionEligible'] },
    { key: 'batch', title: 'Lote', fields: ['expiryDate', 'batchNumber', 'quantity', 'locationId', 'entryDate', 'unitCost', 'observation'] },
  ],
};
const checksum = createHash('sha256').update(JSON.stringify(questionnaireDefinition)).digest('hex');

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
  const user = await prisma.user.upsert({
    where: { authSubject: process.env.DEV_AUTH_SUBJECT ?? 'dev-user-geovanni' },
    update: { displayName: 'Geovanni (desenvolvimento)', status: 'ACTIVE' },
    create: { authSubject: process.env.DEV_AUTH_SUBJECT ?? 'dev-user-geovanni', displayName: 'Geovanni (desenvolvimento)' },
  });
  const company = await prisma.company.upsert({
    where: { id: '10000000-0000-4000-8000-000000000001' }, update: {},
    create: { id: '10000000-0000-4000-8000-000000000001', legalName: 'ValidaGiro Piloto LTDA', displayName: 'Empresa piloto' },
  });
  const store = await prisma.store.upsert({
    where: { id: '20000000-0000-4000-8000-000000000001' }, update: {},
    create: { id: '20000000-0000-4000-8000-000000000001', companyId: company.id, name: 'Loja 01', timezone: 'America/Fortaleza' },
  });
  await prisma.membership.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } }, update: { role: 'COMPANY_ADMIN', allStores: true, status: 'ACTIVE' },
    create: { companyId: company.id, userId: user.id, role: 'COMPANY_ADMIN', allStores: true },
  });
  await prisma.category.upsert({
    where: { id: '30000000-0000-4000-8000-000000000001' }, update: {},
    create: { id: '30000000-0000-4000-8000-000000000001', companyId: company.id, name: 'Mercearia' },
  });
  await prisma.location.upsert({
    where: { id: '40000000-0000-4000-8000-000000000001' }, update: {},
    create: { id: '40000000-0000-4000-8000-000000000001', companyId: company.id, storeId: store.id, code: 'EST-01', name: 'Estoque principal' },
  });
  const questionnaire = await prisma.questionnaireVersion.findUnique({ where: { code_version: { code: 'PRODUCT_INTAKE', version: 1 } } });
  if (!questionnaire) {
    await prisma.questionnaireVersion.create({
      data: { code: 'PRODUCT_INTAKE', version: 1, schemaVersion: 1, definition: questionnaireDefinition, checksum, status: 'PUBLISHED', publishedAt: new Date() },
    });
  }
  console.info(JSON.stringify({ userSubject: user.authSubject, companyId: company.id, storeId: store.id, categoryId: '30000000-0000-4000-8000-000000000001', locationId: '40000000-0000-4000-8000-000000000001' }, null, 2));
}

main().finally(() => prisma.$disconnect());
