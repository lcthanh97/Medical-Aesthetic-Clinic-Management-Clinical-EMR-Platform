export interface IPrescriptionsService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
