import { dateSchema, remaining, type Debt } from "./domain";

// Eligibility only: this creates no reminders, jobs, or schedules.
// Both Utang and Piutang use the same due-date semantics in Debt Tracker.
export function isDebtReminderEligible(debt: Debt): boolean {
  return dateSchema.safeParse(debt.due).success && remaining(debt) > 0;
}
