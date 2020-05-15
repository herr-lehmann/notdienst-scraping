import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeService } from './scrape.service';
import { KvService } from './kvService.entity';

@Injectable()
export class KvServiceService {
  constructor(
    private readonly scraper: ScrapeService
  ) { }

  public async refreshServices(): Promise<KvService[]> {
    return this.getCurrentServices();
  }

  public async getCurrentServices(): Promise<KvService[]> {
    return await this.scraper.scrapeKvHamburg();
  }
}
