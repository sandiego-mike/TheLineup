import {
  Activity,
  ArrowLeftRight,
  BadgeCheck,
  Clipboard,
  Download,
  History,
  LockKeyhole,
  Printer,
  RefreshCw,
  ShieldCheck,
  Unlock,
  Users,
  Zap
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api/client.js';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayLetters = ['M', 'T', 'W', 'TH', 'F', 'S', 'S'];
const modes = [
  ['fairness', 'Fairness First', 'Spreads shifts evenly'],
  ['balanced', 'Balanced', 'Balances coverage, seniority, and fairness'],
  ['seniority', 'Seniority First', 'Prioritizes senior employees']
];

const employeeStatusCatalog = {
  active: { key: 'active', label: 'Active', help: 'Available for assignments' },
  borrowed: { key: 'borrowed', label: 'Borrowed', help: 'Working outside home department' },
  overtime: { key: 'overtime', label: 'OT Risk', help: 'Limit additional hours' },
  off: { key: 'off', label: 'OFF', help: 'Not scheduled' },
  pto: { key: 'pto', label: 'PTO', help: 'Paid time off' },
  holiday: { key: 'holiday', label: 'Holiday PTO', help: 'Company holiday eligible' },
  sick: { key: 'sick', label: 'Sick', help: 'Callout or sick leave' },
  vacation: { key: 'vacation', label: 'Vacation', help: 'Planned time away' },
  unavailable: { key: 'unavailable', label: 'Unavailable', help: 'Cannot be assigned' },
  training: { key: 'training', label: 'Training', help: 'Protected training time' }
};

const holidayRules = [
  { name: 'Memorial Day', month: 4, dateRange: [25, 31] },
  { name: 'Labor Day', month: 8, dateRange: [1, 7] },
  { name: 'Thanksgiving Week', month: 10, dateRange: [22, 29] },
  { name: 'Christmas Week', month: 11, dateRange: [19, 26] },
  { name: 'New Year Week', month: 0, dateRange: [1, 7] }
];


const managerProfiles = {
  'Hector Arias': { department: 'Front End', role: 'Front End Manager', team: ['Alicia Martinez', 'Elena Brooks', 'Grace Kim', 'Jason Miller', 'Tanya Roberts', 'Chris Johnson', 'Taylor Nguyen'] },
  'Maria Santos': { department: 'Deli', role: 'Department Manager', team: ['Nina Shah', 'Maria Santos'] },
  'Jason Miller': { department: 'Receiving', role: 'Operations Manager', team: ['Marcus Lee', 'Owen Carter', 'Jason Miller'] },
  'Maya Chen': { department: 'Front End', role: 'Operations Manager', team: ['Alicia Martinez', 'Elena Brooks', 'Grace Kim', 'Jason Miller', 'Tanya Roberts', 'Chris Johnson', 'Taylor Nguyen'] }
};

const employeePlanning = {
  'Alicia Martinez': { employmentType: 'Full Time', targetHours: 40, fixed: false, timeOff: { Tuesday: 'OFF', Thursday: 'PTO' } },
  'Elena Brooks': { employmentType: 'Full Time', targetHours: 40, fixed: false, timeOff: { Sunday: 'OFF' } },
  'Grace Kim': { employmentType: 'Part Time', targetHours: 24, fixed: true, fixedLabel: 'Mon/Wed/Fri · 10:00 AM – 6:00 PM', timeOff: { Tuesday: 'OFF', Thursday: 'OFF', Saturday: 'OFF', Sunday: 'OFF' } },
  'Jason Miller': { employmentType: 'Full Time', targetHours: 40, fixed: false, timeOff: { Saturday: 'Training', Sunday: 'OFF' } },
  'Tanya Roberts': { employmentType: 'Part Time', targetHours: 28, fixed: false, timeOff: { Monday: 'OFF', Wednesday: 'Vacation', Friday: 'OFF' } },
  'Chris Johnson': { employmentType: 'Part Time', targetHours: 24, fixed: false, timeOff: { Tuesday: 'OFF', Wednesday: 'OFF', Thursday: 'OFF', Friday: 'OFF' } },
  'Taylor Nguyen': { employmentType: 'Full Time', targetHours: 40, fixed: false, timeOff: { Monday: 'OFF', Tuesday: 'OFF' } }
};

const profileLibrary = {
  'Owen Carter': { role: 'Receiving Lead', photo: '/profiles/owen-carter.png', tone: 'steel', skin: '#e8b98f', hair: '#5a3a27', vest: '#151f23' },
  'Alicia Martinez': { role: 'Cross-Trained Associate', photo: '/profiles/alicia-martinez.png', tone: 'burgundy', skin: '#c98764', hair: '#2e1b16', vest: '#681f33' },
  'Marcus Lee': { role: 'Forklift Operator', photo: '/profiles/marcus-lee.png', tone: 'navy', skin: '#8d5639', hair: '#171717', vest: '#132536' },
  'Grace Kim': { role: 'Membership / Front End', photo: '/profiles/sarah-kim.png', tone: 'teal', skin: '#e0ad82', hair: '#171717', vest: '#102a2a' },
  'Elena Brooks': { role: 'Front End Lead', photo: '/profiles/brianna-torres.png', tone: 'black', skin: '#e2b089', hair: '#654023', vest: '#111818' },
  'Nina Shah': { role: 'Closing Expert', photo: '/profiles/taylor-nguyen.png', tone: 'slate', skin: '#b87555', hair: '#111111', vest: '#283238' },
  'Theo Adams': { role: 'Bakery Associate', photo: '/profiles/emily-davis.png', tone: 'amber', skin: '#efc19a', hair: '#745030', vest: '#7a3023' },
  'Jason Miller': { role: 'Operations Manager', photo: '/profiles/lucas-thompson.png', tone: 'green', skin: '#e6b78d', hair: '#563825', vest: '#163a2a' },
  'Maria Santos': { role: 'Department Manager', photo: '/profiles/maya-chen.png', tone: 'purple', skin: '#c98764', hair: '#2b1913', vest: '#1b1f2c' },
  'David Lee': { role: 'Tire Center', photo: '/profiles/chris-johnson.png', tone: 'blue', skin: '#dba678', hair: '#151515', vest: '#17335c' },
  'Tanya Roberts': { role: 'Membership', photo: '/profiles/alicia-martinez.png', tone: 'rose', skin: '#eab88e', hair: '#d0a16e', vest: '#17201d' },
  'Luis Moreno': { role: 'Night Merch', photo: '/profiles/kevin-wright.png', tone: 'orange', skin: '#9f6744', hair: '#151515', vest: '#8b3424' }
};

export function App() {
  const initialRoute = getRouteState();
  const [userId, setUserId] = useState(1);
  const [bootstrap, setBootstrap] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [mode, setMode] = useState('balanced');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [viewMode, setViewMode] = useState(initialRoute.viewMode);
  const [calendarMode, setCalendarMode] = useState(initialRoute.calendarMode);
  const [employeeSearch, setEmployeeSearch] = useState(initialRoute.search);
  const [departmentFilter, setDepartmentFilter] = useState(initialRoute.department);
  const [shiftTypeFilter, setShiftTypeFilter] = useState(initialRoute.shiftType);
  const [aiCollapsed, setAiCollapsed] = useState(() => initialRoute.aiCollapsed);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialRoute.employeeId);
  const [timelineEdit, setTimelineEdit] = useState(null);
  const [searchAllDepartments, setSearchAllDepartments] = useState(false);
  const [showBorrowable, setShowBorrowable] = useState(false);
  const [employeeStatuses, setEmployeeStatuses] = useState({});
  const [dragEmployeeId, setDragEmployeeId] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyShift, setHistoryShift] = useState(null);
  const [notice, setNotice] = useState(null);
  const [resolvedRecommendations, setResolvedRecommendations] = useState([]);
  const [lastUndo, setLastUndo] = useState(null);
  const [highlightedShiftId, setHighlightedShiftId] = useState(null);
  const [employeeDayEdits, setEmployeeDayEdits] = useState(() => loadEmployeeDayEdits());
  const routeAppliedRef = useRef(false);

  useEffect(() => {
    loadAll(userId);
  }, [userId]);

  useEffect(() => {
    const onPopState = () => applyRoute(getRouteState());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!schedule || routeAppliedRef.current) return;
    routeAppliedRef.current = true;
    applyRoute(getRouteState(), schedule);
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('lineupOps.aiCollapsed', aiCollapsed ? '1' : '0');
  }, [aiCollapsed]);

  useEffect(() => {
    localStorage.setItem('lineupOps.employeeDayEdits', JSON.stringify(employeeDayEdits));
  }, [employeeDayEdits]);

  useEffect(() => {
    if (!highlightedShiftId) return;
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-shift-id="${highlightedShiftId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [highlightedShiftId, viewMode]);

  function applyRoute(route, currentSchedule = schedule) {
    setViewMode(route.viewMode);
    setCalendarMode(route.calendarMode);
    setDepartmentFilter(route.department);
    setEmployeeSearch(route.search);
    setShiftTypeFilter(route.shiftType);
    setAiCollapsed(route.aiCollapsed);
    setSelectedEmployeeId(route.employeeId);
    if (currentSchedule) {
      const routeShift = currentSchedule.shifts.find((shift) =>
        String(shift.id) === route.shiftId ||
        (cssId(shift.name) === route.departmentSlug && shift.day.toLowerCase() === route.day && shiftPeriod(shift).toLowerCase() === route.period)
      );
      if (routeShift) setSelectedShiftId(routeShift.id);
    }
  }

  function pushRoute(overrides = {}) {
    const next = {
      viewMode,
      calendarMode,
      department: departmentFilter,
      shiftType: shiftTypeFilter,
      search: employeeSearch,
      aiCollapsed,
      selectedShift,
      selectedEmployeeId,
      ...overrides
    };
    window.history.pushState({}, '', buildRoute(next));
  }

  function replaceRoute(overrides = {}) {
    const next = {
      viewMode,
      calendarMode,
      department: departmentFilter,
      shiftType: shiftTypeFilter,
      search: employeeSearch,
      aiCollapsed,
      selectedShift,
      selectedEmployeeId,
      ...overrides
    };
    window.history.replaceState({}, '', buildRoute(next));
  }

  async function loadAll(nextUserId = userId) {
    setError('');
    try {
      const [boot, sched] = await Promise.all([
        api('/bootstrap', { userId: nextUserId }),
        api('/schedule', { userId: nextUserId })
      ]);
      const normalized = normalizeSchedule(sched);
      setBootstrap(boot);
      setSchedule(normalized);
      setSelectedShiftId((current) => current ?? normalized.shifts[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function generate() {
    await run(async () => {
      const next = await api('/schedule/generate', {
        userId,
        method: 'POST',
        body: { mode, reason: `Generated ${mode} department lineup.` }
      });
      setSchedule(normalizeSchedule(next));
    });
  }

  async function publish() {
    await run(async () => {
      const next = await api('/schedule/publish', { userId, method: 'POST' });
      setSchedule(normalizeSchedule(next));
    });
  }

  async function unlockSchedule() {
    await run(async () => {
      const next = await api('/schedule/unlock', { userId, method: 'POST' });
      setSchedule(normalizeSchedule(next));
    });
  }

  async function assignEmployee(shift, employeeId, reason = 'Department lineup board edit', options = {}) {
    if (!employeeId || !canEditAssignments || isLocked) return null;
    const employee = schedule.employees.find((item) => item.id === Number(employeeId));
    const conflict = findEmployeeConflict(schedule, Number(employeeId), shift);
    if (conflict) {
      setError(`${employee?.name ?? 'This employee'} is already assigned to ${conflict.name} ${shiftPeriod(conflict)} from ${formatShiftTime(conflict)}. View conflict, replace existing assignment, or choose another employee.`);
      setHighlightedShiftId(conflict.id);
      return null;
    }
    const current = shift.assignments.map((assignment) => assignment.employee_id);
    if (current.includes(Number(employeeId))) return schedule;
    return setLineup(shift, [...current, Number(employeeId)], reason, options);
  }

  async function removeEmployee(shift, employeeId, reason = 'Department lineup board edit', options = {}) {
    if (!canEditAssignments || isLocked) return null;
    return setLineup(shift, shift.assignments.map((assignment) => assignment.employee_id).filter((id) => id !== employeeId), reason, options);
  }

  async function applyEmployeeStatus(employeeId, status) {
    const employee = schedule.employees.find((item) => item.id === employeeId);
    if (!employee) return;
    setEmployeeStatuses((current) => ({ ...current, [employeeId]: status }));
    if (['sick', 'pto', 'vacation', 'off', 'unavailable', 'holiday'].includes(status.key)) {
      await run(async () => {
        let nextSchedule = schedule;
        const affected = schedule.shifts.filter((shift) => shift.assignments.some((assignment) => assignment.employee_id === employeeId));
        for (const shift of affected) {
          const next = await api(`/assignments/${shift.id}`, {
            userId,
            method: 'PUT',
            body: {
              employeeIds: shift.assignments.map((assignment) => assignment.employee_id).filter((id) => id !== employeeId),
              reason: `${employee.name} marked ${status.label}`
            }
          });
          nextSchedule = normalizeSchedule(next);
        }
        setSchedule(nextSchedule);
      }, false);
    }
  }

  async function setLineup(shift, employeeIds, reason = 'Department lineup board edit', options = {}) {
    setError('');
    try {
      const next = await api(`/assignments/${shift.id}`, {
        userId,
        method: 'PUT',
        body: {
          employeeIds: employeeIds.slice(0, shift.required_count),
          reason
        }
      });
      const normalized = normalizeSchedule(next);
      setSchedule(normalized);
      return normalized;
    } catch (err) {
      setError(err.message);
      if (options.throwOnError) throw err;
      return null;
    }
  }

  async function assignEmployeeToShift(employeeId, shiftId, reason, options = {}) {
    const shift = schedule.shifts.find((item) => item.id === Number(shiftId));
    if (!shift || !canEditAssignments || isLocked) return null;
    return assignEmployee(shift, employeeId, reason, options);
  }

  function openReferencedShift(item) {
    const shift = schedule.shifts.find((candidate) => candidate.id === item.shiftId) ?? selectedShift;
    if (!shift) return;
    setSelectedShiftId(shift.id);
    setViewMode('lineup');
    setHighlightedShiftId(shift.id);
    setAiCollapsed(false);
    pushRoute({ viewMode: 'lineup', department: shift.name, selectedShift: shift });
  }

  async function applyRecommendation(item) {
    const shift = schedule.shifts.find((candidate) => candidate.id === item.shiftId) ?? selectedShift;
    if (!shift || item.level === 'good') return;
    const openIndex = shift.assignments.length;
    const recommendation = bestNextMove(schedule, shift);
    const employee = item.employeeId ? schedule.employees.find((candidate) => candidate.id === item.employeeId) : recommendation?.employee;
    if (!employee) {
      setError('No available employee can be applied to this recommendation.');
      return;
    }
    const beforeEmployeeIds = shift.assignments.map((assignment) => assignment.employee_id);
    const role = buildSlots(shift)[openIndex] ?? 'open role';
    const next = await assignEmployee(shift, employee.id, `AI suggestion applied: ${employee.name} assigned to ${shift.name} ${role}`);
    if (!next) return;
    const title = item.title ?? item.message;
    setResolvedRecommendations((current) => current.includes(title) ? current : [...current, title]);
    setLastUndo({ shiftId: shift.id, employeeIds: beforeEmployeeIds });
    setNotice(`Suggestion applied: ${employee.name} assigned to ${shift.name} ${role}.`);
  }

  async function undoLastRecommendation() {
    if (!lastUndo) return;
    const shift = schedule.shifts.find((item) => item.id === lastUndo.shiftId);
    if (!shift) return;
    await setLineup(shift, lastUndo.employeeIds, 'Undo AI suggestion');
    setNotice('Suggestion undone.');
    setLastUndo(null);
  }

  async function saveEmployeeDay(employeeId, day, draft) {
    const employee = schedule.employees.find((item) => item.id === employeeId);
    if (!employee) return;
    const key = employeeDayKey(employeeId, day);
    const working = Boolean(draft.working);
    if (working) {
      if (!draft.department || !draft.role || !draft.startTime || !draft.endTime) throw new Error('Department, role, start time, and end time are required when Working is ON.');
      if (toMinutes(parseClockInput(draft.startTime)) >= toMinutes(parseClockInput(draft.endTime))) throw new Error('End time must be after start time.');
      const selected = findShiftForDraft(schedule, day, draft);
      if (!selected) throw new Error('No matching shift exists for that department and shift type.');
      const conflict = findEmployeeConflict(schedule, employeeId, selected);
      if (conflict && conflict.id !== selected.id) throw new Error(`${employee.name} is already assigned to ${conflict.name} ${shiftPeriod(conflict)} from ${formatShiftTime(conflict)}.`);
      const projected = assignedHours(schedule.shifts.filter((shift) => shift.id !== selected.id), employeeId) + hoursBetweenClock(draft.startTime, draft.endTime);
      if (projected > employee.max_hours_per_week && !draft.overrideMaxHours) throw new Error('Employee would exceed max weekly hours. Manager override is required.');
      let nextSchedule = schedule;
      if (parseClockInput(draft.startTime) !== selected.start_time || parseClockInput(draft.endTime) !== selected.end_time) {
        const next = await api(`/shifts/${selected.id}`, {
          userId,
          method: 'PUT',
          body: { startTime: draft.startTime, endTime: draft.endTime, reason: `Employee weekly editor: ${employee.name} ${day}` }
        });
        nextSchedule = normalizeSchedule(next);
        setSchedule(nextSchedule);
      }
      for (const shift of nextSchedule.shifts.filter((item) => item.day === day && item.id !== selected.id && item.assignments.some((assignment) => assignment.employee_id === employeeId))) {
        await removeEmployee(shift, employeeId, `Employee weekly editor: ${employee.name} ${day} moved`, { throwOnError: true });
      }
      await assignEmployeeToShift(employeeId, selected.id, `Employee weekly editor: ${employee.name} ${day} saved`, { throwOnError: true });
    } else {
      for (const shift of schedule.shifts.filter((item) => item.day === day && item.assignments.some((assignment) => assignment.employee_id === employeeId))) {
        await removeEmployee(shift, employeeId, `Employee weekly editor: ${employee.name} marked ${draft.status}`, { throwOnError: true });
      }
    }
    setEmployeeDayEdits((current) => ({ ...current, [key]: { ...draft, working } }));
    setNotice('Saved');
  }

  async function openHistory(shift) {
    setHistoryShift(shift);
    setHistory(await api(`/audit/shifts/${shift.id}`, { userId }));
  }

  async function copyTextExport() {
    const text = await api('/export/text', { userId });
    await navigator.clipboard.writeText(text);
  }

  async function downloadCsv() {
    const csv = await api('/export/csv', { userId });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lineup-ops-costco-schedule.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadJson() {
    const payload = await api('/export/json', { userId });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'lineup-ops-api-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function run(action, showBusy = true) {
    setError('');
    if (showBusy) setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      if (showBusy) setBusy(false);
    }
  }

  const activeUser = bootstrap?.users.find((user) => user.id === userId);
  const selectedManager = managerForUser(activeUser);
  const canGenerate = bootstrap?.permissions.includes('schedule:generate');
  const canEditAssignments = bootstrap?.permissions.includes('assignment:edit');
  const canExport = bootstrap?.permissions.includes('schedule:export');
  const isLocked = schedule?.schedule.status === 'locked';
  const metrics = useMemo(() => schedule ? calculateMetrics(schedule) : null, [schedule]);
  const selectedShift = useMemo(() => {
    if (!schedule) return null;
    return schedule.shifts.find((shift) => shift.id === selectedShiftId) ?? schedule.shifts[0] ?? null;
  }, [schedule, selectedShiftId]);
  const effectiveDepartment = selectedManager?.department ?? departmentFilter;
  const departmentShifts = schedule?.shifts.filter((shift) => shift.name === effectiveDepartment) ?? [];
  const borrowMoves = useMemo(() => schedule && selectedShift ? buildBorrowMoves(schedule, selectedShift) : [], [schedule, selectedShift]);
  const dragEmployee = schedule?.employees.find((employee) => employee.id === dragEmployeeId);
  const selectedEmployee = schedule?.employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const liveCoach = useMemo(() => schedule ? buildLiveCoach(schedule, employeeStatuses) : [], [schedule, employeeStatuses]);
  const coachItems = useMemo(() => [...liveCoach, ...(schedule?.coach ?? [])], [liveCoach, schedule]);
  const activeCoachItems = useMemo(() => coachItems.filter((item) => !resolvedRecommendations.includes(item.title ?? item.message)), [coachItems, resolvedRecommendations]);
  const resolvedCoachItems = useMemo(() => coachItems.filter((item) => resolvedRecommendations.includes(item.title ?? item.message)), [coachItems, resolvedRecommendations]);

  if (!bootstrap || !schedule || !selectedShift) {
    return (
      <main className="loading">
        {error ? (
          <div className="startup-help">
            <strong>Could not reach the scheduling API.</strong>
            <span>{error}</span>
            <code>npm run dev</code>
          </div>
        ) : 'Loading Lineup Ops...'}
      </main>
    );
  }

  const lineupProgress = Math.round((selectedShift.assignments.length / Math.max(selectedShift.required_count, 1)) * 100);
  const missingRoles = selectedShift.required_count - selectedShift.assignments.length;
  const nextMove = bestNextMove(schedule, selectedShift);
  const bench = schedule.employees.filter((employee) => !selectedShift.assignments.some((assignment) => assignment.employee_id === employee.id));
  const managerTeamNames = selectedManager?.team ?? [];
  const departmentCrew = bench.filter((employee) => managerTeamNames.includes(employee.name));
  const availableDepartmentCrew = departmentCrew.filter((employee) => !unavailableReason(employee, selectedShift, schedule, employeeStatuses));
  const unavailableDepartmentCrew = departmentCrew.filter((employee) => unavailableReason(employee, selectedShift, schedule, employeeStatuses));
  const borrowableBench = bench.filter((employee) => !departmentCrew.some((item) => item.id === employee.id))
    .sort((a, b) => readinessImpact(b, selectedShift, schedule.shifts) - readinessImpact(a, selectedShift, schedule.shifts));
  const departments = Array.from(new Set(schedule.shifts.map((shift) => shift.name)));

  return (
    <main className="ops-shell">
      <header className="ops-header">
        <div>
          <div className="brand-mark"><ShieldCheck size={17} /> Lineup Ops</div>
          <h1>Department Lineup Board</h1>
          <p>{schedule.workspace.organization} · {schedule.workspace.location} · Week of {schedule.schedule.week_start}</p>
        </div>
        <div className="header-panel">
          <select value={userId} onChange={(event) => setUserId(Number(event.target.value))}>
            {bootstrap.users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
          </select>
          <span className={`lock-state ${isLocked ? 'locked' : 'draft'}`}>
            {isLocked ? <LockKeyhole size={14} /> : <Unlock size={14} />}
            {isLocked ? 'Published · Locked' : 'Draft'}
          </span>
          {isLocked ? (
            <button disabled={!canGenerate || busy} onClick={unlockSchedule}>Unlock</button>
          ) : (
            <button className="primary-button" disabled={!canGenerate || busy} onClick={publish}>Publish Schedule</button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner"><span>{notice}</span>{lastUndo && <button onClick={undoLastRecommendation}>Undo</button>}<button onClick={() => setNotice(null)}>Dismiss</button></div>}

      <section className="planning-flow">
        <div className="mode-tabs">
          <button className={viewMode === 'weekly' ? 'active' : ''} onClick={() => {
            setViewMode('weekly');
            pushRoute({ viewMode: 'weekly' });
          }}>Weekly Operations</button>
          <button className={viewMode === 'lineup' ? 'active' : ''} onClick={() => {
            setViewMode('lineup');
            pushRoute({ viewMode: 'lineup' });
          }}>Tactical Lineup Builder</button>
        </div>
        <div className="finalization-flow">
          <span className="done">Build lineup</span>
          <span>Optimize readiness</span>
          <span>Resolve warnings</span>
          <span>Publish lineup</span>
          <span>Export or sync</span>
        </div>
      </section>

      {viewMode === 'weekly' && (
        <WeeklyOperationsView
          schedule={schedule}
          metrics={metrics}
          departments={departments}
          calendarMode={calendarMode}
          setCalendarMode={(value) => {
            setCalendarMode(value);
            replaceRoute({ calendarMode: value });
          }}
          employeeSearch={employeeSearch}
          setEmployeeSearch={(value) => {
            setEmployeeSearch(value);
            replaceRoute({ search: value });
          }}
          departmentFilter={effectiveDepartment}
          selectedManager={selectedManager}
          setDepartmentFilter={(value) => {
            setDepartmentFilter(value);
            replaceRoute({ department: value });
          }}
          shiftTypeFilter={shiftTypeFilter}
          setShiftTypeFilter={(value) => {
            setShiftTypeFilter(value);
            replaceRoute({ shiftType: value });
          }}
          aiCollapsed={aiCollapsed}
          setAiCollapsed={(value) => {
            setAiCollapsed(value);
            replaceRoute({ aiCollapsed: value });
          }}
          searchAllDepartments={searchAllDepartments}
          setSearchAllDepartments={setSearchAllDepartments}
          showBorrowable={showBorrowable}
          setShowBorrowable={setShowBorrowable}
          employeeStatuses={employeeStatuses}
          onEmployeeClick={(employee) => {
            setSelectedEmployeeId(employee.id);
            pushRoute({ selectedEmployeeId: employee.id });
          }}
          onTimelineEdit={(employee) => {
            setSelectedEmployeeId(employee.id);
            pushRoute({ selectedEmployeeId: employee.id });
          }}
          onStatusDrop={applyEmployeeStatus}
          coachItems={activeCoachItems}
          canExport={canExport}
          onCopy={copyTextExport}
          onCsv={downloadCsv}
          onJson={downloadJson}
          onOpenLineup={(shift) => {
            setSelectedShiftId(shift.id);
            setViewMode('lineup');
            setHighlightedShiftId(shift.id);
            pushRoute({ viewMode: 'lineup', department: shift.name, selectedShift: shift });
          }}
          onViewShift={openReferencedShift}
          onApplyRecommendation={applyRecommendation}
        />
      )}

      <section className={`ops-controls ${viewMode === 'weekly' ? 'hidden' : ''}`}>
        <div className="flow-label">
          <span>Step 1</span>
          <strong>Select shift</strong>
        </div>
        <div className="department-tabs">
          {departmentShifts.map((shift) => (
            <button key={shift.id} className={shift.id === selectedShift.id ? 'active' : shiftStatus(shift)} onClick={() => setSelectedShiftId(shift.id)}>
              <strong>{shift.name}</strong>
              <span>{shift.day} · {shiftPeriod(shift)} · {shift.assignments.length}/{shift.required_count}</span>
            </button>
          ))}
        </div>
        <div className="lineup-actions">
          <div className="mode-switch">
            {modes.map(([key, label, title]) => (
              <button key={key} title={title} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>{label}</button>
            ))}
          </div>
          <button className="primary-button" disabled={busy || !canGenerate || isLocked} onClick={generate}>
            <RefreshCw size={15} /> {busy ? 'Building...' : 'Build Best Lineup'}
          </button>
        </div>
      </section>

      <section className={`command-grid ${viewMode === 'weekly' ? 'hidden' : ''} ${aiCollapsed ? 'ai-collapsed' : ''}`}>
        <aside className="crew-panel">
          <PanelTitle title={`${selectedManager?.name ?? selectedShift.name} Crew`} subtitle={`${selectedManager?.role ?? 'Manager'} · ${selectedShift.name}. Direct subordinates first.`} />
          <div className="crew-list">
            <StatusDropZones onStatusDrop={applyEmployeeStatus} dragEmployeeId={dragEmployeeId} />
            <section className="bench-group active-lineup-list">
              <h3>Active Lineup</h3>
              {selectedShift.assignments.length ? selectedShift.assignments.map((assignment) => <button key={assignment.employee_id} onClick={() => setSelectedEmployeeId(assignment.employee_id)}>{assignment.employee_name}<span>{formatShiftTime(selectedShift)}</span></button>) : <p className="helper">No employees assigned yet.</p>}
            </section>
            <BenchGroup title="Available Bench" employees={availableDepartmentCrew} shift={selectedShift} schedule={schedule} employeeStatuses={employeeStatuses} onEmployeeClick={(employee) => {
              setSelectedEmployeeId(employee.id);
              pushRoute({ selectedEmployeeId: employee.id });
            }} canDrag={canEditAssignments && !isLocked} setDragEmployeeId={setDragEmployeeId} setHoverSlot={setHoverSlot} />
            <UnavailableGroup employees={unavailableDepartmentCrew} shift={selectedShift} schedule={schedule} employeeStatuses={employeeStatuses} onEmployeeClick={(employee) => {
              setSelectedEmployeeId(employee.id);
              pushRoute({ selectedEmployeeId: employee.id });
            }} />
            {!showBorrowable && <button className="borrow-toggle" onClick={() => setShowBorrowable(true)}>Borrow Employees</button>}
            {showBorrowable && <BorrowableGroup employees={borrowableBench} shift={selectedShift} schedule={schedule} employeeStatuses={employeeStatuses} onBorrow={(employee) => assignEmployee(selectedShift, employee.id)} onEmployeeClick={(employee) => {
              setSelectedEmployeeId(employee.id);
              pushRoute({ selectedEmployeeId: employee.id });
            }} canDrag={canEditAssignments && !isLocked} setDragEmployeeId={setDragEmployeeId} setHoverSlot={setHoverSlot} />}
            {bench.length === 0 && schedule.employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                hours={assignedHours(schedule.shifts, employee.id)}
                impact={readinessImpact(employee, selectedShift, schedule.shifts)}
                status={employeeVisualStatus(employee, employeeStatuses, schedule.shifts)}
                onClick={() => {
                  setSelectedEmployeeId(employee.id);
                  pushRoute({ selectedEmployeeId: employee.id });
                }}
                draggable={canEditAssignments && !isLocked}
                onDragStart={() => setDragEmployeeId(employee.id)}
                onDragEnd={() => {
                  setDragEmployeeId(null);
                  setHoverSlot(null);
                }}
              />
            ))}
          </div>
        </aside>

        <section className={`lineup-surface ${highlightedShiftId === selectedShift.id ? 'shift-highlight' : ''}`} data-shift-id={selectedShift.id}>
          <div className="lineup-surface-head">
            <div>
              <span className="step-chip">Build {selectedShift.name} {shiftPeriod(selectedShift)} Lineup</span>
              <h2><ShiftTypePill shift={selectedShift} /> Build {selectedShift.name} {shiftPeriod(selectedShift)} Lineup</h2>
              <p>{selectedShift.day} · {formatShiftTime(selectedShift)}</p>
              <p className="lineup-instruction">Drag available employees into open roles or click Find Best Match.</p>
            </div>
            <button onClick={() => openHistory(selectedShift)}><History size={15} /> View History</button>
          </div>

          <ShiftContextStrip schedule={schedule} selectedShift={selectedShift} onOpenShift={setSelectedShiftId} />

          <DayCoveragePanel schedule={schedule} selectedShift={selectedShift} onOpenShift={setSelectedShiftId} />

          <div className="lineup-progress-card">
            <div>
              <span>Lineup Completion</span>
              <strong>{lineupProgress}%</strong>
              <em>{selectedShift.assignments.length} / {selectedShift.required_count} filled · {missingRoles > 0 ? `${missingRoles} critical ${missingRoles === 1 ? 'role' : 'roles'} missing` : 'Ready to publish'}</em>
            </div>
            <div className="completion-meter"><i style={{ width: `${lineupProgress}%` }} /></div>
            <div>
              <span>Operational Readiness</span>
              <strong>{selectedShift.readiness}%</strong>
              <em>Labor ${Math.round(laborCost(selectedShift))} / ${Math.round(selectedShift.labor_budget || laborCost(selectedShift))}</em>
            </div>
          </div>

          <div className="slot-board grouped-slot-board">
            {buildRoleGroups(selectedShift).map((group) => (
              <section className="role-group" key={group.name}>
                <h3>{group.name}</h3>
                {group.roles.map((slot) => {
                  const index = buildSlots(selectedShift).indexOf(slot);
                  const assignment = selectedShift.assignments[index];
                  const fit = dragEmployee ? evaluateFit(dragEmployee, selectedShift, schedule.shifts) : null;
                  return (
                    <LineupSlot
                      key={slot}
                      label={slot}
                      assignment={assignment}
                      fit={hoverSlot === index ? fit : null}
                      canEdit={canEditAssignments && !isLocked}
                      onDragEnter={() => setHoverSlot(index)}
                      onDragLeave={() => setHoverSlot(null)}
                      onDrop={() => {
                        assignEmployee(selectedShift, dragEmployeeId);
                        setHoverSlot(null);
                      }}
                      onRemove={() => assignment && removeEmployee(selectedShift, assignment.employee_id)}
                      onBestMatch={() => nextMove && assignEmployee(selectedShift, nextMove.employee.id, `Best match: ${nextMove.employee.name} assigned to ${selectedShift.name} ${slot}`)}
                      onEmployeeClick={(assignment) => {
                        setSelectedEmployeeId(assignment.employee_id);
                        pushRoute({ selectedEmployeeId: assignment.employee_id });
                      }}
                    />
                  );
                })}
              </section>
            ))}
          </div>

          <div className="lineup-footer">
            <span>Last edited by {selectedShift.updated_by_name} · {formatTime(selectedShift.updated_at)}</span>
            <span>{selectedShift.assignments.length} of {selectedShift.required_count} roles staffed</span>
          </div>
        </section>

        {!aiCollapsed && <aside className="strategy-panel">
          <button className="panel-minimize" onClick={() => {
            setAiCollapsed(true);
            replaceRoute({ aiCollapsed: true });
          }}>Minimize AI</button>
          <PanelTitle title="AI Next Best Move" subtitle="Answers: what should I do next?" />
          {nextMove && (
            <article className="next-move-card">
              <span>TOP PRIORITY</span>
              <strong>Assign {nextMove.slot}</strong>
              <p>Recommended: {nextMove.employee.name}</p>
              <em>Strong fit · +{nextMove.impact}% readiness</em>
              <button disabled={isLocked} onClick={() => assignEmployee(selectedShift, nextMove.employee.id, `Manager applied next best move: ${nextMove.employee.name} assigned to ${selectedShift.name} ${nextMove.slot}`)}>Apply Move</button>
            </article>
          )}
          <div className="coach-stack">
            {activeCoachItems.slice(0, 4).map((item, index) => (
              <RecommendationCard key={`${item.title}-${index}`} item={item} onViewShift={openReferencedShift} onApply={applyRecommendation} />
            ))}
          </div>

          <div className="borrow-panel">
            <PanelTitle title="Borrow Employees" subtitle="Preview cross-department moves." />
            {borrowMoves.map((move) => (
              <article className="borrow-card" key={move.employee.id}>
                <div>
                  <strong>{move.employee.name}</strong>
                  <span>{move.from} → {selectedShift.name}</span>
                </div>
                <p>Receiving Readiness +{move.targetGain}% · {move.from} -{move.sourceLoss}% · Warehouse +{move.netGain}%</p>
                <div>
                  <button>Preview Impact</button>
                  <button disabled={isLocked} onClick={() => assignEmployee(selectedShift, move.employee.id)}>Apply Move</button>
                </div>
              </article>
            ))}
          </div>

          <div className="activity-panel">
            <PanelTitle title="Recent Activity" subtitle="Every move is attributable." />
            {schedule.audit.slice(0, 6).map((item) => <AuditItem key={item.id} item={item} />)}
          </div>
          <div className="activity-panel">
            <PanelTitle title="Resolved Recommendations" subtitle={`${resolvedCoachItems.length} handled this session.`} />
            {resolvedCoachItems.length ? resolvedCoachItems.slice(0, 4).map((item) => <article className="resolved-item" key={item.title ?? item.message}>{item.title ?? item.message}</article>) : <p className="helper">Applied or manually fixed recommendations will appear here.</p>}
          </div>

          <div className="export-panel">
            <button disabled={!canExport} onClick={copyTextExport}><Clipboard size={15} /> Copy</button>
            <button disabled={!canExport} onClick={downloadCsv}><Download size={15} /> CSV</button>
            <button onClick={() => window.print()}><Printer size={15} /> Print</button>
          </div>
        </aside>}
      </section>

      {aiCollapsed && (
        <button className="floating-ai" onClick={() => {
          setAiCollapsed(false);
          replaceRoute({ aiCollapsed: false });
        }}>
          <Zap size={16} /> AI Coach · {activeCoachItems.filter((item) => item.level !== 'good').length} Alerts
        </button>
      )}

      {selectedEmployee && (
        <EmployeeQuickPanel
          employee={selectedEmployee}
          schedule={schedule}
          status={employeeStatuses[selectedEmployee.id]}
          onClose={() => {
            setSelectedEmployeeId(null);
            if (window.location.pathname.startsWith('/employee/')) window.history.back();
            else replaceRoute({ selectedEmployeeId: null });
          }}
          onStatusChange={(status) => applyEmployeeStatus(selectedEmployee.id, status)}
          dayEdits={employeeDayEdits}
          onSaveDay={saveEmployeeDay}
          onOpenShift={(shift) => {
            setSelectedShiftId(shift.id);
            setViewMode('lineup');
            setSelectedEmployeeId(null);
            pushRoute({ viewMode: 'lineup', department: shift.name, selectedShift: shift, selectedEmployeeId: null });
          }}
        />
      )}

      {timelineEdit && (
        <TimelineEditModal
          edit={timelineEdit}
          schedule={schedule}
          employeeStatuses={employeeStatuses}
          onClose={() => setTimelineEdit(null)}
          onAssign={assignEmployeeToShift}
          onRemove={removeEmployee}
          onStatusChange={applyEmployeeStatus}
        />
      )}

      {historyShift && (
        <div className="modal-backdrop" onClick={() => setHistoryShift(null)}>
          <section className="history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <h2>{historyShift.name} History</h2>
                <p>{historyShift.day} · {formatShiftTime(historyShift)}</p>
              </div>
              <button onClick={() => setHistoryShift(null)}>Close</button>
            </div>
            {history.length === 0 ? <p className="helper">No shift-specific changes yet.</p> : history.map((item) => <AuditItem key={item.id} item={item} />)}
          </section>
        </div>
      )}
    </main>
  );
}

function WeeklyOperationsView({
  schedule,
  metrics,
  departments,
  calendarMode,
  setCalendarMode,
  employeeSearch,
  setEmployeeSearch,
  departmentFilter,
  selectedManager,
  setDepartmentFilter,
  shiftTypeFilter,
  setShiftTypeFilter,
  aiCollapsed,
  setAiCollapsed,
  searchAllDepartments,
  setSearchAllDepartments,
  showBorrowable,
  setShowBorrowable,
  employeeStatuses,
  onEmployeeClick,
  onTimelineEdit,
  onStatusDrop,
  coachItems,
  canExport,
  onCopy,
  onCsv,
  onJson,
  onOpenLineup,
  onViewShift,
  onApplyRecommendation
}) {
  const [certificationFilter, setCertificationFilter] = useState('all');
  const managerTeamNames = selectedManager?.team ?? [];
  const borrowedEmployeeIds = new Set(schedule.shifts.flatMap((shift) =>
    shift.assignments
      .filter((assignment) => assignment.home_department && assignment.home_department !== shift.name)
      .map((assignment) => assignment.employee_id)
  ));
  const contextEmployeeIds = new Set(schedule.employees
    .filter((employee) => departmentFilter === 'all' || managerTeamNames.includes(employee.name))
    .map((employee) => employee.id));
  const filteredShifts = schedule.shifts.filter((shift) =>
    (departmentFilter === 'all' || shift.name === departmentFilter) &&
    (shiftTypeFilter === 'all' || shiftPeriod(shift).toLowerCase() === shiftTypeFilter)
  );
  const filteredEmployees = schedule.employees.filter((employee) => {
    const text = `${employee.name} ${employee.certifications.join(' ')} ${employee.home_department ?? ''}`.toLowerCase();
    const search = employeeSearch.toLowerCase();
    const matchesText = search === 'borrowed' ? borrowedEmployeeIds.has(employee.id) : text.includes(search);
    const matchesCertification = certificationFilter === 'all' || employee.certifications.includes(certificationFilter);
    const matchesContext = searchAllDepartments || departmentFilter === 'all' || contextEmployeeIds.has(employee.id) || borrowedEmployeeIds.has(employee.id);
    return matchesText && matchesCertification && matchesContext;
  });
  const primaryEmployees = filteredEmployees.filter((employee) => departmentFilter === 'all' || managerTeamNames.includes(employee.name));
  const borrowableEmployees = filteredEmployees.filter((employee) => departmentFilter !== 'all' && !managerTeamNames.includes(employee.name));
  const certifications = Array.from(new Set(schedule.employees.flatMap((employee) => employee.certifications))).sort();
  const openShifts = schedule.shifts.filter((shift) => shift.assignments.length < shift.required_count);
  const readinessByDepartment = departments.map((department) => {
    const shifts = schedule.shifts.filter((shift) => shift.name === department);
    const readiness = shifts.length ? Math.round(shifts.reduce((sum, shift) => sum + shift.readiness, 0) / shifts.length) : 0;
    return { department, readiness };
  });

  return (
    <section className="weekly-ops">
      <div className="weekly-toolbar">
        <div>
          <span className="step-chip">Weekly Operations View</span>
          <h2>{departmentFilter === 'all' ? 'Warehouse Weekly Schedule' : `${departmentFilter} Weekly Schedule`}</h2>
          <p>Build, review, export, or sync to systems like UKG, Workday, ADP, Dayforce, Blue Yonder, SAP, Oracle, and Reflexis.</p>
        </div>
        <div className="weekly-actions">
          <div className="shift-type-toggle">
            {['all', 'am', 'mid', 'pm'].map((period) => <button key={period} className={shiftTypeFilter === period ? 'active' : ''} onClick={() => setShiftTypeFilter(period)}>{period === 'all' ? 'All' : period.toUpperCase()}</button>)}
          </div>
          <div className="calendar-toggle">
            {['day', 'week', 'month'].map((mode) => <button key={mode} className={calendarMode === mode ? 'active' : ''} onClick={() => setCalendarMode(mode)}>{mode}</button>)}
          </div>
          <button>Previous Week</button>
          <button>Next Week</button>
        </div>
      </div>

      <div className="weekly-summary">
        <Kpi label="Operational Readiness" value={`${metrics.operationalReadiness}%`} detail={metrics.operationalReadiness >= 88 ? 'Strong Lineup' : 'Needs work before export'} tone={metrics.operationalReadiness >= 88 ? 'good' : metrics.operationalReadiness >= 70 ? 'watch' : 'urgent'} />
        <Kpi label="Open Shifts" value={openShifts.length} detail="need manager action" tone={openShifts.length ? 'urgent' : 'good'} />
        <Kpi label="Slots Filled" value={`${metrics.filled} of ${metrics.totalSlots}`} detail={`${metrics.coveragePct}% staffing coverage`} progress={metrics.coveragePct} tone={metrics.coveragePct >= 92 ? 'good' : 'watch'} />
        <Kpi label="Selected Department" value={`${departmentReadiness(filteredShifts)}%`} detail={`${filteredShifts.length} shifts visible`} progress={departmentReadiness(filteredShifts)} tone={departmentReadiness(filteredShifts) >= 82 ? 'good' : 'watch'} />
      </div>

      <div className={`weekly-grid ${aiCollapsed ? 'ai-collapsed' : ''}`}>
        <aside className="weekly-side">
          <PanelTitle title="Search & Filters" subtitle="Find employees, skills, or department coverage." />
          <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search employees or skills" />
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="all">All departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <select value={certificationFilter} onChange={(event) => setCertificationFilter(event.target.value)}>
            <option value="all">All certifications</option>
            {certifications.map((certification) => <option key={certification} value={certification}>{certification}</option>)}
          </select>
          <label className="search-all-toggle">
            <input type="checkbox" checked={searchAllDepartments} onChange={(event) => setSearchAllDepartments(event.target.checked)} />
            Search all departments
          </label>
          <div className="quick-filters">
            <span>Fast filters</span>
            <button onClick={() => setCertificationFilter('Forklift')}>Forklift</button>
            <button onClick={() => setCertificationFilter('Cashier')}>Cashier</button>
            <button onClick={() => setEmployeeSearch('borrowed')}>Borrowed</button>
            <button onClick={() => setEmployeeSearch('')}>Clear</button>
          </div>
          <div className="readiness-list">
            <h3>Department Readiness</h3>
            {readinessByDepartment.map((item) => (
              <button key={item.department} onClick={() => setDepartmentFilter(item.department)}>
                <span>{item.department}</span>
                <strong>{item.readiness}%</strong>
              </button>
            ))}
          </div>
          <div className="integration-box">
            <h3>Export / Sync Prep</h3>
            <p>Lineup Ops exports clean planning data with employee IDs, shift IDs, departments, roles, certifications, labor, and assignments.</p>
            <button disabled={!canExport} onClick={onCopy}>Copy Schedule</button>
            <button disabled={!canExport} onClick={onCsv}>CSV / Excel</button>
            <button disabled={!canExport} onClick={onJson}>JSON / API-ready</button>
          </div>
        </aside>

        <section className="weekly-board">
          <div className="heatmap-row">
            <span><i className="good" /> Ready</span>
            <span><i className="watch" /> At risk</span>
            <span><i className="urgent" /> Open roles</span>
            <span><i className="borrowed" /> Borrowed employee</span>
            <span><i className="am" /> AM</span>
            <span><i className="mid" /> MID</span>
            <span><i className="pm" /> PM</span>
          </div>
          <DepartmentWeekTimeline shifts={filteredShifts} onOpenLineup={onOpenLineup} />
          <EmployeeWeeklyTimeline
            employees={filteredEmployees}
            shifts={schedule.shifts}
            activeDepartment={departmentFilter}
            employeeStatuses={employeeStatuses}
            onEmployeeClick={onEmployeeClick}
            onTimelineEdit={onTimelineEdit}
          />
        </section>

        {!aiCollapsed && <aside className="weekly-side ai-weekly-panel">
          <button className="panel-minimize" onClick={() => setAiCollapsed(true)}>Minimize AI</button>
          <PanelTitle title="AI Recommendations" subtitle="Resolve these before publishing." />
          {coachItems.slice(0, 5).map((item, index) => <RecommendationCard key={`${item.title}-${index}`} item={item} onViewShift={onViewShift} onApply={onApplyRecommendation} />)}
          <div className="search-results">
            <h3>Matching Employees</h3>
            {departmentFilter !== 'all' && <span className="result-group-label">{departmentFilter} Crew</span>}
            {(departmentFilter === 'all' ? filteredEmployees : primaryEmployees).slice(0, 5).map((employee) => (
              <div key={employee.id} onClick={() => onEmployeeClick(employee)} role="button" tabIndex={0}>
                <strong>{employee.name}</strong>
                <span>{employee.certifications.join(' · ')}</span>
              </div>
            ))}
            {departmentFilter !== 'all' && (
              <>
                <span className="result-group-label">Borrowable Employees</span>
                {borrowableEmployees.slice(0, 5).map((employee) => (
                  <div key={employee.id} onClick={() => onEmployeeClick(employee)} role="button" tabIndex={0}>
                    <strong>{employee.name}</strong>
                    <span>{employee.home_department ?? 'Shared bench'} · {employee.certifications.join(' · ')}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>}
      </div>
      <StatusDropZones onStatusDrop={onStatusDrop} dragEmployeeId={null} compact />
    </section>
  );
}

function DepartmentWeekTimeline({ shifts, onOpenLineup }) {
  return (
    <section className="department-timeline" aria-label="Department weekly timeline">
      <div className="timeline-head">
        {days.map((day) => {
          const dayShifts = shifts.filter((shift) => shift.day === day);
          const ready = departmentReadiness(dayShifts);
          const open = dayShifts.reduce((sum, shift) => sum + Math.max(0, shift.required_count - shift.assignments.length), 0);
          return (
            <div key={day}>
              <strong>{day}</strong>
              <span>{ready}% ready · {open} open</span>
            </div>
          );
        })}
      </div>
      <div className="timeline-grid">
        {days.map((day) => (
          <section className="timeline-day" key={day}>
            {shifts.filter((shift) => shift.day === day).map((shift, index, dayShifts) => (
              <ShiftTimelineCard
                key={shift.id}
                shift={shift}
                previousShift={dayShifts[index - 1]}
                nextShift={dayShifts[index + 1]}
                onOpenLineup={onOpenLineup}
              />
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}

function ShiftTimelineCard({ shift, previousShift, nextShift, onOpenLineup }) {
  const openRoles = buildSlots(shift).slice(shift.assignments.length);
  const borrowed = shift.assignments.filter((assignment) => assignment.home_department && assignment.home_department !== shift.name);
  return (
    <button className={`timeline-shift ${shiftStatus(shift)} shift-${shiftPeriod(shift).toLowerCase()}`} onClick={() => onOpenLineup(shift)}>
      <div className="shift-card-top">
        <ShiftTypePill shift={shift} />
        <strong>{shift.name}</strong>
        <em>{formatShiftTime(shift)}</em>
      </div>
      <div className="shift-readiness-line">
        <span>{shift.assignments.length} / {shift.required_count} staffed</span>
        <strong>{shift.readiness}%</strong>
      </div>
      <div className="mini-progress"><i style={{ width: `${Math.min(100, (shift.assignments.length / Math.max(shift.required_count, 1)) * 100)}%` }} /></div>
      <div className="assignment-chips">
        {shift.assignments.slice(0, 4).map((assignment) => (
          <span key={assignment.employee_id} className={assignment.home_department && assignment.home_department !== shift.name ? 'borrowed-chip' : ''}>
            {assignment.employee_name}
          </span>
        ))}
        {shift.assignments.length > 4 && <span>+{shift.assignments.length - 4} more</span>}
      </div>
      {openRoles.length > 0 && (
        <div className="open-role-list">
          {openRoles.slice(0, 3).map((role) => <span key={role}>Need {role}</span>)}
        </div>
      )}
      <div className="shift-card-foot">
        <span>Labor ${Math.round(laborCost(shift))} / ${Math.round(shift.labor_budget || laborCost(shift))}</span>
        <span>{borrowed.length ? `${borrowed.length} borrowed` : shift.required_certification}</span>
      </div>
      {(previousShift || nextShift) && (
        <div className="continuity-row">
          <span>{previousShift ? `Prev ${previousShift.readiness}%` : 'Start of day'}</span>
          <span>{nextShift ? `Next ${nextShift.readiness}%` : 'End of day'}</span>
        </div>
      )}
    </button>
  );
}

function EmployeeWeeklyTimeline({ employees, shifts, activeDepartment, employeeStatuses, onEmployeeClick, onTimelineEdit }) {
  const rows = employees.map((employee) => employeeWeekSummary(employee, shifts, activeDepartment, employeeStatuses));
  return (
    <section className="employee-weekly-timeline">
      <div className="timeline-section-title">
        <div>
          <h3>Employee Weekly Timeline</h3>
          <p>Hours, assignments, borrowed coverage, and OT pressure in one pass.</p>
        </div>
      </div>
      <div className="employee-timeline-table">
        <div className="employee-row timeline-days-header">
          <span>Team Member</span>
          {['M', 'Tue', 'W', 'Thu', 'F', 'Sat', 'Sun'].map((label) => <span key={label}>{label}</span>)}
        </div>
        {rows.slice(0, 10).map((row) => (
          <article className={`employee-row ${row.overtime ? 'overtime' : row.fatigue ? 'fatigue' : ''}`} key={row.employee.id}>
            <button className={`employee-row-person status-${row.visual.key}`} onClick={() => onEmployeeClick(row.employee)}>
              <ProfilePhoto name={row.employee.name} profile={profileFor(row.employee)} size="small" />
              <div>
                <strong>{row.employee.name}</strong>
                <span>{row.plan.employmentType} · {row.hours} / {row.employee.max_hours_per_week} hrs · {row.status}</span>
                {row.plan.fixed && <em>{row.plan.fixedLabel}</em>}
              </div>
            </button>
            {days.map((day) => (
              <button className="employee-day-cell" key={day} onClick={() => onTimelineEdit(row.employee, day)}>
                {row.dayStatus[day] ? <em className="timeoff">{row.dayStatus[day]}</em> : row.byDay[day].length ? row.byDay[day].map((item) => (
                  <span key={`${item.shift.id}-${item.shift.start_time}`} className={`${item.borrowed ? 'borrowed' : ''} period-${shiftPeriod(item.shift).toLowerCase()}`}>
                    {formatShiftTime(item.shift)} · {assignmentLabel(item.shift)}
                  </span>
                )) : <em>OFF</em>}
              </button>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}


function UnavailableGroup({ employees, shift, schedule, employeeStatuses, onEmployeeClick }) {
  if (!employees.length) return null;
  return (
    <section className="bench-group unavailable-list">
      <h3>Unavailable</h3>
      {employees.map((employee) => (
        <button key={employee.id} onClick={() => onEmployeeClick(employee)}>
          <ProfilePhoto name={employee.name} profile={profileFor(employee)} size="small" />
          <div>
            <strong>{employee.name}</strong>
            <span>{unavailableReason(employee, shift, schedule, employeeStatuses)}</span>
          </div>
        </button>
      ))}
    </section>
  );
}

function BorrowableGroup({ employees, shift, schedule, employeeStatuses, onEmployeeClick, onBorrow, canDrag, setDragEmployeeId, setHoverSlot }) {
  if (!employees.length) return null;
  return (
    <section className="bench-group borrowable-list">
      <h3>Borrowable From Other Departments</h3>
      {employees.slice(0, 8).map((employee) => {
        const impact = readinessImpact(employee, shift, schedule.shifts);
        const sourceLoss = employee.reliability_score > 88 ? 5 : 3;
        return (
          <article className="borrowable-employee" key={employee.id} draggable={canDrag} onDragStart={() => setDragEmployeeId(employee.id)} onDragEnd={() => {
            setDragEmployeeId(null);
            setHoverSlot(null);
          }}>
            <button onClick={() => onEmployeeClick(employee)}>
              <ProfilePhoto name={employee.name} profile={profileFor(employee)} size="small" />
              <div>
                <strong>{employee.name}</strong>
                <span>Home: {employee.home_department ?? sourceDepartment(employee, schedule.shifts)}</span>
                <em>{employee.certifications.join(' · ')}</em>
              </div>
            </button>
            <p>{shift.name} +{impact}% · {employee.home_department ?? 'Home dept'} -{sourceLoss}%</p>
            <div>
              <button onClick={() => onBorrow(employee)}>Borrow</button>
              <button>Preview Impact</button>
              <button>Request Approval</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function DayCoveragePanel({ schedule, selectedShift, onOpenShift }) {
  const dayShifts = schedule.shifts.filter((shift) => shift.name === selectedShift.name && shift.day === selectedShift.day);
  return (
    <section className="day-coverage-panel">
      <div>
        <span>Full-Day Coverage</span>
        <strong>{selectedShift.name} · {selectedShift.day}</strong>
      </div>
      {dayShifts.map((shift) => (
        <button key={shift.id} className={shift.id === selectedShift.id ? 'active' : shiftStatus(shift)} onClick={() => onOpenShift(shift.id)}>
          <ShiftTypePill shift={shift} />
          <strong>{formatShiftTime(shift)}</strong>
          <span>{shift.assignments.length}/{shift.required_count} staffed · {shift.readiness}% ready</span>
        </button>
      ))}
    </section>
  );
}

function ShiftContextStrip({ schedule, selectedShift, onOpenShift }) {
  const sameDepartment = schedule.shifts.filter((shift) => shift.name === selectedShift.name);
  const currentIndex = sameDepartment.findIndex((shift) => shift.id === selectedShift.id);
  const previousShift = sameDepartment[currentIndex - 1] ?? null;
  const nextShift = sameDepartment[currentIndex + 1] ?? null;
  const borrowed = selectedShift.assignments.filter((assignment) => assignment.home_department && assignment.home_department !== selectedShift.name);
  return (
    <div className="shift-context-strip">
      <button disabled={!previousShift} onClick={() => previousShift && onOpenShift(previousShift.id)}>
        <span>Previous shift</span>
        <strong>{previousShift ? `${previousShift.day} · ${shiftPeriod(previousShift)} · ${previousShift.readiness}%` : 'None'}</strong>
      </button>
      <div>
        <span>Weekly awareness</span>
        <strong>{borrowed.length ? `${borrowed.length} borrowed employee${borrowed.length === 1 ? '' : 's'} in this lineup` : 'No borrowed employees'}</strong>
        <em>{selectedShift.assignments.length} active assignments · {Math.max(0, selectedShift.required_count - selectedShift.assignments.length)} open roles</em>
      </div>
      <button disabled={!nextShift} onClick={() => nextShift && onOpenShift(nextShift.id)}>
        <span>Next shift</span>
        <strong>{nextShift ? `${nextShift.day} · ${shiftPeriod(nextShift)} · ${nextShift.readiness}%` : 'None'}</strong>
      </button>
    </div>
  );
}

function BenchGroup({ title, employees, shift, schedule, employeeStatuses, onEmployeeClick, canDrag, setDragEmployeeId, setHoverSlot }) {
  if (!employees.length) return null;
  return (
    <section className="bench-group">
      <h3>{title}</h3>
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          hours={assignedHours(schedule.shifts, employee.id)}
          impact={readinessImpact(employee, shift, schedule.shifts)}
          status={employeeVisualStatus(employee, employeeStatuses, schedule.shifts)}
          onClick={() => onEmployeeClick(employee)}
          draggable={canDrag}
          onDragStart={() => setDragEmployeeId(employee.id)}
          onDragEnd={() => {
            setDragEmployeeId(null);
            setHoverSlot(null);
          }}
        />
      ))}
    </section>
  );
}

function LineupSlot({ label, assignment, fit, canEdit, onDragEnter, onDragLeave, onDrop, onRemove, onEmployeeClick, onBestMatch }) {
  const profile = assignment ? profileFor({ name: assignment.employee_name, certifications: assignment.certifications }) : null;
  return (
    <article
      className={`lineup-slot ${assignment ? 'filled' : 'open'} ${fit ? `fit-${fit.tone}` : ''}`}
      onDragOver={(event) => canEdit && event.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="slot-label">{label}</div>
      {assignment ? (
        <div className="slot-person">
          <ProfilePhoto name={assignment.employee_name} profile={profile} size="small" />
          <button className="slot-person-main" onClick={() => onEmployeeClick(assignment)}>
            <strong>{assignment.employee_name}</strong>
            <span>{profile.role} · Reliability {assignment.reliability_score}</span>
          </button>
          {canEdit && <button onClick={onRemove}>Remove</button>}
        </div>
      ) : (
        <div className="slot-empty">
          <strong>{label}</strong>
          <span>{roleRequirementText(label)}</span>
          {canEdit && <button onClick={onBestMatch}>Find Best Match</button>}
        </div>
      )}
      {fit && <div className={`fit-message ${fit.tone}`}>{fit.message}</div>}
    </article>
  );
}

function EmployeeCard({ employee, hours, impact, status, draggable, onClick, onDragStart, onDragEnd }) {
  const remaining = Math.max(0, employee.max_hours_per_week - hours);
  const pressure = remaining <= 4;
  const profile = profileFor(employee);
  return (
    <article className={`employee-card status-${status?.key ?? 'active'}`} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <button className="employee-top" onClick={onClick}>
        <ProfilePhoto name={employee.name} profile={profile} />
        <div>
          <strong>{employee.name}</strong>
          <span>{profile.role}</span>
        </div>
      </button>
      <div className="employee-meta">
        <span>Reliability {employee.reliability_score}</span>
        <span className={pressure ? 'danger' : ''}>{remaining}h remaining</span>
        <span>${employee.hourly_rate}/hr</span>
        <span className={impact >= 10 ? 'impact-high' : ''}>{impact >= 10 ? 'High' : 'Standard'} readiness impact</span>
      </div>
      <span className="employee-status-chip">{status?.label ?? 'Active'}</span>
      <div className="skill-row">{employee.certifications.map((skill) => <span key={skill}>{skill}</span>)}</div>
      <AvailabilityStrip availability={employee.availability} />
    </article>
  );
}

function StatusDropZones({ onStatusDrop, dragEmployeeId, compact = false }) {
  const zones = [
    employeeStatusCatalog.off,
    employeeStatusCatalog.pto,
    employeeStatusCatalog.sick,
    employeeStatusCatalog.vacation
  ];
  return (
    <section className={`status-zones ${compact ? 'compact' : ''}`}>
      {!compact && <h3>Quick Status Zones</h3>}
      <div>
        {zones.map((status) => (
          <button
            key={status.key}
            className={`status-zone status-${status.key}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dragEmployeeId && onStatusDrop(dragEmployeeId, status)}
          >
            <strong>{status.label}</strong>
            <span>{status.help}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function EmployeeQuickPanel({ employee, schedule, status, onClose, onStatusChange, onOpenShift, dayEdits, onSaveDay }) {
  const assignments = schedule.shifts.filter((shift) => shift.assignments.some((assignment) => assignment.employee_id === employee.id));
  const hours = assignedHours(schedule.shifts, employee.id);
  const visual = employeeVisualStatus(employee, { [employee.id]: status }, schedule.shifts);
  const plan = planningFor(employee);
  const remaining = employee.max_hours_per_week - hours;
  const [drafts, setDrafts] = useState(() => Object.fromEntries(days.map((day) => [day, buildDayDraft(employee, day, schedule, dayEdits)])));
  const [saveStates, setSaveStates] = useState({});
  const [dirty, setDirty] = useState(false);

  function updateDay(day, patch) {
    setDrafts((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
    setSaveStates((current) => ({ ...current, [day]: 'Unsaved changes' }));
    setDirty(true);
  }

  async function saveDay(day) {
    setSaveStates((current) => ({ ...current, [day]: 'Saving...' }));
    try {
      await onSaveDay(employee.id, day, drafts[day]);
      setSaveStates((current) => ({ ...current, [day]: 'Saved' }));
      setDirty(false);
    } catch (err) {
      setSaveStates((current) => ({ ...current, [day]: `Error saving: ${err.message}` }));
    }
  }

  function requestClose() {
    if (dirty && !window.confirm('You have unsaved changes. Save before closing?')) return;
    onClose();
  }

  return (
    <aside className="employee-drawer weekly-editor-drawer">
      <div className="drawer-head">
        <div className={`drawer-profile status-${visual.key}`}>
          <ProfilePhoto name={employee.name} profile={profileFor(employee)} />
          <div>
            <span>Employee Detail / Weekly Editor</span>
            <h2>{employee.name}</h2>
            <p>{profileFor(employee).role} · {employee.home_department}</p>
          </div>
        </div>
        <button onClick={requestClose}>Close</button>
      </div>

      <section className="drawer-section employee-detail-grid">
        <div><span>Home department</span><strong>{employee.home_department ?? 'Shared bench'}</strong></div>
        <div><span>Role</span><strong>{profileFor(employee).role}</strong></div>
        <div><span>Status</span><strong>{plan.employmentType}</strong></div>
        <div><span>Target hours</span><strong>{plan.targetHours}h</strong></div>
        <div><span>Max hours</span><strong>{employee.max_hours_per_week}h</strong></div>
        <div><span>Scheduled</span><strong>{hours}h</strong></div>
        <div><span>Remaining</span><strong className={remaining < 0 ? 'danger' : ''}>{remaining}h</strong></div>
        <div><span>OT risk</span><strong>{hours > employee.max_hours_per_week ? 'Projected' : hours >= employee.max_hours_per_week * 0.85 ? 'Watch' : 'Clear'}</strong></div>
      </section>

      <section className="drawer-section">
        <h3>Skills / Certifications</h3>
        <div className="skill-row">{employee.certifications.map((skill) => <span key={skill}>{skill}</span>)}</div>
      </section>

      <section className="drawer-section">
        <h3>Current Week Schedule</h3>
        <div className="week-editor-list">
          {days.map((day) => (
            <DayScheduleEditor
              key={day}
              day={day}
              draft={drafts[day]}
              schedule={schedule}
              employee={employee}
              saveState={saveStates[day] ?? 'Saved'}
              onChange={(patch) => updateDay(day, patch)}
              onSave={() => saveDay(day)}
              onOpenShift={onOpenShift}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}

function DayScheduleEditor({ day, draft, schedule, employee, saveState, onChange, onSave, onOpenShift }) {
  const departments = Array.from(new Set(schedule.shifts.map((shift) => shift.name)));
  const roles = rolesForDepartment(draft.department, employee);
  const matchingShift = findShiftForDraft(schedule, day, draft);
  const statusOptions = draft.working ? ['Working', 'Training'] : ['Off', 'Sick', 'Vacation', 'PTO', 'Holiday PTO', 'Unavailable'];
  return (
    <article className={`day-editor ${draft.working ? 'working' : 'off'}`}>
      <div className="day-editor-head">
        <strong>{day}</strong>
        <label className="working-toggle">
          <input type="checkbox" checked={draft.working} onChange={(event) => onChange({ working: event.target.checked, status: event.target.checked ? 'Working' : 'Off' })} />
          Working: {draft.working ? 'ON' : 'OFF'}
        </label>
        <span className={`save-state ${saveState.startsWith('Error') ? 'error' : saveState === 'Unsaved changes' ? 'dirty' : ''}`}>{saveState}</span>
      </div>
      <div className="day-editor-grid">
        <label>Status<select value={draft.status} onChange={(event) => onChange({ status: event.target.value })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Department<select disabled={!draft.working} value={draft.department} onChange={(event) => onChange({ department: event.target.value, role: rolesForDepartment(event.target.value, employee)[0] })}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Role<select disabled={!draft.working} value={draft.role} onChange={(event) => onChange({ role: event.target.value })}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Shift<select disabled={!draft.working} value={draft.period} onChange={(event) => onChange({ period: event.target.value })}>{['AM', 'MID', 'PM'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Start time<input disabled={!draft.working} value={draft.startTime} onChange={(event) => onChange({ startTime: event.target.value })} /></label>
        <label>End time<input disabled={!draft.working} value={draft.endTime} onChange={(event) => onChange({ endTime: event.target.value })} /></label>
        <label className="notes-field">Notes<input value={draft.notes ?? ''} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Optional" /></label>
        <label className="override-toggle"><input type="checkbox" checked={Boolean(draft.overrideMaxHours)} onChange={(event) => onChange({ overrideMaxHours: event.target.checked })} /> Override max hours</label>
      </div>
      <div className="day-editor-actions">
        <button className="primary-button" onClick={onSave}>Save {day}</button>
        {matchingShift && <button onClick={() => onOpenShift(matchingShift)}>View Shift</button>}
      </div>
    </article>
  );
}

function TimelineEditModal({ edit, schedule, employeeStatuses, onClose, onAssign, onRemove, onStatusChange }) {
  const employee = schedule.employees.find((item) => item.id === edit.employeeId);
  const [department, setDepartment] = useState(employee?.home_department ?? 'Front End');
  const [period, setPeriod] = useState('am');
  const [role, setRole] = useState(employee?.certifications?.[0] ?? 'Cashier');
  const [startTime, setStartTime] = useState('6:00 AM');
  const [endTime, setEndTime] = useState('2:00 PM');
  const [statusKey, setStatusKey] = useState(employeeStatuses[edit.employeeId]?.key ?? 'active');
  if (!employee) return null;

  const departments = Array.from(new Set(schedule.shifts.map((shift) => shift.name)));
  const matchingShifts = schedule.shifts.filter((shift) =>
    shift.day === edit.day &&
    shift.name === department &&
    shiftPeriod(shift).toLowerCase() === period
  );
  const assignedShifts = schedule.shifts.filter((shift) =>
    shift.day === edit.day &&
    shift.assignments.some((assignment) => assignment.employee_id === employee.id)
  );
  const selectedShift = matchingShifts[0] ?? null;

  async function save() {
    const status = employeeStatusCatalog[statusKey] ?? employeeStatusCatalog.active;
    await onStatusChange(employee.id, status);
    if (statusKey === 'active' || statusKey === 'borrowed' || statusKey === 'training') {
      if (selectedShift) await onAssign(employee.id, selectedShift.id);
    }
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="timeline-edit-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <h2>Edit {employee.name}</h2>
            <p>{edit.day} · timeline cell</p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="quick-fields">
          <label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Role<select value={role} onChange={(event) => setRole(event.target.value)}>{employee.certifications.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Shift<select value={period} onChange={(event) => setPeriod(event.target.value)}>{['am', 'mid', 'pm'].map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label>
          <label>Status<select value={statusKey} onChange={(event) => setStatusKey(event.target.value)}>{Object.values(employeeStatusCatalog).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label>Start time<input value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <label>End time<input value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
        </div>
        <div className="timeline-edit-actions">
          <button className="primary-button" disabled={!selectedShift && ['active', 'borrowed', 'training'].includes(statusKey)} onClick={save}>
            Save Change
          </button>
          {assignedShifts.map((shift) => (
            <button key={shift.id} onClick={() => onRemove(shift, employee.id)}>Remove from {shift.name} {shiftPeriod(shift)}</button>
          ))}
        </div>
        <p className="helper">{selectedShift ? `Will assign to ${department} ${period.toUpperCase()} (${formatShiftTime(selectedShift)}).` : 'No matching shift for this department and period.'} Start/end changes are validated and saved through the weekly editor.</p>
      </section>
    </div>
  );
}

function ProfilePhoto({ name, profile, size = 'normal' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`profile-photo ${profile.tone} ${size}`} aria-label={`${name} profile picture`}>
      {profile.photo && !failed ? (
        <img src={profile.photo} alt="" onError={() => setFailed(true)} />
      ) : <span className="profile-initials">{initials(name)}</span>}
    </div>
  );
}

function ShiftTypePill({ shift }) {
  const period = shiftPeriod(shift);
  return <span className={`shift-type-pill period-${period.toLowerCase()}`}>{period.toUpperCase()}</span>;
}

function RecommendationCard({ item, onViewShift, onApply }) {
  return (
    <article className={`recommendation-card ${item.level}`}>
      <div className="recommendation-top">
        <span>{item.severity ?? severityFromLevel(item.level)}</span>
        <strong>{item.title ?? 'Lineup Opportunity'}</strong>
      </div>
      <p>{item.message}</p>
      <em>{item.suggestedFix ?? 'Review the lineup and compare alternatives.'}</em>
      <div className="recommendation-actions">
        <button onClick={() => onViewShift?.(item)}>View Shift</button>
        <button disabled={item.level === 'good'} onClick={() => onApply?.(item)}>Apply Suggestion</button>
      </div>
    </article>
  );
}

function AvailabilityStrip({ availability }) {
  return (
    <div className="availability-strip">
      {days.map((day, index) => {
        const record = availability.find((item) => item.day === day);
        const limited = record && (record.start_time > '08:00' || record.end_time < '18:00');
        return <span key={day} className={record ? limited ? 'limited' : 'available' : 'unavailable'}>{dayLetters[index]}</span>;
      })}
    </div>
  );
}

function Kpi({ label, value, detail, tone = '', progress }) {
  return (
    <article className={`kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
      {typeof progress === 'number' && <div className="progress-bar"><i style={{ width: `${progress}%` }} /></div>}
    </article>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function AuditItem({ item }) {
  return (
    <article className="audit-item">
      <strong>{item.actor_name} {actionPhrase(item)}</strong>
      <span>{item.old_value ?? 'none'} → {item.new_value ?? 'none'}</span>
      <time>{formatTime(item.created_at)}</time>
    </article>
  );
}


function loadEmployeeDayEdits() {
  try {
    return JSON.parse(localStorage.getItem('lineupOps.employeeDayEdits') || '{}');
  } catch {
    return {};
  }
}

function employeeDayKey(employeeId, day) {
  return `${employeeId}:${day}`;
}

function buildDayDraft(employee, day, schedule, dayEdits = {}) {
  const saved = dayEdits[employeeDayKey(employee.id, day)];
  if (saved) return saved;
  const assigned = schedule.shifts.find((shift) => shift.day === day && shift.assignments.some((assignment) => assignment.employee_id === employee.id));
  const status = planningFor(employee).timeOff?.[day] ?? 'Off';
  return {
    working: Boolean(assigned),
    status: assigned ? 'Working' : status,
    department: assigned?.name ?? employee.home_department ?? schedule.shifts[0]?.name ?? 'Front End',
    role: assigned ? (buildSlots(assigned)[assigned.assignments.findIndex((assignment) => assignment.employee_id === employee.id)] ?? employee.certifications[0]) : employee.certifications[0],
    period: assigned ? shiftPeriod(assigned).toUpperCase() : 'AM',
    startTime: assigned ? formatClock(assigned.start_time) : '6:00 AM',
    endTime: assigned ? formatClock(assigned.end_time) : '2:00 PM',
    notes: '',
    overrideMaxHours: false
  };
}

function rolesForDepartment(department, employee) {
  const fakeShift = { name: department, required_count: 8, required_certification: employee.certifications[0] };
  return Array.from(new Set([...buildSlots(fakeShift), ...employee.certifications]));
}

function findShiftForDraft(schedule, day, draft) {
  return schedule.shifts.find((shift) =>
    shift.day === day &&
    shift.name === draft.department &&
    shiftPeriod(shift).toUpperCase() === draft.period
  ) ?? null;
}

function findEmployeeConflict(schedule, employeeId, targetShift) {
  return schedule.shifts.find((shift) =>
    shift.id !== targetShift.id &&
    shift.day === targetShift.day &&
    shift.assignments.some((assignment) => assignment.employee_id === employeeId) &&
    shiftsOverlap(shift, targetShift)
  ) ?? null;
}

function parseClockInput(value) {
  if (!value) return '';
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return String(value).trim();
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3]?.toUpperCase();
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toMinutes(value) {
  const [hour, minute] = parseClockInput(value).split(':').map(Number);
  return hour * 60 + minute;
}

function hoursBetweenClock(start, end) {
  return (toMinutes(end) - toMinutes(start)) / 60;
}

function normalizeSchedule(raw) {
  const shifts = (raw.shifts ?? []).map((shift) => {
    const assignments = (shift.assignments ?? []).map((assignment) => ({
      ...assignment,
      certifications: Array.isArray(assignment.certifications) ? assignment.certifications : parseCertifications(assignment.certifications),
      hourly_rate: Number(assignment.hourly_rate ?? 22),
      reliability_score: Number(assignment.reliability_score ?? 80),
      max_hours_per_week: Number(assignment.max_hours_per_week ?? 40)
    }));
    return {
      ...shift,
      assignments,
      readiness: Number.isFinite(shift.readiness) ? shift.readiness : fallbackReadiness(shift, assignments),
      required_certification: shift.required_certification ?? null,
      labor_budget: Number(shift.labor_budget ?? 0)
    };
  });

  return {
    ...raw,
    shifts,
    employees: (raw.employees ?? []).map((employee) => ({
      ...employee,
      certifications: Array.isArray(employee.certifications) ? employee.certifications : parseCertifications(employee.certifications),
      availability: employee.availability ?? [],
      reliability_score: Number(employee.reliability_score ?? 80),
      hourly_rate: Number(employee.hourly_rate ?? 22),
      max_hours_per_week: Number(employee.max_hours_per_week ?? 40)
    })),
    coach: normalizeRecommendations(raw.coach, shifts),
    audit: raw.audit ?? []
  };
}

function normalizeRecommendations(coach, shifts) {
  if (coach?.length) {
    return coach.map((item) => ({
      severity: item.severity ?? severityFromLevel(item.level),
      level: item.level ?? 'watch',
      title: item.title ?? 'Lineup Opportunity',
      message: item.message,
      suggestedFix: item.suggestedFix ?? 'Review this lineup before publishing.',
      impact: item.impact ?? 'Medium',
      shiftId: item.shiftId
    }));
  }
  return buildFallbackCoach(shifts);
}

function buildLiveCoach(schedule, employeeStatuses) {
  const items = [];
  const holiday = detectHolidayWeek(schedule.schedule.week_start);
  if (holiday) {
    items.push({
      severity: 'Warning',
      level: 'watch',
      title: `${holiday.name} Detected`,
      message: 'Holiday week planning should use reduced coverage expectations and premium-pay visibility.',
      suggestedFix: 'Review volunteer coverage and apply a reduced staffing template before export.',
      impact: 'Medium'
    });
  }

  for (const [employeeIdText, status] of Object.entries(employeeStatuses)) {
    if (!status || !['sick', 'pto', 'vacation', 'off', 'unavailable', 'holiday'].includes(status.key)) continue;
    const employeeId = Number(employeeIdText);
    const employee = schedule.employees.find((item) => item.id === employeeId);
    if (!employee) continue;
    const affected = schedule.shifts.filter((shift) => shift.assignments.some((assignment) => assignment.employee_id === employeeId));
    const weakest = affected.sort((a, b) => a.readiness - b.readiness)[0];
    if (weakest) {
      const replacement = bestReplacementFor(schedule, weakest, employeeId);
      items.push({
        severity: status.key === 'sick' ? 'Critical' : 'Warning',
        level: status.key === 'sick' ? 'urgent' : 'watch',
        title: `${employee.name} marked ${status.label}`,
        message: `${weakest.name} readiness is exposed on ${weakest.day} ${shiftPeriod(weakest)}.`,
        suggestedFix: replacement ? `Suggested replacement: ${replacement.name}. Borrow or assign to recover coverage.` : 'Open the shift and fill the role from available bench.',
        impact: 'High',
        shiftId: weakest.id
      });
    }
  }

  const conflicts = detectShiftConflicts(schedule);
  for (const conflict of conflicts.slice(0, 3)) {
    items.push({
      severity: 'Warning',
      level: 'watch',
      title: 'Shift Conflict Detected',
      message: `${conflict.employee.name} has overlapping ${conflict.first.name} and ${conflict.second.name} assignments on ${conflict.first.day}.`,
      suggestedFix: 'Move one assignment or borrow a cross-trained employee.',
      impact: 'Medium',
      shiftId: conflict.second.id
    });
  }
  return items;
}



function unavailableReason(employee, shift, schedule, employeeStatuses = {}) {
  const explicit = employeeStatuses[employee.id];
  if (explicit && ['off', 'pto', 'sick', 'vacation', 'holiday', 'unavailable'].includes(explicit.key)) return `${explicit.label} today`;
  const dayStatus = planningFor(employee).timeOff?.[shift.day];
  if (dayStatus) return `${dayStatus} today`;
  const conflict = findEmployeeConflict(schedule, employee.id, shift);
  if (conflict) return `Already working ${formatShiftTime(conflict)}`;
  const hoursAfter = assignedHours(schedule.shifts, employee.id) + shiftHours(shift);
  if (hoursAfter > employee.max_hours_per_week) return 'Over max hours';
  if (shift.required_certification && !employee.certifications.includes(shift.required_certification)) return `Missing ${shift.required_certification} skill`;
  const availability = employee.availability.find((item) => item.day === shift.day);
  if (!availability || availability.start_time > shift.start_time || availability.end_time < shift.end_time) return `Not available ${shiftPeriod(shift)}`;
  return '';
}

function buildRoleGroups(shift) {
  const slots = buildSlots(shift);
  const groups = {
    'Front End': [
      ['Leads', ['Front End Lead', 'Supervisor']],
      ['Cashiers', ['Cashier 1', 'Cashier 2', 'Cashier 3']],
      ['Membership / Service', ['Membership Support', 'Self Checkout', 'Returns']],
      ['Cart / Floor Support', ['Cart Runner', 'Door Support', 'Backup Coverage']]
    ],
    Bakery: [
      ['Lead', ['Bakery Lead']],
      ['Production', ['Production']],
      ['Packout', ['Packout']],
      ['Sanitation', ['Sanitation']],
      ['Closing Support', ['Closing Support']]
    ],
    Receiving: [
      ['Receiving Lead', ['Receiving Lead', 'Forklift Lead']],
      ['Equipment', ['Forklift Operator', 'Pallet Jack Operator']],
      ['Receiving', ['Receiver', 'Receiver 1', 'Receiver 2']],
      ['Backup Coverage', ['Backup Coverage', 'Backup', 'Closing Lead']]
    ]
  };
  const template = groups[shift.name];
  if (!template) return [{ name: 'Required Roles', roles: slots }];
  const used = new Set();
  const grouped = template.map(([name, names]) => ({
    name,
    roles: slots.filter((slot) => names.includes(slot) && !used.has(slot) && used.add(slot))
  })).filter((group) => group.roles.length);
  const remaining = slots.filter((slot) => !used.has(slot));
  return remaining.length ? [...grouped, { name: 'Backup Coverage', roles: remaining }] : grouped;
}

function roleRequirementText(label) {
  if (/cashier|self checkout/i.test(label)) return 'Needs cashier-trained employee';
  if (/forklift|pallet/i.test(label)) return 'Needs equipment certification';
  if (/lead|supervisor/i.test(label)) return 'Needs leadership coverage';
  if (/packout|production|bakery/i.test(label)) return 'Needs Bakery skill';
  return 'Needs qualified available employee';
}

function buildSlots(shift) {
  const role = shift.required_certification ?? shift.name;
  const templates = {
    Receiving: ['Receiving Lead', 'Forklift Operator', 'Receiver', 'Pallet Jack Operator', 'Backup Coverage'],
    'Forklift Ops': ['Forklift Lead', 'Operator 1', 'Operator 2', 'Safety Backup'],
    'Front End': ['Front End Lead', 'Cashier 1', 'Cashier 2', 'Membership Support', 'Cart Runner', 'Self Checkout', 'Backup Coverage'],
    Bakery: ['Bakery Lead', 'Production', 'Packout', 'Sanitation', 'Closing Support'],
    Deli: ['Deli Lead', 'Prep 1', 'Service'],
    'Night Merchandising': ['Night Lead', 'Stocker 1', 'Stocker 2'],
    Stocking: ['Stocking Lead', 'Stocker 1', 'Stocker 2'],
    'Morning Prep': ['Prep Lead', 'Prep 1', 'Prep 2'],
    Membership: ['Membership Lead', 'Member Support'],
    'Tire Center': ['Tire Lead', 'Technician']
  };
  return (templates[shift.name] ?? Array.from({ length: shift.required_count }, (_, index) => `${role} ${index + 1}`)).slice(0, shift.required_count);
}

function departmentReadiness(shifts) {
  if (!shifts.length) return 0;
  return Math.round(shifts.reduce((sum, shift) => sum + shift.readiness, 0) / shifts.length);
}

function planningFor(employee) {
  const fallbackType = employee.max_hours_per_week <= 29 ? 'Part Time' : 'Full Time';
  return employeePlanning[employee.name] ?? { employmentType: fallbackType, targetHours: Math.min(employee.max_hours_per_week, fallbackType === 'Part Time' ? 28 : 40), fixed: false, timeOff: {} };
}

function explicitDayStatus(employee, day, employeeStatuses = {}) {
  const explicit = employeeStatuses?.[employee.id];
  if (explicit && ['off', 'sick', 'vacation', 'pto', 'holiday', 'unavailable', 'training'].includes(explicit.key)) return explicit.label;
  return planningFor(employee).timeOff?.[day] ?? '';
}

function managerForUser(user) {
  if (!user) return null;
  const profile = managerProfiles[user.name];
  if (!profile) return null;
  return { name: user.name, ...profile };
}

function employeeWeekSummary(employee, shifts, activeDepartment, employeeStatuses = {}) {
  const plan = planningFor(employee);
  const dayStatus = Object.fromEntries(days.map((day) => [day, explicitDayStatus(employee, day, employeeStatuses)]));
  const byDay = Object.fromEntries(days.map((day) => [day, []]));
  for (const shift of shifts) {
    if (activeDepartment !== 'all' && shift.name !== activeDepartment && !shift.assignments.some((assignment) => assignment.employee_id === employee.id)) continue;
    const assignment = shift.assignments.find((item) => item.employee_id === employee.id);
    if (!assignment) continue;
    byDay[shift.day].push({
      shift,
      borrowed: Boolean(assignment.home_department && assignment.home_department !== shift.name)
    });
  }
  const hours = assignedHours(shifts, employee.id);
  const visual = employeeVisualStatus(employee, employeeStatuses, shifts);
  const overtime = hours > employee.max_hours_per_week;
  const fatigue = hours >= employee.max_hours_per_week * 0.85;
  const consecutiveDays = longestConsecutiveWorkStreak(byDay);
  return {
    employee,
    byDay,
    hours,
    overtime,
    fatigue,
    visual,
    plan,
    dayStatus,
    status: visual.key !== 'active' ? visual.label : overtime ? 'OT projected' : fatigue ? 'Fatigue watch' : consecutiveDays >= 5 ? 'Consecutive shift watch' : 'Balanced load'
  };
}

function longestConsecutiveWorkStreak(byDay) {
  let best = 0;
  let current = 0;
  for (const day of days) {
    if (byDay[day].length) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function assignmentLabel(shift) {
  return `${shift.name} ${shiftPeriod(shift)}`;
}

function shiftPeriod(shift) {
  const hour = Number(shift.start_time.split(':')[0]);
  if (hour < 12) return 'AM';
  if (hour < 16) return 'Mid';
  return 'PM';
}

function employeeVisualStatus(employee, employeeStatuses = {}, shifts = []) {
  const explicit = employeeStatuses?.[employee.id];
  if (explicit) return explicit;
  const hours = assignedHours(shifts, employee.id);
  const borrowed = shifts.some((shift) => shift.assignments.some((assignment) =>
    assignment.employee_id === employee.id && assignment.home_department && assignment.home_department !== shift.name
  ));
  if (borrowed) return employeeStatusCatalog.borrowed;
  if (hours >= employee.max_hours_per_week * 0.85) return employeeStatusCatalog.overtime;
  if (!hours) return employeeStatusCatalog.off;
  return employeeStatusCatalog.active;
}

function isDepartmentCrew(employee, shift) {
  return isEmployeeInDepartmentContext(employee, shift.name) ||
    Boolean(shift.required_certification && employee.certifications.includes(shift.required_certification));
}

function isEmployeeInDepartmentContext(employee, department) {
  return employee.home_department === department || employee.certifications.includes(department);
}

function bestReplacementFor(schedule, shift, blockedEmployeeId) {
  const assignedIds = new Set(shift.assignments.map((assignment) => assignment.employee_id));
  assignedIds.add(blockedEmployeeId);
  return schedule.employees
    .filter((employee) => !assignedIds.has(employee.id))
    .map((employee) => ({ ...employee, impact: readinessImpact(employee, shift, schedule.shifts) }))
    .sort((a, b) => b.impact - a.impact)[0] ?? null;
}

function detectShiftConflicts(schedule) {
  const conflicts = [];
  for (const employee of schedule.employees) {
    const assigned = schedule.shifts.filter((shift) => shift.assignments.some((assignment) => assignment.employee_id === employee.id));
    for (let index = 0; index < assigned.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < assigned.length; nextIndex += 1) {
        const first = assigned[index];
        const second = assigned[nextIndex];
        if (first.day === second.day && shiftsOverlap(first, second)) conflicts.push({ employee, first, second });
      }
    }
  }
  return conflicts;
}

function shiftsOverlap(first, second) {
  return first.start_time < second.end_time && second.start_time < first.end_time;
}

function detectHolidayWeek(weekStart) {
  const date = new Date(`${weekStart}T00:00:00`);
  return holidayRules.find((holiday) =>
    date.getMonth() === holiday.month &&
    date.getDate() >= holiday.dateRange[0] &&
    date.getDate() <= holiday.dateRange[1]
  ) ?? null;
}

function profileFor(employee) {
  if (profileLibrary[employee.name]) return profileLibrary[employee.name];
  const primary = employee.certifications?.[0] ?? 'General';
  return {
    role: primary,
    tone: 'steel',
    imageName: employee.name
  };
}

function buildBorrowMoves(schedule, selectedShift) {
  const assignedIds = new Set(selectedShift.assignments.map((assignment) => assignment.employee_id));
  return schedule.employees
    .filter((employee) => !assignedIds.has(employee.id))
    .map((employee) => ({
      employee,
      from: sourceDepartment(employee, schedule.shifts),
      targetGain: readinessImpact(employee, selectedShift, schedule.shifts),
      sourceLoss: employee.reliability_score > 88 ? 5 : 3,
      netGain: Math.max(2, Math.round(readinessImpact(employee, selectedShift, schedule.shifts) / 2))
    }))
    .filter((move) => move.targetGain >= 8)
    .sort((a, b) => b.targetGain - a.targetGain)
    .slice(0, 3);
}

function bestNextMove(schedule, selectedShift) {
  const openIndex = selectedShift.assignments.length;
  if (openIndex >= selectedShift.required_count) return null;
  const slot = buildSlots(selectedShift)[openIndex] ?? `${selectedShift.required_certification ?? selectedShift.name} role`;
  const assignedIds = new Set(selectedShift.assignments.map((assignment) => assignment.employee_id));
  const employee = schedule.employees
    .filter((item) => !assignedIds.has(item.id))
    .map((item) => ({ employee: item, impact: readinessImpact(item, selectedShift, schedule.shifts) }))
    .sort((a, b) => b.impact - a.impact)[0];
  if (!employee) return null;
  return { slot, employee: employee.employee, impact: employee.impact };
}

function sourceDepartment(employee, shifts) {
  const shift = shifts.find((item) => item.assignments.some((assignment) => assignment.employee_id === employee.id));
  return shift?.name ?? employee.certifications[0] ?? 'Shared bench';
}

function readinessImpact(employee, shift, shifts) {
  const hoursAfter = assignedHours(shifts, employee.id) + shiftHours(shift);
  let impact = 5;
  if (!shift.required_certification || employee.certifications.includes(shift.required_certification)) impact += 9;
  if (employee.reliability_score >= 88) impact += 5;
  if (hoursAfter <= employee.max_hours_per_week) impact += 4;
  return impact;
}

function evaluateFit(employee, shift, shifts) {
  const hours = assignedHours(shifts, employee.id) + shiftHours(shift);
  if (hours > employee.max_hours_per_week) return { tone: 'risky', message: 'Risky fit: exceeds max hours' };
  if (shift.required_certification && !employee.certifications.includes(shift.required_certification)) {
    return { tone: 'warning', message: `Warning: missing ${shift.required_certification} certification` };
  }
  if (employee.reliability_score >= 86) return { tone: 'strong', message: 'Strong fit: adds coverage and keeps OT low' };
  return { tone: 'warning', message: 'Acceptable fit: compare alternatives' };
}

function shiftStatus(shift) {
  if (shift.assignments.length === 0) return 'open';
  if (shift.assignments.length < shift.required_count) return 'urgent';
  if (shift.readiness < 74) return 'watch';
  return 'good';
}

function calculateMetrics(schedule) {
  const totalSlots = schedule.shifts.reduce((sum, shift) => sum + shift.required_count, 0);
  const filled = schedule.shifts.reduce((sum, shift) => sum + shift.assignments.length, 0);
  const coveragePct = totalSlots ? Math.round((filled / totalSlots) * 100) : 0;
  const certified = schedule.shifts.filter((shift) => !shift.required_certification || shift.assignments.some((assignment) => assignment.certifications.includes(shift.required_certification))).length;
  const certPct = schedule.shifts.length ? Math.round((certified / schedule.shifts.length) * 100) : 0;
  const avgReadiness = schedule.shifts.length ? schedule.shifts.reduce((sum, shift) => sum + shift.readiness, 0) / schedule.shifts.length : 0;
  const overtimeRisk = schedule.employees.filter((employee) => assignedHours(schedule.shifts, employee.id) > employee.max_hours_per_week * 0.85).length;
  return {
    totalSlots,
    filled,
    coveragePct,
    operationalReadiness: clamp(Math.round(coveragePct * 0.42 + avgReadiness * 0.32 + certPct * 0.2 + 8 - overtimeRisk * 5), 0, 100)
  };
}

function buildFallbackCoach(shifts) {
  const openShift = shifts.find((shift) => shift.assignments.length < shift.required_count);
  if (openShift) {
    return [{
      severity: 'Critical',
      level: 'urgent',
      title: 'Coverage Hole',
      message: `${openShift.name} has ${openShift.required_count - openShift.assignments.length} open lineup slots.`,
      suggestedFix: `Borrow or assign a ${openShift.required_certification ?? 'qualified'} employee.`,
      impact: 'High',
      shiftId: openShift.id
    }];
  }
  return [{ severity: 'Opportunity', level: 'good', title: 'Strong Lineup', message: 'All department lineups have baseline coverage.', suggestedFix: 'Review vulnerabilities and publish when ready.', impact: 'Low' }];
}

function assignedHours(shifts, employeeId) {
  return shifts.reduce((sum, shift) => shift.assignments.some((assignment) => assignment.employee_id === employeeId) ? sum + shiftHours(shift) : sum, 0);
}

function laborCost(shift) {
  return shift.assignments.reduce((sum, assignment) => sum + assignment.hourly_rate * shiftHours(shift), 0);
}

function shiftHours(shift) {
  const [startHour, startMinute] = shift.start_time.split(':').map(Number);
  const [endHour, endMinute] = shift.end_time.split(':').map(Number);
  return ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
}

function fallbackReadiness(shift, assignments) {
  return Math.round(Math.min((assignments.length / Math.max(shift.required_count, 1)) * 100, 100));
}

function parseCertifications(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatShiftTime(shift) {
  return `${formatClock(shift.start_time)} – ${formatClock(shift.end_time)}`;
}

function formatClock(value) {
  const [hourText, minute] = value.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

function formatTime(value) {
  if (!value) return 'Not yet';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value.replace(' ', 'T')));
}

function initials(name) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function cssId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function severityFromLevel(level) {
  if (level === 'urgent') return 'Critical';
  if (level === 'good') return 'Opportunity';
  return 'Warning';
}

function actionPhrase(item) {
  if (item.action === 'updated') return 'updated lineup';
  if (item.action === 'generated') return 'optimized schedule';
  if (item.action === 'published') return 'published schedule';
  if (item.action === 'unlocked') return 'unlocked schedule';
  return item.action;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRouteState() {
  const url = new URL(window.location.href);
  const aiStored = localStorage.getItem('lineupOps.aiCollapsed');
  const employeeMatch = url.pathname.match(/^\/employee\/(\d+)/);
  const isLineup = url.pathname.startsWith('/lineup');
  const department = url.searchParams.get('department') || 'front-end';
  return {
    viewMode: isLineup ? 'lineup' : 'weekly',
    calendarMode: url.searchParams.get('view') || 'week',
    department: departmentFromSlug(department),
    departmentSlug: department,
    day: url.searchParams.get('day') || '',
    period: url.searchParams.get('shift') || '',
    shiftId: url.searchParams.get('shiftId') || '',
    shiftType: url.searchParams.get('shiftType') || 'all',
    search: url.searchParams.get('search') || '',
    employeeId: employeeMatch ? Number(employeeMatch[1]) : null,
    aiCollapsed: url.searchParams.get('ai') ? url.searchParams.get('ai') === 'collapsed' : aiStored === '1'
  };
}

function buildRoute(state) {
  const params = new URLSearchParams();
  const selectedShift = state.selectedShift;
  params.set('week', '2026-05-11');
  params.set('department', cssId(state.department || selectedShift?.name || 'Front End'));
  if (state.calendarMode) params.set('view', state.calendarMode);
  if (state.shiftType && state.shiftType !== 'all') params.set('shiftType', state.shiftType);
  if (state.search) params.set('search', state.search);
  if (state.aiCollapsed) params.set('ai', 'collapsed');
  if (selectedShift) {
    params.set('day', selectedShift.day.toLowerCase());
    params.set('shift', shiftPeriod(selectedShift).toLowerCase());
    params.set('shiftId', String(selectedShift.id));
  }
  if (state.selectedEmployeeId) return `/employee/${state.selectedEmployeeId}?${params.toString()}`;
  return `/${state.viewMode === 'lineup' ? 'lineup' : 'weekly'}?${params.toString()}`;
}

function departmentFromSlug(value) {
  const known = ['Front End', 'Receiving', 'Stocking', 'Bakery', 'Deli', 'Membership', 'Tire Center', 'Night Merchandising', 'Morning Prep', 'Closing'];
  return known.find((item) => cssId(item) === value) ?? value;
}
