import { Module, HttpModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KvServiceModule } from './kvService/kvService.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    KvServiceModule
  ],
  providers: [
    Logger
  ],
  controllers: [AppController]
})
export class AppModule {
  constructor() { }
}
