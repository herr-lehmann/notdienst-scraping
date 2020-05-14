import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class KvService {
  @PrimaryColumn() id: number
  @Column('date') startDate: string;
  @Column('time') startTime: string;
  @Column('date') endDate: string;
  @Column('time') endTime: string;
  @Column() kind: string;
  @Column() status: string;
  @Column() owner: string;
  @Column() region: string;

  static parse(
    [id, startDate, startTime, endDate, endTime, kind, status, owner]: string[],
    region: string): KvService {
    if (id === undefined) return;
    const _id = Number.parseInt(id)
    return Object.assign(
      new KvService,
      { _id, startDate, startTime, endDate, endTime, kind, status, owner, region }
    )
  }

  private constructor() { }
}
