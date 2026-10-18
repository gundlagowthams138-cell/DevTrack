
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Timer,
  BarChart3,
  Code2,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Flame,
  Clock3,
  CircleCheck,
  Circle,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Target,
  TrendingUp,
  Zap,
  Coffee,
  CalendarDays,
  Pencil,
  Eye,
  EyeOff,
  LogOut,
  UserRound,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import "./App.css";

const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const TASK_CATEGORIES = ["Learning", "DSA", "Project", "College"];
const TASK_PRIORITIES = ["Low", "Medium", "High"];
const PAGE_TITLES = {
  overview: "Overview",
  tasks: "My Tasks",
  focus: "Focus Room",
  analytics: "Analytics",
  daily: "Daily Progress",
};
const LEGACY_STORAGE_KEYS = [
  "devtrack-tasks",
  "devtrack-focus-log",
  "devtrack-sessions",
  "devtrack-goal",
  "devtrack-dark",
  "devtrack-timer-mode",
  "devtrack-timer-seconds",
];

let storageReadError = "";

function readStorage(key, fallback) {
  try {
    if (typeof window === "undefined") return fallback;
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`Unable to read "${key}" from local storage.`, error);
    storageReadError = "Some saved settings could not be read. Default values are being used.";
    return fallback;
  }
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return getDateKey(new Date());
}

function getPageFromHash() {
  const page = window.location.hash.slice(1);
  return Object.hasOwn(PAGE_TITLES, page) ? page : "overview";
}

function getInitialDailyCompletions(username) {
  const value = readStorage(
    userStorageKey(username, "devtrack-daily-completions"),
    {}
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    console.error('Saved daily completions in "devtrack-daily-completions" are invalid.');
    storageReadError = "Saved daily progress was invalid. An empty tracker is being used.";
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([date, completed]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof completed === "boolean"
    )
  );
}

function getCurrentWeekDays(today) {
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12
  );
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: getDateKey(date),
      dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
      shortDayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      monthName: date.toLocaleDateString("en-US", { month: "short" }),
      dateNumber: date.getDate(),
      fullDate: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      isToday: getDateKey(date) === getDateKey(today),
    };
  });
}

function userStorageKey(username, key) {
  return `devtrack-user:${encodeURIComponent(username.toLowerCase())}:${key}`;
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function normalizePhoneNumber(value) {
  return value.trim().replace(/\D/g, "");
}

function getInitialTasks(username) {
  const savedTasks = readStorage(userStorageKey(username, "devtrack-tasks"), []);
  if (!Array.isArray(savedTasks)) {
    console.error("Saved tasks are not an array.");
    storageReadError = "Saved tasks were invalid. An empty task list is being used.";
    return [];
  }

  const validTasks = savedTasks.filter(
    (task) =>
      task &&
      (typeof task.id === "number" || typeof task.id === "string") &&
      typeof task.title === "string"
  );

  if (validTasks.length !== savedTasks.length) {
    console.error('Some invalid tasks in "devtrack-tasks" were discarded.');
    storageReadError = "Some saved tasks were invalid and have been discarded.";
  }

  return validTasks.map((task) => ({
    ...task,
    category: TASK_CATEGORIES.includes(task.category)
      ? task.category
      : "Learning",
    priority: TASK_PRIORITIES.includes(task.priority)
      ? task.priority
      : "Medium",
    done: Boolean(task.done),
  }));
}

function getInitialFocusLog(username) {
  const value = readStorage(userStorageKey(username, "devtrack-focus-log"), {});
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    console.error('Saved focus data in "devtrack-focus-log" is invalid.');
    storageReadError = "Saved focus data was invalid and has been reset.";
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, seconds]) => Number.isFinite(seconds) && seconds >= 0
    )
  );
}

function getInitialSessions(username) {
  const value = readStorage(userStorageKey(username, "devtrack-sessions"), {});
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    console.error('Saved session data in "devtrack-sessions" is invalid.');
    storageReadError = "Saved session data was invalid and has been reset.";
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, count]) => Number.isInteger(count) && count >= 0
    )
  );
}

function getInitialGoal(username) {
  const goal = readStorage(userStorageKey(username, "devtrack-goal"), 4);
  if (Number.isInteger(goal) && goal >= 1 && goal <= 12) return goal;
  console.error('Saved goal in "devtrack-goal" is invalid; using 4 hours.');
  storageReadError = "Saved focus goal was invalid. The default goal is being used.";
  return 4;
}

function getInitialTheme(username) {
  const theme = readStorage(userStorageKey(username, "devtrack-dark"), true);
  if (typeof theme === "boolean") return theme;
  console.error('Saved theme in "devtrack-dark" is invalid; using dark theme.');
  storageReadError = "Saved theme was invalid. The dark theme is being used.";
  return true;
}

function getInitialMode(username) {
  const mode = readStorage(userStorageKey(username, "devtrack-timer-mode"), "focus");
  if (mode === "focus" || mode === "break") return mode;
  console.error('Saved timer mode is invalid; using focus mode.');
  storageReadError = "Saved timer mode was invalid. Focus mode is being used.";
  return "focus";
}

function getInitialSeconds(mode, username) {
  const defaultSeconds =
    mode === "break" ? BREAK_DURATION : FOCUS_DURATION;

  const seconds = readStorage(
    userStorageKey(username, "devtrack-timer-seconds"),
    defaultSeconds
  );
  if (Number.isInteger(seconds) && seconds >= 0 && seconds <= defaultSeconds) {
    return seconds;
  }
  console.error('Saved timer value is invalid; using the default duration.');
  storageReadError = "Saved timer value was invalid. The default duration is being used.";
  return defaultSeconds;
}

