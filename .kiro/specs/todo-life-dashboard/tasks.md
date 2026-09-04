# Implementation Plan: To-Do List Life Dashboard

## Overview

Build a zero-dependency, single-page productivity dashboard delivered as static files (`index.html`, `css/style.css`, `js/app.js`). All state is persisted in `localStorage`. The implementation follows the module structure defined in the design: `StorageModule`, `ThemeModule`, `GreetingModule`, `TimerModule`, `TaskModule`, `LinkModule`, and a top-level init sequence wired on `DOMContentLoaded`.

---

## Tasks

- [x] 1. Scaffold project structure and HTML skeleton
  - [x] 1.1 Create directory layout and `index.html`
    - Create `css/` and `js/` directories
    - Write `index.html` with `<!DOCTYPE html>`, `<html lang="en" class="theme-dark">`, `<head>` (charset, viewport, title, link to `css/style.css`, script tag for `js/app.js` with `defer`)
    - Add `<header>` with `<h1>` dashboard title and `<button id="theme-toggle" aria-label="Switch theme">`
    - Add `<main>` containing four `<section>` elements: `#greeting-panel`, `#timer-panel`, `#task-panel`, `#links-panel`
    - Populate each section with the exact element IDs and ARIA attributes from the design's HTML Structure Outline (aria-live regions, role="alert", output, forms, lists)
    - _Requirements: 9.3, 9.4, 9.5_

  - [x] 1.2 Create empty `css/style.css` and `js/app.js` files
    - Create `css/style.css` with a single comment placeholder
    - Create `js/app.js` with a single comment placeholder
    - Verify the HTML links resolve correctly (no 404s when opened directly in a browser)
    - _Requirements: 9.1, 9.2, 9.4_

- [x] 2. Implement `StorageModule`
  - [x] 2.1 Write the `StorageModule` IIFE with get/set for all four keys
    - Implement `getTasks()` / `setTasks(tasks)` using key `"tld_tasks"`
    - Implement `getLinks()` / `setLinks(links)` using key `"tld_links"`
    - Implement `getDuration()` / `setDuration(n)` using key `"tld_duration"`, default `25`
    - Implement `getTheme()` / `setTheme(t)` using key `"tld_theme"`, default `"dark"`
    - All getters wrap `localStorage.getItem` + `JSON.parse` in try/catch; return safe defaults on any error
    - All setters wrap `localStorage.setItem` + `JSON.stringify` in try/catch; catch `QuotaExceededError` and re-throw a typed `StorageError`
    - Add a module-level `storageAvailable` flag (test by writing/reading a probe key on first use)
    - _Requirements: 7.1–7.6, Design: StorageModule_

  - [x] 2.2 Add schema-validation logic inside each getter
    - `getTasks`: validate array, each element has `id` (string), `description` (string 1–500), `completed` (boolean), `createdAt` (number); silently drop invalid elements; whole-parse failure → `[]`
    - `getLinks`: validate array ≤ 20 items, each has `id` (string), `label` (string 1–50), `url` (string starting with `http://` or `https://`, ≤ 2048 chars); silently drop invalid; whole-parse failure → `[]`
    - `getDuration`: validate integer in [1, 120]; any other value → `25`
    - `getTheme`: validate `"dark"` or `"light"`; any other value → `"dark"`
    - _Requirements: 7.5, Design: Validation on Read_

  - [x]* 2.3 Write property tests for `StorageModule`
    - **Property 7: Task storage round-trip preserves data**
    - **Validates: Requirements 3.4, 7.1**
    - **Property 13: Link storage round-trip preserves data**
    - **Validates: Requirements 6.3, 7.2**
    - **Property 15: Storage read-back after any write returns correct theme**
    - **Validates: Requirements 8.3, 7.4**
    - **Property 16: Corrupt or missing Storage values produce safe defaults**
    - **Validates: Requirements 7.5, 8.7**
    - **Property 19: Session duration storage round-trip**
    - **Validates: Requirements 7.3, 2.7**
    - Use `fc.array(validTask(), { maxLength: 50 })`, `fc.array(validLink(), { maxLength: 20 })`, `fc.constantFrom("dark","light")`, `fc.integer({ min: 1, max: 120 })`, `fc.anything()` generators as specified in the design Testing Strategy

  - [x]* 2.4 Write unit tests for `StorageModule`
    - Test `QuotaExceededError` path: mock `setItem` to throw; verify `StorageError` is re-thrown
    - Test schema rejection: feed corrupted JSON strings; verify defaults are returned
    - Test `storageAvailable` flag: block `localStorage`; verify getters return defaults without throwing
    - _Requirements: 7.5, 7.6_

