// js/app.js — To-Do List Life Dashboard application logic

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------

class StorageError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'StorageError';
  }
}

class ValidationError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// StorageModule — wraps all localStorage access
// ---------------------------------------------------------------------------

const StorageModule = (() => {
  // Storage keys
  const KEYS = {
    tasks:    'tld_tasks',
    links:    'tld_links',
    duration: 'tld_duration',
    theme:    'tld_theme',
    probe:    'tld_probe',
  };

  // Defaults
  const DEFAULTS = {
    tasks:    [],
    links:    [],
    duration: 25,
    theme:    'dark',
  };

  // Test whether localStorage is available by writing/reading a probe key.
  let storageAvailable = false;
  try {
    localStorage.setItem(KEYS.probe, '1');
    if (localStorage.getItem(KEYS.probe) === '1') {
      storageAvailable = true;
    }
    localStorage.removeItem(KEYS.probe);
  } catch (_) {
    storageAvailable = false;
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Read a raw value from localStorage and JSON-parse it.
   * Returns `undefined` on any error (unavailable, missing key, parse failure).
   */
  function _read(key) {
    if (!storageAvailable) return undefined;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return undefined;
      return JSON.parse(raw);
    } catch (_) {
      return undefined;
    }
  }

  /**
   * Write a value to localStorage as JSON.
   * Throws StorageError when the quota is exceeded.
   * Throws StorageError when storage is unavailable.
   */
  function _write(key, value) {
    if (!storageAvailable) {
      throw new StorageError('localStorage is not available');
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22 ||
          err.code === 1014)
      ) {
        throw new StorageError('Could not save — storage full');
      }
      throw new StorageError(err.message || 'localStorage write failed');
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns true if `el` is a structurally valid Task object.
   * @param {*} el
   * @returns {boolean}
   */
  function _isValidTask(el) {
    return (
      el !== null &&
      typeof el === 'object' &&
      typeof el.id === 'string' &&
      typeof el.description === 'string' &&
      el.description.length >= 1 &&
      el.description.length <= 500 &&
      typeof el.completed === 'boolean' &&
      typeof el.createdAt === 'number'
    );
  }

  /**
   * Returns true if `el` is a structurally valid Link object.
   * @param {*} el
   * @returns {boolean}
   */
  function _isValidLink(el) {
    return (
      el !== null &&
      typeof el === 'object' &&
      typeof el.id === 'string' &&
      typeof el.label === 'string' &&
      el.label.length >= 1 &&
      el.label.length <= 50 &&
      typeof el.url === 'string' &&
      (el.url.startsWith('http://') || el.url.startsWith('https://')) &&
      el.url.length <= 2048
    );
  }

  /** @returns {Array} stored task array, or [] on any error */
  function getTasks() {
    const value = _read(KEYS.tasks);
    if (!Array.isArray(value)) return DEFAULTS.tasks;
    // Silently drop any elements that fail schema validation.
    return value.filter(_isValidTask);
  }

  /** @param {Array} tasks */
  function setTasks(tasks) {
    _write(KEYS.tasks, tasks);
  }

  /** @returns {Array} stored link array, or [] on any error */
  function getLinks() {
    const value = _read(KEYS.links);
    if (!Array.isArray(value)) return DEFAULTS.links;
    // Silently drop any elements that fail schema validation; cap at 20.
    const valid = value.filter(_isValidLink);
    return valid.slice(0, 20);
  }

  /** @param {Array} links */
  function setLinks(links) {
    _write(KEYS.links, links);
  }

  /**
   * @returns {number} stored session duration in minutes, or 25 on any error
   */
  function getDuration() {
    const value = _read(KEYS.duration);
    // Must be an integer in [1, 120]; anything else falls back to default.
    if (!Number.isInteger(value) || value < 1 || value > 120) return DEFAULTS.duration;
    return value;
  }

  /** @param {number} n — integer minutes */
  function setDuration(n) {
    _write(KEYS.duration, n);
  }

  /**
   * @returns {"dark"|"light"} stored theme, or "dark" on any error
   */
  function getTheme() {
    const value = _read(KEYS.theme);
    if (value !== 'dark' && value !== 'light') return DEFAULTS.theme;
    return value;
  }

  /** @param {"dark"|"light"} t */
  function setTheme(t) {
    _write(KEYS.theme, t);
  }

  /**
   * Convenience helper: read all four keys at once.
   * @returns {{ tasks: Array, links: Array, duration: number, theme: string }}
   */
  function loadAll() {
    return {
      tasks:    getTasks(),
      links:    getLinks(),
      duration: getDuration(),
      theme:    getTheme(),
    };
  }

  return {
    getTasks,
    setTasks,
    getLinks,
    setLinks,
    getDuration,
    setDuration,
    getTheme,
    setTheme,
    loadAll,
    /** Expose flag for error-banner logic in init sequence */
    isAvailable: () => storageAvailable,
  };
})();

