import { Controller, Get, Render, Logger } from '@nestjs/common';
import { KvServiceService } from './kvService/kvService.service';


@Controller('notdienste')
export class AppController {
  constructor(private readonly kvService: KvServiceService) { }

  @Get('update')
  async getCurrentServices() {
    try {
      await this.kvService.getCurrentServices();
      this.kvService.sendMail()
    } catch (e) {
      Logger.error("Update failed." + e)
    }
  }
}
