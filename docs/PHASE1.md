# MYSPACE v2 — Phase 1

Implemented locally: Global Search + Command Palette and Floating Quick Capture. No backend, synchronization, automation, new navigation module, or deployment is introduced.

## Architecture

- `createCommands()` supplies a shared registry of identifiers, bilingual titles/keywords, categories, and executable actions. Search ranks exact phrases before prefixes and partial token matches. Extend this registry to add commands; both entry points use the same actions.
- `GlobalActions` connects the registry to the existing hash navigation and one active global editor. Debt, countdown, and subscription creation reuse their existing components, validators, transactions, and notices. No duplicate form/business logic.
- `CommandPalette` uses the existing Radix modal and a combobox/listbox with active-descendant keyboard selection. Focus remains in the search input while results change. Escape/outside click dismiss; focus returns to the launcher. Shortcuts are paused while another dialog is open to preserve in-progress forms.
- `FloatingCapture` uses Pointer Events and pointer capture for mouse/touch dragging. A 6px threshold separates drag from click. Release snaps to the nearest horizontal edge; persisted position stores side and a normalized vertical fraction. Resize, visual viewport changes, and safe-area padding recompute the visible bounds. Keyboard positioning and Tab/Enter/Escape menu interaction are supported.
- Idle appearance changes after 5 seconds; hover, touch, focus and interaction restore opacity. CSS honors reduced motion and existing dark/light/system variables.
- `QuickNotes` is a lightweight dialog with a 5,000-character editor and chronological history, newest first. Entries contain text, id, and UTC timestamp displayed in Asia/Shanghai. No separate Notes module, rich text, tags, editing, or cloud features.

## Persistence and compatibility

The Dexie database and table remain `myspace-v1` / `documents`. The existing backup discriminator remains `myspace.backup.v1` with additive fields:

- `quickNotes`: defaults to `[]`.
- `settings.capturePosition`: defaults to `{ side: "right", y: 0.7 }`.

Schema parsing adds defaults in memory when reading old data. `change()` now parses the latest stored record before editing, so the first new-field write works on a pre-update database. Initialization never overwrites an existing document. Transactions validate and retain all original fields. Export includes notes and position; import preview includes the note count. Older app versions do not understand these new fields; use this version or newer when restoring a new backup.

## Files

New:

- `src/lib/commands.ts` — registry, keyword matching, quick action ids.
- `src/lib/capture-position.ts` — bounds, clamping, snap geometry.
- `src/components/GlobalActions.tsx` — shared entry points and editor host.
- `src/components/CommandPalette.tsx` — search/keyboard result interface.
- `src/components/FloatingCapture.tsx` — draggable control and compact action menu.
- `src/components/QuickNotes.tsx` — capture and note history.
- `tests/unit/commands.test.ts` — matching, actions, geometry, data compatibility.
- `tests/e2e/quick-actions.spec.ts` — browser interactions and persistence.
- `docs/PHASE1.md` — this implementation record.

Modified:

- `src/App.tsx` — mount shared tools in the topbar.
- `src/components/Finance.tsx` — export the existing DebtEditor for reuse.
- `src/components/Settings.tsx` — show Quick Note count in backup preview.
- `src/components/ui/dialog.tsx` — optional class and explicit focus restoration.
- `src/data/seed.ts` — defaults for fresh installations.
- `src/lib/domain.ts` — additive schema fields and note ID validation.
- `src/lib/store.ts` — parse defaults before transactional edits.
- `src/styles.css` — scoped monochrome styles for the two features.
- `README.md` — usage and compatibility notes.

No dependencies added. Package manifests, lockfile, deployment workflow, existing timetable, maps, and original module business logic are unchanged.

## Validation

Local results, 14 October 2026:

- 45 unit tests passed (17 existing + 28 new).
- 15 browser tests passed on Chromium desktop / WebKit iPhone emulation; the Chromium-specific native touch protocol test is intentionally skipped on WebKit (1 skip).
- TypeScript and production builds passed with relative paths and `/myspace/`; the complete final browser run used `/myspace/`, matching GitHub Pages.
- No page/console errors in the new browser scenarios; keyboard focus, dialog containment, semantic labels, reduced motion, and dark/light screenshots checked. This is not a full screen-reader audit.
- `git diff --check` passed. No package, lockfile, workflow, or master timetable changes.

Run from the repository root:

```sh
pnpm test
pnpm build
pnpm test:e2e
```

Coverage includes:

- All existing module tests: timetable/edit/map, payments, converter, recurrence, subscriptions, randomizer, custom dashboard, backup and offline reload.
- Indonesian/English/partial/case-insensitive commands and empty search.
- Ctrl+K and Cmd+K, autofocus, arrow selection/wrap, Enter, Escape, outside dismissal, focus return and retaining an active form.
- Shared forms launched through search and capture; saved notes/position after reload; exported note/position/debt/event data.
- Mouse/pointer drag on desktop and emulated iPhone, edge snap without accidental menu opening, narrow viewport, keyboard positioning and focus containment.
- Native Chromium touch input drag and tap. This extra protocol test is skipped on WebKit; iPhone/WebKit tests separately cover touch tap and pointer dragging.
- Idle opacity, reduced motion, semantic roles/labels, console errors, and screenshots on desktop/iPhone sizes.
- Old backup defaults, old IndexedDB document updates preserving original fields, failed-write rollback, duplicate/empty note validation, and backup round-trip.

Browser emulation is not testing on a physical iPhone. Screen reader behavior and the iOS software keyboard/safe areas still warrant device-level checks. Search covers registered navigation/actions, not the contents of personal records. Quick Notes intentionally provide capture and viewing only. The existing production bundle size advisory may still appear during build.

Publication to the existing GitHub repository and Pages site was explicitly approved by the user on 15 October 2026. The existing deployment workflow validates the release before publishing.
