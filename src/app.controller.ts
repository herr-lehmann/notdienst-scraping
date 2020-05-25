import { Controller, Get, Render, Logger, Res, Query, Post } from '@nestjs/common';
import { Response } from 'express';
import { KvServiceService } from './kvService/kvService.service';
import { ConfigService } from '@nestjs/config';

@Controller('notdienste')
export class AppController {
  constructor(
    private readonly kvService: KvServiceService,
  ) { }

  @Post('update')
  async triggerScraping(@Res() res: Response, @Query('no-mail') sendNoMail: string) {
    this.kvService.getCurrentServices()
      .then(async () => {
        if (sendNoMail === undefined) {
          this.kvService.sendMail(await this.kvService.findRelevant());
        }
      })
      .catch((e) => Logger.error(e));
    return res.sendStatus(202);
  }

  @Get('render')
  @Render('index')
  async listServices() {
    const services = await this.kvService.findAll();
    return { services };
  }

  @Get('render/relevant')
  @Render('index')
  async listRelevantServices() {
    const services = await this.kvService.findRelevant();
    return { services };
  }
}
