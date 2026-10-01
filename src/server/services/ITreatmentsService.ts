export interface ITreatmentsService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
