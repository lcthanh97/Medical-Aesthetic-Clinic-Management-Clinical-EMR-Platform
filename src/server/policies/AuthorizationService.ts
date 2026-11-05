export interface ResourceContext { resource:string; action:string; facilityId?:string; departmentId?:string }
export class AuthorizationService {
  can(permissionCodes: readonly string[], context: ResourceContext) {
    const required = `${context.resource}.${context.action}`.toLowerCase();
    return permissionCodes.some(code => {
      const normalized = code.toLowerCase();
      if (normalized === '*' || normalized === required) return true;
      const [resource, action] = normalized.split('.');
      return (resource === '*' || resource === context.resource.toLowerCase()) && action === '*';
    });
  }
  assert(permissionCodes: readonly string[], context: ResourceContext) {
    if (!this.can(permissionCodes, context)) throw new Error(`Không có quyền ${context.action} trên ${context.resource}.`);
  }
}
