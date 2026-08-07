import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_AUTH_ENABLED === 'true') {
    throw new Error('DEV_AUTH_ENABLED must never be enabled in production');
  }
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(express.json({ limit: '64kb' }));
  app.setGlobalPrefix('v1', { exclude: ['health/live', 'health/ready'] });
  const origins = (process.env.CORS_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  if (origins.length > 0) app.enableCors({ origin: origins });
  const openApi = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('ValidaGiro API').setVersion('1.0').addServer('/').addBearerAuth().build());
  SwaggerModule.setup('docs', app, openApi);
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

void bootstrap();
