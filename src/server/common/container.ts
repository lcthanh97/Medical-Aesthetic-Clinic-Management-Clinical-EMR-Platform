import { PrismaReceptionRepository } from '@/infrastructure/database/repositories/PrismaReceptionRepository';
import { ReceptionService } from '@/server/services/ReceptionService';
import { ReceptionController } from '@/server/controllers/ReceptionController';

import { PrismaVisitsRepository } from '@/infrastructure/database/repositories/PrismaVisitsRepository';
import { VisitsService } from '@/server/services/VisitsService';
import { VisitsController } from '@/server/controllers/VisitsController';

import { PrismaBillingRepository } from '@/infrastructure/database/repositories/PrismaBillingRepository';
import { PrismaClinicalServicesRepository } from '@/infrastructure/database/repositories/PrismaClinicalServicesRepository';
import { BillingService } from '@/server/services/BillingService';
import { BillingController } from '@/server/controllers/BillingController';
import { ClinicalServicesService } from '@/server/services/ClinicalServicesService';
import { ClinicalServicesController } from '@/server/controllers/ClinicalServicesController';

// 1. Reception & Patient module container (REC-01)
const receptionRepository = new PrismaReceptionRepository();
export const receptionService = new ReceptionService(receptionRepository);
export const receptionController = new ReceptionController(receptionService);

// 2. Walk-in Visit & Queue module container (REC-02)
const visitsRepository = new PrismaVisitsRepository();
export const visitsService = new VisitsService(visitsRepository);
export const visitsController = new VisitsController(visitsService);

// 3. Billing & Clinical Services module container (CLS-04)
export const billingRepository = new PrismaBillingRepository();
export const clinicalServicesRepository = new PrismaClinicalServicesRepository();

export const billingService = new BillingService(billingRepository, clinicalServicesRepository);
export const billingController = new BillingController(billingService);

export const clinicalServicesService = new ClinicalServicesService(clinicalServicesRepository, billingService);
export const clinicalServicesController = new ClinicalServicesController(clinicalServicesService, billingService);

// Alias cho backward compatibility
export const paymentService = billingService;
export const paymentController = billingController;
