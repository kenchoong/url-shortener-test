import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stringify } from 'yaml';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Courtside Backend')
    .setDescription('Scaffolded URL shortener backend API.')
    .setVersion('0.1.0')
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function configureSwagger(app: INestApplication) {
  const document = createOpenApiDocument(app);

  SwaggerModule.setup('api-docs', app, document, {
    jsonDocumentUrl: 'api-docs/openapi.json',
  });
}

export async function writeOpenApiArtifacts(app: INestApplication) {
  const outputDir = resolve(process.cwd(), 'docs/api');
  const document = createOpenApiDocument(app);

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    resolve(outputDir, 'openapi.json'),
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8',
  );
  await writeFile(resolve(outputDir, 'openapi.yaml'), stringify(document), 'utf8');
}
