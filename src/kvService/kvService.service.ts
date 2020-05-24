import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeService } from './scrape.service';
import { KvService, KvServiceStatus } from './kvService.entity';
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
    return this.repo.find({
      order: { start_db: 'ASC' },
      where: [
        { status: KvServiceStatus.TRADE_OPEN },
        { status: KvServiceStatus.OPEN }
      ]
    });
  }

  /**
   * update
   */
  @Cron(CronExpression.EVERY_QUARTER)
  public async update() {
    await this.getCurrentServices();
    await this.sendMail();

  }

  public async sendMail() {
    const services = await this.findAll();

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
