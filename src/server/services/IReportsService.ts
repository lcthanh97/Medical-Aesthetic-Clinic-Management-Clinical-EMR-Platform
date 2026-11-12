export interface IReportsService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
