import { Entity, Column, PrimaryColumn } from "typeorm";
import moment = require('moment');

@Entity()
export class KvService {
  @PrimaryColumn() id: number
  @Column('timestamp') private start_db: string;
  @Column('timestamp') private end_db: string;
  @Column() kind: string;
  @Column() status: string;
  @Column() owner: string;
  @Column() region: string;

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
    return this.prettyPrint(this.start_db)
  }

  public set end(timestamp: string) {
    this.end_db = timestamp;
  }

  private prettyPrint(date: string) {
    return moment(date).format('DD.MM.YYYY, HH:mm')
  }

}