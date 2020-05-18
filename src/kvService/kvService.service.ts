import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeService } from './scrape.service';
import { KvService } from './kvService.entity';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

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
    const services = await this.scraper.scrapeKvHamburg();
    return this.repo.save(services)
  }
  public async findAll(): Promise<KvService[]> {
    return this.repo.find();
  }

  public async sendMail() {
    const services = await this.findAll();

    return this.mailer.sendMail({
      to: this.config.get('MAIL_RECEIVERS'), 
      subject: 'Aktuelle Notdienste 👨🏻‍⚕️', 
      template: 'index',
      context: {
        services: services
      }
    })
  }

}
