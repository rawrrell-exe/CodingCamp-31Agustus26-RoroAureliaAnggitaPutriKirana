# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application that serves as a personal productivity hub. It combines a real-time greeting with time/date display, a Pomodoro focus timer, a task management list, and a quick links panel — all persisted via the browser's Local Storage API. The interface uses a dark theme with pink accents and must work across modern desktop and mobile browsers with no backend or build tooling required.

The project follows a strict single-file constraint: one CSS file inside `css/` and one JavaScript file inside `js/`.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Panel**: The UI section that displays the current time, date, and a time-of-day greeting message.
- **Focus_Timer**: The Pomodoro-style countdown timer component.
- **Task_Manager**: The component responsible for creating, reading, updating, and deleting tasks.
- **Task**: A single to-do item with a text description and a completion state.
- **Quick_Links**: The component that stores and displays shortcut buttons to user-defined URLs.
- **Link**: A single quick-link entry with a label and a URL.
- **Storage**: The browser's Local Storage API used for all client-side persistence.
- **Theme_Toggle**: The UI control that switches between dark and light visual themes.
- **Session**: A single Pomodoro interval (default 25 minutes, configurable by the user).

---

## Requirements

### Requirement 1: Real-Time Greeting Panel

**User Story:** As a user, I want to see the current time, date, and a personalized greeting when I open the Dashboard, so that I am oriented in the day at a glance.

#### Acceptance Criteria

1. THE Greeting_Panel SHALL display the current time in HH:MM:SS 24-hour format, updated every 1 second without requiring a page reload.
2. THE Greeting_Panel SHALL display the current date in a human-readable format (e.g., "Monday, 25 August 2025") using the user's local locale.
3. WHEN the local time is between 00:00:00 and 11:59:59, THE Greeting_Panel SHALL display the greeting "Good Morning".
4. WHEN the local time is between 12:00:00 and 17:59:59, THE Greeting_Panel SHALL display the greeting "Good Afternoon".
5. WHEN the local time is between 18:00:00 and 23:59:59, THE Greeting_Panel SHALL display the greeting "Good Evening".
6. WHEN the Dashboard is opened, THE Greeting_Panel SHALL display the current time, date, and greeting within 1 second of page load completion.
7. IF the user's local time cannot be determined, THEN THE Greeting_Panel SHALL display a static placeholder indicating time is unavailable and omit the greeting.

---

### Requirement 2: Focus Timer (Pomodoro)

**User Story:** As a user, I want a Pomodoro-style countdown timer, so that I can manage focused work sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display the current session duration in MM:SS format (e.g., 25:00) on initial load, defaulting to 25:00 if no custom duration is persisted in Storage.
2. WHEN the user activates the Start control while the timer is not counting down, THE Focus_Timer SHALL begin counting down in one-second decrements, updating the displayed time once per second.
3. WHEN the user activates the Stop control while the timer is counting down, THE Focus_Timer SHALL pause the countdown; the displayed time SHALL remain frozen at the paused value until the Start or Reset control is activated.
4. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and reset the displayed time to the current session duration.
5. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and play an audio signal of at least 1 second duration to notify the user.
6. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the session duration input field so the duration cannot be changed.
7. WHERE the user has configured a custom session duration, THE Focus_Timer SHALL use that duration instead of the 25-minute default on Reset and on page reload.
8. WHEN the user submits a custom session duration, THE Focus_Timer SHALL accept only whole-number values between 1 and 120 minutes inclusive and update the session duration.
9. IF the user submits a custom session duration value that is not a whole number or is outside the range 1–120, THEN THE Focus_Timer SHALL display an inline error message, retain the previous session duration, and not interrupt any active countdown.
10. WHEN the user activates the Start control while the timer is already counting down, THE Focus_Timer SHALL ignore the activation without resetting or altering the current countdown.

---

### Requirement 3: Task Manager — Add and Display Tasks

