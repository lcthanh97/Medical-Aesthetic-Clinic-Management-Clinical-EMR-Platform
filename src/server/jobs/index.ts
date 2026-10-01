export interface Job<T=unknown>{name:string;payload:T}
export interface JobHandler<T=unknown>{handle(job:Job<T>):Promise<void>}
export interface Scheduler{schedule(job:Job,runAt:Date):Promise<void>}
export class FollowUpReminderJob{}
export class AfterCareNotificationJob{}
export class LowStockAlertJob{}
