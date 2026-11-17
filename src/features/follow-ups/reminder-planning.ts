export type ReminderKind = 'REMIND_3D' | 'REMIND_1D';
export type ReminderAction =
  | { action: 'CREATE'; kind: ReminderKind; key: string; at: Date; appointment: boolean }
  | { action: 'SKIP'; reason: 'INELIGIBLE' | 'COMPLETED' | 'NOT_DUE' | 'QUIET_HOURS' | 'ALREADY_SENT' | 'PATIENT_CONFIRMED' };

export type ReminderPlanInput = {
  id: string;
  version: number;
  status: string;
  decision: string;
  targetDate: Date | null;
  appointments: Array<{ scheduledAt: Date; status: string }>;
  completed: boolean;
  patientConfirmed: boolean;
  existingKeys: ReadonlySet<string>;
  now: Date;
};

const appointmentInactive = new Set(['CANCELLED', 'CANCELED', 'COMPLETED', 'DONE']);

function vietnamParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (name: string) => Number(parts.find((part) => part.type === name)?.value);
  return { day: Math.floor(Date.UTC(value('year'), value('month') - 1, value('day')) / 86_400_000), hour: value('hour') };
}

export function planFollowUpReminders(input: ReminderPlanInput): ReminderAction {
  if (input.status !== 'CONFIRMED' || input.decision !== 'SCHEDULED' || !input.targetDate) return { action: 'SKIP', reason: 'INELIGIBLE' };
  if (input.completed) return { action: 'SKIP', reason: 'COMPLETED' };

  if (input.appointments.length > 0 && input.appointments.every((item) => ['CANCELLED', 'CANCELED'].includes(item.status.toUpperCase()))) {
    return { action: 'SKIP', reason: 'INELIGIBLE' };
  }

  const nextAppointment = input.appointments
    .filter((item) => !appointmentInactive.has(item.status.toUpperCase()) && item.scheduledAt.getTime() >= input.now.getTime())
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())[0];
  const at = nextAppointment?.scheduledAt ?? input.targetDate;
  const remaining = nextAppointment
    ? (at.getTime() - input.now.getTime()) / 86_400_000
    : vietnamParts(at).day - vietnamParts(input.now).day;
  const kind: ReminderKind | null = remaining >= 0 && remaining <= 1 ? 'REMIND_1D'
    : remaining > 1 && remaining <= 3 ? 'REMIND_3D' : null;
  if (!kind) return { action: 'SKIP', reason: 'NOT_DUE' };
  if (kind === 'REMIND_3D' && input.patientConfirmed) return { action: 'SKIP', reason: 'PATIENT_CONFIRMED' };
  const key = `${kind}:${input.id}:${input.version}:${at.toISOString()}`;
  if (input.existingKeys.has(key)) return { action: 'SKIP', reason: 'ALREADY_SENT' };
  const hour = vietnamParts(input.now).hour;
  if (hour >= 21 || hour < 7) return { action: 'SKIP', reason: 'QUIET_HOURS' };
  return { action: 'CREATE', kind, key, at, appointment: Boolean(nextAppointment) };
}
