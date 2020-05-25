import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmConfigService } from './typeormconfig.service';
import { MailerConfigService } from './mailerconfig.service';

@Module({
  providers: [
    TypeOrmConfigService,
    MailerConfigService,
  ],
  exports: [
    TypeOrmConfigService,
    MailerConfigService,
  ],
})
export class MyConfigModule { }
