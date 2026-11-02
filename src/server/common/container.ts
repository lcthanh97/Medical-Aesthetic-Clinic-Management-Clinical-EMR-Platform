import { PrismaReceptionRepository } from '@/infrastructure/database/repositories/PrismaReceptionRepository';
import { ReceptionService } from '@/server/services/ReceptionService';
import { ReceptionController } from '@/server/controllers/ReceptionController';

// Reception & Patient module container
const receptionRepository = new PrismaReceptionRepository();
export const receptionService = new ReceptionService(receptionRepository);
export const receptionController = new ReceptionController(receptionService);

