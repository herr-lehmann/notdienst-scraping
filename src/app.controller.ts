import { Controller, Get, Render } from '@nestjs/common';
import { KvServiceService } from './kvService/kvService.service';
import { KvService } from './kvService/kvService.entity';


@Controller('notdienste')
export class AppController {
  constructor(private readonly kvService: KvServiceService) { }

  @Get('update')
  @Render('index')
  async getCurrentServices() {
    const services = await this.kvService.getCurrentServices();
    return {services: services}
  }
}