function getLastSevenDays(focusLog) {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return {
      key,
      day: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      hours: (focusLog[key] || 0) / 3600,
    };
  });
}

function normalizeDemoAccount(account, usernameKey = "") {
  if (!account || typeof account !== "object" || Array.isArray(account)) {
    return null;
  }

  const username =
    account.username ?? account.userName ?? account.user_name ?? usernameKey;
  const name = account.name ?? account.fullName ?? account.full_name;
  const phoneNumber =
    account.phoneNumber ??
    account.phone ??
    account.phone_number ??
    account.mobileNumber ??
    account.mobile;

  return {
    ...account,
    ...(typeof name === "string" ? { name } : {}),
    ...(typeof username === "string" ? { username: normalizeUsername(username) } : {}),
    ...(["string", "number"].includes(typeof phoneNumber)
      ? { phoneNumber: normalizePhoneNumber(String(phoneNumber)) }
      : {}),
  };
}

function readDemoAccounts() {
  try {
    const storedAccounts = localStorage.getItem("devtrack-demo-accounts");
    if (storedAccounts === null) return [];

    const parsedAccounts = JSON.parse(storedAccounts);
    if (Array.isArray(parsedAccounts)) {
      const normalized = parsedAccounts.map((account) =>
        normalizeDemoAccount(account)
      );
      if (normalized.some((account) => account === null)) {
        throw new Error("Some saved demo accounts have an unsupported format.");
      }
      return normalized;
    }

    if (!parsedAccounts || typeof parsedAccounts !== "object") {
      throw new Error("Saved demo accounts have an unsupported format.");
    }

    const accountCollection = parsedAccounts.accounts ?? parsedAccounts;
    if (Array.isArray(accountCollection)) {
      return accountCollection.map((account) => normalizeDemoAccount(account));
    }
    if (!accountCollection || typeof accountCollection !== "object") {
      throw new Error("Saved demo accounts have an unsupported format.");
    }

    const isSingleAccount = [parsedAccounts, accountCollection].some(
      (account) =>
        typeof account.username === "string" ||
        typeof account.userName === "string" ||
        typeof account.user_name === "string"
    );

    const entries = isSingleAccount
      ? [["", accountCollection]]
      : Object.entries(accountCollection);
    const normalized = entries.map(([key, account]) =>
      normalizeDemoAccount(account, key)
    );
    if (normalized.some((account) => account === null)) {
      throw new Error("Some saved demo accounts have an unsupported format.");
    }
    return normalized;
  } catch (error) {
    console.error("Unable to read demo accounts from local storage.", error);
    throw new Error(error instanceof SyntaxError
      ? "Saved demo accounts could not be parsed. Existing data was left untouched."
      : error instanceof Error
        ? error.message
        : "Demo accounts could not be read. Existing data was left untouched.");
  }
}

function getInitialUser() {
  try {
    const username = localStorage.getItem("devtrack-demo-session");
    if (!username) return null;
    const account = readDemoAccounts().find(
      (candidate) =>
        typeof candidate.username === "string" &&
        candidate.username.toLowerCase() === username.toLowerCase()
    );
    return account || null;
  } catch (error) {
    storageReadError = error.message;
    return null;
  }
}

function migrateLegacyData(username) {
  try {
    if (localStorage.getItem("devtrack-legacy-migrated") === "true") return;

    LEGACY_STORAGE_KEYS.forEach((key) => {
      const oldValue = localStorage.getItem(key);
      const newKey = userStorageKey(username, key);
      if (oldValue !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldValue);
      }
    });

    localStorage.setItem("devtrack-legacy-migrated", "true");
  } catch (error) {
    console.error("Unable to migrate existing dashboard data.", error);
    throw new Error(
      "Existing dashboard data could not be migrated. Check browser storage and try again."
    );
  }
}

