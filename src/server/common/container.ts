import { PrismaReceptionRepository } from '@/infrastructure/database/repositories/PrismaReceptionRepository';
import { ReceptionService } from '@/server/services/ReceptionService';
import { ReceptionController } from '@/server/controllers/ReceptionController';

import { PrismaVisitsRepository } from '@/infrastructure/database/repositories/PrismaVisitsRepository';
import { VisitsService } from '@/server/services/VisitsService';
import { VisitsController } from '@/server/controllers/VisitsController';

// Reception & Patient module container (REC-01)
const receptionRepository = new PrismaReceptionRepository();
export const receptionService = new ReceptionService(receptionRepository);
export const receptionController = new ReceptionController(receptionService);

// Walk-in Visit & Queue module container (REC-02)
const visitsRepository = new PrismaVisitsRepository();
export const visitsService = new VisitsService(visitsRepository);
export const visitsController = new VisitsController(visitsService);
