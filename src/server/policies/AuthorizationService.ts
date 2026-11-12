export interface ResourceContext{accountId:string;facilityId?:string;departmentId?:string;resource:string;action:string}
export class AuthorizationService{can(_context:ResourceContext){return false; /* TODO: resource-scoped RBAC */}}
