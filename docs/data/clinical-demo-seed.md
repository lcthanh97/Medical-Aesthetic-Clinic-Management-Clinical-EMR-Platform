# Clinical demo dataset

`scripts/seed-comprehensive-demo.mjs` creates a deterministic, relationally
consistent dataset for the doctor workspace and the rest of the clinic system.
It covers all 54 application tables; every table has at least 21 rows after the
seed is applied. Core workflow tables intentionally contain more rows.

## Safety and intended use

- Every patient, employee, encounter, image, signature and document is
  synthetic. No real hospital or patient records are copied.
- Medicine names use generic ingredient/formulation descriptions. The dataset
  is for UI development, demonstrations and automated testing only.
- Prescription dosage text is deliberately marked as requiring physician
  confirmation. It must not be used as prescribing guidance.
- Interaction records are decision-support test fixtures, not a replacement
  for an approved drug database, the locally approved label, or pharmacist and
  physician review.
- Image/document URLs are placeholders and contain no clinical media.

## Reference basis

The seed vocabulary was curated from these public clinical references, accessed
in October 2026:

- American Academy of Dermatology, Acne clinical guideline:
  <https://www.aad.org/member/clinical-quality/guidelines/acne>
- American Academy of Dermatology, Psoriasis clinical guideline:
  <https://www.aad.org/member/clinical-quality/guidelines/psoriasis>
- WHO Model Lists of Essential Medicines (2025):
  <https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists/>
- WHO common skin disease classification for primary care:
  <https://cdn.who.int/media/docs/default-source/ntds/skin-ntds/common-skin-diseases-for-managemen-or-referral-at-primary-health-care-level.pdf>
- DailyMed isotretinoin label (vitamin A and tetracycline warnings):
  <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=31f62a49-4c6d-4ce3-a0ca-d159562370b1>
- DailyMed doxycycline label (anticoagulants, penicillin, antacids, minerals,
  oral contraceptives and enzyme-inducing medicines):
  <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0a18d4c7-9484-4d3e-b61b-e81fe63fefec>
- DailyMed doxycycline class label (oral retinoid warning):
  <https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=10aca485-850b-4c82-bb7e-5fac2d7a62ce&version=2>
- DailyMed fluconazole label (QT and CYP-mediated interaction warnings):
  <https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c5bfc182-b35f-afc4-e053-2a95a90ae5c3>

## Usage

Dry-run inside a transaction (default):

```powershell
node scripts/seed-comprehensive-demo.mjs
```

Apply to the configured Neon database:

```powershell
node scripts/seed-comprehensive-demo.mjs --apply
```

The script is additive and repeatable: deterministic keys plus
`ON CONFLICT DO NOTHING` preserve both existing data and earlier seed rows.