**User Story:** As a user, I want to add tasks and see them listed on the Dashboard, so that I can track what I need to do.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task description of 1 to 200 characters, THE Task_Manager SHALL add a new Task to the list with an incomplete completion state and display it in the task list without requiring a page reload.
2. IF the user submits an empty or whitespace-only task description, THEN THE Task_Manager SHALL reject the submission, preserve the contents of the input field, and display an inline validation message adjacent to the input field.
3. THE Task_Manager SHALL display all stored Tasks on page load by reading from Storage within 2 seconds of the page load event, rendering each Task with its description and completion state.
4. THE Task_Manager SHALL persist every Task to Storage immediately after the Task is added, before the task list display is updated.
5. IF Storage is unavailable when persisting a Task, THEN THE Task_Manager SHALL display an error message indicating the Task could not be saved and shall not add the Task to the displayed task list.
6. IF Storage is unavailable on page load, THEN THE Task_Manager SHALL display an error message indicating tasks could not be loaded and render an empty task list.

---

### Requirement 4: Task Manager — Edit, Complete, and Delete Tasks

**User Story:** As a user, I want to edit, mark as done, and delete tasks, so that I can keep my list accurate and up to date.

#### Acceptance Criteria

1. WHEN the user activates the edit control for a Task, THE Task_Manager SHALL replace the Task's display text with an editable input field pre-filled with the current Task description, and the input field SHALL have a maximum length of 500 characters.
2. WHEN the user confirms an edit with a value containing at least 1 non-whitespace character, THE Task_Manager SHALL update the Task description to the trimmed value and persist the change to Storage.
3. IF the user confirms an edit with an empty or whitespace-only value, THEN THE Task_Manager SHALL reject the change, restore the original Task description in the display, and indicate to the user that the Task description cannot be blank.
4. WHEN the user activates the complete control for a Task, THE Task_Manager SHALL toggle the Task's completion state between true and false and persist the updated state to Storage.
5. WHEN the user activates the delete control for a Task, THE Task_Manager SHALL remove the Task from the list and permanently delete the Task record from Storage.
6. WHILE a Task's completion state is true, THE Task_Manager SHALL apply a strikethrough style to the Task's display text.
7. IF Storage is unavailable when the Task_Manager attempts to persist a change, THEN THE Task_Manager SHALL retain the change in the current session and indicate to the user that the change could not be saved.

---

### Requirement 5: Task Manager — Sort Tasks

**User Story:** As a user, I want to sort my task list, so that I can prioritize and review tasks in a useful order.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide sort controls that allow the user to order Tasks by: (a) creation order ascending by creation timestamp (default), (b) alphabetical A–Z order by description case-insensitively, and (c) completion state with incomplete Tasks first then completed Tasks.
2. WHEN the user selects a sort order, THE Task_Manager SHALL re-render the Task list in the selected order within 300 milliseconds without modifying the underlying Storage data.
3. THE Task_Manager SHALL visually indicate the currently active sort option in the sort controls.
4. WHEN two Tasks are equal under the selected sort criterion, THE Task_Manager SHALL use creation timestamp ascending as a tiebreaker.
5. THE Task_Manager SHALL retain the user's selected sort order for the duration of the page session; WHEN new Tasks are added or Tasks are completed, THE Task_Manager SHALL re-render the list applying the currently retained sort.

---

### Requirement 6: Quick Links

**User Story:** As a user, I want to save and display shortcut buttons to my favorite websites, so that I can navigate to them quickly from the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a Link with a label of 1–50 characters and a URL beginning with `http://` or `https://` and no longer than 2048 characters, THE Quick_Links SHALL add the Link to the displayed list and persist it to Storage.
2. IF the user submits a Link with an empty label, a label exceeding 50 characters, a URL that does not begin with `http://` or `https://`, or a URL exceeding 2048 characters, THEN THE Quick_Links SHALL reject the submission without saving and display an inline validation error adjacent to the invalid field identifying which field is invalid and why.
3. THE Quick_Links SHALL display all stored Links as clickable buttons on page load by reading from Storage, and SHALL display an empty state message when no Links are stored.
4. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab without navigating away from the Dashboard.
5. WHEN the user activates the delete control for a Link, THE Quick_Links SHALL remove the Link from the display and from Storage, and SHALL display an empty state message if no Links remain.
6. THE Quick_Links SHALL support storing and displaying a maximum of 20 Links; IF the user attempts to add a Link when 20 Links are already stored, THEN THE Quick_Links SHALL reject the submission and display an inline error indicating the maximum limit has been reached.

---

### Requirement 7: Data Persistence

