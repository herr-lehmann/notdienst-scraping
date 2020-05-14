import { Module, HttpModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { KvService } from './kvService/kvService.entity';
import { KvServiceModule } from './kvService/kvService.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        database: configService.get<string>('POSTGRES_DB'),
        entities: [KvService],
        synchronize: true,
        logging: "all"
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([KvService]),
    KvServiceModule
  ],
  providers: [
    Logger
  ],
  controllers: [AppController]
})
export class AppModule {
  constructor(private readonly connection: Connection) { }
}