- [x] 3. Implement `ThemeModule`
  - [x] 3.1 Write the `ThemeModule` IIFE
    - Implement `init(theme)`: add/remove `theme-dark` / `theme-light` class on `<html>`; if `theme` is neither `"dark"` nor `"light"` fall back to `"dark"`
    - Implement `toggle()`: read current theme from `<html>` class, flip it, call `StorageModule.setTheme`, re-apply class
    - Implement `getCurrent()`: return `"dark"` or `"light"` based on current `<html>` class
    - Wire the `#theme-toggle` button click event to `ThemeModule.toggle()` inside the module's init
    - _Requirements: 8.1–8.7, Design: ThemeModule_

  - [x]* 3.2 Write property tests for `ThemeModule`
    - **Property 14: Theme toggle is an involution**
    - **Validates: Requirements 8.2**
    - Use `fc.constantFrom("dark", "light")` as start state; call `toggle()` twice; assert theme equals initial state

  - [x]* 3.3 Write unit tests for `ThemeModule`
    - Test dark→light transition: verify HTML class changes and `StorageModule.setTheme` is called with `"light"`
    - Test light→dark transition
    - Test invalid persisted theme falls back to `"dark"`
    - Test `getCurrent()` returns the correct string in both states
    - _Requirements: 8.1, 8.4, 8.7_

- [x] 4. Implement `GreetingModule`
  - [x] 4.1 Write the `GreetingModule` IIFE
    - Implement `init()`: call `tick()` immediately, then `setInterval(tick, 1000)`
    - Implement `tick()`: call `new Date()` inside try/catch; on failure render `"Time unavailable"` in `#clock` and clear `#greeting`; on success call `formatTime`, `formatDate`, `getGreeting` and update `#clock`, `#date`, `#greeting` DOM nodes
    - Implement `formatTime(date)`: return zero-padded `HH:MM:SS` string using `getHours()`, `getMinutes()`, `getSeconds()`
    - Implement `formatDate(date)`: return human-readable string using `date.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' })`
    - Implement `getGreeting(hour)`: return `"Good Morning"` for 0–11, `"Good Afternoon"` for 12–17, `"Good Evening"` for 18–23
    - _Requirements: 1.1–1.7, Design: GreetingModule_

  - [x]* 4.2 Write property tests for `GreetingModule`
    - **Property 1: Greeting is consistent with local hour**
    - **Validates: Requirements 1.3, 1.4, 1.5**
    - Use `fc.integer({ min: 0, max: 23 })` injected as mock hour
    - **Property 2: Clock display matches actual time**
    - **Validates: Requirements 1.1**
    - Use `fc.date()` arbitrary date object; verify zero-padded HH:MM:SS matches date's hours/minutes/seconds

  - [x]* 4.3 Write unit tests for `GreetingModule`
    - Test `formatTime` at boundary hours 00, 11, 12, 17, 18, 23 (midnight, noon, evening boundaries)
    - Test `getGreeting` for each of the three bands and boundary values (0, 11, 12, 17, 18, 23)
    - Test `tick()` when `new Date()` throws: verify `"Time unavailable"` renders, no exception propagates
    - _Requirements: 1.1–1.6_

