import serverlessExpress from "@codegenie/serverless-express";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

let cachedHandler: ReturnType<typeof serverlessExpress> | undefined;

async function bootstrap() {
  if (!cachedHandler) {
    const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
    app.enableCors({ origin: process.env.WEB_ORIGIN ?? false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    cachedHandler = serverlessExpress({ app: app.getHttpAdapter().getInstance() });
  }
  return cachedHandler;
}

export async function handler(event: unknown, context: unknown, callback: unknown) {
  const server = await bootstrap();
  return server(event, context, callback);
}
