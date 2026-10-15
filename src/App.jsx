
import { useState, useEffect } from "react";
import {
  LayoutDashboard, CheckSquare, Timer, BarChart3, Code2,
  Search, Plus, Bell, Sun, Moon, Flame, Clock3,
  CircleCheck, Circle, Trash2, Play, Pause, RotateCcw,
  Target, TrendingUp, Zap, Coffee, CalendarDays
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from "recharts";
import "./App.css";

const initialTasks = [
  { id: 1, title: "Solve 2 LeetCode problems", category: "DSA", priority: "High", done: true },
  { id: 2, title: "Complete React dashboard UI", category: "Project", priority: "High", done: false },
  { id: 3, title: "Revise JavaScript closures", category: "Learning", priority: "Medium", done: false },
  { id: 4, title: "Push code to GitHub", category: "Project", priority: "Low", done: false },
];

const focusData = [
  { day: "Mon", hours: 2.2 }, { day: "Tue", hours: 3.4 },
  { day: "Wed", hours: 2.8 }, { day: "Thu", hours: 4.1 },
  { day: "Fri", hours: 3.2 }, { day: "Sat", hours: 5.1 },
  { day: "Sun", hours: 3.8 },
];

const initialSkills = [
  { name: "JavaScript", value: 75, color: "#8b7cff" },
  { name: "React", value: 55, color: "#47c9e5" },
  { name: "Python", value: 68, color: "#f4b860" },
];

function readTasks() {
  try {
    const saved = localStorage.getItem("devtrack-tasks");
    return saved ? JSON.parse(saved) : initialTasks;
  } catch {
    return initialTasks;
  }
}

export default function App() {
  const [tasks, setTasks] = useState(readTasks);
  const [newTask, setNewTask] = useState("");
  const [category, setCategory] = useState("Learning");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(true);
  const [goal, setGoal] = useState(4);
  const [seconds, setSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    localStorage.setItem("devtrack-tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setTimerRunning(false);
          setSessionCount((count) => count + 1);
          return 25 * 60;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning]);

  const completed = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - completed;
  const todayHours = 3.5;
  const shownTasks = tasks.filter((task) => {
    const matchesFilter = filter === "All" ||
      (filter === "Completed" ? task.done : !task.done);
    return matchesFilter && task.title.toLowerCase().includes(search.toLowerCase());
  });

  function addTask(event) {
    event.preventDefault();
    if (!newTask.trim()) return;
    setTasks((current) => [
      { id: Date.now(), title: newTask.trim(), category, priority: "Medium", done: false },
      ...current,
    ]);
    setNewTask("");
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => task.id === id ? { ...task, done: !task.done } : task)
    );
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function resetTimer() {
    setTimerRunning(false);
    setSeconds(25 * 60);
  }

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className={`app-shell ${dark ? "theme-dark" : "theme-light"}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Code2 size={23} /></div>
          <span>dev<span className="brand-accent">track</span></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          <a className="nav-link active" href="#overview"><LayoutDashboard size={18} /> Overview</a>
          <a className="nav-link" href="#tasks"><CheckSquare size={18} /> My Tasks <span className="nav-count">{remaining}</span></a>
          <a className="nav-link" href="#focus"><Timer size={18} /> Focus Room</a>
          <a className="nav-link" href="#analytics"><BarChart3 size={18} /> Analytics</a>
        </nav>

        <div className="sidebar-divider" />
        <div className="workspace-label">YOUR PROGRESS</div>
        <div className="side-progress">
          <div className="side-progress-icon"><Flame size={18} /></div>
          <div><strong>7 day streak</strong><span>Keep it going!</span></div>
        </div>
        <div className="streak-dots">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) =>
            <div className={`streak-day ${i < 5 ? "streak-done" : ""}`} key={`${day}-${i}`}>{i < 5 ? "✓" : day}</div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="profile-avatar">SG</div>
          <div className="profile-info"><strong>Developer</strong><span>Personal workspace</span></div>
          <span className="online-dot" />
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-actions">
            <div className="today-label"><CalendarDays size={16} /> My dashboard</div>
            <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
          </div>
        </header>

        <section className="welcome-row">
          <div>
            <div className="eyebrow"><span className="live-dot" /> YOUR PERSONAL PRODUCTIVITY SPACE</div>
            <h1>Build better habits,<br /><span>one day at a time.</span></h1>
            <p>Stay focused, keep learning, and make progress that adds up.</p>
          </div>
          <div className="welcome-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-core"><Code2 size={42} /></div><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span></div>
        </section>

        <section className="stats-grid">
          <div className="stat-card"><div className="stat-top"><span>Tasks completed</span><span className="stat-icon purple"><CircleCheck size={18} /></span></div><div className="stat-number">{completed}<small> / {tasks.length}</small></div><div className="stat-foot"><span className="positive"><TrendingUp size={14} /> {tasks.length ? Math.round(completed / tasks.length * 100) : 0}%</span> of your task list</div><div className="mini-track"><div style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} /></div></div>
          <div className="stat-card"><div className="stat-top"><span>Focus time today</span><span className="stat-icon cyan"><Clock3 size={18} /></span></div><div className="stat-number">{todayHours}<small> hrs</small></div><div className="stat-foot"><span className="positive"><TrendingUp size={14} /> +18%</span> vs. last week</div><div className="mini-track cyan-track"><div style={{ width: `${Math.min(todayHours / goal * 100, 100)}%` }} /></div></div>
          <div className="stat-card"><div className="stat-top"><span>Daily focus goal</span><span className="stat-icon orange"><Target size={18} /></span></div><div className="stat-number">{goal}<small> hrs</small></div><div className="stat-foot">Set a goal you can reach</div><div className="goal-controls"><button onClick={() => setGoal((g) => Math.max(1, g - 1))}>−</button><span>{goal} hour target</span><button onClick={() => setGoal((g) => Math.min(12, g + 1))}>+</button></div></div>
          <div className="stat-card"><div className="stat-top"><span>Focus sessions</span><span className="stat-icon green"><Zap size={18} /></span></div><div className="stat-number">{sessionCount}<small> today</small></div><div className="stat-foot">One session at a time.</div><div className="session-dots"><i /><i /><i /><i /><i /></div></div>
        </section>

        <section className="content-grid">
          <div className="panel tasks-panel" id="tasks">
            <div className="panel-heading"><div><div className="panel-kicker">STAY ON TRACK</div><h2>Today's tasks <span className="heading-count">{remaining}</span></h2></div><span className="panel-action"><CheckSquare size={17} /></span></div>
            <form className="add-task-form" onSubmit={addTask}>
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="What do you want to accomplish?" aria-label="New task" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Task category"><option>Learning</option><option>DSA</option><option>Project</option><option>College</option></select>
              <button type="submit" aria-label="Add task"><Plus size={19} /></button>
            </form>
            <div className="task-toolbar"><div className="task-filters">{["All", "Active", "Completed"].map((item) => <button key={item} className={filter === item ? "filter-active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="search-box"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" /></label></div>
            <div className="task-list">
              {shownTasks.map((task) => <div className={`task-row ${task.done ? "task-done" : ""}`} key={task.id}><button className="task-check" onClick={() => toggleTask(task.id)} aria-label={task.done ? "Mark incomplete" : "Complete task"}>{task.done ? <CircleCheck size={20} /> : <Circle size={20} />}</button><div className="task-main"><span className="task-title">{task.title}</span><span className="task-meta">{task.category} <i /> <span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span></span></div><button className="delete-task" onClick={() => deleteTask(task.id)} aria-label="Delete task"><Trash2 size={16} /></button></div>)}
              {shownTasks.length === 0 && <div className="empty-state">No tasks found. Add one above to get started!</div>}
            </div>
            <div className="task-footer"><span>{completed} of {tasks.length} tasks completed</span><div className="task-footer-track"><div style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} /></div></div>
          </div>

          <div className="panel focus-panel" id="focus">
            <div className="panel-heading"><div><div className="panel-kicker">DEEP WORK</div><h2>Focus room</h2></div><span className="panel-action"><Timer size={17} /></span></div>
            <div className="focus-mode"><span className="focus-mode-dot" /> FOCUS SESSION <span>• 25 MIN</span></div>
            <div className="timer-ring" style={{ "--timer-progress": `${seconds / 1500 * 100}%` }}><div className="timer-inner"><span className="timer-caption">TIME REMAINING</span><div className="timer-time">{time}</div><span className="timer-subtitle"><Coffee size={14} /> Stay in the zone</span></div></div>
            <div className="timer-controls"><button className="timer-reset" onClick={resetTimer} aria-label="Reset timer"><RotateCcw size={17} /></button><button className="timer-start" onClick={() => setTimerRunning(!timerRunning)}>{timerRunning ? <Pause size={17} /> : <Play size={17} />}{timerRunning ? "Pause session" : "Start focusing"}</button></div>
            <div className="focus-tip"><Zap size={16} /><span><strong>Pro tip</strong> — Silence notifications and focus on one task.</span></div>
          </div>
        </section>

        <section className="bottom-grid" id="analytics">
          <div className="panel chart-panel">
            <div className="panel-heading"><div><div className="panel-kicker">YOUR CONSISTENCY</div><h2>Focus activity <span className="chart-period">Last 7 days</span></h2></div><div className="chart-legend"><i /> Focus hours</div></div>
            <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={focusData} margin={{ top: 12, right: 6, left: -18, bottom: 0 }}><defs><linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b7cff" stopOpacity={0.32} /><stop offset="100%" stopColor="#8b7cff" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)" }} /><Area type="monotone" dataKey="hours" stroke="#8b7cff" strokeWidth={3} fill="url(#focusGradient)" /></AreaChart></ResponsiveContainer></div>
          </div>
          <div className="panel skills-panel">
            <div className="panel-heading"><div><div className="panel-kicker">KEEP LEARNING</div><h2>Skill progress</h2></div><span className="panel-action"><TrendingUp size={17} /></span></div>
            <div className="skills-list">{initialSkills.map((skill) => <div className="skill-row" key={skill.name}><div className="skill-label"><span>{skill.name}</span><strong>{skill.value}%</strong></div><div className="skill-track"><div style={{ width: `${skill.value}%`, background: skill.color }} /></div></div>)}</div>
            <div className="skills-note"><Target size={16} /><span>Small steps every day lead to big results.</span></div>
          </div>
        </section>

        <footer className="app-footer"><span> <Code2 size={14} /> Built for the journey.</span><span>DEVTRACK <i /> KEEP BUILDING</span></footer>
      </main>
    </div>
  );
}
