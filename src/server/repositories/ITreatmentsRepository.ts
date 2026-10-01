export interface ITreatmentsRepository {
  findById(id:string):Promise<unknown|null>;
  findMany():Promise<unknown[]>;
  create(input:unknown):Promise<unknown>;
  update(id:string,input:unknown):Promise<unknown>;
}
