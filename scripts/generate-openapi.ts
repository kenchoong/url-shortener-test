import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { writeOpenApiArtifacts } from '../src/swagger';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  await writeOpenApiArtifacts(app);
  await app.close();
}

void generateOpenApi();
