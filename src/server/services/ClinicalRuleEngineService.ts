import { prisma } from '@/infrastructure/database/prisma';

export interface InteractionWarning {
  severity: string;
  message: string;
  ingredientA: string;
  ingredientB: string;
}

export class ClinicalRuleEngineService {
  /**
   * Check for interactions between newly prescribed medicines and the patient's treatment history.
   * @param patientId The patient's ID
   * @param newMedicineIds The IDs of the medicines being prescribed
   */
  async checkInteractions(patientId: string, newMedicineIds: string[]): Promise<InteractionWarning[]> {
    if (!newMedicineIds.length) return [];

    // 1. Get active ingredients of the new medicines
    const newMedicines = await prisma.medicine.findMany({
      where: { id: { in: newMedicineIds } },
      include: {
        ingredients: {
          include: { ingredient: true }
        }
      }
    });

    const newIngredientIds = new Set<string>();
    const ingredientNameMap = new Map<string, string>();

    newMedicines.forEach(med => {
      med.ingredients.forEach(mi => {
        newIngredientIds.add(mi.ingredientId);
        ingredientNameMap.set(mi.ingredientId, mi.ingredient.name);
      });
    });

    if (newIngredientIds.size === 0) return [];

    // 2. Get active ingredients from patient's treatment history (Prescriptions & Treatment Consumptions)
    // For simplicity, we check past 30 days of prescriptions or active treatments.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastPrescriptions = await prisma.prescriptionItem.findMany({
      where: {
        prescription: {
          visit: { patientId }
        }
      },
      include: {
        medicine: {
          include: {
            ingredients: { include: { ingredient: true } }
          }
        }
      }
    });

    const historyIngredientIds = new Set<string>();
    pastPrescriptions.forEach(pi => {
      pi.medicine.ingredients.forEach(mi => {
        historyIngredientIds.add(mi.ingredientId);
        ingredientNameMap.set(mi.ingredientId, mi.ingredient.name);
      });
    });

    const allIngredientIds = Array.from(new Set([...newIngredientIds, ...historyIngredientIds]));

    // 3. Find interactions
    const interactions = await prisma.ingredientInteraction.findMany({
      where: {
        OR: [
          {
            ingredientAId: { in: Array.from(newIngredientIds) },
            ingredientBId: { in: allIngredientIds }
          },
          {
            ingredientAId: { in: allIngredientIds },
            ingredientBId: { in: Array.from(newIngredientIds) }
          }
        ],
        status: 'ACTIVE'
      }
    });

    // 4. Format warnings
    const warnings: InteractionWarning[] = [];
    const seen = new Set<string>();

    interactions.forEach(interaction => {
      // Prevent duplicates if A->B and B->A both exist
      const key = [interaction.ingredientAId, interaction.ingredientBId].sort().join('-');
      if (seen.has(key)) return;
      seen.add(key);

      const nameA = ingredientNameMap.get(interaction.ingredientAId) || 'Unknown';
      const nameB = ingredientNameMap.get(interaction.ingredientBId) || 'Unknown';

      warnings.push({
        severity: interaction.severity,
        message: interaction.description || `Tương tác giữa ${nameA} và ${nameB}`,
        ingredientA: nameA,
        ingredientB: nameB
      });
    });

    return warnings;
  }
}

export const clinicalRuleEngine = new ClinicalRuleEngineService();