// ---------------------------------------------------------------------------
// ThemeModule — dark / light theme toggle and persistence
// ---------------------------------------------------------------------------

const ThemeModule = (() => {
  function _applyTheme(theme) {
    const html = document.documentElement;
    html.classList.remove('theme-dark', 'theme-light');
    html.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
  }

  function init(theme) {
    const safe = (theme === 'dark' || theme === 'light') ? theme : 'dark';
    _applyTheme(safe);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggle);
  }

  function toggle() {
    const current = getCurrent();
    const next = current === 'dark' ? 'light' : 'dark';
    _applyTheme(next);
    try { StorageModule.setTheme(next); } catch (_) { /* non-fatal */ }
  }

  function getCurrent() {
    return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
  }

  return { init, toggle, getCurrent };
})();

// ---------------------------------------------------------------------------
// GreetingModule — real-time clock, date display, and time-of-day greeting
// ---------------------------------------------------------------------------

const GreetingModule = (() => {
  /**
   * Zero-pad a number to 2 digits.
   * @param {number} n
   * @returns {string}
   */
  function _pad(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * Format a Date as HH:MM:SS (24-hour, zero-padded).
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    return `${_pad(date.getHours())}:${_pad(date.getMinutes())}:${_pad(date.getSeconds())}`;
  }

  /**
   * Format a Date as a human-readable locale string.
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Return the appropriate greeting string for the given hour (0–23).
   * @param {number} hour
   * @returns {string}
   */
  function getGreeting(hour) {
    if (hour >= 0 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /**
   * One clock tick: update #clock, #date, and #greeting.
   * Falls back gracefully if Date() throws.
   */
  function tick() {
    const clockEl    = document.getElementById('clock');
    const dateEl     = document.getElementById('date');
    const greetingEl = document.getElementById('greeting');

    try {
      const now = new Date();
      if (clockEl)    clockEl.textContent    = formatTime(now);
      if (dateEl)     dateEl.textContent     = formatDate(now);
      if (greetingEl) greetingEl.textContent = getGreeting(now.getHours());
    } catch (_) {
      if (clockEl)    clockEl.textContent    = 'Time unavailable';
      if (greetingEl) greetingEl.textContent = '';
    }
  }

  /**
   * Start the greeting panel: fire an immediate tick, then update every second.
   */
  function init() {
    tick();
    setInterval(tick, 1000);
  }

  return { init, tick, formatTime, formatDate, getGreeting };
})();

// ---------------------------------------------------------------------------
// TimerModule — Pomodoro countdown timer
// ---------------------------------------------------------------------------

const TimerModule = (() => {
  // ---- module state ----
  let intervalId       = null;
  let remainingSeconds = 0;
  let sessionDuration  = 25 * 60;  // seconds
  let isRunning        = false;

  // ---- display ----
  /**
   * Format a total-seconds value as MM:SS (zero-padded).
   * @param {number} totalSeconds
   * @returns {string}
   */
  function formatCountdown(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function _updateDisplay() {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = formatCountdown(remainingSeconds);
  }

  // ---- controls ----

  /**
   * Start the countdown. No-op if already running (idempotent).
   * Disables the duration input while running.
   */
  function start() {
    if (isRunning) return;
    isRunning = true;
    const input = document.getElementById('duration-input');
    if (input) input.disabled = true;
    intervalId = setInterval(_tick, 1000);
  }

  /**
   * Stop the countdown. Clears the interval and re-enables the duration input.
   */
  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isRunning = false;
    const input = document.getElementById('duration-input');
    if (input) input.disabled = false;
  }

  /**
   * Reset the countdown to the current session duration without starting it.
   */
  function reset() {
    stop();
    remainingSeconds = sessionDuration;
    _updateDisplay();
  }

  // ---- custom duration / beep ----

  /**
   * Validate and apply a new session duration.
   * @param {number|string} minutes — must be a whole number in [1, 120]
   * @returns {ValidationError|undefined}
   */
  function setCustomDuration(minutes) {
    const errorEl = document.getElementById('duration-error');
    const n = Number(minutes);
    if (!Number.isInteger(n) || n < 1 || n > 120) {
      if (errorEl) errorEl.textContent = 'Duration must be a whole number between 1 and 120.';
      return new ValidationError('Invalid duration: ' + minutes);
    }
    if (errorEl) errorEl.textContent = '';
    sessionDuration = n * 60;
    try { StorageModule.setDuration(n); } catch (_) { /* non-fatal */ }
    reset();
  }

  /**
   * Play a 1-second audio beep when the countdown reaches zero.
   * Primary: Web Audio API (AudioContext) sine-wave tone at 880 Hz.
   * Fallback: <audio> element with a data-URI encoded WAV.
   */
  function playBeep() {
    // Primary: AudioContext sine-wave tone for 1 second
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('No AudioContext');
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;      // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.0);
      oscillator.onended = () => ctx.close();
      return;
    } catch (_) { /* fall through to audio element fallback */ }

    // Fallback: short beep via <audio> with a data-URI (base64 WAV)
    try {
      const audio = document.createElement('audio');
      // Minimal silent WAV placeholder — enough to trigger the audio pipeline
      // in environments where AudioContext is blocked but <audio> autoplay is allowed.
      audio.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYB1T18A';
      audio.volume = 0.5;
      audio.play().catch(() => { /* silent failure if autoplay is blocked */ });
    } catch (_) { /* complete silence is acceptable */ }
  }

  // ---- internal tick ----
  function _tick() {
    remainingSeconds -= 1;
    _updateDisplay();
    if (remainingSeconds <= 0) {
      stop();
      playBeep();
    }
  }

  // ---- init ----
  function init(durationMinutes) {
    sessionDuration = ((durationMinutes && Number.isInteger(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 120)
      ? durationMinutes : 25) * 60;
    reset();

    // Wire button event listeners
    const btnStart = document.getElementById('timer-start');
    const btnStop  = document.getElementById('timer-stop');
    const btnReset = document.getElementById('timer-reset');
    if (btnStart) btnStart.addEventListener('click', start);
    if (btnStop)  btnStop.addEventListener('click', stop);
    if (btnReset) btnReset.addEventListener('click', reset);

    // Wire duration input change to setCustomDuration
    const durationInput = document.getElementById('duration-input');
    if (durationInput) {
      durationInput.addEventListener('change', () => {
        setCustomDuration(durationInput.value);
      });
    }
  }

  return { init, start, stop, reset, formatCountdown, setCustomDuration, playBeep };
})();

// ---------------------------------------------------------------------------
// TaskModule — task CRUD, sort, and rendering
// ---------------------------------------------------------------------------

const TaskModule = (() => {
  /** @type {Task[]} in-memory canonical task list (insertion order) */
  let tasks     = [];
  let sortOrder = 'created';

  /** @returns {string} a UUID v4 */
  function _generateId() {
    return crypto.randomUUID();
  }

  /** @param {Task[]} initialTasks */
  function init(initialTasks) {
    tasks = Array.isArray(initialTasks) ? initialTasks : [];

    const taskForm = document.getElementById('task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', e => {
        e.preventDefault();
        const inputEl = document.getElementById('task-input');
        addTask(inputEl ? inputEl.value : '');
      });
    }

    // Wire sort buttons
    document.querySelectorAll('[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => setSortOrder(btn.dataset.sort));
    });

    render();
  }

  // ---- CRUD (implemented in tasks 7.2–7.3) ----
  function addTask(description) {
    const inputEl   = document.getElementById('task-input');
    const errorEl   = document.getElementById('task-input-error');
    const storageEl = document.getElementById('task-storage-error');
    const trimmed   = (description || '').trim();

    if (!trimmed) {
      if (errorEl) errorEl.textContent = 'Task description cannot be empty.';
      return new ValidationError('Empty task description');
    }
    if (errorEl) errorEl.textContent = '';

    const newTask = {
      id:          _generateId(),
      description: trimmed,
      completed:   false,
      createdAt:   Date.now(),
    };

    // Persist first — abort if storage fails (requirement 3.4, 3.5)
    try {
      StorageModule.setTasks([...tasks, newTask]);
    } catch (err) {
      if (storageEl) storageEl.textContent = 'Could not save — storage unavailable.';
      return err;
    }

    tasks.push(newTask);
    if (storageEl) storageEl.textContent = '';
    if (inputEl)   inputEl.value = '';
    render();
    return newTask;
  }

  function deleteTask(id) {
    const storageEl = document.getElementById('task-storage-error');
    tasks = tasks.filter(t => t.id !== id);
    try {
      StorageModule.setTasks(tasks);
      if (storageEl) storageEl.textContent = '';
    } catch (_) {
      if (storageEl) storageEl.textContent = 'Change could not be saved.';
    }
    render();
  }
  function editTask(id, newDesc) {
    const storageEl = document.getElementById('task-storage-error');
    const trimmed   = (newDesc || '').trim();
    const task      = tasks.find(t => t.id === id);
    if (!task) return new ValidationError('Task not found: ' + id);

    if (!trimmed) {
      // Return ValidationError — the inline edit UI (render) will handle restoring text
      return new ValidationError('Task description cannot be blank');
    }

    task.description = trimmed;

    try {
      StorageModule.setTasks(tasks);
      if (storageEl) storageEl.textContent = '';
    } catch (_) {
      if (storageEl) storageEl.textContent = 'Change could not be saved.';
    }

    render();
    return task;
  }

  function toggleComplete(id) {
    const storageEl = document.getElementById('task-storage-error');
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;

    try {
      StorageModule.setTasks(tasks);
      if (storageEl) storageEl.textContent = '';
    } catch (_) {
      if (storageEl) storageEl.textContent = 'Change could not be saved.';
    }

    render();
  }

  // ---- sort (task 7.4) ----
  function setSortOrder(order) {
    if (['created', 'alpha', 'completion'].includes(order)) {
      sortOrder = order;
    }
    render();
  }

  function _getSortedCopy() {
    return tasks.slice().sort((a, b) => {
      if (sortOrder === 'alpha') {
        const cmp = a.description.toLowerCase().localeCompare(b.description.toLowerCase());
        return cmp !== 0 ? cmp : a.createdAt - b.createdAt;
      }
      if (sortOrder === 'completion') {
        // incomplete (false) first, complete (true) last
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.createdAt - b.createdAt;
      }
      // default: 'created' — createdAt ascending
      return a.createdAt - b.createdAt;
    });
  }

  // ---- render (task 7.5) ----
  function render() {
    const list = document.getElementById('task-list');
    if (!list) return;

    // Clear existing items
    list.innerHTML = '';

    // Update sort button active states
    document.querySelectorAll('[data-sort]').forEach(btn => {
      const isActive = btn.dataset.sort === sortOrder;
      btn.setAttribute('aria-pressed', String(isActive));
      btn.classList.toggle('sort-active', isActive);
    });

    // Build list from sorted copy
    _getSortedCopy().forEach(task => {
      const li = document.createElement('li');
      li.dataset.taskId = task.id;

      // Checkbox — toggles completion
      const checkbox = document.createElement('input');
      checkbox.type    = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark "${task.description}" as ${task.completed ? 'incomplete' : 'complete'}`);
      checkbox.addEventListener('change', () => toggleComplete(task.id));

      // Description span
      const span = document.createElement('span');
      span.textContent = task.description;
      if (task.completed) span.classList.add('completed');

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.type        = 'button';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);
      editBtn.addEventListener('click', () => _startInlineEdit(li, task, span));

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.type        = 'button';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('aria-label', `Delete task: ${task.description}`);
      delBtn.addEventListener('click', () => deleteTask(task.id));

      li.append(checkbox, span, editBtn, delBtn);
      list.appendChild(li);
    });
  }

  function _startInlineEdit(li, task, span) {
    // Replace span with an input field
    const input = document.createElement('input');
    input.type      = 'text';
    input.value     = task.description;
    input.maxLength = 500;
    input.setAttribute('aria-label', 'Edit task description');

    const originalDesc = task.description;

    function _commitEdit() {
      const result = editTask(task.id, input.value);
      if (result instanceof ValidationError) {
        // Show inline error in the edit field, restore original
        input.setAttribute('aria-invalid', 'true');
        input.title = 'Description cannot be blank';
        // Restore the span
        li.replaceChild(span, input);
        span.textContent = originalDesc;
      }
    }

    function _cancelEdit() {
      li.replaceChild(span, input);
      span.textContent = originalDesc;
    }

    input.addEventListener('blur', _commitEdit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.removeEventListener('blur', _commitEdit); li.replaceChild(span, input); }
    });

    li.replaceChild(input, span);
    input.focus();
    input.select();
  }

  return {
    init,
    addTask,
    deleteTask,
    editTask,
    toggleComplete,
    setSortOrder,
    render,
  };
})();

// ---------------------------------------------------------------------------
// LinkModule — quick links CRUD and rendering
// ---------------------------------------------------------------------------

const LinkModule = (() => {
  /** @type {Link[]} in-memory link list */
  let links = [];

  function init(initialLinks) {
    links = Array.isArray(initialLinks) ? initialLinks : [];

    const linkForm = document.getElementById('link-form');
    if (linkForm) {
      linkForm.addEventListener('submit', e => {
        e.preventDefault();
        const labelEl = document.getElementById('link-label-input');
        const urlEl   = document.getElementById('link-url-input');
        addLink(labelEl ? labelEl.value : '', urlEl ? urlEl.value : '');
      });
    }

    render();
  }

  function addLink(label, url) {
    const errorEl   = document.getElementById('link-error');
    const trimLabel = (label || '').trim();
    const trimUrl   = (url   || '').trim();

    // Validate label
    if (!trimLabel || trimLabel.length > 50) {
      if (errorEl) errorEl.textContent = trimLabel
        ? 'Label must be 50 characters or fewer.'
        : 'Label is required.';
      return new ValidationError('Invalid label');
    }

    // Validate URL
    if (!trimUrl.startsWith('http://') && !trimUrl.startsWith('https://')) {
      if (errorEl) errorEl.textContent = 'URL must start with http:// or https://.';
      return new ValidationError('Invalid URL protocol');
    }
    if (trimUrl.length > 2048) {
      if (errorEl) errorEl.textContent = 'URL must be 2048 characters or fewer.';
      return new ValidationError('URL too long');
    }

    // Cap at 20
    if (links.length >= 20) {
      if (errorEl) errorEl.textContent = 'Maximum 20 links reached.';
      return new ValidationError('Link list full');
    }

    if (errorEl) errorEl.textContent = '';

    const newLink = { id: crypto.randomUUID(), label: trimLabel, url: trimUrl };
    links.push(newLink);

    try {
      StorageModule.setLinks(links);
    } catch (_) {
      if (errorEl) errorEl.textContent = 'Could not save — storage unavailable.';
    }

    // Clear inputs
    const labelEl = document.getElementById('link-label-input');
    const urlEl   = document.getElementById('link-url-input');
    if (labelEl) labelEl.value = '';
    if (urlEl)   urlEl.value   = '';

    render();
    return newLink;
  }

  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    try {
      StorageModule.setLinks(links);
    } catch (_) { /* silent — link removed from memory regardless */ }
    render();
  }

  // ---- render ----
  function render() {
    const list = document.getElementById('link-list');
    if (!list) return;

    list.innerHTML = '';

    if (links.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'No quick links saved yet.';
      empty.className   = 'link-empty-state';
      list.appendChild(empty);
      return;
    }

    links.forEach(link => {
      const li = document.createElement('li');

      // Link button — opens URL in new tab
      const linkBtn = document.createElement('button');
      linkBtn.type        = 'button';
      linkBtn.textContent = link.label;
      linkBtn.setAttribute('aria-label', `Open ${link.label}`);
      linkBtn.addEventListener('click', () => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.type        = 'button';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
      delBtn.addEventListener('click', () => deleteLink(link.id));

      li.append(linkBtn, delBtn);
      list.appendChild(li);
    });
  }

  return { init, addLink, deleteLink, render };
})();

// ---------------------------------------------------------------------------
// Top-level initialisation sequence
// ---------------------------------------------------------------------------

/**
 * Show a load-failure banner with a Retry button.
 * Called if DOMContentLoaded has not fired within 5 seconds.
 */
function _showLoadFailure() {
  const banner = document.createElement('div');
  banner.id = 'load-failure';
  banner.innerHTML = `
    <p>The dashboard failed to load.</p>
    <button type="button" onclick="location.reload()">Retry</button>
  `;
  // Append to body if it exists, otherwise to documentElement
  (document.body || document.documentElement).appendChild(banner);
}

// 5-second safety net (req 10.5): show failure indicator if init does not complete
const _loadTimeoutId = setTimeout(_showLoadFailure, 5000);

document.addEventListener('DOMContentLoaded', () => {
  // Cancel the failure timeout — we got here in time
  clearTimeout(_loadTimeoutId);

  // Load persisted data
  const { tasks, links, duration, theme } = StorageModule.loadAll();

  // Show storage-unavailable banner if storage is blocked
  if (!StorageModule.isAvailable()) {
    const banner = document.createElement('p');
    banner.setAttribute('role', 'alert');
    banner.textContent = 'Storage is unavailable — changes will not be saved.';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:0.5rem;text-align:center;z-index:100;';
    document.body.prepend(banner);
  }

  // Initialise modules in dependency order
  ThemeModule.init(theme);
  GreetingModule.init();
  TimerModule.init(duration);
  TaskModule.init(tasks);
  LinkModule.init(links);
});
