import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import * as exphbs from 'express-handlebars';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));

  // const helpers = {
  //   json: (ctx) => JSON.stringify(ctx, null, 2),
  // };
  // const hbs = exphbs.create({
  //   layoutsDir: join(__dirname, '..', 'views'),
  //   extname: 'hbs',
  //   defaultLayout: 'index',
  //   helpers: helpers,
  // });

  // app.engine('hbs', hbs.engine);
  // app.setViewEngine('hbs');

  let port = process.env.PORT;
  if (port === "" || port === undefined) {
    port = "3000";
  }
  await app.listen(port);

}
bootstrap();