- [x] 5. Implement `TimerModule`
  - [x] 5.1 Write the `TimerModule` IIFE — state and display
    - Declare module-level state: `intervalId`, `remainingSeconds`, `sessionDuration` (in seconds), `isRunning`
    - Implement `init(durationMinutes)`: set `sessionDuration` from `durationMinutes` (default 25 if falsy), call `reset()`
    - Implement `formatCountdown(totalSeconds)`: return zero-padded `MM:SS`
    - Implement internal `updateDisplay()`: write `formatCountdown(remainingSeconds)` to `#timer-display`
    - _Requirements: 2.1, Design: TimerModule_

  - [x] 5.2 Implement `start()`, `stop()`, `reset()` controls
    - Implement `start()`: no-op if `isRunning`; set `isRunning = true`; disable `#duration-input`; start `setInterval(tick, 1000)`
    - Implement `stop()`: clear interval; set `isRunning = false`; re-enable `#duration-input`
    - Implement `reset()`: call `stop()`; set `remainingSeconds = sessionDuration`; call `updateDisplay()`
    - Implement internal `tick()`: decrement `remainingSeconds`; call `updateDisplay()`; if `remainingSeconds <= 0` call `stop()` then `playBeep()`
    - Wire `#timer-start`, `#timer-stop`, `#timer-reset` button click events inside `init`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.10, Design: TimerModule_

  - [x] 5.3 Implement custom duration input and audio beep
    - Implement `setCustomDuration(minutes)`: validate integer in [1, 120]; on failure show inline error in `#duration-error` and return `ValidationError`; on success set `sessionDuration`, persist via `StorageModule.setDuration`, clear error, call `reset()`
    - Wire the `#duration-input` change/submit event to `setCustomDuration`
    - Implement `playBeep()`: try `AudioContext` tone for ≥ 1 second; catch `AudioContext` unavailability; fall back to a `<audio>` element with a data-URI encoded beep
    - _Requirements: 2.7, 2.8, 2.9, 2.5, Design: TimerModule audio signal_

  - [x]* 5.4 Write property tests for `TimerModule`
    - **Property 3: Timer countdown decrements correctly**
    - **Validates: Requirements 2.1, 2.2**
    - Use `fc.integer({ min: 1, max: 120 })` for duration and `fc.nat()` for k ≤ duration_seconds; verify `remainingSeconds = duration_seconds − k` and `formatCountdown` encodes correctly
    - **Property 4: Custom duration validation rejects out-of-range values**
    - **Validates: Requirements 2.8, 2.9**
    - Use `fc.oneof(fc.float(), fc.string(), fc.integer({ min: -1000, max: 0 }), fc.integer({ min: 121, max: 9999 }))` generators

  - [x]* 5.5 Write unit tests for `TimerModule`
    - Test `formatCountdown` for 0 s, 1 s, 60 s, 3599 s
    - Test `start()` is idempotent: calling twice does not create two intervals
    - Test `stop()` while not running does not throw
    - Test `setCustomDuration` accepts 1 and 120; rejects 0, 121, 1.5, "foo", -1
    - Test `reset()` restores `remainingSeconds` to `sessionDuration`
    - _Requirements: 2.1–2.10_

- [x] 6. Checkpoint — Storage, Theme, Greeting, Timer
  - Ensure all tests pass up to this point. Ask the user if questions arise before proceeding.