**User Story:** As a user, I want my tasks, links, and timer settings to survive page reloads, so that I never lose my data.

#### Acceptance Criteria

1. THE Storage SHALL persist the complete Task list, where each task entry contains a text description of 1–500 characters and a boolean completion state, across page reloads.
2. THE Storage SHALL persist all Quick Links, where each entry contains a label of 1–100 characters and a valid URL of 1–2000 characters, across page reloads, supporting a maximum of 20 Quick Links.
3. THE Storage SHALL persist the user's configured session duration, which must be a whole number of minutes between 1 and 120, across page reloads.
4. THE Storage SHALL persist the user's selected Theme, which must be one of the two values "dark" or "light", across page reloads.
5. IF Storage is unavailable or the retrieved value for a key fails to match the expected type or allowed values for that key, THEN THE Dashboard SHALL discard that value, apply the default for that key (Task list: empty list; Quick Links: empty list; session duration: 25 minutes; Theme: dark), and continue operating without interruption.
6. WHEN any Task, Quick Link, session duration, or Theme value is created or modified, THE Storage SHALL write the updated value before the next user interaction is processed.

---

### Requirement 8: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between dark and light themes, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL apply the dark theme by default on first load when no previously persisted theme exists in Storage.
2. WHEN the user activates the Theme_Toggle, THE Dashboard SHALL switch the active theme from dark to light or from light to dark within 100 milliseconds.
3. WHEN the user activates the Theme_Toggle, THE Dashboard SHALL persist the newly selected theme to Storage, replacing any previously stored theme value.
4. WHEN the page loads and a previously persisted theme value exists in Storage, THE Dashboard SHALL restore the persisted theme instead of applying the default dark theme.
5. WHILE the dark theme is active, THE Dashboard SHALL apply dark background colors to all page surfaces and pink accent colors to interactive elements including buttons, links, and focus indicators.
6. WHILE the light theme is active, THE Dashboard SHALL apply light background colors to all page surfaces and pink accent colors to interactive elements including buttons, links, and focus indicators.
7. IF the persisted theme value in Storage is unrecognized or corrupted, THEN THE Dashboard SHALL fall back to the dark theme default.

---

### Requirement 9: Layout and Code Structure

**User Story:** As a developer, I want the project to follow a strict single-file structure, so that the codebase remains clean and easy to maintain.

#### Acceptance Criteria

1. THE Dashboard SHALL include exactly one CSS file located at `css/style.css`; no additional CSS files SHALL exist in the project.
2. THE Dashboard SHALL include exactly one JavaScript file located at `js/app.js`; no additional JavaScript files SHALL exist in the project.
3. THE Dashboard SHALL use semantic HTML5 elements (e.g., `<header>`, `<main>`, `<section>`, `<button>`) for all structural markup; `<div>` and `<span>` elements SHALL NOT be used where a semantic equivalent is available.
4. THE Dashboard SHALL function as a standalone web application that can be opened by loading `index.html` directly in a browser without a server, build step, or non-CDN network request.
5. THE Dashboard SHALL contain no inline styles and no inline `<script>` blocks that contain application logic; all styles SHALL reside in `css/style.css` and all application logic SHALL reside in `js/app.js`.

---

### Requirement 10: Performance and Browser Compatibility

**User Story:** As a user, I want the Dashboard to load quickly and work reliably across modern browsers, so that I can rely on it as my daily productivity tool.

#### Acceptance Criteria

1. THE Dashboard SHALL complete its initial render, including all visible UI components and default data, in under 2 seconds on a connection with a minimum download speed of 25 Mbps.
2. THE Dashboard SHALL respond to all user interactions (adding tasks, toggling theme, starting timer) within 100 milliseconds of the interaction event being triggered, measured from the event firing to the first visible UI change.
3. THE Dashboard SHALL operate correctly in the current stable releases of Chrome, Firefox, Edge, and Safari, where "correctly" means all acceptance criteria in this document pass without error or visual defect in each browser.
4. THE Dashboard SHALL render all content and controls without overflow, clipping, or element overlap on viewport widths from 320px to 2560px.
5. IF the Dashboard fails to complete its initial render within 5 seconds, THEN THE Dashboard SHALL display a loading failure indicator and provide a retry option to the user.
