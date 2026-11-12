export interface IAppointmentsService { getById(id:string):Promise<unknown|null>; getList():Promise<unknown[]>; }
