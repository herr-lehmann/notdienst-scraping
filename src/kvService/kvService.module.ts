import { Module, Logger } from "@nestjs/common";
import { KvServiceService } from "./kvService.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KvService } from "./kvService.entity";
import { ScrapeService } from "./scrape.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule
  ],
  providers: [
    KvServiceService,
    ScrapeService,
    Logger
  ],
  exports: [
    KvServiceService
  ]
})

export class KvServiceModule { }