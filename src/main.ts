import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { AppModule } from "./app.module";
import { configureSwagger } from "./swagger";

const defaultPort = 3001;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  configureSwagger(app);

  console.log("PORT ==>", configService.get("PORT"));
  const configuredPort = Number(configService.get("PORT") ?? defaultPort);
  const port =
    Number.isFinite(configuredPort) && configuredPort > 0
      ? configuredPort
      : defaultPort;

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
