export interface IAdministrationService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