- [x] 7. Implement `TaskModule`
  - [x] 7.1 Write `TaskModule` IIFE — data model and `init`
    - Declare module-level state: `tasks: Task[]` (in-memory copy), `sortOrder = "created"`
    - Implement `init(tasks)`: assign the provided array to module state, call `render()`
    - Implement `generateId()`: use `crypto.randomUUID()` for task IDs
    - _Requirements: 3.3, Design: TaskModule data model_

  - [x] 7.2 Implement `addTask(description)` and `deleteTask(id)`
    - Implement `addTask(description)`: trim input; if empty/whitespace show inline error in `#task-input-error` and return `ValidationError`; otherwise create a `Task` object `{ id, description, completed: false, createdAt: Date.now() }`; call `StorageModule.setTasks` first — if `StorageError` is thrown show error in `#task-storage-error` and abort; otherwise push to `tasks`, call `render()`, clear error
    - Implement `deleteTask(id)`: filter task out of `tasks`; call `StorageModule.setTasks`; call `render()`; if `StorageError` show inline warning in `#task-storage-error`
    - Wire `#task-form` submit event to `addTask`
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 4.5, Design: TaskModule_

  - [x] 7.3 Implement `editTask(id, newDesc)` and `toggleComplete(id)`
    - Implement `editTask(id, newDesc)`: trim `newDesc`; if empty/whitespace restore original description in DOM, show inline error inside the edit field, return `ValidationError`; otherwise update `tasks` entry, call `StorageModule.setTasks` — if `StorageError` show inline warning but retain in-memory change; call `render()`
    - Implement `toggleComplete(id)`: flip `completed` on matching task; call `StorageModule.setTasks` — if `StorageError` retain in-memory change and show inline warning; call `render()`
    - _Requirements: 4.1–4.4, 4.6, 4.7, Design: TaskModule_

  - [x] 7.4 Implement `setSortOrder(order)` and sort logic
    - Implement `setSortOrder(order)`: set `sortOrder`; call `render()`
    - Implement internal `getSortedCopy()`: create a shallow copy of `tasks`; sort by the active criterion with `createdAt` ascending as tiebreaker (do not mutate the canonical array)
    - Sort criteria: `"created"` → `createdAt` ascending; `"alpha"` → `description.toLowerCase()` A–Z then `createdAt`; `"completion"` → incomplete first then complete then `createdAt`
    - Wire `data-sort` button clicks to `setSortOrder` inside `init`
    - _Requirements: 5.1–5.5, Design: Sort implementation_

  - [x] 7.5 Implement `render()` and inline edit UI
    - Implement `render()`: call `getSortedCopy()`; clear `<ul id="task-list">`; for each task append a `<li>` containing: checkbox (checked = `completed`), `<span>` with description text (class `completed` + strikethrough CSS when `completed`), edit `<button>`, delete `<button>`; update `aria-pressed` / `aria-label` on sort buttons to reflect active sort
    - Implement inline edit mode: clicking edit replaces `<span>` with `<input>` pre-filled with description (maxlength 500); blur or Enter confirm edit via `editTask`; Escape cancels and restores original text
    - _Requirements: 3.3, 4.1–4.3, 4.6, 5.3, Design: Render logic_

  - [x]* 7.6 Write property tests for `TaskModule`
    - **Property 5: Adding a valid task grows the list by exactly one**
    - **Validates: Requirements 3.1**
    - Use `fc.array(validTask())` × `fc.string({ minLength: 1 })` filtered to non-whitespace
    - **Property 6: Whitespace-only task descriptions are rejected**
    - **Validates: Requirements 3.2**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))`
    - **Property 8: Toggling completion is an involution**
    - **Validates: Requirements 4.4**
    - Use `fc.boolean()` as initial completion state
    - **Property 9: Sort does not mutate Storage**
    - **Validates: Requirements 5.2**
    - Use `fc.array(validTask())` × `fc.constantFrom("created","alpha","completion")`
    - **Property 10: Sort tiebreaker preserves creation order**
    - **Validates: Requirements 5.4**
    - Use `fc.array(validTask())` with randomised equal-key pairs
    - **Property 17: Deleting a task removes it from both list and Storage**
    - **Validates: Requirements 4.5**
    - Use `fc.array(validTask(), { minLength: 1 })` with random id selected

  - [x]* 7.7 Write unit tests for `TaskModule`
    - Test `addTask` with valid description, empty string, whitespace-only, 200-char boundary
    - Test `editTask` valid edit, blank value (restores original), id not found
    - Test `toggleComplete` flips state and calls `StorageModule.setTasks`
    - Test `deleteTask` removes correct task and calls `StorageModule.setTasks`
    - Test `setSortOrder` for each of three orders with tie cases
    - _Requirements: 3.1–3.6, 4.1–4.7, 5.1–5.5_

- [x] 8. Implement `LinkModule`
  - [x] 8.1 Write `LinkModule` IIFE — `init`, `addLink`, `deleteLink`
    - Declare module-level state: `links: Link[]`
    - Implement `init(links)`: assign provided array, call `render()`
    - Implement `addLink(label, url)`: trim both; validate label 1–50 chars, URL starts with `http://` or `https://` and ≤ 2048 chars, list length < 20; on any failure show inline error in `#link-error` identifying which field is invalid; on success push `{ id: crypto.randomUUID(), label, url }` to `links`, call `StorageModule.setLinks`, call `render()`
    - Implement `deleteLink(id)`: filter link out of `links`; call `StorageModule.setLinks`; call `render()`
    - Wire `#link-form` submit event to `addLink` inside `init`
    - _Requirements: 6.1–6.6, Design: LinkModule_

  - [x] 8.2 Implement `LinkModule.render()`
    - Clear `<ul id="link-list">`; if `links` is empty show an empty-state `<li>` message
    - For each link append a `<li>` containing: a `<button>` or `<a>` that opens `url` in a new tab via `window.open(url, '_blank', 'noopener,noreferrer')`, and a delete `<button>`
    - Wire delete buttons inside render (event delegation acceptable)
    - _Requirements: 6.3, 6.4, 6.5, Design: LinkModule_

  - [x]* 8.3 Write property tests for `LinkModule`
    - **Property 11: Valid link addition grows link list by one**
    - **Validates: Requirements 6.1**
    - Use `fc.array(validLink(), { maxLength: 19 })` × `fc.record({ label, url })`
    - **Property 12: Invalid link submissions are rejected without side effects**
    - **Validates: Requirements 6.2, 6.6**
    - Generators for each invalid field combination (empty label, label > 50, non-http(s), URL > 2048, list at 20)
    - **Property 18: Deleting a link removes it from both list and Storage**
    - **Validates: Requirements 6.5**
    - Use `fc.array(validLink(), { minLength: 1 })` with random id selected

  - [x]* 8.4 Write unit tests for `LinkModule`
    - Test `addLink` with all valid inputs; label boundary (1 char, 50 chars); URL http and https
    - Test `addLink` rejects empty label, label > 50, non-http(s) URL, URL > 2048
    - Test `addLink` rejects when 20 links already stored
    - Test `deleteLink` removes correct link and shows empty state when list becomes empty
    - _Requirements: 6.1–6.6_

