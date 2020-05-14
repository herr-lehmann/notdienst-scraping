import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  let port = process.env.PORT;
  if (port === "" || port === undefined) {
    port = "3000";
  }
  await app.listen(port);

}
bootstrap();
