import { Controller, Get, Render, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { KvServiceService } from './kvService/kvService.service';
import { ConfigService } from '@nestjs/config';


@Controller('notdienste')
export class AppController {
  constructor(
    private readonly kvService: KvServiceService,
    private readonly config: ConfigService
  ) { }

  @Get('update')
  async getCurrentServices(@Res() res: Response) {
    try {
      const services = await this.kvService.getCurrentServices();
      if (this.config.get('MODE') === 'local') {
        return res.render('index', { services: services })
      } else {
        this.kvService.sendMail()
      }
    } catch (e) {
      Logger.error("Update failed." + e)
    }
  }
}
