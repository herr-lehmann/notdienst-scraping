import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeService } from './scrape.service';
import { KvService, KvServiceStatus, KvServiceKind } from './kvService.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
    let currents = [];
    try {
      currents = await this.scraper.scrapeKvHamburg();
    } catch (e) {
      Logger.error('Aborted Scraping', e);
      return [];
    }
    const all = await this.findAll();

    const toBeDeleted: KvService[] = [];
    const toBeCreated: KvService[] = currents; // all new services are treated to created
    const toBeUpdated: KvService[] = [];

    // check all existing services
    all.forEach(service => {
      // check if any existing services are found in toBeCreated
      const newServiceIndex = toBeCreated.findIndex((s) => s.id === service.id);

      if (newServiceIndex !== -1) {
        // get the found service for reference
        const existingService = toBeCreated[newServiceIndex];

        // check if there were changes of properties
        if (!existingService.equals(service)) {
          toBeUpdated.push(existingService); // update the service only if there where changes
        }
        // because the service was found in exsting we remove it from the toBeCreated
        toBeCreated.splice(newServiceIndex, 1);
      } else {
        // if the services could not be found in the latest scrape, it needs to be removed
        toBeDeleted.push(service);
      }
    });

    Logger.debug('Deletes: ' + toBeDeleted.length);
    Logger.debug('Updates: ' + toBeUpdated.length);
    Logger.debug('Creates: ' + toBeCreated.length);

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
    return this.buildBaseQueryRelevantServices().getMany();
  }
  public async findRelevantChanged(): Promise<KvService[]> {
    return this.buildBaseQueryRelevantServices()
      .andWhere('kv_service._updated > CURRENT_TIMESTAMP - interval \'10 minutes\'')
      .getMany();
  }

  private buildBaseQueryRelevantServices(): SelectQueryBuilder<KvService> {
    return this.repo.createQueryBuilder('kv_service')
      .where('kv_service.status IN (:...status)', { status: [KvServiceStatus.OPEN] })
      .andWhere('kv_service.kind NOT IN (:...kind)', { kind: [KvServiceKind.BACKUP, KvServiceKind.LATE_NIGHT] });
  }

  /**
   * update
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  public async update() {
    try {
      await this.getCurrentServices();
      this.sendMail(await this.findRelevantChanged());
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
