export interface IAuthService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
