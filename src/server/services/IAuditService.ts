export interface IAuditService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
