import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function generate(): Promise<void> {
  process.env.DATABASE_URL ??= 'postgresql://invalid:invalid@localhost:5432/invalid';
  process.env.DIRECT_DATABASE_URL ??= process.env.DATABASE_URL;
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('v1', { exclude: ['health/live', 'health/ready'] });
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('ValidaGiro API').setVersion('1.0').addServer('/').addBearerAuth().build());
  writeFileSync(resolve(process.cwd(), '../../packages/contracts/openapi.json'), `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();
}

void generate();
