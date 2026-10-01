export interface IConsentsService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
