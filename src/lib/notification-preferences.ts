import { z } from "zod";

export const classLeadMinutes = [5, 10, 15, 30, 60] as const;
export const eventLeadDays = [1, 3, 7] as const;
export const debtLeadDays = [0, 1, 3, 7] as const;
const enabled = z.boolean().catch(false);
const leadTime = (options: readonly number[], fallback: number) =>
  z
    .number()
    .int()
    .refine((value) => options.includes(value))
    .catch(fallback);
const timezone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  })
  .catch("Asia/Shanghai");

const preferencesV1 = z.object({
  version: z.literal(1).default(1),
  enabled,
  timezone,
  delivery: z
    .object({
      preferredChannel: z.literal("iphone-web-push").catch("iphone-web-push"),
    })
    .catch(() => ({ preferredChannel: "iphone-web-push" as const })),
  modules: z
    .object({
      timetable: z
        .object({ enabled, leadMinutes: leadTime(classLeadMinutes, 30) })
        .catch(() => ({ enabled: false, leadMinutes: 30 })),
      subscriptions: z
        .object({ enabled, leadDays: leadTime(eventLeadDays, 3) })
        .catch(() => ({ enabled: false, leadDays: 3 })),
      countdown: z
        .object({ enabled, leadDays: leadTime(eventLeadDays, 1) })
        .catch(() => ({ enabled: false, leadDays: 1 })),
      debts: z
        .object({ enabled, leadDays: leadTime(debtLeadDays, 0) })
        .catch(() => ({ enabled: false, leadDays: 0 })),
    })
    .catch(() => ({
      timetable: { enabled: false, leadMinutes: 30 },
      subscriptions: { enabled: false, leadDays: 3 },
      countdown: { enabled: false, leadDays: 1 },
      debts: { enabled: false, leadDays: 0 },
    })),
  updatedAt: z.string().datetime({ offset: true }).nullable().catch(null),
});

// Recover only notification preferences. Other application records keep their
// existing validation. Unsupported versions fail closed, without enabling delivery.
export const notificationPreferencesSchema = preferencesV1.catch(() =>
  preferencesV1.parse({}),
);
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
export const defaultNotificationPreferences = (): NotificationPreferences =>
  notificationPreferencesSchema.parse(undefined);

export type PermissionStatus =
  | "default"
  | "granted"
  | "denied"
  | "unavailable"
  | "unknown";
export function readNotificationPermission(
  host: { Notification?: { permission?: unknown } } = globalThis,
): PermissionStatus {
  try {
    if (!host.Notification) return "unavailable";
    const value = host.Notification.permission;
    return value === "default" || value === "granted" || value === "denied"
      ? value
      : "unknown";
  } catch {
    return "unknown";
  }
}
