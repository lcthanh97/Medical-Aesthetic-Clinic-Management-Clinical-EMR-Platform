export interface IBillingService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
