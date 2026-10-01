export interface IReceptionService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
