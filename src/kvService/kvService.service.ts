import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeService } from './scrape.service';
import { KvService, KvServiceStatus, KvServiceKind } from './kvService.entity';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class KvServiceService {
  constructor(
    @InjectRepository(KvService)
    private readonly repo: Repository<KvService>,
    private readonly scraper: ScrapeService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService
  ) { }

  public async getCurrentServices(): Promise<KvService[]> {
    try {
      const services = await this.scraper.scrapeKvHamburg();
      return this.repo.save(services)
    } catch (e) {
      return Promise.reject(e)
    }

  }
  public async findAll(): Promise<KvService[]> {
    return this.repo.find();
  }

  public async findRelevant(): Promise<KvService[]>{
    return this.repo.createQueryBuilder('kv_service')
      .where('kv_service.status IN (:...status)', { status: [KvServiceStatus.OPEN] })
      .andWhere('kv_service.kind NOT IN (:...kind)', { kind: [KvServiceKind.BACKUP, KvServiceKind.LATE_NIGHT] })
      .andWhere("kv_service.updated > NOW() - interval '10 minutes'")
      .getMany()
  }

  /**
   * update
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  public async update() {
    await this.getCurrentServices();
    this.sendMail(await this.findRelevant())
  }

  public async sendMail(services: KvService[]) {
    if (services.length === 0) {
      Logger.warn('Did not send empty mail', 'KvService');
      return
    }
    let recipients = this.config.get('MAIL_RECEIVERS')
    if (this.config.get('MODE') === 'local') {
      recipients = 'henning@kuch.email'
    }

    return this.mailer.sendMail({
      to: recipients,
      subject: 'Aktuelle Notdienste 👨🏻‍⚕️',
      template: 'index',
      context: {
        services: services
      }
    })
  }

}
