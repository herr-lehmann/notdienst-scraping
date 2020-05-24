import { Entity, Column, PrimaryColumn, UpdateDateColumn } from "typeorm";
import moment = require('moment');


export enum KvServiceStatus {
  TRADE_OPEN = "Zum Tausch angeboten",
  TRADE_PROPOSED = "Übernahmevorschlag eingegangen",
  OPEN = "Zur Abgabe angeboten",
  TRANSFER_PROPOSED = "Abgabevorschlag abgegeben"
}

export enum KvServiceKind {
  DAY = "Tagdienst",
  LATE = "Spätdienst",
  NIGHT = "Abenddienst",
  LATE_NIGHT = "tiefe Nacht",
  REGULAR = "Werktagdienst",
  BACKUP = "Reservedienst"
}

@Entity()
export class KvService {
  @PrimaryColumn() id: number
  @Column('timestamp') start_db: string;
  @Column('timestamp') end_db: string;
  
  @Column({
    type: 'enum',
    enum: KvServiceKind,
    default: KvServiceKind.REGULAR
  })
  kind: KvServiceKind;

  @Column({
    type: 'enum',
    enum: KvServiceStatus,
    default: KvServiceStatus.OPEN
  })
  status: KvServiceStatus;

  @Column() owner: string;
  @Column() region: string;
  @UpdateDateColumn() updated: Date;

  private constructor() { }
  static parse(
    [id, startDate, startTime, endDate, endTime, kind, status, owner]: string[],
    region: string): KvService {

    if (id === undefined) return;
    const _id = Number.parseInt(id)

    const _start = moment(startDate + startTime, 'DD.MM.YYYY, -- HHmm');
    const _end = moment(endDate + endTime, 'DD.MM.YYYY, -- HHmm');

    return Object.assign(
      new KvService,
      { "id": _id, "start": _start, "end": _end, kind, status, owner, region }
    )
  }

  public get start(): string {
    return this.prettyPrint(this.start_db)
  }

  public set start(timestamp: string) {
    this.start_db = timestamp;
  }

  public get end(): string {
    return this.prettyPrint(this.end_db)
  }

  public set end(timestamp: string) {
    this.end_db = timestamp;
  }

  private prettyPrint(date: string) {
    return moment(date).format('DD.MM.YYYY, HH:mm')
  }
}