function Authentication({ onAuthenticate, initialError }) {
  const [page, setPage] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
  const signingUp = page === "signup";

  function switchPage(nextPage) {
    setPage(nextPage);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    const normalizedUsername = normalizeUsername(username);
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (signingUp && !name.trim()) {
      setError("Enter your full name to create an account.");
      return;
    }
    if (!/^[a-z0-9_.-]{3,24}$/.test(normalizedUsername)) {
      setError("Username must be 3–24 characters using letters, numbers, dots, underscores, or hyphens.");
      return;
    }
    if (
      !/^[+\d\s().-]+$/.test(phoneNumber.trim()) ||
      normalizedPhone.length < 7 ||
      normalizedPhone.length > 15
    ) {
      setError("Enter a valid phone number with 7 to 15 digits.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (signingUp && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const accounts = readDemoAccounts();
      let account;

      if (signingUp) {
        if (
          accounts.some(
            (candidate) =>
              typeof candidate.username === "string" &&
              normalizeUsername(candidate.username) === normalizedUsername
          )
        ) {
          setError("That username is already taken. Choose another username.");
          return;
        }
        account = {
          name: name.trim(),
          username: normalizedUsername,
          phoneNumber: normalizedPhone,
          password,
          avatar: "",
        };
        const updatedAccounts = [...accounts, account];
        localStorage.setItem(
          "devtrack-demo-accounts",
          JSON.stringify(updatedAccounts)
        );
        const savedAccounts = readDemoAccounts();
        const savedAccount = savedAccounts.find(
          (candidate) =>
            typeof candidate.username === "string" &&
            normalizeUsername(candidate.username) === normalizedUsername
        );
        if (
          !savedAccount ||
          savedAccount.name !== account.name ||
          normalizePhoneNumber(savedAccount.phoneNumber || "") !==
            normalizedPhone ||
          savedAccount.password !== account.password
        ) {
          throw new Error(
            "Your account could not be confirmed in browser storage. Please try again."
          );
        }
        account = savedAccount;
      } else {
        const matchingUsername = accounts.find(
          (candidate) =>
            typeof candidate.username === "string" &&
            normalizeUsername(candidate.username) === normalizedUsername
        );
        if (!matchingUsername) {
          setError("No account exists with that username. Check it or create an account.");
          return;
        }
        if (
          typeof matchingUsername.phoneNumber !== "string" ||
          normalizePhoneNumber(matchingUsername.phoneNumber) !== normalizedPhone
        ) {
          setError(
            "That phone number does not match this username. Enter the same full number, including its country code."
          );
          return;
        }
        if (matchingUsername.password !== password) {
          setError("That password is incorrect. Please try again.");
          return;
        }
        account = matchingUsername;
      }

      migrateLegacyData(account.username);
      localStorage.setItem("devtrack-demo-session", account.username);
      onAuthenticate(account);
    } catch (submitError) {
      console.error("Demo authentication failed.", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save your demo account. Check browser storage."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="About DevTrack">
        <div className="brand auth-brand" aria-label="DevTrack">
          <span className="brand-mark">
            <Code2 size={23} />
          </span>
          <span>
            dev<span className="brand-accent">track</span>
          </span>
        </div>
        <div className="auth-brand-copy">
          <span className="auth-eyebrow">
            <span className="live-dot" />
            YOUR PERSONAL PRODUCTIVITY SPACE
          </span>
          <h1>
            Make room for
            <br />
            <span>meaningful progress.</span>
          </h1>
          <p>
            One calm workspace for your tasks, focus sessions, and the habits
            you are building.
          </p>
          <div className="auth-feature-list">
            <span><CircleCheck size={17} /> Plan your day with intention</span>
            <span><Timer size={17} /> Protect time for deep work</span>
            <span><BarChart3 size={17} /> See your progress add up</span>
          </div>
        </div>
        <span className="auth-footer-note">A little progress, every day.</span>
      </section>

      <section className="auth-form-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <span className="auth-card-kicker">DEMO ACCOUNT</span>
          <h2>{signingUp ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-intro">
            {signingUp
              ? "Set up your personal workspace in a moment."
              : "Log in to pick up where you left off."}
          </p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          {signingUp && (
            <label className="auth-field">
              <span>Full Name</span>
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                maxLength={60}
                required
              />
            </label>
          )}

          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your_username"
              maxLength={24}
              required
            />
          </label>

          <label className="auth-field">
            <span>Phone Number</span>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+1 555 123 4567"
              maxLength={24}
              required
            />
            <span className="auth-field-hint">
              Use the same complete number at login, including the country code.
            </span>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <span className="auth-password-input">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={signingUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {signingUp && (
            <label className="auth-field">
              <span>Confirm password</span>
              <span className="auth-password-input">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((visible) => !visible)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </span>
            </label>
          )}

          <p className="demo-auth-notice">
            Demo authentication only. Account details and passwords are stored
            in this browser and are not secure.
          </p>

          <button
            className="auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Please wait…"
              : signingUp
                ? "Create demo account"
                : "Log in"}
          </button>

          <p className="auth-switch">
            {signingUp ? "Already have an account?" : "New to DevTrack?"}{" "}
            <button
              type="button"
              onClick={() => switchPage(signingUp ? "login" : "signup")}
            >
              {signingUp ? "Log in" : "Create an account"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(getInitialUser);
  const [authError] = useState(storageReadError);

  if (!user) {
    return (
      <Authentication
        onAuthenticate={setUser}
        initialError={authError}
      />
    );
  }

  return (
    <Dashboard
      key={user.username}
      user={user}
      onProfileUpdate={(updates) => {
        try {
          const accounts = readDemoAccounts();
          const updatedAccount = { ...user, ...updates };
          const nextAccounts = accounts.map((account) =>
            typeof account.username === "string" &&
            account.username.toLowerCase() === user.username.toLowerCase()
              ? updatedAccount
              : account
          );
          localStorage.setItem(
            "devtrack-demo-accounts",
            JSON.stringify(nextAccounts)
          );
          setUser(updatedAccount);
          return true;
        } catch (error) {
          console.error("Unable to save profile changes.", error);
          window.alert(
            "Profile changes could not be saved. Check browser storage and try again."
          );
          return false;
        }
      }}
      onLogout={() => {
        try {
          localStorage.removeItem("devtrack-demo-session");
        } catch (error) {
          console.error("Unable to clear demo session.", error);
        }
        setUser(null);
      }}
    />
  );
}

function Dashboard({ user, onLogout, onProfileUpdate }) {
  const avatarInputRef = useRef(null);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarError, setAvatarError] = useState("");
  const [tasks, setTasks] = useState(() => getInitialTasks(user.username));
  const [newTask, setNewTask] = useState("");
  const [category, setCategory] = useState("Learning");
  const [priority, setPriority] = useState("Medium");
  const [filter, setFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [activeSection, setActiveSection] = useState(getPageFromHash);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [dark, setDark] = useState(() => getInitialTheme(user.username));
  const [goal, setGoal] = useState(() => getInitialGoal(user.username));
  const [dailyCompletions, setDailyCompletions] = useState(() =>
    getInitialDailyCompletions(user.username)
  );

  const [focusLog, setFocusLog] = useState(() =>
    getInitialFocusLog(user.username)
  );
  const [sessions, setSessions] = useState(() =>
    getInitialSessions(user.username)
  );

  const [timerMode, setTimerMode] = useState(() =>
    getInitialMode(user.username)
  );
  const [seconds, setSeconds] = useState(() =>
    getInitialSeconds(getInitialMode(user.username), user.username)
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const timerDeadline = useRef(null);
  const runStartedAt = useRef(null);
  const runDuration = useRef(0);
  const trackedRunSeconds = useRef(0);

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [notification, setNotification] = useState("");
  const [storageError, setStorageError] = useState(storageReadError);
  const todayKey = getDateKey(currentDate);
  const dateLabel = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const currentWeekDays = getCurrentWeekDays(currentDate);
  const completedDaysThisWeek = currentWeekDays.filter(
    (day) => dailyCompletions[day.key]
  ).length;
  const completed = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - completed;
  const todaySeconds = focusLog[todayKey] || 0;
  const todayHours = Number((todaySeconds / 3600).toFixed(2));
  const sessionCount = sessions[todayKey] || 0;
  const displayedAvatar =
    pendingAvatar !== null ? pendingAvatar : user.avatar || "";

  function previewAvatar(event) {
    setAvatarError("");
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file to use as your profile photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 1024 * 1024) {
      setAvatarError("Choose an image smaller than 1 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingAvatar(reader.result);
      } else {
        setAvatarError("That image could not be previewed. Try another file.");
      }
    };
    reader.onerror = () => {
      console.error("Unable to preview selected profile image.", reader.error);
      setAvatarError("That image could not be read. Try another file.");
    };
    reader.readAsDataURL(file);
  }

  function saveAvatar() {
    if (pendingAvatar === null) return;
    if (!onProfileUpdate({ avatar: pendingAvatar })) return;
    setPendingAvatar(null);
    setAvatarError("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function cancelAvatarChanges() {
    setPendingAvatar(null);
    setAvatarError("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  const persistStorage = useCallback((key, value) => {
    try {
      localStorage.setItem(
        userStorageKey(user.username, key),
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(`Unable to save "${key}" to local storage.`, error);
      queueMicrotask(() => {
        setStorageError(
          "Changes could not be saved. Check your browser storage settings."
        );
      });
    }
  }, [user.username]);

  useEffect(() => {
    persistStorage("devtrack-tasks", tasks);
  }, [persistStorage, tasks]);

  useEffect(() => {
    persistStorage("devtrack-focus-log", focusLog);
  }, [focusLog, persistStorage]);

  useEffect(() => {
    persistStorage("devtrack-sessions", sessions);
  }, [persistStorage, sessions]);

  useEffect(() => {
    persistStorage("devtrack-daily-completions", dailyCompletions);
  }, [dailyCompletions, persistStorage]);

  useEffect(() => {
    persistStorage("devtrack-goal", goal);
  }, [goal, persistStorage]);

  useEffect(() => {
    persistStorage("devtrack-dark", dark);
  }, [dark, persistStorage]);

  useEffect(() => {
    persistStorage("devtrack-timer-mode", timerMode);
    persistStorage("devtrack-timer-seconds", seconds);
  }, [persistStorage, timerMode, seconds]);

  function trackFocusTime(now = Date.now()) {
    if (runStartedAt.current === null) return;

    const elapsedSeconds = Math.min(
      Math.floor((now - runStartedAt.current) / 1000),
      runDuration.current
    );
    const newSeconds = elapsedSeconds - trackedRunSeconds.current;

    if (newSeconds <= 0) return;

    const additions = {};

    for (
      let second = trackedRunSeconds.current + 1;
      second <= elapsedSeconds;
      second += 1
    ) {
      const key = getDateKey(
        new Date(runStartedAt.current + second * 1000)
      );
      additions[key] = (additions[key] || 0) + 1;
    }

    trackedRunSeconds.current = elapsedSeconds;
    setFocusLog((currentLog) => {
      const nextLog = { ...currentLog };
      Object.entries(additions).forEach(([key, amount]) => {
        nextLog[key] = (nextLog[key] || 0) + amount;
      });
      return nextLog;
    });
  }

  function finishTimer(mode) {
    timerDeadline.current = null;
    setTimerRunning(false);

    if (mode === "focus") {
      const key = getTodayKey();
      setSessions((currentSessions) => ({
        ...currentSessions,
        [key]: (currentSessions[key] || 0) + 1,
      }));
      setNotification("Focus session completed! Great work.");
      setTimerMode("break");
      setSeconds(BREAK_DURATION);
      return;
    }

    setNotification("Break finished. Ready to focus?");
    setTimerMode("focus");
    setSeconds(FOCUS_DURATION);
  }

  useEffect(() => {
    if (!timerRunning) return undefined;

    const interval = setInterval(() => {
      const now = Date.now();
      const deadline = timerDeadline.current;

      if (deadline === null) return;

      if (timerMode === "focus") trackFocusTime(now);

      const remainingSeconds = Math.max(
        0,
        Math.ceil((deadline - now) / 1000)
      );
      setSeconds((current) =>
        current === remainingSeconds ? current : remainingSeconds
      );

      if (remainingSeconds === 0) finishTimer(timerMode);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerMode]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function syncPageWithLocation() {
      setActiveSection(getPageFromHash());
    }

    window.addEventListener("hashchange", syncPageWithLocation);
    window.addEventListener("popstate", syncPageWithLocation);
    return () => {
      window.removeEventListener("hashchange", syncPageWithLocation);
      window.removeEventListener("popstate", syncPageWithLocation);
    };
  }, []);

  useEffect(() => {
    if (!notification) return undefined;

    const timeout = setTimeout(() => {
      setNotification("");
    }, 4000);

    return () => clearTimeout(timeout);
  }, [notification]);

  const shownTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Completed" && task.done) ||
      (filter === "Active" && !task.done);

    const matchesCategory =
      categoryFilter === "All" || task.category === categoryFilter;
    const matchesPriority =
      priorityFilter === "All" || task.priority === priorityFilter;
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = `${task.title} ${task.category} ${task.priority}`
      .toLowerCase()
      .includes(normalizedSearch);

    return matchesFilter && matchesCategory && matchesPriority && matchesSearch;
  });

  const focusData = getLastSevenDays(focusLog);

  const weeklyFocusSeconds = focusData.reduce(
    (total, day) => total + day.hours * 3600,
    0
  );

  const weeklyFocusHours = Number(
    (weeklyFocusSeconds / 3600).toFixed(1)
  );
  const weeklySessions = focusData.reduce(
    (total, day) => total + (sessions[day.key] || 0),
    0
  );
  const focusedDays = focusData.filter((day) => day.hours > 0).length;
  const bestFocusDay = focusData.reduce(
    (best, day) => (day.hours > best.hours ? day : best),
    { hours: 0, date: "" }
  );

  const completionRate = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  function addTask(event) {
    event.preventDefault();

    const title = newTask.trim();

    if (!title) {
      setNotification("Please enter a task title.");
      return;
    }

    setTasks((current) => [
      {
        id: Date.now(),
        title,
        category,
        priority,
        done: false,
      },
      ...current,
    ]);

    setNewTask("");
    setNotification("Task added successfully.");
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, done: !task.done }
          : task
      )
    );
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task || !window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      return;
    }

    setTasks((current) =>
      current.filter((task) => task.id !== id)
    );

    setNotification("Task deleted.");
  }

  function startEditing(task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  }

  function saveEditedTask(id) {
    const title = editingTitle.trim();

    if (!title) {
      setNotification("Task title cannot be empty.");
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, title } : task
      )
    );

    setEditingTaskId(null);
    setEditingTitle("");
    setNotification("Task updated successfully.");
  }

  function changePriority(id, nextPriority) {
    if (!TASK_PRIORITIES.includes(nextPriority)) return;

    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, priority: nextPriority }
          : task
      )
    );
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditingTitle("");
  }

  function resetTimer() {
    if (timerRunning && timerMode === "focus") trackFocusTime();
    timerDeadline.current = null;
    setTimerRunning(false);

    setSeconds(
      timerMode === "break" ? BREAK_DURATION : FOCUS_DURATION
    );

    setNotification("Timer reset.");
  }

  function changeTimerMode(mode) {
    if (mode === timerMode) return;
    if (timerRunning && timerMode === "focus") trackFocusTime();
    timerDeadline.current = null;
    setTimerRunning(false);
    setTimerMode(mode);
    setSeconds(mode === "break" ? BREAK_DURATION : FOCUS_DURATION);
  }

  function toggleTimer() {
    if (timerRunning) {
      const now = Date.now();
      const deadline = timerDeadline.current;

      if (timerMode === "focus") trackFocusTime(now);

      const remainingSeconds =
        deadline === null
          ? seconds
          : Math.max(0, Math.ceil((deadline - now) / 1000));

      if (remainingSeconds === 0) {
        finishTimer(timerMode);
        return;
      }

      timerDeadline.current = null;
      setSeconds(remainingSeconds);
      setTimerRunning(false);
      return;
    }

    const duration =
      seconds > 0
        ? seconds
        : timerMode === "break"
          ? BREAK_DURATION
          : FOCUS_DURATION;
    const now = Date.now();

    runStartedAt.current = now;
    runDuration.current = duration;
    trackedRunSeconds.current = 0;
    timerDeadline.current = now + duration * 1000;
    setSeconds(duration);
    setTimerRunning(true);
  }

  const time = `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0"
  )}:${String(seconds % 60).padStart(2, "0")}`;

  const timerProgress =
    (seconds /
      (timerMode === "break" ? BREAK_DURATION : FOCUS_DURATION)) *
    100;

  return (
    <div className={`app-shell ${dark ? "theme-dark" : "theme-light"}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Code2 size={23} />
          </div>
          <span>
            dev<span className="brand-accent">track</span>
          </span>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list" aria-label="Main navigation">
          <a
            className={`nav-link ${activeSection === "overview" ? "active" : ""}`}
            href="#overview"
            onClick={() => setActiveSection("overview")}
            aria-current={activeSection === "overview" ? "page" : undefined}
          >
            <LayoutDashboard size={18} />
            Overview
          </a>

          <a
            className={`nav-link ${activeSection === "tasks" ? "active" : ""}`}
            href="#tasks"
            onClick={() => setActiveSection("tasks")}
            aria-current={activeSection === "tasks" ? "page" : undefined}
          >
            <CheckSquare size={18} />
            My Tasks
            <span className="nav-count">{remaining}</span>
          </a>

          <a
            className={`nav-link ${activeSection === "focus" ? "active" : ""}`}
            href="#focus"
            onClick={() => setActiveSection("focus")}
            aria-current={activeSection === "focus" ? "page" : undefined}
          >
            <Timer size={18} />
            Focus Room
          </a>

          <a
            className={`nav-link ${activeSection === "analytics" ? "active" : ""}`}
            href="#analytics"
            onClick={() => setActiveSection("analytics")}
            aria-current={activeSection === "analytics" ? "page" : undefined}
          >
            <BarChart3 size={18} />
            Analytics
          </a>

          <a
            className={`nav-link ${activeSection === "daily" ? "active" : ""}`}
            href="#daily"
            onClick={() => setActiveSection("daily")}
            aria-current={activeSection === "daily" ? "page" : undefined}
          >
            <CalendarDays size={18} />
            Daily Progress
          </a>
        </nav>

        <div className="sidebar-divider" />

        <div className="workspace-label">YOUR PROGRESS</div>

        <div className="side-progress">
          <div className="side-progress-icon">
            <Flame size={18} />
          </div>
          <div>
            <strong>{sessionCount} sessions today</strong>
            <span>Keep it going!</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <details className="profile-menu">
            <summary aria-label={`Open profile menu for ${user.name}`}>
              <span className="profile-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  getInitials(user.name)
                )}
              </span>
              <span className="profile-info">
                <strong>{user.name}</strong>
                <span>@{user.username}</span>
              </span>
              <UserRound size={16} aria-hidden="true" />
            </summary>
            <div className="profile-dropdown">
              <div className="profile-dropdown-heading">
                <span className="profile-avatar profile-avatar-large">
                  {displayedAvatar ? (
                    <img src={displayedAvatar} alt="Profile preview" />
                  ) : (
                    getInitials(user.name)
                  )}
                </span>
                <span className="profile-dropdown-details">
                  <span className="profile-dropdown-name">{user.name}</span>
                  <span className="profile-dropdown-username">
                    @{user.username}
                  </span>
                </span>
              </div>

              <input
                ref={avatarInputRef}
                className="sr-only"
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                aria-label="Choose a profile photo"
                onChange={previewAvatar}
              />
              <button
                type="button"
                className="profile-photo-choose"
                onClick={() => avatarInputRef.current?.click()}
              >
                <UserRound size={15} />
                {displayedAvatar ? "Change photo" : "Upload photo"}
              </button>
              {displayedAvatar && (
                <button
                  type="button"
                  className="profile-photo-remove"
                  onClick={() => {
                    setAvatarError("");
                    setPendingAvatar("");
                    if (avatarInputRef.current) {
                      avatarInputRef.current.value = "";
                    }
                  }}
                >
                  Remove photo
                </button>
              )}
              {pendingAvatar !== null && (
                <div className="profile-photo-actions">
                  <button type="button" onClick={saveAvatar}>
                    Save photo
                  </button>
                  <button type="button" onClick={cancelAvatarChanges}>
                    Cancel
                  </button>
                </div>
              )}
              {avatarError && (
                <p className="profile-photo-error" role="alert">
                  {avatarError}
                </p>
              )}
              <button type="button" onClick={onLogout}>
                <LogOut size={15} />
                Log out
              </button>
            </div>
          </details>
        </div>
      </aside>

      <main className="main-content" id={activeSection}>
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>{PAGE_TITLES[activeSection]}</strong>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => setDark((current) => !current)}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() =>
                setNotification(
                  remaining
                    ? `You have ${remaining} active task(s).`
                    : "All tasks completed. Great job!"
                )
              }
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        {storageError && (
          <div className="app-notification app-notification-error" role="alert">
            <span>{storageError}</span>
            <button
              type="button"
              onClick={() => setStorageError("")}
              aria-label="Dismiss storage warning"
            >
              ×
            </button>
          </div>
        )}

        {notification && (
          <div className="app-notification" role="status">
            {notification}
            <button
              type="button"
              onClick={() => setNotification("")}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        {activeSection === "overview" && (
          <div className="page-content page-content-overview">
        <div className="today-label">
          <CalendarDays size={18} aria-hidden="true" />
          <time dateTime={todayKey}>{dateLabel}</time>
        </div>

        <section className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="live-dot" />
              YOUR PERSONAL PRODUCTIVITY SPACE
            </div>

            <h1>
              Build better habits,
              <br />
              <span>one day at a time.</span>
            </h1>

            <p>
              Stay focused, keep learning, and make progress that adds up.
            </p>
          </div>

          <div className="welcome-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-core">
              <Code2 size={42} />
            </div>
            <span className="art-star star-one">✦</span>
            <span className="art-star star-two">✧</span>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span>Tasks completed</span>
              <span className="stat-icon purple">
                <CircleCheck size={18} />
              </span>
            </div>

            <div className="stat-number">
              {completed}
              <small> / {tasks.length}</small>
            </div>

            <div className="stat-foot">
              <span className="positive">
                <TrendingUp size={14} /> {completionRate}%
              </span>
              of your task list
            </div>

            <div className="mini-track">
              <div style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Focus time today</span>
              <span className="stat-icon cyan">
                <Clock3 size={18} />
              </span>
            </div>

            <div className="stat-number">
              {todayHours}
              <small> hrs</small>
            </div>

            <div className="stat-foot">
              Actual time tracked by the focus timer
            </div>

            <div className="mini-track cyan-track">
              <div
                style={{
                  width: `${Math.min((todayHours / goal) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Daily focus goal</span>
              <span className="stat-icon orange">
                <Target size={18} />
              </span>
            </div>

            <div className="stat-number">
              {goal}
              <small> hrs</small>
            </div>

            <div className="stat-foot">Set a goal you can reach</div>

            <div className="goal-controls">
              <button
                type="button"
                disabled={goal <= 1}
                onClick={() =>
                  setGoal((current) => Math.max(1, current - 1))
                }
                aria-label="Decrease focus goal"
              >
                −
              </button>

              <span>{goal} hour target</span>

              <button
                type="button"
                disabled={goal >= 12}
                onClick={() =>
                  setGoal((current) => Math.min(12, current + 1))
                }
                aria-label="Increase focus goal"
              >
                +
              </button>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Focus sessions</span>
              <span className="stat-icon green">
                <Zap size={18} />
              </span>
            </div>

            <div className="stat-number">
              {sessionCount}
              <small> today</small>
            </div>

            <div className="stat-foot">
              Completed 25-minute focus sessions
            </div>

            <div className="session-dots">
              {Array.from({ length: 5 }, (_, index) => (
                <i
                  key={index}
                  style={{
                    opacity: index < sessionCount ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
          </div>
        )}

        {activeSection === "daily" && <section
          className="panel daily-progress-panel"
          aria-labelledby="daily-progress-heading"
        >
          <div className="panel-heading daily-progress-heading">
            <div>
              <div className="panel-kicker">ONE DAY AT A TIME</div>
              <h2 id="daily-progress-heading">Daily progress</h2>
            </div>
            <div className="daily-progress-summary">
              <strong>{completedDaysThisWeek}</strong> of 7 days complete
            </div>
          </div>
          <div
            className="daily-progress-track"
            role="progressbar"
            aria-label="Weekly completed days"
            aria-valuemin={0}
            aria-valuemax={7}
            aria-valuenow={completedDaysThisWeek}
            aria-valuetext={`${completedDaysThisWeek} of 7 days complete`}
          >
            <div
              style={{ width: `${(completedDaysThisWeek / 7) * 100}%` }}
            />
          </div>
          <div className="daily-progress-days">
            {currentWeekDays.map((day) => {
              const isComplete = Boolean(dailyCompletions[day.key]);
              return (
                <button
                  className={`daily-progress-day${day.isToday ? " is-today" : ""}${isComplete ? " is-complete" : ""}`}
                  type="button"
                  key={day.key}
                  aria-label={`Mark ${day.fullDate} ${isComplete ? "incomplete" : "complete"}`}
                  aria-pressed={isComplete}
                  title={`${day.fullDate}${day.isToday ? " (today)" : ""}`}
                  onClick={() =>
                    setDailyCompletions((current) => ({
                      ...current,
                      [day.key]: !current[day.key],
                    }))
                  }
                >
                  <span className="daily-progress-day-name">
                    <span className="daily-progress-day-short">
                      {day.shortDayName}
                    </span>
                    <span className="daily-progress-day-full">
                      {day.dayName}
                    </span>
                  </span>
                  <span className="daily-progress-month">{day.monthName}</span>
                  <span className="daily-progress-date">{day.dateNumber}</span>
                  <span className="daily-progress-check" aria-hidden="true">
                    {isComplete ? <CircleCheck size={17} /> : <Circle size={17} />}
                  </span>
                  {day.isToday && (
                    <span className="daily-progress-today">Today</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>}

        {activeSection === "tasks" && (
        <section className="content-grid single-page-content">
          <div className="panel tasks-panel">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">STAY ON TRACK</div>
                <h2>
                  Today's tasks{" "}
                  <span className="heading-count">{remaining}</span>
                </h2>
              </div>

            </div>

            <form className="add-task-form" onSubmit={addTask}>
              <input
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="What do you want to accomplish?"
                aria-label="New task"
                maxLength={120}
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Task category"
              >
                <option value="Learning">Learning</option>
                <option value="DSA">DSA</option>
                <option value="Project">Project</option>
                <option value="College">College</option>
              </select>

              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                aria-label="Task priority"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <button type="submit" aria-label="Add task" title="Add task">
                <Plus size={19} />
              </button>
            </form>

            <div className="task-toolbar">
              <div className="task-filters">
                {["All", "Active", "Completed"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={filter === item ? "filter-active" : ""}
                    onClick={() => setFilter(item)}
                    aria-pressed={filter === item}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <label className="category-filter">
                <span className="sr-only">Filter tasks by category</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="Filter tasks by category"
                >
                  <option value="All">All categories</option>
                  {TASK_CATEGORIES.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="priority-filter">
                <span className="sr-only">Filter tasks by priority</span>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  aria-label="Filter tasks by priority"
                >
                  <option value="All">All priorities</option>
                  {TASK_PRIORITIES.map((item) => (
                    <option value={item} key={item}>
                      {item} priority
                    </option>
                  ))}
                </select>
              </label>

              <label className="search-box">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  aria-label="Search tasks"
                  type="search"
                />
              </label>
            </div>

            <div className="task-list">
              {shownTasks.map((task) => (
                <div
                  className={`task-row ${task.done ? "task-done" : ""}`}
                  key={task.id}
                >
                  <button
                    type="button"
                    className="task-check"
                    onClick={() => toggleTask(task.id)}
                    aria-label={
                      task.done ? "Mark incomplete" : "Complete task"
                    }
                    title={task.done ? "Mark incomplete" : "Complete task"}
                  >
                    {task.done ? (
                      <CircleCheck size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  <div className="task-main">
                    {editingTaskId === task.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          saveEditedTask(task.id);
                        }}
                      >
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          aria-label="Edit task title"
                          maxLength={120}
                        />

                        <div className="edit-task-actions">
                          <button type="submit">Save</button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <span className="task-title">{task.title}</span>
                    )}

                    <span className="task-meta">
                      {task.category}
                      <i />
                      <select
                        className={`priority priority-${(
                          task.priority || "Medium"
                        ).toLowerCase()}`}
                        value={task.priority || "Medium"}
                        onChange={(event) =>
                          changePriority(task.id, event.target.value)
                        }
                        aria-label={`Priority for ${task.title}`}
                      >
                        {TASK_PRIORITIES.map((item) => (
                          <option value={item} key={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="delete-task"
                    onClick={() => startEditing(task)}
                    aria-label={`Edit ${task.title}`}
                    title="Edit task"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    className="delete-task"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                    title="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {shownTasks.length === 0 && (
                <div className="empty-state" role="status">
                  {tasks.length === 0
                    ? "No tasks yet. Add one above to get started!"
                    : "No tasks match your search or filters."}
                </div>
              )}
            </div>

            <div className="task-footer">
              <span>
                {completed} of {tasks.length} tasks completed
              </span>

              <div className="task-footer-track">
                <div style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>

        </section>
        )}

        {activeSection === "focus" && (
        <section className="content-grid single-page-content focus-page-content">
          <div className="panel focus-panel">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">DEEP WORK</div>
                <h2>Focus room</h2>
              </div>

            </div>

            <div className="focus-mode">
              <button
                type="button"
                onClick={() => changeTimerMode("focus")}
                className={timerMode === "focus" ? "filter-active" : ""}
                aria-pressed={timerMode === "focus"}
                aria-label="Switch to 25-minute focus timer"
              >
                Focus
              </button>

              <span>•</span>

              <button
                type="button"
                onClick={() => changeTimerMode("break")}
                className={timerMode === "break" ? "filter-active" : ""}
                aria-pressed={timerMode === "break"}
                aria-label="Switch to 5-minute break timer"
              >
                Break
              </button>
            </div>

            <div
              className="timer-ring"
              style={{ "--timer-progress": `${timerProgress}%` }}
            >
              <div className="timer-inner">
                <span className="timer-caption">
                  {timerMode === "focus" ? "FOCUS TIME" : "BREAK TIME"}
                </span>

                <div className="timer-time" role="timer" aria-label={`${time} remaining`}>
                  {time}
                </div>

                <span className="timer-subtitle">
                  <Coffee size={14} />
                  {timerMode === "focus"
                    ? "Stay in the zone"
                    : "Take a short break"}
                </span>
              </div>
            </div>

            <div className="timer-controls">
              <button
                type="button"
                className="timer-reset"
                onClick={resetTimer}
                aria-label="Reset timer"
                title="Reset timer"
              >
                <RotateCcw size={17} />
              </button>

              <button
                type="button"
                className="timer-start"
                onClick={toggleTimer}
                aria-label={
                  timerRunning
                    ? "Pause timer"
                    : `Start ${timerMode === "focus" ? "focus" : "break"} timer`
                }
              >
                {timerRunning ? <Pause size={17} /> : <Play size={17} />}
                {timerRunning
                  ? "Pause session"
                  : timerMode === "focus"
                    ? "Start focusing"
                    : "Start break"}
              </button>
            </div>

            <div className="focus-tip">
              <Zap size={16} />
              <span>
                <strong>Pro tip</strong> — Silence notifications and focus on
                one task.
              </span>
            </div>
          </div>
        </section>
        )}

        {activeSection === "analytics" && <section className="bottom-grid analytics-page-content">
          <div className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">YOUR CONSISTENCY</div>
                <h2>
                  Focus activity{" "}
                  <span className="chart-period">Last 7 days</span>
                </h2>
              </div>

              <div className="chart-legend">
                <i />
                Focus hours
              </div>
            </div>

            {weeklyFocusSeconds > 0 ? (
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={focusData}
                    margin={{ top: 12, right: 6, left: -18, bottom: 0 }}
                  >
                  <defs>
                    <linearGradient
                      id="focusGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#8b7cff"
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="100%"
                        stopColor="#8b7cff"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--chart-grid)"
                  />

                  <XAxis
                    dataKey="day"
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals
                  />

                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toFixed(2)} hours`,
                        "Focus",
                      ]}
                      contentStyle={{
                        background: "var(--panel)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text)",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#8b7cff"
                      strokeWidth={3}
                      fill="url(#focusGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-empty" role="status">
                No focus sessions this week yet. Start a focus timer to see
                your activity here.
              </div>
            )}

            <div className="skills-note">
              <Clock3 size={16} />
              <span>
                {weeklyFocusSeconds > 0
                  ? `${weeklyFocusHours} total focus hours tracked in the last 7 days.`
                  : "Weekly focus time is recorded automatically while the focus timer runs."}
              </span>
            </div>
          </div>

          <div className="panel weekly-summary-panel">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">YOUR FOCUS</div>
                <h2>This week</h2>
              </div>
            </div>

            {weeklyFocusSeconds > 0 ? (
              <div className="weekly-summary">
                <div>
                  <span>Time focused</span>
                  <strong>{weeklyFocusHours} hrs</strong>
                </div>
                <div>
                  <span>Sessions completed</span>
                  <strong>{weeklySessions}</strong>
                </div>
                <div>
                  <span>Days with focus</span>
                  <strong>{focusedDays} of 7</strong>
                </div>
                <div>
                  <span>Best day</span>
                  <strong>
                    {bestFocusDay.date} · {bestFocusDay.hours.toFixed(1)} hrs
                  </strong>
                </div>
              </div>
            ) : (
              <div className="empty-state weekly-empty" role="status">
                Your focus summary will appear here after your first session.
              </div>
            )}
            <div className="analytics-task-summary">
              <div className="panel-kicker">TASK COMPLETION</div>
              <div className="weekly-summary">
                <div>
                  <span>Total tasks</span>
                  <strong>{tasks.length}</strong>
                </div>
                <div>
                  <span>Completed</span>
                  <strong>{completed}</strong>
                </div>
                <div>
                  <span>Remaining</span>
                  <strong>{remaining}</strong>
                </div>
                <div>
                  <span>Completion rate</span>
                  <strong>{completionRate}%</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
        }

        <footer className="app-footer">
          <span>
            <Code2 size={14} /> Built for the journey.
          </span>

          <span>
            DEVTRACK <i /> KEEP BUILDING
          </span>
        </footer>
      </main>
    </div>
  );
}
