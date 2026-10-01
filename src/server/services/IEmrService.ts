export interface IEmrService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
