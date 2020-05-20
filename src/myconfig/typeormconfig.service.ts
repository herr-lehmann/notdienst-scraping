import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Injectable, Logger } from "@nestjs/common";
import { KvService } from "../kvService/kvService.entity";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(
    private readonly config: ConfigService,
    ) { }
  createTypeOrmOptions(): TypeOrmModuleOptions {
    let options: { [key: string]: any };
    options = {
      type: 'postgres',
      entities: [KvService],
      synchronize: true,
      logging: this.config.get('DB_LOG_LEVEL') || 'all',
    }
    if (this.config.get('DATABASE_URL') !== undefined) {
      options.url = this.config.get('DATABASE_URL');
    } else {
      // options.host = this.config.get('DB_HOST')
      // options.port = this.config.get('DB_PORT')
      // options.username = this.config.get('DB_USER')
      // options.password = this.config.get('DB_PASSWORD')
      options.database = this.config.get('DB_NAME')
    }
    return options
  }
}
