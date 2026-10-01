export function notImplemented(module:string){return Response.json({success:false,message:`Not implemented: ${module}`},{status:501});}
