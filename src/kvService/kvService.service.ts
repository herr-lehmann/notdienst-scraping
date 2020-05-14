import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapeService } from './scrape.service';
import { KvService } from './kvService.entity';

@Injectable()
export class KvServiceService {
  constructor(
    @InjectRepository(KvService)
    private readonly kvServiceRepository: Repository<KvService>,
    private readonly scraper: ScrapeService
  ) { }

  /**
   * getAllServices
   */
  public async getAllServices(): Promise<KvService[]> {
    return this.kvServiceRepository.find()
  }

  public async refreshServices(): Promise<KvService[]>{
    return this.getCurrentServices();
  }
  
  public async getCurrentServices(): Promise<KvService[]> {
    return await this.scraper.scrapeKvHamburg();
  }

  /**
   * addService
   */
  public addService(service: KvService): void {
    this.kvServiceRepository.insert(service);
  }
}
