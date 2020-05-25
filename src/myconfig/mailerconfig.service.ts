import { Injectable } from '@nestjs/common';
import { MailerOptionsFactory, MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerConfigService implements MailerOptionsFactory {
  constructor(private readonly config: ConfigService) { }
  createMailerOptions(): MailerOptions {
    const login = this.config.get<string>('MAIL_USERNAME');
    const domain = this.config.get<string>('MAIL_DOMAIN');
    const pass = this.config.get<string>('MAIL_PASSWORD');

    return {
      transport: `smtps://${login}@${domain}:${pass}@smtp.${domain}`,
      defaults: {
        from: `"Notdienste Scraper" ${login}@${domain}`,
      },
      template: {
        dir: join(__dirname, '..', '..', 'views'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    };
  }
}
