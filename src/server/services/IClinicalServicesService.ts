export interface IClinicalServicesService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
