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
    private readonly config: ConfigService,
  ) { }

  public async getCurrentServices(): Promise<KvService[]> {
    const currents = await this.scraper.scrapeKvHamburg();
    const all = await this.repo.find({ select: ['id'] });

    const toBeDeleted = [];
    const toBeCreated = currents; // all new services are treated to created
    const toBeUpdated = [];

    // check all existing services
    all.forEach(service => {
      // check if any existing services are found in toBeCreated
      const existingServiceIndex = toBeCreated.findIndex((s) => s.id === service.id);

      if (existingServiceIndex !== -1) {
        // get the found service for reference
        const existingService = toBeCreated[existingServiceIndex];

        // check if there were changes of properties
        if (!existingService.equals(service)) {
          toBeUpdated.push(service); // update the service only if there where changes
        }
        // because the service was found in exsting we remove it from the toBeCreated
        toBeCreated.splice(existingServiceIndex, 1);
      } else {
        // if the services could not be found in the latest scrape, it needs to be removed
        toBeDeleted.push(service);
      }
    });

    return Promise.all([
      this.repo.remove(toBeDeleted),
      this.repo.save(toBeCreated.concat(toBeUpdated)), // save and update is the same call
    ])
      .then(() => currents);
  }

  public async findAll(): Promise<KvService[]> {
    const result = await this.repo.find();
    return KvService.sortByStartDate(result);
  }

  public async findRelevant(): Promise<KvService[]> {
    return this.repo.createQueryBuilder('kv_service')
      .where('kv_service.status IN (:...status)', { status: [KvServiceStatus.OPEN] })
      .andWhere('kv_service.kind NOT IN (:...kind)', { kind: [KvServiceKind.BACKUP, KvServiceKind.LATE_NIGHT] })
      .getMany();
  }

  /**
   * update
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  public async update() {
    try {
      await this.getCurrentServices();
      this.sendMail(await this.findRelevant());
    } catch (e) {
      Logger.error('Error during scraping', e, 'KvService');
    }
  }

  public async sendMail(services: KvService[]) {
    if (services.length === 0) {
      Logger.warn('Did not send empty mail', 'KvService');
      return;
    }
    let recipients = this.config.get('MAIL_RECEIVERS');
    if (this.config.get('MODE') === 'local') {
      recipients = 'henning@kuch.email';
    }

    return this.mailer.sendMail({
      to: recipients,
      subject: 'Aktuelle Notdienste 👨🏻‍⚕️',
      template: 'index',
      context: {
        services,
      },
    });
  }

}
