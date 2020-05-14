import { Controller, Get, Render } from '@nestjs/common';
import { KvServiceService } from './kvService/kvService.service';
import { KvService } from './kvService/kvService.entity';

@Controller('notdienste')
export class AppController {
  constructor(private readonly kvService: KvServiceService) { }

  @Get()
  async getAll(): Promise<KvService[]> {
    return await this.kvService.getAllServices();
  }

  @Get('update')
  async getCurrentServices() {
    // const services = await this.kvService.getCurrentServices();
    const test = KvService.parse(["id", "startDate", "startTime", "endDate", "endTime", "kind", "status", "owner"], "region")
    this.kvService.addService(test);
    return JSON.stringify(test, null, 2)
  }
}
