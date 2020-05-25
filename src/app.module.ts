import { Module, HttpModule, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KvServiceModule } from './kvService/kvService.module';
import { AppController } from './app.controller';
import { Connection } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './myconfig/typeormconfig.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerConfigService } from './myconfig/mailerconfig.service';
import { MyConfigModule } from './myconfig/myconfig.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KvServiceModule,
    TypeOrmModule.forRootAsync({
      imports: [MyConfigModule],
      useExisting: TypeOrmConfigService,
    }),
    MailerModule.forRootAsync({
      imports: [MyConfigModule],
      useExisting: MailerConfigService,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [Logger],
  controllers: [AppController],
})
export class AppModule {
  constructor(private connection: Connection) { }
}
