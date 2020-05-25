import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import moment = require('moment');

export enum KvServiceStatus {
  OPEN = 'Zur Abgabe angeboten',
  TRADE_OPEN = 'Zum Tausch angeboten',
  TRADE_PROPOSED = 'Tauschvorschlag abgegeben',
  TRANSFER_PROPOSED = 'Abgabevorschlag abgegeben',
  TRANSFER_PROPOSAL_RECEIVED = 'Übernahmevorschlag eingegangen',
}

export enum KvServiceKind {
  DAY = 'Tagdienst',
  LATE = 'Spätdienst',
  NIGHT = 'Abenddienst',
  LATE_NIGHT = 'tiefe Nacht',
  REGULAR = 'Werktagdienst',
  BACKUP = 'Reservedienst',
}

@Entity()
export class KvService {
  @PrimaryColumn() id: number;
// tslint:disable-next-line: variable-name
  @Column('timestamp') start_db: string;
// tslint:disable-next-line: variable-name
  @Column('timestamp') end_db: string;

  @Column({
    type: 'enum',
    enum: KvServiceKind,
    default: KvServiceKind.REGULAR,
  })
  kind: KvServiceKind;

  @Column({
    type: 'enum',
    enum: KvServiceStatus,
    default: KvServiceStatus.OPEN,
  })
  status: KvServiceStatus;

  @Column() owner: string;
  @Column() region: string;
  @UpdateDateColumn() updated: Date;

  private constructor() { }
  static parse(
    [id, startDate, startTime, endDate, endTime, kind, status, owner]: string[],
    region: string): KvService {

    if (id === undefined) { return; }
// tslint:disable-next-line: variable-name
    const _id = Number.parseInt(id, 10);

// tslint:disable-next-line: variable-name
    const _start = moment(startDate + startTime, 'DD.MM.YYYY, -- HHmm');
// tslint:disable-next-line: variable-name
    const _end = moment(endDate + endTime, 'DD.MM.YYYY, -- HHmm');

    return Object.assign(
      new KvService(),
      { id: _id, start: _start, end: _end, kind, status, owner, region },
    );
  }

  public get start(): string {
    return this.prettyPrint(this.start_db);
  }

  public set start(timestamp: string) {
    this.start_db = timestamp;
  }

  public get end(): string {
    return this.prettyPrint(this.end_db);
  }

  public set end(timestamp: string) {
    this.end_db = timestamp;
  }

  private prettyPrint(date: string) {
    return moment(date).format('DD.MM.YYYY, HH:mm');
  }
}
