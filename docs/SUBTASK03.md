# Subtask 03 — Notification Settings UI

## Scope and usage

Open **Settings & backup → Notifications**. The section is collapsed initially to keep Settings compact. Enable the master preference, then the desired categories and lead times. Changes save automatically in the existing IndexedDB document; disabling the master retains category choices. Disabled categories retain their selected lead times. No browser permission is requested.

The interface labels the delivery preference **iPhone Web Push (Planned)** and explicitly states that no notifications are scheduled or sent, even when browser permission is granted. `Notification.permission` is read when Settings mounts and when the window regains focus/visibility. Missing APIs are reported as unavailable in the current browser context; exceptions/unknown values are reported as unreadable. Permission is never persisted as if it were a user preference.

All controls use the existing theme variables and settings modal, with native checkbox switches/selects, explicit labels, disabled states, focus indicators, and reduced-motion styling. Source counts refer to existing module data; they are not a scheduled-reminder preview.

## Data contract

`AppData.settings.notifications` is an additive, versioned object in the existing `myspace-v1` database, `documents` table, `main` record. There is no database upgrade or new storage mechanism.

```json
{
  "version": 1,
  "enabled": false,
  "timezone": "Asia/Shanghai",
  "delivery": { "preferredChannel": "iphone-web-push" },
  "modules": {
    "timetable": { "enabled": false, "leadMinutes": 30 },
    "subscriptions": { "enabled": false, "leadDays": 3 },
    "countdown": { "enabled": false, "leadDays": 1 },
    "debts": { "enabled": false, "leadDays": 0 }
  },
  "updatedAt": null
}
```

- All switches default off. Class options: 5/10/15/30/60 minutes. Subscription and countdown options: 1/3/7 days. Debt options: 0/1/3/7 days, where 0 means the due date.
- `timezone` accepts a valid timezone recognized by `Intl.DateTimeFormat`. Its initial value is Asia/Shanghai. This subtask displays the timezone; it does not add a timezone editor or alter the existing timetable's timezone.
- `updatedAt` is an ISO timestamp set only when a preference is changed. It provides a revision hint for a future synchronization implementation; it does not perform synchronization or establish conflict resolution.
- `delivery.preferredChannel` identifies the planned channel. It is not an active subscription, a permission grant, or a delivery capability flag. Future channels can extend this field through an explicit schema migration.
- Missing fields use safe defaults. Invalid leaf values fall back individually, preserving valid sibling preferences. Invalid containers and unsupported schema versions fall back to disabled defaults. Fallback objects are freshly created, never shared between parses.
- Existing classes, debts, subscriptions, events, converter history, randomizer lists, quick notes, and unrelated settings are neither reset nor rewritten by initialization. The existing transaction layer parses defaults before a later preference save. Validation outside the notifications subtree remains unchanged.
- Preferences are included in normal JSON export/import. Legacy backups gain notification defaults. Older app versions do not recognize this new field, so restore new backups with this version or later.

## Future engine integration

The future Automation Engine can consume `settings.notifications` after schema validation, require both the global and category enabled flags, and apply the configured timezone and explicit lead-time unit. This subtask has **no engine, generated reminder objects, or scheduling**.

Data sources for that future integration:

| Category | Existing source | Constraints |
| --- | --- | --- |
| Timetable | `classes[].date`, `start` | Use stored dated occurrences, not guessed recurrence; retain existing uncertainty flags. |
| Subscriptions | `renewalDate(subscription)` | Active subscriptions; respect existing anchored cycle calculations. |
| Countdown | `events[]`, future use of `nextEvent()` | Use event date/time and existing recurrence semantics. |
| Debt | `debts[].due`, `isDebtReminderEligible()` | Valid calendar due date and outstanding balance; applies to both Utang and Piutang. |

`isDebtReminderEligible()` is a pure eligibility predicate. It does not alter debt records or generate a reminder. Paid debts and missing/invalid dates are excluded. Date-only debts/subscriptions do not receive an invented delivery hour here; a future scheduler must define that policy explicitly. Subscription `remindDays` and existing in-dashboard renewal reminders remain unchanged; they are separate from these future delivery preferences.

## Files

New:

- `src/components/NotificationSettings.tsx` — collapsible settings, controls, read-only permission status, persistence feedback.
- `src/lib/notification-preferences.ts` — versioned schema, fallback factories, options, permission reader.
- `src/lib/notification-sources.ts` — pure debt eligibility helper.
- `tests/unit/notifications.test.ts` — defaults, recovery, permissions, eligibility, storage compatibility.
- `tests/e2e/notifications.spec.ts` — UI, reload, backup, invalid stored settings, API/network side-effect checks.
- `docs/SUBTASK03.md` — this implementation guide.

Modified:

- `src/components/Settings.tsx` — mount Notifications within the existing modal.
- `src/lib/domain.ts` — add the notification preferences field to settings validation.
- `src/data/seed.ts` — add fresh notification defaults for new installations.
- `src/styles.css` — scoped monochrome notification settings styles.
- `README.md` — usage link.

No new dependencies. Existing six modules, command palette, floating capture, service worker, deployment workflow, and database transaction implementation are unchanged.

## Verification and limitations

Local verification on 15 October 2026:

- **63 unit tests passed** (45 existing, 18 new).
- **19 browser tests passed**, with 1 existing Chromium-protocol test intentionally skipped on WebKit. All four new notification scenarios passed on desktop Chromium and iPhone WebKit emulation.
- TypeScript and production builds passed. The final full browser suite ran against `/myspace/`, matching the GitHub Pages path.
- Existing data equality and notification preferences backup round-trip passed. Instrumented API counters and external request lists remained zero/empty.
- Desktop and iPhone screenshots were inspected; keyboard activation, labels, disabled states, and horizontal layout bounds were checked. `git diff --check` passed.

Run `pnpm test`, `pnpm build`, and `pnpm test:e2e`. The new browser tests exercise every lead-time option, master/category toggles, reload, backup round-trip, invalid persisted settings, permission states and refresh, unchanged original data, and desktop/iPhone layout. Notification constructor, permission request, service-worker notification display, and push subscription APIs are instrumented to assert zero calls. Network checks assert no external requests during settings interactions.

The original regression suite covers all six modules and Subtasks 01/02. No timers, background jobs, service-worker changes, notification API invocations, backend clients, or synchronization were added. The existing PWA caching service worker continues to work as before.

Browser emulation does not replace a physical iPhone or screen-reader audit. Permission visibility depends on the current browser context. The existing production bundle-size advisory remains. Actual notifications, scheduling, timezone editing, cloud sync, and push setup are intentionally outside this subtask.

Publication was explicitly approved on 15 October 2026. Deployment uses the existing GitHub Pages workflow.
