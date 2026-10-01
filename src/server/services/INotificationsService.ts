export interface INotificationsService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
