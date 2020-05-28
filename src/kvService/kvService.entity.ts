import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import moment = require('moment');

export enum KvServiceStatus {
  OPEN = 'Zur Abgabe angeboten',
  TRADE_OPEN = 'Zum Tausch angeboten',
  TRADE_PROPOSED = 'Tauschvorschlag abgegeben',
  TRADE_PROPOSAL_RECEIVED = 'Tauschvorschlag eingegangen',
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

  @Column('timestamp')
  // tslint:disable-next-line: variable-name
  private _start: Date;
  @Column('timestamp')
  // tslint:disable-next-line: variable-name
  private _end: Date;

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

  @UpdateDateColumn()
  // tslint:disable-next-line: variable-name
  private _updated: Date;

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
    return this.prettyPrint(this._start);
  }

  public set start(timestamp: string) {
    this._start = moment(timestamp).toDate();
  }

  public get end(): string {
    return this.prettyPrint(this._end);
  }

  public set end(timestamp: string) {
    this._end = moment(timestamp).toDate();
  }

  public get updated(): string {
    return this.prettyPrint(this._updated);
  }

  public set updated(timestamp: string) {
    this._updated = moment(timestamp).toDate();
  }

  private prettyPrint(date: number | Date) {
    return moment(date).format('DD.MM.YYYY, HH:mm');
  }

  equals(service: KvService): boolean {
    return this.id === service.id
      && this._start.valueOf() === service._start.valueOf()
      && this._end.valueOf() === service._end.valueOf()
      && this.region === service.region
      && this.kind === service.kind
      && this.owner === service.owner;
  }

  public static sortByStartDate(array: KvService[]): KvService[] {
    return array.sort((a, b) => (a._start.valueOf() - b._start.valueOf()));
  }

}
