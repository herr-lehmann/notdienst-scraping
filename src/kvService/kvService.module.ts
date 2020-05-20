import { Module, Logger } from "@nestjs/common";
import { KvServiceService } from "./kvService.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KvService } from "./kvService.entity";
import { ScrapeService } from "./scrape.service";
import { ConfigModule } from "@nestjs/config";
import { MailerModule } from "@nestjs-modules/mailer";

@Module({
  imports: [
    TypeOrmModule.forFeature([KvService]),
    MailerModule
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