- [x] 9. Implement CSS — theming, layout, and component styles
  - [x] 9.1 Write CSS custom properties and theme classes
    - Define `html.theme-dark` with variables: `--bg-surface: #1a1a2e`, `--bg-card: #16213e`, `--text-primary: #e0e0e0`, `--text-muted: #a0a0b0`, `--accent: #ff6b9d`, `--accent-hover: #ff8fb3`, `--border: #2a2a4a`, `--error: #ff5555`
    - Define `html.theme-light` with variables as specified in the design CSS Architecture section
    - Add `transition: background-color 80ms ease, color 80ms ease` to `html` to stay under 100 ms requirement
    - _Requirements: 8.5, 8.6, 10.2, Design: CSS Architecture_

  - [x] 9.2 Write responsive grid layout and base styles
    - Style `<main>` with `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; padding: 1rem`
    - Add a media query (or rely on `auto-fill`) for single-column layout at viewport widths < 600px
    - Apply `background-color: var(--bg-card)` to each `<section>`, use `var(--text-primary)` for body text, `var(--accent)` for buttons and interactive elements, `var(--border)` for separators
    - Ensure no overflow, clipping, or element overlap from 320px to 2560px viewport width
    - _Requirements: 9.3, 10.4, Design: Responsive layout_

  - [x] 9.3 Write component-specific styles
    - `#timer-display`: large monospace font for readability
    - Task list `<li>`: flex row with checkbox, description span, and action buttons
    - Completed task `<span>`: `text-decoration: line-through; color: var(--text-muted)` (strikethrough)
    - Active sort button: distinct visual state (e.g., `background: var(--accent); color: #fff`) to indicate currently active sort
    - `role="alert"` error paragraphs: `color: var(--error)`, hidden by default (`display: none` or empty content), shown when text is set
    - Focus rings: visible outline using `var(--accent)` on `:focus-visible` for all interactive elements
    - `#duration-input[disabled]`: reduced opacity to indicate disabled state
    - _Requirements: 4.6, 5.3, 9.3, Design: Component styles_

- [x] 10. Integrate all modules in `js/app.js`
  - [x] 10.1 Write the top-level initialisation sequence
    - Declare all module IIFEs at the top of `js/app.js` in dependency order: `StorageModule`, `ThemeModule`, `GreetingModule`, `TimerModule`, `TaskModule`, `LinkModule`
    - Add a `setTimeout` before `DOMContentLoaded` listener that fires after 5 seconds and shows a load-failure indicator with a retry button calling `location.reload()` if the app has not yet initialised
    - In the `DOMContentLoaded` handler: call `StorageModule.loadAll()` (or individual getters), then `ThemeModule.init(theme)`, `GreetingModule.init()`, `TimerModule.init(duration)`, `TaskModule.init(tasks)`, `LinkModule.init(links)`; clear the 5-second timeout on successful init
    - _Requirements: 9.4, 10.1, 10.5, Design: Initialisation Sequence_

  - [x] 10.2 Verify all module wiring and event handlers
    - Confirm `#theme-toggle` click calls `ThemeModule.toggle()`
    - Confirm `#timer-start`, `#timer-stop`, `#timer-reset` buttons call their respective `TimerModule` methods
    - Confirm `#duration-input` change triggers `TimerModule.setCustomDuration()`
    - Confirm `#task-form` submit calls `TaskModule.addTask()`
    - Confirm sort `data-sort` buttons call `TaskModule.setSortOrder()`
    - Confirm `#link-form` submit calls `LinkModule.addLink()`
    - Confirm no inline `<script>` blocks or inline `style` attributes exist in `index.html`
    - _Requirements: 9.5, Design: Module Responsibilities_

  - [x]* 10.3 Write integration smoke test
    - Write a Playwright (or equivalent) test that opens `index.html` directly (file:// or local static server)
    - Assert clock text matches `HH:MM:SS` format and updates after 1 second
    - Add a task, verify it appears in the list; reload, verify it persists
    - Start timer, let it count down 2 ticks, stop it; verify display is frozen
    - Toggle theme, verify `<html>` class changes; reload, verify theme persists
    - Add a quick link, click it (intercept `window.open`), verify it was called with correct URL and `_blank`
    - _Requirements: 7.1–7.4, 10.1–10.3_

- [x] 11. Final checkpoint — full test suite
  - Run all unit tests, property tests, and integration tests. Verify no test failures. Ask the user if any questions arise before closing out.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Every task references the specific requirements clauses and design sections it implements for full traceability
- Checkpoints (tasks 6 and 11) are manual verification gates — ensure tests pass before crossing each one
- Property tests use [fast-check](https://github.com/dubzzz/fast-check); each test must run a minimum of 100 iterations and carry a `// Feature: todo-life-dashboard, Property N: <text>` comment per the design Testing Strategy
- Unit tests use a mocked `localStorage` shim so they run in Node without a browser
- The `StorageModule` must be the first module loaded (no other module calls Storage at import time; all Storage calls happen inside functions)
- `crypto.randomUUID()` is available in all target browsers (Chrome, Firefox, Edge, Safari stable) — no polyfill needed
- The single-file constraint (one JS file, one CSS file) is a hard requirement — do not split modules into separate files

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["5.3"] },
    { "id": 8, "tasks": ["5.4", "5.5", "7.1"] },
    { "id": 9, "tasks": ["7.2"] },
    { "id": 10, "tasks": ["7.3", "7.4"] },
    { "id": 11, "tasks": ["7.5"] },
    { "id": 12, "tasks": ["7.6", "7.7", "8.1"] },
    { "id": 13, "tasks": ["8.2"] },
    { "id": 14, "tasks": ["8.3", "8.4", "9.1"] },
    { "id": 15, "tasks": ["9.2"] },
    { "id": 16, "tasks": ["9.3"] },
    { "id": 17, "tasks": ["10.1"] },
    { "id": 18, "tasks": ["10.2"] },
    { "id": 19, "tasks": ["10.3"] }
  ]
}
```
