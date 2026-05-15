import {
  AlertTriangle,
  ArrowLeftRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock,
  Download,
  History,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
  Users,
  X,
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
  active:      { key: 'active',      label: 'Active',       help: 'Available for assignments' },
  borrowed:    { key: 'borrowed',    label: 'Borrowed',     help: 'Working outside home department' },
  overtime:    { key: 'overtime',    label: 'OT Risk',      help: 'Limit additional hours' },
  off:         { key: 'off',         label: 'OFF',          help: 'Not scheduled' },
  pto:         { key: 'pto',         label: 'PTO',          help: 'Paid time off' },
  holiday:     { key: 'holiday',     label: 'Holiday PTO',  help: 'Company holiday eligible' },
  sick:        { key: 'sick',        label: 'Sick',         help: 'Callout or sick leave' },
  vacation:    { key: 'vacation',    label: 'Vacation',     help: 'Planned time away' },
  unavailable: { key: 'unavailable', label: 'Unavailable',  help: 'Cannot be assigned' },
  training:    { key: 'training',    label: 'Training',     help: 'Protected training time' }
};

const holidayRules = [
  { name: 'Memorial Day',      month: 4,  dateRange: [25, 31] },
  { name: 'Labor Day',         month: 8,  dateRange: [1, 7] },
  { name: 'Thanksgiving Week', month: 10, dateRange: [22, 29] },
  { name: 'Christmas Week',    month: 11, dateRange: [19, 26] },
  { name: 'New Year Week',     month: 0,  dateRange: [1, 7] }
];

const managerProfiles = {
  'Hector Arias': { department: 'Front End', role: 'Front End Manager', team: ['Alicia Martinez', 'Elena Brooks', 'Grace Kim', 'Jason Miller', 'Tanya Roberts', 'Chris Johnson', 'Taylor Nguyen'] },
  'Maria Santos':  { department: 'Deli',      role: 'Department Manager', team: ['Nina Shah', 'Maria Santos'] },
  'Jason Miller':  { department: 'Receiving', role: 'Operations Manager', team: ['Marcus Lee', 'Owen Carter', 'Jason Miller'] },
  'Maya Chen':     { department: 'Front End', role: 'Operations Manager', team: ['Alicia Martinez', 'Elena Brooks', 'Grace Kim', 'Jason Miller', 'Tanya Roberts', 'Chris Johnson', 'Taylor Nguyen'] }
};

const employeePlanning = {
  'Alicia Martinez': { employmentType: 'Full Time',  targetHours: 40, fixed: false, timeOff: { Tuesday: 'OFF', Thursday: 'PTO' } },
  'Elena Brooks':    { employmentType: 'Full Time',  targetHours: 40, fixed: false, timeOff: { Sunday: 'OFF' } },
  'Grace Kim':       { employmentType: 'Part Time',  targetHours: 24, fixed: true,  fixedLabel: 'Mon/Wed/Fri · 10:00 AM – 6:00 PM', timeOff: { Tuesday: 'OFF', Thursday: 'OFF', Saturday: 'OFF', Sunday: 'OFF' } },
  'Jason Miller':    { employmentType: 'Full Time',  targetHours: 40, fixed: false, timeOff: { Saturday: 'Training', Sunday: 'OFF' } },
  'Tanya Roberts':   { employmentType: 'Part Time',  targetHours: 28, fixed: false, timeOff: { Monday: 'OFF', Wednesday: 'Vacation', Friday: 'OFF' } },
  'Chris Johnson':   { employmentType: 'Part Time',  targetHours: 24, fixed: false, timeOff: { Tuesday: 'OFF', Wednesday: 'OFF', Thursday: 'OFF', Friday: 'OFF' } },
  'Taylor Nguyen':   { employmentType: 'Full Time',  targetHours: 40, fixed: false, timeOff: { Monday: 'OFF', Tuesday: 'OFF' } }
};

const profileLibrary = {
  'Owen Carter':     { role: 'Receiving Lead',           photo: '/profiles/owen-carter.png',      tone: 'steel' },
  'Alicia Martinez': { role: 'Cross-Trained Associate',  photo: '/profiles/alicia-martinez.png',  tone: 'burgundy' },
  'Marcus Lee':      { role: 'Forklift Operator',        photo: '/profiles/marcus-lee.png',       tone: 'navy' },
  'Grace Kim':       { role: 'Membership / Front End',   photo: '/profiles/sarah-kim.png',        tone: 'teal' },
  'Elena Brooks':    { role: 'Front End Lead',            photo: '/profiles/brianna-torres.png',  tone: 'black' },
  'Nina Shah':       { role: 'Closing Expert',           photo: '/profiles/taylor-nguyen.png',    tone: 'slate' },
  'Theo Adams':      { role: 'Bakery Associate',         photo: '/profiles/emily-davis.png',      tone: 'amber' },
  'Jason Miller':    { role: 'Operations Manager',       photo: '/profiles/lucas-thompson.png',   tone: 'green' },
  'Maria Santos':    { role: 'Department Manager',       photo: '/profiles/maya-chen.png',        tone: 'purple' },
  'David Lee':       { role: 'Tire Center',              photo: '/profiles/chris-johnson.png',    tone: 'blue' },
  'Tanya Roberts':   { role: 'Membership',               photo: '/profiles/alicia-martinez.png',  tone: 'rose' },
  'Luis Moreno':     { role: 'Night Merch',              photo: '/profiles/kevin-wright.png',     tone: 'orange' }
};

export function App() {
  const initialRoute = getRouteState();
  const [userId, setUserId] = useState(1);
  const [bootstrap, setBootstrap] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [mode, setMode] = useState('balanced');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(initialRoute.department);
  const [shiftTypeFilter, setShiftTypeFilter] = useState('all');
  const [aiCollapsed, setAiCollapsed] = useState(() => initialRoute.aiCollapsed);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [showBorrowable, setShowBorrowable] = useState(false);
  const [employeeStatuses, setEmployeeStatuses] = useState({});
  const [dragEmployeeId, setDragEmployeeId] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyShift, setHistoryShift] = useState(null);
  const [resolvedRecommendations, setResolvedRecommendations] = useState([]);
  const [lastUndo, setLastUndo] = useState(null);
  const [highlightedShiftId, setHighlightedShiftId] = useState(null);
  const [employeeDayEdits, setEmployeeDayEdits] = useState(() => loadEmployeeDayEdits());
  const [pendingDrop, setPendingDrop] = useState(null);
  const routeAppliedRef = useRef(false);

  useEffect(() => { loadAll(userId); }, [userId]);

  useEffect(() => {
    localStorage.setItem('lineupOps.aiCollapsed', aiCollapsed ? '1' : '0');
  }, [aiCollapsed]);

  useEffect(() => {
    localStorage.setItem('lineupOps.employeeDayEdits', JSON.stringify(employeeDayEdits));
  }, [employeeDayEdits]);

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
      if (!selectedShiftId) {
        const firstDept = normalized.shifts.find(s => s.name === (departmentFilter !== 'all' ? departmentFilter : normalized.shifts[0]?.name));
        setSelectedShiftId(firstDept?.id ?? normalized.shifts[0]?.id ?? null);
      }
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

  async function assignEmployee(shift, employeeId, reason = 'Lineup board assignment', options = {}) {
    if (!employeeId || !canEditAssignments || isLocked) return null;
    const employee = schedule.employees.find(e => e.id === Number(employeeId));
    const conflict = findEmployeeConflict(schedule, Number(employeeId), shift);
    if (conflict) {
      setError(`${employee?.name ?? 'This employee'} already works ${formatShiftTime(conflict)} on ${conflict.day}. Choose a different shift or employee.`);
      setHighlightedShiftId(conflict.id);
      return null;
    }
    const current = shift.assignments.map(a => a.employee_id);
    if (current.includes(Number(employeeId))) return schedule;
    return setLineup(shift, [...current, Number(employeeId)], reason, options);
  }

  async function removeEmployee(shift, employeeId, reason = 'Removed from lineup', options = {}) {
    if (!canEditAssignments || isLocked) return null;
    return setLineup(shift, shift.assignments.map(a => a.employee_id).filter(id => id !== employeeId), reason, options);
  }

  async function applyEmployeeStatus(employeeId, status) {
    const employee = schedule.employees.find(e => e.id === employeeId);
    if (!employee) return;
    setEmployeeStatuses(cur => ({ ...cur, [employeeId]: status }));
    if (['sick', 'pto', 'vacation', 'off', 'unavailable', 'holiday'].includes(status.key)) {
      await run(async () => {
        let nextSchedule = schedule;
        const affected = schedule.shifts.filter(s => s.assignments.some(a => a.employee_id === employeeId));
        for (const shift of affected) {
          const next = await api(`/assignments/${shift.id}`, {
            userId,
            method: 'PUT',
            body: {
              employeeIds: shift.assignments.map(a => a.employee_id).filter(id => id !== employeeId),
              reason: `${employee.name} marked ${status.label}`
            }
          });
          nextSchedule = normalizeSchedule(next);
        }
        setSchedule(nextSchedule);
      }, false);
    }
  }

  async function setLineup(shift, employeeIds, reason = 'Lineup board edit', options = {}) {
    setError('');
    try {
      const next = await api(`/assignments/${shift.id}`, {
        userId,
        method: 'PUT',
        body: { employeeIds: employeeIds.slice(0, shift.required_count), reason }
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
    const shift = schedule.shifts.find(s => s.id === Number(shiftId));
    if (!shift || !canEditAssignments || isLocked) return null;
    return assignEmployee(shift, employeeId, reason, options);
  }

  async function applyRecommendation(item) {
    const shift = schedule.shifts.find(c => c.id === item.shiftId) ?? selectedShift;
    if (!shift || item.level === 'good') return;
    const openIndex = shift.assignments.length;
    const recommendation = bestNextMove(schedule, shift);
    const employee = item.employeeId
      ? schedule.employees.find(c => c.id === item.employeeId)
      : recommendation?.employee;
    if (!employee) { setError('No available employee found for this suggestion.'); return; }
    const beforeEmployeeIds = shift.assignments.map(a => a.employee_id);
    const role = buildSlots(shift)[openIndex] ?? 'open role';
    const next = await assignEmployee(shift, employee.id, `AI suggestion: ${employee.name} → ${shift.name} ${role}`);
    if (!next) return;
    const title = item.title ?? item.message;
    setResolvedRecommendations(cur => cur.includes(title) ? cur : [...cur, title]);
    setLastUndo({ shiftId: shift.id, employeeIds: beforeEmployeeIds });
    setNotice(`Applied: ${employee.name} assigned to ${shift.name} ${role}.`);
  }

  async function undoLastRecommendation() {
    if (!lastUndo) return;
    const shift = schedule.shifts.find(s => s.id === lastUndo.shiftId);
    if (!shift) return;
    await setLineup(shift, lastUndo.employeeIds, 'Undo AI suggestion');
    setNotice('Undone.');
    setLastUndo(null);
  }

  async function saveEmployeeDay(employeeId, day, draft) {
    const employee = schedule.employees.find(e => e.id === employeeId);
    if (!employee) return;
    const key = employeeDayKey(employeeId, day);
    const working = Boolean(draft.working);
    if (working) {
      if (!draft.department || !draft.role || !draft.startTime || !draft.endTime)
        throw new Error('Department, role, start time, and end time are required.');
      if (toMinutes(parseClockInput(draft.startTime)) >= toMinutes(parseClockInput(draft.endTime)))
        throw new Error('End time must be after start time.');
      const selected = findShiftForDraft(schedule, day, draft);
      if (!selected) throw new Error('No matching shift for that department and period.');
      const conflict = findEmployeeConflict(schedule, employeeId, selected);
      if (conflict && conflict.id !== selected.id)
        throw new Error(`${employee.name} is already assigned to ${conflict.name} ${shiftPeriod(conflict)} from ${formatShiftTime(conflict)}.`);
      const projected = assignedHours(schedule.shifts.filter(s => s.id !== selected.id), employeeId) + hoursBetweenClock(draft.startTime, draft.endTime);
      if (projected > employee.max_hours_per_week && !draft.overrideMaxHours)
        throw new Error('Employee would exceed max weekly hours. Enable override to continue.');
      let nextSchedule = schedule;
      if (parseClockInput(draft.startTime) !== selected.start_time || parseClockInput(draft.endTime) !== selected.end_time) {
        const next = await api(`/shifts/${selected.id}`, {
          userId,
          method: 'PUT',
          body: { startTime: draft.startTime, endTime: draft.endTime, reason: `Weekly editor: ${employee.name} ${day}` }
        });
        nextSchedule = normalizeSchedule(next);
        setSchedule(nextSchedule);
      }
      for (const shift of nextSchedule.shifts.filter(s => s.day === day && s.id !== selected.id && s.assignments.some(a => a.employee_id === employeeId))) {
        await removeEmployee(shift, employeeId, `Weekly editor: ${employee.name} ${day} moved`, { throwOnError: true });
      }
      await assignEmployeeToShift(employeeId, selected.id, `Weekly editor: ${employee.name} ${day} saved`, { throwOnError: true });
    } else {
      for (const shift of schedule.shifts.filter(s => s.day === day && s.assignments.some(a => a.employee_id === employeeId))) {
        await removeEmployee(shift, employeeId, `Weekly editor: ${employee.name} marked ${draft.status}`, { throwOnError: true });
      }
    }
    setEmployeeDayEdits(cur => ({ ...cur, [key]: { ...draft, working } }));
    setNotice('Saved');
  }

  async function openHistory(shift) {
    setHistoryShift(shift);
    setHistory(await api(`/audit/shifts/${shift.id}`, { userId }));
  }

  async function copyTextExport() {
    const text = await api('/export/text', { userId });
    await navigator.clipboard.writeText(text);
    setNotice('Schedule copied to clipboard.');
  }

  async function downloadCsv() {
    const csv = await api('/export/csv', { userId });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lineup-ops-schedule.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadJson() {
    const payload = await api('/export/json', { userId });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lineup-ops-export.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async function run(action, showBusy = true) {
    setError('');
    if (showBusy) setBusy(true);
    try { await action(); }
    catch (err) { setError(err.message); }
    finally { if (showBusy) setBusy(false); }
  }

  // ── Derived state ────────────────────────────────────────────────

  const activeUser = bootstrap?.users.find(u => u.id === userId);
  const selectedManager = managerForUser(activeUser);
  const canGenerate = bootstrap?.permissions.includes('schedule:generate');
  const canEditAssignments = bootstrap?.permissions.includes('assignment:edit');
  const canExport = bootstrap?.permissions.includes('schedule:export');
  const isLocked = schedule?.schedule.status === 'locked';

  const departments = useMemo(
    () => (schedule ? Array.from(new Set(schedule.shifts.map(s => s.name))) : []),
    [schedule]
  );

  const effectiveDepartment = useMemo(() => {
    if (selectedManager?.department) return selectedManager.department;
    if (departmentFilter && departmentFilter !== 'all') return departmentFilter;
    return departments[0] ?? 'Front End';
  }, [selectedManager, departmentFilter, departments]);

  const selectedShift = useMemo(() => {
    if (!schedule) return null;
    return schedule.shifts.find(s => s.id === selectedShiftId) ?? null;
  }, [schedule, selectedShiftId]);

  const managerTeamNames = useMemo(
    () => selectedManager?.team ?? [],
    [selectedManager]
  );

  const liveCoach = useMemo(
    () => (schedule ? buildLiveCoach(schedule, employeeStatuses) : []),
    [schedule, employeeStatuses]
  );

  const coachItems = useMemo(
    () => [...liveCoach, ...(schedule?.coach ?? [])],
    [liveCoach, schedule]
  );

  const activeCoachItems = useMemo(
    () => coachItems.filter(item => !resolvedRecommendations.includes(item.title ?? item.message)),
    [coachItems, resolvedRecommendations]
  );

  const resolvedCoachItems = useMemo(
    () => coachItems.filter(item => resolvedRecommendations.includes(item.title ?? item.message)),
    [coachItems, resolvedRecommendations]
  );

  const borrowMoves = useMemo(
    () => (schedule && selectedShift ? buildBorrowMoves(schedule, selectedShift) : []),
    [schedule, selectedShift]
  );

  const nextMove = useMemo(
    () => (schedule && selectedShift ? bestNextMove(schedule, selectedShift) : null),
    [schedule, selectedShift]
  );

  const selectedEmployee = useMemo(
    () => (schedule ? schedule.employees.find(e => e.id === selectedEmployeeId) ?? null : null),
    [schedule, selectedEmployeeId]
  );

  // ── Loading state ─────────────────────────────────────────────────

  if (!bootstrap || !schedule) {
    return (
      <main className="loading">
        {error ? (
          <div className="startup-help">
            <strong>Cannot reach the API server.</strong>
            <span>{error}</span>
            <code>npm run dev</code>
          </div>
        ) : 'Loading Lineup Ops…'}
      </main>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <main className="app-shell">

      <AppHeader
        schedule={schedule}
        bootstrap={bootstrap}
        userId={userId}
        setUserId={setUserId}
        effectiveDepartment={effectiveDepartment}
        departments={departments}
        setDepartmentFilter={dep => { setDepartmentFilter(dep); setSelectedShiftId(null); }}
        isLocked={isLocked}
        aiCollapsed={aiCollapsed}
        setAiCollapsed={setAiCollapsed}
        alertCount={activeCoachItems.filter(i => i.level !== 'good').length}
        canGenerate={canGenerate}
        busy={busy}
        onPublish={publish}
        onUnlock={unlockSchedule}
        mode={mode}
        setMode={setMode}
        onGenerate={generate}
        canExport={canExport}
        onCsv={downloadCsv}
        onJson={downloadJson}
        onCopy={copyTextExport}
      />

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {notice && (
        <div className="alert alert-success">
          <span>{notice}</span>
          {lastUndo && <button onClick={undoLastRecommendation}>Undo</button>}
          <button onClick={() => setNotice(null)}><X size={14} /></button>
        </div>
      )}

      <div className="app-body">
        <CrewSidebar
          manager={selectedManager}
          selectedShift={selectedShift}
          schedule={schedule}
          employeeStatuses={employeeStatuses}
          effectiveDepartment={effectiveDepartment}
          managerTeamNames={managerTeamNames}
          canEdit={canEditAssignments && !isLocked}
          setDragEmployeeId={setDragEmployeeId}
          setHoverSlot={setHoverSlot}
          onEmployeeClick={emp => setSelectedEmployeeId(emp.id ?? emp.employee_id)}
          showBorrowable={showBorrowable}
          setShowBorrowable={setShowBorrowable}
          onRemoveEmployee={assignment => selectedShift && removeEmployee(selectedShift, assignment.employee_id)}
        />

        <ShiftBoard
          schedule={schedule}
          effectiveDepartment={effectiveDepartment}
          shiftTypeFilter={shiftTypeFilter}
          setShiftTypeFilter={setShiftTypeFilter}
          selectedShift={selectedShift}
          setSelectedShiftId={setSelectedShiftId}
          dragEmployeeId={dragEmployeeId}
          hoverSlot={hoverSlot}
          setHoverSlot={setHoverSlot}
          canEdit={canEditAssignments && !isLocked}
          nextMove={nextMove}
          highlightedShiftId={highlightedShiftId}
          onDropEmployee={(shiftId) => {
            if (!dragEmployeeId) return;
            const shift = schedule.shifts.find(s => s.id === shiftId);
            if (!shift) return;
            const emp = schedule.employees.find(e => e.id === dragEmployeeId);
            if (shift.assignments.length >= shift.required_count) {
              setError(`${shift.name} ${shiftPeriod(shift)} is already full (${shift.required_count}/${shift.required_count}).`);
              setDragEmployeeId(null);
              return;
            }
            setPendingDrop({ employeeId: dragEmployeeId, shiftId });
            setDragEmployeeId(null);
          }}
          onRemoveEmployee={(shift, employeeId) => removeEmployee(shift, employeeId)}
          onEmployeeClick={emp => setSelectedEmployeeId(emp.employee_id ?? emp.id)}
          onBestMatch={() => nextMove && selectedShift && assignEmployee(selectedShift, nextMove.employee.id, `Best match: ${nextMove.employee.name} → ${selectedShift.name} ${nextMove.slot}`)}
          onOpenHistory={openHistory}
        />

        {!aiCollapsed && (
          <AIPanel
            schedule={schedule}
            selectedShift={selectedShift}
            coachItems={activeCoachItems}
            resolvedCoachItems={resolvedCoachItems}
            nextMove={nextMove}
            borrowMoves={borrowMoves}
            isLocked={isLocked}
            canExport={canExport}
            onApplyRecommendation={applyRecommendation}
            onViewShift={(item) => {
              const shift = schedule.shifts.find(s => s.id === item.shiftId);
              if (shift) setSelectedShiftId(shift.id);
            }}
            onApplyNextMove={() => nextMove && selectedShift && assignEmployee(selectedShift, nextMove.employee.id, `AI next best move: ${nextMove.employee.name}`)}
            onBorrow={emp => selectedShift && assignEmployee(selectedShift, emp.id)}
            onCollapse={() => setAiCollapsed(true)}
            onCopy={copyTextExport}
            onCsv={downloadCsv}
            onJson={downloadJson}
          />
        )}
      </div>

      {aiCollapsed && (
        <button className="ai-float-btn" onClick={() => setAiCollapsed(false)}>
          <Zap size={15} /> AI Coach
          {activeCoachItems.filter(i => i.level !== 'good').length > 0 && (
            <span className="badge">{activeCoachItems.filter(i => i.level !== 'good').length}</span>
          )}
        </button>
      )}

      {pendingDrop && (() => {
        const emp = schedule.employees.find(e => e.id === pendingDrop.employeeId);
        const shift = schedule.shifts.find(s => s.id === pendingDrop.shiftId);
        return (
          <RolePicker
            employee={emp}
            shift={shift}
            onAssign={(role) => {
              assignEmployee(shift, emp.id, `Assigned as ${role}`);
              setPendingDrop(null);
            }}
            onCancel={() => setPendingDrop(null)}
          />
        );
      })()}

      {selectedEmployee && (
        <EmployeeDrawer
          employee={selectedEmployee}
          schedule={schedule}
          status={employeeStatuses[selectedEmployee.id]}
          onClose={() => setSelectedEmployeeId(null)}
          onStatusChange={status => applyEmployeeStatus(selectedEmployee.id, status)}
          dayEdits={employeeDayEdits}
          onSaveDay={saveEmployeeDay}
          onOpenShift={shift => { setSelectedShiftId(shift.id); setSelectedEmployeeId(null); }}
        />
      )}

      {historyShift && (
        <div className="modal-backdrop" onClick={() => setHistoryShift(null)}>
          <section className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{historyShift.name} History</h2>
                <p>{historyShift.day} · {formatShiftTime(historyShift)}</p>
              </div>
              <button onClick={() => setHistoryShift(null)}><X size={16} /></button>
            </div>
            {history.length === 0
              ? <p className="muted">No changes recorded yet.</p>
              : history.map(item => <AuditItem key={item.id} item={item} />)
            }
          </section>
        </div>
      )}

    </main>
  );
}

// ══════════════════════════════════════════════════════════════════
// APP HEADER
// ══════════════════════════════════════════════════════════════════

function AppHeader({
  schedule, bootstrap, userId, setUserId, effectiveDepartment, departments,
  setDepartmentFilter, isLocked, aiCollapsed, setAiCollapsed, alertCount,
  canGenerate, busy, onPublish, onUnlock, mode, setMode, onGenerate,
  canExport, onCsv, onJson, onCopy
}) {
  const [showExport, setShowExport] = useState(false);
  const weekLabel = formatWeekLabel(schedule.schedule.week_start);
  const orgName = schedule.workspace.organization;

  return (
    <header className="app-header">
      <div className="header-brand">
        <ShieldCheck size={16} />
        Lineup Ops
      </div>

      <select
        className="dept-selector"
        value={effectiveDepartment}
        onChange={e => setDepartmentFilter(e.target.value)}
      >
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <button className="week-nav" title="Previous week"><ChevronLeft size={16} /></button>
      <span className="week-label">{weekLabel}</span>
      <button className="week-nav" title="Next week"><ChevronRight size={16} /></button>

      <div className="header-spacer" />

      <select
        className="user-select"
        value={userId}
        onChange={e => setUserId(Number(e.target.value))}
      >
        {bootstrap.users.map(u => (
          <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
        ))}
      </select>

      <span className={`lock-badge ${isLocked ? 'locked' : 'draft'}`}>
        {isLocked ? <LockKeyhole size={13} /> : <Unlock size={13} />}
        {isLocked ? 'Published' : 'Draft'}
      </span>

      <div className="mode-tabs" title="Generation mode">
        {modes.map(([key, label, tip]) => (
          <button
            key={key}
            title={tip}
            className={mode === key ? 'active' : ''}
            onClick={() => setMode(key)}
          >
            {key === 'fairness' ? 'Fair' : key === 'balanced' ? 'Balanced' : 'Senior'}
          </button>
        ))}
      </div>

      <button
        className="btn-outline"
        disabled={busy || !canGenerate || isLocked}
        onClick={onGenerate}
        title="Auto-build best lineup"
      >
        <RefreshCw size={14} /> {busy ? 'Building…' : 'Auto-Build'}
      </button>

      {isLocked ? (
        <button className="btn-outline" disabled={!canGenerate || busy} onClick={onUnlock}>
          <Unlock size={14} /> Unlock
        </button>
      ) : (
        <button className="btn-primary" disabled={!canGenerate || busy} onClick={onPublish}>
          Publish Schedule
        </button>
      )}

      <div style={{ position: 'relative' }}>
        <button
          className="btn-outline"
          onClick={() => setShowExport(v => !v)}
          title="Export schedule"
        >
          <Download size={14} /> Export
        </button>
        {showExport && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
            background: 'rgba(9,20,17,0.99)', border: '1px solid rgba(151,179,166,0.22)',
            borderRadius: 10, padding: 8, display: 'grid', gap: 5, minWidth: 140,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
          }}>
            <button disabled={!canExport} onClick={() => { onCopy(); setShowExport(false); }}>
              Copy Text
            </button>
            <button disabled={!canExport} onClick={() => { onCsv(); setShowExport(false); }}>
              CSV / Excel
            </button>
            <button disabled={!canExport} onClick={() => { onJson(); setShowExport(false); }}>
              JSON / API
            </button>
          </div>
        )}
      </div>

      <button
        className={`btn-ai ${alertCount > 0 ? 'has-alerts' : ''}`}
        onClick={() => setAiCollapsed(v => !v)}
      >
        <Zap size={14} /> AI Coach
        {alertCount > 0 && <span className="badge">{alertCount}</span>}
      </button>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════
// CREW SIDEBAR
// ══════════════════════════════════════════════════════════════════

function CrewSidebar({
  manager, selectedShift, schedule, employeeStatuses, effectiveDepartment,
  managerTeamNames, canEdit, setDragEmployeeId, setHoverSlot,
  onEmployeeClick, showBorrowable, setShowBorrowable, onRemoveEmployee
}) {
  const [search, setSearch] = useState('');

  const activeLineup = selectedShift ? selectedShift.assignments : [];

  const allBench = useMemo(() => {
    return schedule.employees.filter(emp => {
      if (!managerTeamNames.includes(emp.name)) return false;
      if (selectedShift?.assignments.some(a => a.employee_id === emp.id)) return false;
      if (search && !emp.name.toLowerCase().includes(search.toLowerCase()) &&
          !emp.certifications.some(c => c.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [schedule.employees, managerTeamNames, selectedShift, search]);

  const available = useMemo(
    () => allBench.filter(emp => !unavailableReason(emp, selectedShift, schedule, employeeStatuses)),
    [allBench, selectedShift, schedule, employeeStatuses]
  );

  const unavailable = useMemo(
    () => allBench.filter(emp => unavailableReason(emp, selectedShift, schedule, employeeStatuses)),
    [allBench, selectedShift, schedule, employeeStatuses]
  );

  const borrowed = useMemo(() => {
    if (!showBorrowable) return [];
    return schedule.employees.filter(emp => {
      if (managerTeamNames.includes(emp.name)) return false;
      if (selectedShift?.assignments.some(a => a.employee_id === emp.id)) return false;
      if (search && !emp.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).slice(0, 8);
  }, [showBorrowable, schedule.employees, managerTeamNames, selectedShift, search]);

  return (
    <aside className="crew-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Users size={14} />
          {manager?.name ?? effectiveDepartment}
        </div>
        <div className="sidebar-search">
          <Search size={13} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search crew…"
          />
        </div>
      </div>

      <div className="sidebar-body">

        {/* Active Lineup */}
        {activeLineup.length > 0 && (
          <section className="crew-section">
            <div className="crew-section-header">
              <span className="crew-section-title">Active Lineup</span>
              <span className="crew-section-count">
                {activeLineup.length}/{selectedShift?.required_count}
              </span>
            </div>
            {activeLineup.map(a => (
              <div key={a.employee_id} className="lineup-member" onClick={() => onEmployeeClick(a)}>
                <ProfilePhoto
                  name={a.employee_name}
                  profile={profileFor({ name: a.employee_name, certifications: a.certifications ?? [] })}
                  size="small"
                />
                <div className="lineup-member-info">
                  <strong>{a.employee_name}</strong>
                  {selectedShift && <span>{formatShiftTime(selectedShift)}</span>}
                </div>
                {canEdit && (
                  <button
                    className="remove-btn"
                    onClick={e => { e.stopPropagation(); onRemoveEmployee(a); }}
                    title="Remove from shift"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Available Bench */}
        {available.length > 0 && (
          <section className="crew-section">
            <div className="crew-section-header">
              <span className="crew-section-title">Available Bench</span>
              <span className="crew-section-count">{available.length}</span>
            </div>
            {available.map(emp => (
              <RosterCard
                key={emp.id}
                employee={emp}
                schedule={schedule}
                employeeStatuses={employeeStatuses}
                selectedShift={selectedShift}
                draggable={canEdit}
                onDragStart={() => setDragEmployeeId(emp.id)}
                onDragEnd={() => { setDragEmployeeId(null); setHoverSlot(null); }}
                onClick={() => onEmployeeClick(emp)}
              />
            ))}
          </section>
        )}

        {/* Unavailable */}
        {unavailable.length > 0 && (
          <section className="crew-section">
            <div className="crew-section-header">
              <span className="crew-section-title">Unavailable</span>
            </div>
            {unavailable.map(emp => (
              <div key={emp.id} className="unavailable-member" onClick={() => onEmployeeClick(emp)}>
                <ProfilePhoto name={emp.name} profile={profileFor(emp)} size="small" />
                <div>
                  <strong>{emp.name}</strong>
                  <span className="reason">
                    {unavailableReason(emp, selectedShift, schedule, employeeStatuses)}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Borrowed Support */}
        {!showBorrowable && (
          <button className="borrow-toggle-btn" onClick={() => setShowBorrowable(true)}>
            <ArrowLeftRight size={13} /> Show Borrowed Support
          </button>
        )}

        {showBorrowable && (
          <section className="crew-section borrowed-section">
            <div className="crew-section-header">
              <span className="crew-section-title">Borrowed Support</span>
              <button
                className="remove-btn"
                onClick={() => setShowBorrowable(false)}
                title="Collapse"
              >
                <X size={12} />
              </button>
            </div>
            {borrowed.length === 0
              ? <p className="muted" style={{ fontSize: '0.76rem', padding: '4px' }}>No borrowable employees found.</p>
              : borrowed.map(emp => (
                <RosterCard
                  key={emp.id}
                  employee={emp}
                  schedule={schedule}
                  employeeStatuses={employeeStatuses}
                  selectedShift={selectedShift}
                  draggable={canEdit}
                  borrowed
                  onDragStart={() => setDragEmployeeId(emp.id)}
                  onDragEnd={() => { setDragEmployeeId(null); setHoverSlot(null); }}
                  onClick={() => onEmployeeClick(emp)}
                />
              ))
            }
          </section>
        )}

      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROSTER CARD
// ══════════════════════════════════════════════════════════════════

function RosterCard({ employee, schedule, employeeStatuses, selectedShift, draggable, borrowed, onDragStart, onDragEnd, onClick }) {
  const hours = assignedHours(schedule.shifts, employee.id);
  const remaining = Math.max(0, employee.max_hours_per_week - hours);
  const otRisk = remaining <= 4;
  const status = employeeVisualStatus(employee, employeeStatuses, schedule.shifts);
  const isUnavail = ['off', 'sick', 'vacation', 'pto', 'holiday', 'unavailable'].includes(status.key);
  const cardClass = borrowed ? 'borrowed' : isUnavail ? 'unavail' : otRisk ? 'ot-risk' : 'available';

  return (
    <article
      className={`roster-card ${cardClass}`}
      draggable={draggable && !isUnavail}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <ProfilePhoto name={employee.name} profile={profileFor(employee)} size="small" />
      <div className="roster-card-info">
        <strong>{employee.name}</strong>
        <span className="roster-role">{profileFor(employee).role}</span>
        <div className="roster-tags">
          {employee.certifications.slice(0, 3).map(c => (
            <span key={c} className="skill-tag">{c}</span>
          ))}
        </div>
      </div>
      <div className="roster-status">
        <span className={`hours-badge ${otRisk ? 'ot' : ''}`}>{remaining}h</span>
        <span className={`status-dot dot-${cardClass}`} />
      </div>
    </article>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHIFT BOARD
// ══════════════════════════════════════════════════════════════════

function ShiftBoard({
  schedule, effectiveDepartment, shiftTypeFilter, setShiftTypeFilter,
  selectedShift, setSelectedShiftId, dragEmployeeId, hoverSlot, setHoverSlot,
  canEdit, nextMove, highlightedShiftId, onDropEmployee, onRemoveEmployee,
  onEmployeeClick, onBestMatch, onOpenHistory
}) {
  const deptShifts = useMemo(
    () => schedule.shifts.filter(s => s.name === effectiveDepartment),
    [schedule.shifts, effectiveDepartment]
  );

  const showDetail = Boolean(selectedShift);

  return (
    <section className="shift-board">
      <div className="board-header">
        <div className="board-title">
          {showDetail ? (
            <>
              <button className="back-btn" onClick={() => setSelectedShiftId(null)}>
                <ChevronLeft size={14} /> Board
              </button>
              <span className={`period-pill period-${shiftPeriod(selectedShift).toLowerCase()}`}>
                {shiftPeriod(selectedShift)}
              </span>
              <span>
                {selectedShift.name} · {selectedShift.day} · {formatShiftTime(selectedShift)}
              </span>
            </>
          ) : (
            <span>{effectiveDepartment} — Weekly Board</span>
          )}
        </div>

        <div className="board-period-filter">
          {['all', 'am', 'mid', 'pm'].map(p => (
            <button
              key={p}
              className={shiftTypeFilter === p ? 'active' : ''}
              onClick={() => setShiftTypeFilter(p)}
            >
              {p === 'all' ? 'All' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {showDetail ? (
        <ShiftDetailView
          shift={selectedShift}
          schedule={schedule}
          nextMove={nextMove}
          canEdit={canEdit}
          dragEmployeeId={dragEmployeeId}
          hoverSlot={hoverSlot}
          setHoverSlot={setHoverSlot}
          onDrop={() => onDropEmployee(selectedShift.id)}
          onRemoveEmployee={assignment => onRemoveEmployee(selectedShift, assignment.employee_id)}
          onEmployeeClick={onEmployeeClick}
          onBestMatch={onBestMatch}
          onOpenHistory={() => onOpenHistory(selectedShift)}
        />
      ) : (
        <div className="board-scroll">
          <WeekGrid
            shifts={deptShifts}
            shiftTypeFilter={shiftTypeFilter}
            dragEmployeeId={dragEmployeeId}
            canEdit={canEdit}
            selectedShiftId={selectedShift?.id}
            onShiftClick={setSelectedShiftId}
            onDrop={onDropEmployee}
            onEmployeeClick={onEmployeeClick}
          />
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// WEEK GRID
// ══════════════════════════════════════════════════════════════════

function WeekGrid({ shifts, shiftTypeFilter, dragEmployeeId, canEdit, selectedShiftId, onShiftClick, onDrop, onEmployeeClick }) {
  const periods = ['AM', 'Mid', 'PM'];
  const visiblePeriods = shiftTypeFilter === 'all'
    ? periods
    : periods.filter(p => p.toLowerCase() === shiftTypeFilter);

  return (
    <div className="week-grid">
      {/* Column headers */}
      <div className="week-grid-head">
        <div className="period-label-cell" />
        {days.map(day => {
          const dayShifts = shifts.filter(s => s.day === day);
          const ready = departmentReadiness(dayShifts);
          const openCount = dayShifts.reduce((sum, s) => sum + Math.max(0, s.required_count - s.assignments.length), 0);
          const tone = ready >= 88 ? 'good' : ready >= 70 ? 'watch' : 'urgent';
          return (
            <div key={day} className="day-col-header">
              <span className="day-name">{day.slice(0, 3).toUpperCase()}</span>
              <span className={`day-status ${tone}`}>
                {openCount > 0 ? `${openCount} open` : `${ready}% ready`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Period rows */}
      {visiblePeriods.map(period => (
        <div key={period} className="period-row">
          <div className="period-label-cell">
            <span className={`period-badge period-${period.toLowerCase()}`}>{period}</span>
          </div>
          {days.map(day => {
            const shift = shifts.find(s => s.day === day && shiftPeriod(s) === period);
            return (
              <div key={day} className="shift-cell-wrap">
                {shift ? (
                  <ShiftCell
                    shift={shift}
                    canEdit={canEdit}
                    dragEmployeeId={dragEmployeeId}
                    selected={shift.id === selectedShiftId}
                    onClick={() => onShiftClick(shift.id)}
                    onDrop={() => onDrop(shift.id)}
                    onEmployeeClick={onEmployeeClick}
                  />
                ) : (
                  <div className="shift-cell empty" />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHIFT CELL
// ══════════════════════════════════════════════════════════════════

function ShiftCell({ shift, canEdit, dragEmployeeId, selected, onClick, onDrop, onEmployeeClick }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const openCount = shift.required_count - shift.assignments.length;
  const status = shiftStatus(shift);
  const period = shiftPeriod(shift).toLowerCase();

  return (
    <article
      className={`shift-cell period-${period} ${status} ${selected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={onClick}
      onDragOver={e => { if (canEdit && dragEmployeeId) { e.preventDefault(); setIsDragOver(true); } }}
      onDragEnter={() => canEdit && dragEmployeeId && setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setIsDragOver(false);
        if (canEdit && dragEmployeeId) onDrop();
      }}
    >
      <div className="shift-cell-head">
        <span className={`period-dot dot-${period}`} />
        <span className="shift-time">{formatShiftTime(shift)}</span>
        <span className={`staffed-count ${openCount > 0 ? 'incomplete' : 'complete'}`}>
          {shift.assignments.length}/{shift.required_count}
        </span>
      </div>

      <div className="shift-names">
        {shift.assignments.slice(0, 3).map(a => (
          <span
            key={a.employee_id}
            className="name-chip"
            onClick={e => { e.stopPropagation(); onEmployeeClick(a); }}
          >
            {a.employee_name.split(' ')[0]}
          </span>
        ))}
        {shift.assignments.length > 3 && (
          <span className="name-chip more">+{shift.assignments.length - 3}</span>
        )}
      </div>

      {openCount > 0 && (
        <div className="open-roles-indicator">
          <AlertTriangle size={11} />
          <span>{openCount} open {openCount === 1 ? 'role' : 'roles'}</span>
        </div>
      )}

      {isDragOver && <div className="drop-indicator">Drop to assign</div>}
    </article>
  );
}

// ══════════════════════════════════════════════════════════════════
// SHIFT DETAIL VIEW
// ══════════════════════════════════════════════════════════════════

function ShiftDetailView({
  shift, schedule, nextMove, canEdit, dragEmployeeId, hoverSlot, setHoverSlot,
  onDrop, onRemoveEmployee, onEmployeeClick, onBestMatch, onOpenHistory
}) {
  const dragEmployee = schedule.employees.find(e => e.id === dragEmployeeId);
  const openCount = shift.required_count - shift.assignments.length;
  const progress = Math.round((shift.assignments.length / Math.max(shift.required_count, 1)) * 100);
  const groups = buildRoleGroups(shift);
  const slots = buildSlots(shift);

  return (
    <div className="shift-detail">
      {/* Header */}
      <div className="shift-detail-header">
        <div className="shift-detail-meta">
          <span className={`period-pill period-${shiftPeriod(shift).toLowerCase()}`}>
            {shiftPeriod(shift)}
          </span>
          <h2>{shift.name} · {shift.day}</h2>
          <div className="shift-time-label">
            <Clock size={13} />
            {formatShiftTime(shift)}
          </div>
        </div>
        <div className="shift-detail-stats">
          <div className="stat-block">
            <span>Staffed</span>
            <strong className={openCount > 0 ? 'warn' : 'good'}>
              {shift.assignments.length}/{shift.required_count}
            </strong>
          </div>
          <div className="stat-block">
            <span>Readiness</span>
            <strong>{shift.readiness}%</strong>
          </div>
          <div className="shift-progress-bar">
            <div className="shift-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <button className="btn-icon sm" onClick={onOpenHistory} title="View history">
            <History size={15} />
          </button>
        </div>
      </div>

      {/* Next move banner */}
      {nextMove && openCount > 0 && (
        <div className="next-move-banner">
          <Zap size={14} />
          <span>Best next move: assign <strong>{nextMove.employee.name}</strong> as {nextMove.slot}</span>
          <button className="btn-primary sm" onClick={onBestMatch}>Apply</button>
        </div>
      )}

      {/* Role slots */}
      <div className="role-groups">
        {groups.map(group => (
          <div key={group.name} className="role-group-section">
            <h3 className="role-group-title">{group.name}</h3>
            <div className="role-slots">
              {group.roles.map(role => {
                const index = slots.indexOf(role);
                const assignment = shift.assignments[index];
                const fit = dragEmployee ? evaluateFit(dragEmployee, shift, schedule.shifts) : null;
                const isHovering = hoverSlot === index;

                return (
                  <div
                    key={role}
                    className={`role-slot ${assignment ? 'filled' : 'empty'} ${isHovering && fit ? `fit-${fit.tone}` : ''}`}
                    onDragOver={e => { if (canEdit) e.preventDefault(); }}
                    onDragEnter={() => canEdit && dragEmployeeId && setHoverSlot(index)}
                    onDragLeave={() => setHoverSlot(null)}
                    onDrop={e => {
                      e.preventDefault();
                      setHoverSlot(null);
                      if (canEdit && dragEmployeeId) onDrop();
                    }}
                  >
                    <span className="role-label">{role}</span>

                    {assignment ? (
                      <div className="slot-assigned">
                        <ProfilePhoto
                          name={assignment.employee_name}
                          profile={profileFor({ name: assignment.employee_name, certifications: assignment.certifications ?? [] })}
                          size="small"
                        />
                        <button
                          className="slot-name"
                          onClick={() => onEmployeeClick(assignment)}
                        >
                          {assignment.employee_name}
                        </button>
                        {canEdit && (
                          <button
                            className="remove-slot-btn"
                            onClick={() => onRemoveEmployee(assignment)}
                            title="Remove"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="slot-empty-state">
                        <Plus size={16} />
                        <span>Drag employee here</span>
                      </div>
                    )}

                    {isHovering && fit && (
                      <div className={`fit-badge ${fit.tone}`}>{fit.message}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="shift-detail-footer">
        Last edited by {shift.updated_by_name} · {formatTime(shift.updated_at)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// AI PANEL
// ══════════════════════════════════════════════════════════════════

function AIPanel({
  schedule, selectedShift, coachItems, resolvedCoachItems, nextMove, borrowMoves,
  isLocked, canExport, onApplyRecommendation, onViewShift, onApplyNextMove,
  onBorrow, onCollapse, onCopy, onCsv, onJson
}) {
  return (
    <aside className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <Bot size={15} /> AI Coach
        </div>
        <button className="btn-icon" onClick={onCollapse}><X size={15} /></button>
      </div>

      <div className="ai-panel-body">

        {/* Next best move */}
        {nextMove && selectedShift && (
          <div className="ai-next-move">
            <span className="ai-label">Top Priority</span>
            <h3>Assign {nextMove.slot}</h3>
            <p>Best match: <strong>{nextMove.employee.name}</strong></p>
            <p>+{nextMove.impact}% readiness impact</p>
            <button className="btn-primary sm" disabled={isLocked} onClick={onApplyNextMove}>
              Apply Move
            </button>
          </div>
        )}

        {/* Suggestions */}
        <div className="ai-section">
          <h3>Suggestions</h3>
          {coachItems.length === 0 && (
            <p className="muted" style={{ fontSize: '0.78rem' }}>Lineup looks strong. No issues detected.</p>
          )}
          {coachItems.slice(0, 5).map((item, i) => (
            <AICard
              key={`${item.title}-${i}`}
              item={item}
              onViewShift={onViewShift}
              onApply={onApplyRecommendation}
              isLocked={isLocked}
            />
          ))}
        </div>

        {/* Borrow suggestions */}
        {borrowMoves.length > 0 && (
          <div className="ai-section">
            <h3>Borrow Employees</h3>
            {borrowMoves.slice(0, 3).map(move => (
              <div key={move.employee.id} className="borrow-suggestion">
                <strong>{move.employee.name}</strong>
                <span>{move.from} → {selectedShift?.name}</span>
                <p>+{move.targetGain}% readiness · -{move.sourceLoss}% source dept</p>
                <button
                  className="btn-outline sm"
                  disabled={isLocked}
                  onClick={() => onBorrow(move.employee)}
                >
                  Apply Borrow
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="ai-section">
          <h3>Quick Actions</h3>
          <div className="ai-action-grid">
            <button
              disabled={isLocked || coachItems.length === 0}
              onClick={() => coachItems[0] && onApplyRecommendation(coachItems[0])}
            >
              Autofill Best Match
            </button>
            <button disabled={isLocked} onClick={() => onApplyNextMove()}>
              Apply Next Move
            </button>
          </div>
        </div>

        {/* Export */}
        <div className="ai-section">
          <h3>Export Schedule</h3>
          <div className="export-btns">
            <button disabled={!canExport} onClick={onCopy}>
              <Clipboard size={13} /> Copy
            </button>
            <button disabled={!canExport} onClick={onCsv}>
              <Download size={13} /> CSV
            </button>
            <button disabled={!canExport} onClick={onJson}>
              <Download size={13} /> JSON
            </button>
          </div>
        </div>

        {/* Resolved */}
        {resolvedCoachItems.length > 0 && (
          <div className="ai-section">
            <h3>Resolved ({resolvedCoachItems.length})</h3>
            {resolvedCoachItems.slice(0, 3).map(item => (
              <div key={item.title ?? item.message} style={{
                fontSize: '0.76rem', color: 'var(--muted)', padding: '6px 8px',
                background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                border: '1px solid rgba(151,179,166,0.12)'
              }}>
                {item.title ?? item.message}
              </div>
            ))}
          </div>
        )}

      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════
// AI CARD
// ══════════════════════════════════════════════════════════════════

function AICard({ item, onViewShift, onApply, isLocked }) {
  return (
    <article className={`ai-card ${item.level}`}>
      <div className="ai-card-top">
        <span className="ai-severity">{item.severity ?? severityFromLevel(item.level)}</span>
        <strong>{item.title ?? 'Lineup Opportunity'}</strong>
      </div>
      <p className="ai-message">{item.message}</p>
      <div className="ai-card-actions">
        <button onClick={() => onViewShift?.(item)}>View Shift</button>
        <button
          disabled={item.level === 'good' || isLocked}
          onClick={() => onApply?.(item)}
        >
          Apply Suggestion
        </button>
      </div>
    </article>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROLE PICKER MODAL
// ══════════════════════════════════════════════════════════════════

function RolePicker({ employee, shift, onAssign, onCancel }) {
  if (!employee || !shift) return null;

  const openSlots = buildSlots(shift).slice(shift.assignments.length);
  const primaryRoles = openSlots.length > 0 ? openSlots : employee.certifications;
  const extraCerts = employee.certifications.filter(c => !primaryRoles.includes(c));

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="role-picker" onClick={e => e.stopPropagation()}>
        <div className="role-picker-head">
          <ProfilePhoto name={employee.name} profile={profileFor(employee)} size="normal" />
          <div>
            <h3>Assign {employee.name}</h3>
            <p>{shift.name} · {shift.day} · {formatShiftTime(shift)}</p>
          </div>
          <button className="btn-icon" onClick={onCancel}><X size={15} /></button>
        </div>

        <p className="role-picker-prompt">Select role for this shift:</p>

        <div className="role-options">
          {primaryRoles.map(role => (
            <button key={role} className="role-option" onClick={() => onAssign(role)}>
              {role}
            </button>
          ))}
          {extraCerts.map(cert => (
            <button
              key={cert}
              className="role-option secondary"
              onClick={() => onAssign(cert)}
            >
              {cert}
              <span style={{ color: 'var(--muted)', fontSize: '0.7rem', marginLeft: 4 }}>
                (certified)
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EMPLOYEE DRAWER
// ══════════════════════════════════════════════════════════════════

function EmployeeDrawer({ employee, schedule, status, onClose, onStatusChange, onOpenShift, dayEdits, onSaveDay }) {
  const assignments = schedule.shifts.filter(s => s.assignments.some(a => a.employee_id === employee.id));
  const hours = assignedHours(schedule.shifts, employee.id);
  const visual = employeeVisualStatus(employee, { [employee.id]: status }, schedule.shifts);
  const plan = planningFor(employee);
  const remaining = employee.max_hours_per_week - hours;
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(days.map(day => [day, buildDayDraft(employee, day, schedule, dayEdits)]))
  );
  const [saveStates, setSaveStates] = useState({});
  const [dirty, setDirty] = useState(false);

  function updateDay(day, patch) {
    setDrafts(cur => ({ ...cur, [day]: { ...cur[day], ...patch } }));
    setSaveStates(cur => ({ ...cur, [day]: 'Unsaved changes' }));
    setDirty(true);
  }

  async function saveDay(day) {
    setSaveStates(cur => ({ ...cur, [day]: 'Saving…' }));
    try {
      await onSaveDay(employee.id, day, drafts[day]);
      setSaveStates(cur => ({ ...cur, [day]: 'Saved' }));
      setDirty(false);
    } catch (err) {
      setSaveStates(cur => ({ ...cur, [day]: `Error: ${err.message}` }));
    }
  }

  function requestClose() {
    if (dirty && !window.confirm('You have unsaved changes. Close anyway?')) return;
    onClose();
  }

  const statusButtons = [
    employeeStatusCatalog.active,
    employeeStatusCatalog.off,
    employeeStatusCatalog.pto,
    employeeStatusCatalog.sick,
    employeeStatusCatalog.vacation,
    employeeStatusCatalog.training
  ];

  return (
    <aside className="employee-drawer">
      <div className="drawer-head">
        <div className="drawer-profile">
          <ProfilePhoto name={employee.name} profile={profileFor(employee)} size="large" />
          <div className="drawer-profile-info">
            <span>Employee · Weekly Planner</span>
            <h2>{employee.name}</h2>
            <p>{profileFor(employee).role} · {employee.home_department}</p>
          </div>
        </div>
        <button className="btn-icon" onClick={requestClose}><X size={16} /></button>
      </div>

      {/* Stats */}
      <section className="drawer-section">
        <div className="detail-grid">
          <div className="detail-cell">
            <span>Dept</span>
            <strong>{employee.home_department ?? 'Shared'}</strong>
          </div>
          <div className="detail-cell">
            <span>Type</span>
            <strong>{plan.employmentType}</strong>
          </div>
          <div className="detail-cell">
            <span>Scheduled</span>
            <strong>{hours}h</strong>
          </div>
          <div className="detail-cell">
            <span>Remaining</span>
            <strong className={remaining < 0 ? 'danger' : ''}>{remaining}h</strong>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="drawer-section">
        <h3>Skills & Certifications</h3>
        <div className="skill-row">
          {employee.certifications.map(c => (
            <span key={c} className="skill-tag" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>{c}</span>
          ))}
        </div>
      </section>

      {/* Status */}
      <section className="drawer-section">
        <h3>Set Status</h3>
        <div className="status-action-grid">
          {statusButtons.map(s => (
            <button
              key={s.key}
              className={`status-${s.key} ${visual.key === s.key ? 'active' : ''}`}
              style={{ borderLeftWidth: 3 }}
              onClick={() => onStatusChange(s)}
            >
              <strong style={{ fontSize: '0.83rem' }}>{s.label}</strong>
              <span>{s.help}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Availability */}
      <section className="drawer-section">
        <h3>Availability</h3>
        <AvailabilityStrip availability={employee.availability} />
      </section>

      {/* Weekly schedule editor */}
      <section className="drawer-section">
        <h3>Current Week Schedule</h3>
        <div className="week-editor-list">
          {days.map(day => (
            <DayScheduleEditor
              key={day}
              day={day}
              draft={drafts[day]}
              schedule={schedule}
              employee={employee}
              saveState={saveStates[day] ?? 'Saved'}
              onChange={patch => updateDay(day, patch)}
              onSave={() => saveDay(day)}
              onOpenShift={onOpenShift}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════════
// DAY SCHEDULE EDITOR
// ══════════════════════════════════════════════════════════════════

function DayScheduleEditor({ day, draft, schedule, employee, saveState, onChange, onSave, onOpenShift }) {
  const depts = Array.from(new Set(schedule.shifts.map(s => s.name)));
  const roles = rolesForDepartment(draft.department, employee);
  const matchingShift = findShiftForDraft(schedule, day, draft);
  const statusOptions = draft.working ? ['Working', 'Training'] : ['Off', 'Sick', 'Vacation', 'PTO', 'Holiday PTO', 'Unavailable'];

  return (
    <article className={`day-editor ${draft.working ? '' : 'off'}`}>
      <div className="day-editor-head">
        <strong>{day}</strong>
        <label className="working-toggle">
          <input
            type="checkbox"
            checked={draft.working}
            onChange={e => onChange({ working: e.target.checked, status: e.target.checked ? 'Working' : 'Off' })}
          />
          {draft.working ? 'Working' : 'Off'}
        </label>
        <span className={`save-state ${saveState.startsWith('Error') ? 'error' : saveState === 'Unsaved changes' ? 'dirty' : ''}`}>
          {saveState}
        </span>
      </div>

      <div className="day-editor-grid">
        <label>
          Status
          <select value={draft.status} onChange={e => onChange({ status: e.target.value })}>
            {statusOptions.map(o => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>
          Department
          <select
            disabled={!draft.working}
            value={draft.department}
            onChange={e => onChange({ department: e.target.value, role: rolesForDepartment(e.target.value, employee)[0] })}
          >
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>
          Role
          <select disabled={!draft.working} value={draft.role} onChange={e => onChange({ role: e.target.value })}>
            {roles.map(r => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label>
          Shift
          <select disabled={!draft.working} value={draft.period} onChange={e => onChange({ period: e.target.value })}>
            {['AM', 'MID', 'PM'].map(p => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>
          Start time
          <input disabled={!draft.working} value={draft.startTime} onChange={e => onChange({ startTime: e.target.value })} />
        </label>
        <label>
          End time
          <input disabled={!draft.working} value={draft.endTime} onChange={e => onChange({ endTime: e.target.value })} />
        </label>
        <label className="notes-field">
          Notes
          <input value={draft.notes ?? ''} onChange={e => onChange({ notes: e.target.value })} placeholder="Optional" />
        </label>
        <label className="override-toggle">
          <input
            type="checkbox"
            checked={Boolean(draft.overrideMaxHours)}
            onChange={e => onChange({ overrideMaxHours: e.target.checked })}
          />
          Override max hours
        </label>
      </div>

      <div className="day-editor-actions">
        <button className="btn-primary" onClick={onSave}>Save {day}</button>
        {matchingShift && (
          <button onClick={() => onOpenShift(matchingShift)}>View Shift</button>
        )}
      </div>
    </article>
  );
}

// ══════════════════════════════════════════════════════════════════
// SMALL SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════

function ProfilePhoto({ name, profile, size = 'normal' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`profile-photo ${profile?.tone ?? 'steel'} ${size}`} aria-label={`${name} profile`}>
      {profile?.photo && !failed ? (
        <img src={profile.photo} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="profile-initials">{initials(name)}</span>
      )}
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

function AvailabilityStrip({ availability }) {
  return (
    <div className="availability-strip">
      {days.map((day, i) => {
        const rec = availability.find(a => a.day === day);
        const limited = rec && (rec.start_time > '08:00' || rec.end_time < '18:00');
        return (
          <span key={day} className={rec ? (limited ? 'limited' : 'available') : 'unavailable'}>
            {dayLetters[i]}
          </span>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS  (business logic — unchanged)
// ══════════════════════════════════════════════════════════════════

function loadEmployeeDayEdits() {
  try { return JSON.parse(localStorage.getItem('lineupOps.employeeDayEdits') || '{}'); }
  catch { return {}; }
}

function employeeDayKey(employeeId, day) { return `${employeeId}:${day}`; }

function buildDayDraft(employee, day, schedule, dayEdits = {}) {
  const saved = dayEdits[employeeDayKey(employee.id, day)];
  if (saved) return saved;
  const assigned = schedule.shifts.find(s => s.day === day && s.assignments.some(a => a.employee_id === employee.id));
  const status = planningFor(employee).timeOff?.[day] ?? 'Off';
  return {
    working: Boolean(assigned),
    status: assigned ? 'Working' : status,
    department: assigned?.name ?? employee.home_department ?? schedule.shifts[0]?.name ?? 'Front End',
    role: assigned
      ? (buildSlots(assigned)[assigned.assignments.findIndex(a => a.employee_id === employee.id)] ?? employee.certifications[0])
      : employee.certifications[0],
    period: assigned ? shiftPeriod(assigned).toUpperCase() : 'AM',
    startTime: assigned ? formatClock(assigned.start_time) : '6:00 AM',
    endTime:   assigned ? formatClock(assigned.end_time)   : '2:00 PM',
    notes: '',
    overrideMaxHours: false
  };
}

function rolesForDepartment(department, employee) {
  const fake = { name: department, required_count: 8, required_certification: employee.certifications[0] };
  return Array.from(new Set([...buildSlots(fake), ...employee.certifications]));
}

function findShiftForDraft(schedule, day, draft) {
  return schedule.shifts.find(s =>
    s.day === day && s.name === draft.department && shiftPeriod(s).toUpperCase() === draft.period
  ) ?? null;
}

function findEmployeeConflict(schedule, employeeId, targetShift) {
  return schedule.shifts.find(s =>
    s.id !== targetShift.id &&
    s.day === targetShift.day &&
    s.assignments.some(a => a.employee_id === employeeId) &&
    shiftsOverlap(s, targetShift)
  ) ?? null;
}

function parseClockInput(value) {
  if (!value) return '';
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return String(value).trim();
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const suffix = m[3]?.toUpperCase();
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toMinutes(value) {
  const [h, m] = parseClockInput(value).split(':').map(Number);
  return h * 60 + m;
}

function hoursBetweenClock(start, end) {
  return (toMinutes(end) - toMinutes(start)) / 60;
}

function normalizeSchedule(raw) {
  const shifts = (raw.shifts ?? []).map(shift => {
    const assignments = (shift.assignments ?? []).map(a => ({
      ...a,
      certifications: Array.isArray(a.certifications) ? a.certifications : parseCertifications(a.certifications),
      hourly_rate: Number(a.hourly_rate ?? 22),
      reliability_score: Number(a.reliability_score ?? 80),
      max_hours_per_week: Number(a.max_hours_per_week ?? 40)
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
    employees: (raw.employees ?? []).map(emp => ({
      ...emp,
      certifications: Array.isArray(emp.certifications) ? emp.certifications : parseCertifications(emp.certifications),
      availability: emp.availability ?? [],
      reliability_score: Number(emp.reliability_score ?? 80),
      hourly_rate: Number(emp.hourly_rate ?? 22),
      max_hours_per_week: Number(emp.max_hours_per_week ?? 40)
    })),
    coach: normalizeRecommendations(raw.coach, shifts),
    audit: raw.audit ?? []
  };
}

function normalizeRecommendations(coach, shifts) {
  if (coach?.length) {
    return coach.map(item => ({
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
      severity: 'Warning', level: 'watch',
      title: `${holiday.name} Detected`,
      message: 'Holiday week — use reduced coverage expectations and premium-pay visibility.',
      suggestedFix: 'Review volunteer coverage before export.',
      impact: 'Medium'
    });
  }
  for (const [idText, status] of Object.entries(employeeStatuses)) {
    if (!status || !['sick','pto','vacation','off','unavailable','holiday'].includes(status.key)) continue;
    const employeeId = Number(idText);
    const employee = schedule.employees.find(e => e.id === employeeId);
    if (!employee) continue;
    const affected = schedule.shifts.filter(s => s.assignments.some(a => a.employee_id === employeeId));
    const weakest = affected.sort((a, b) => a.readiness - b.readiness)[0];
    if (weakest) {
      const replacement = bestReplacementFor(schedule, weakest, employeeId);
      items.push({
        severity: status.key === 'sick' ? 'Critical' : 'Warning',
        level: status.key === 'sick' ? 'urgent' : 'watch',
        title: `${employee.name} marked ${status.label}`,
        message: `${weakest.name} readiness exposed on ${weakest.day} ${shiftPeriod(weakest)}.`,
        suggestedFix: replacement
          ? `Suggested replacement: ${replacement.name}.`
          : 'Open the shift and fill from available bench.',
        impact: 'High',
        shiftId: weakest.id
      });
    }
  }
  const conflicts = detectShiftConflicts(schedule);
  for (const c of conflicts.slice(0, 3)) {
    items.push({
      severity: 'Warning', level: 'watch',
      title: 'Shift Conflict Detected',
      message: `${c.employee.name} has overlapping ${c.first.name} and ${c.second.name} on ${c.first.day}.`,
      suggestedFix: 'Move one assignment or borrow a cross-trained employee.',
      impact: 'Medium',
      shiftId: c.second.id
    });
  }
  return items;
}

function unavailableReason(employee, shift, schedule, employeeStatuses = {}) {
  if (!shift) return '';
  const explicit = employeeStatuses[employee.id];
  if (explicit && ['off','pto','sick','vacation','holiday','unavailable'].includes(explicit.key)) return `${explicit.label} today`;
  const dayStatus = planningFor(employee).timeOff?.[shift.day];
  if (dayStatus) return `${dayStatus} today`;
  const conflict = findEmployeeConflict(schedule, employee.id, shift);
  if (conflict) return `Working ${formatShiftTime(conflict)}`;
  const hoursAfter = assignedHours(schedule.shifts, employee.id) + shiftHours(shift);
  if (hoursAfter > employee.max_hours_per_week) return 'Over max hours';
  if (shift.required_certification && !employee.certifications.includes(shift.required_certification)) return `Missing ${shift.required_certification}`;
  const avail = employee.availability.find(a => a.day === shift.day);
  if (!avail || avail.start_time > shift.start_time || avail.end_time < shift.end_time) return `Not available ${shiftPeriod(shift)}`;
  return '';
}

function buildRoleGroups(shift) {
  const slots = buildSlots(shift);
  const templates = {
    'Front End': [
      ['Leads',                ['Front End Lead', 'Supervisor']],
      ['Cashiers',             ['Cashier 1', 'Cashier 2', 'Cashier 3']],
      ['Membership / Service', ['Membership Support', 'Self Checkout', 'Returns']],
      ['Cart / Floor',        ['Cart Runner', 'Door Support', 'Backup Coverage']]
    ],
    Bakery: [
      ['Lead',           ['Bakery Lead']],
      ['Production',     ['Production']],
      ['Packout',        ['Packout']],
      ['Sanitation',     ['Sanitation']],
      ['Closing Support',['Closing Support']]
    ],
    Receiving: [
      ['Lead',           ['Receiving Lead', 'Forklift Lead']],
      ['Equipment',      ['Forklift Operator', 'Pallet Jack Operator']],
      ['Receiving',      ['Receiver', 'Receiver 1', 'Receiver 2']],
      ['Backup',         ['Backup Coverage', 'Backup', 'Closing Lead']]
    ]
  };
  const template = templates[shift.name];
  if (!template) return [{ name: 'Required Roles', roles: slots }];
  const used = new Set();
  const grouped = template.map(([name, names]) => ({
    name,
    roles: slots.filter(slot => names.includes(slot) && !used.has(slot) && used.add(slot))
  })).filter(g => g.roles.length);
  const remaining = slots.filter(s => !used.has(s));
  return remaining.length ? [...grouped, { name: 'Backup Coverage', roles: remaining }] : grouped;
}

function buildSlots(shift) {
  const role = shift.required_certification ?? shift.name;
  const templates = {
    Receiving:           ['Receiving Lead', 'Forklift Operator', 'Receiver', 'Pallet Jack Operator', 'Backup Coverage'],
    'Forklift Ops':      ['Forklift Lead', 'Operator 1', 'Operator 2', 'Safety Backup'],
    'Front End':         ['Front End Lead', 'Cashier 1', 'Cashier 2', 'Membership Support', 'Cart Runner', 'Self Checkout', 'Backup Coverage'],
    Bakery:              ['Bakery Lead', 'Production', 'Packout', 'Sanitation', 'Closing Support'],
    Deli:                ['Deli Lead', 'Prep 1', 'Service'],
    'Night Merchandising':['Night Lead', 'Stocker 1', 'Stocker 2'],
    Stocking:            ['Stocking Lead', 'Stocker 1', 'Stocker 2'],
    'Morning Prep':      ['Prep Lead', 'Prep 1', 'Prep 2'],
    Membership:          ['Membership Lead', 'Member Support'],
    'Tire Center':       ['Tire Lead', 'Technician']
  };
  return (templates[shift.name] ?? Array.from({ length: shift.required_count }, (_, i) => `${role} ${i + 1}`)).slice(0, shift.required_count);
}

function departmentReadiness(shifts) {
  if (!shifts.length) return 0;
  return Math.round(shifts.reduce((sum, s) => sum + s.readiness, 0) / shifts.length);
}

function planningFor(employee) {
  const fallbackType = employee.max_hours_per_week <= 29 ? 'Part Time' : 'Full Time';
  return employeePlanning[employee.name] ?? {
    employmentType: fallbackType,
    targetHours: Math.min(employee.max_hours_per_week, fallbackType === 'Part Time' ? 28 : 40),
    fixed: false,
    timeOff: {}
  };
}

function explicitDayStatus(employee, day, employeeStatuses = {}) {
  const explicit = employeeStatuses?.[employee.id];
  if (explicit && ['off','sick','vacation','pto','holiday','unavailable','training'].includes(explicit.key)) return explicit.label;
  return planningFor(employee).timeOff?.[day] ?? '';
}

function managerForUser(user) {
  if (!user) return null;
  const p = managerProfiles[user.name];
  if (!p) return null;
  return { name: user.name, ...p };
}

function employeeVisualStatus(employee, employeeStatuses = {}, shifts = []) {
  const explicit = employeeStatuses?.[employee.id];
  if (explicit) return explicit;
  const hours = assignedHours(shifts, employee.id);
  const borrowed = shifts.some(s => s.assignments.some(a =>
    a.employee_id === employee.id && a.home_department && a.home_department !== s.name
  ));
  if (borrowed) return employeeStatusCatalog.borrowed;
  if (hours >= employee.max_hours_per_week * 0.85) return employeeStatusCatalog.overtime;
  if (!hours) return employeeStatusCatalog.off;
  return employeeStatusCatalog.active;
}

function bestReplacementFor(schedule, shift, blockedId) {
  const ids = new Set(shift.assignments.map(a => a.employee_id));
  ids.add(blockedId);
  return schedule.employees
    .filter(e => !ids.has(e.id))
    .map(e => ({ ...e, impact: readinessImpact(e, shift, schedule.shifts) }))
    .sort((a, b) => b.impact - a.impact)[0] ?? null;
}

function detectShiftConflicts(schedule) {
  const conflicts = [];
  for (const emp of schedule.employees) {
    const assigned = schedule.shifts.filter(s => s.assignments.some(a => a.employee_id === emp.id));
    for (let i = 0; i < assigned.length; i++) {
      for (let j = i + 1; j < assigned.length; j++) {
        const f = assigned[i], s = assigned[j];
        if (f.day === s.day && shiftsOverlap(f, s)) conflicts.push({ employee: emp, first: f, second: s });
      }
    }
  }
  return conflicts;
}

function shiftsOverlap(a, b) {
  return a.start_time < b.end_time && b.start_time < a.end_time;
}

function detectHolidayWeek(weekStart) {
  const d = new Date(`${weekStart}T00:00:00`);
  return holidayRules.find(r =>
    d.getMonth() === r.month && d.getDate() >= r.dateRange[0] && d.getDate() <= r.dateRange[1]
  ) ?? null;
}

function profileFor(employee) {
  if (profileLibrary[employee.name]) return profileLibrary[employee.name];
  return { role: employee.certifications?.[0] ?? 'Associate', tone: 'steel' };
}

function buildBorrowMoves(schedule, selectedShift) {
  const ids = new Set(selectedShift.assignments.map(a => a.employee_id));
  return schedule.employees
    .filter(e => !ids.has(e.id))
    .map(e => ({
      employee: e,
      from: sourceDepartment(e, schedule.shifts),
      targetGain: readinessImpact(e, selectedShift, schedule.shifts),
      sourceLoss: e.reliability_score > 88 ? 5 : 3,
      netGain: Math.max(2, Math.round(readinessImpact(e, selectedShift, schedule.shifts) / 2))
    }))
    .filter(m => m.targetGain >= 8)
    .sort((a, b) => b.targetGain - a.targetGain)
    .slice(0, 3);
}

function bestNextMove(schedule, selectedShift) {
  const openIndex = selectedShift.assignments.length;
  if (openIndex >= selectedShift.required_count) return null;
  const slot = buildSlots(selectedShift)[openIndex] ?? `${selectedShift.required_certification ?? selectedShift.name} role`;
  const ids = new Set(selectedShift.assignments.map(a => a.employee_id));
  const top = schedule.employees
    .filter(e => !ids.has(e.id))
    .map(e => ({ employee: e, impact: readinessImpact(e, selectedShift, schedule.shifts) }))
    .sort((a, b) => b.impact - a.impact)[0];
  if (!top) return null;
  return { slot, employee: top.employee, impact: top.impact };
}

function sourceDepartment(employee, shifts) {
  const s = shifts.find(sh => sh.assignments.some(a => a.employee_id === employee.id));
  return s?.name ?? employee.certifications[0] ?? 'Shared bench';
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
  if (hours > employee.max_hours_per_week) return { tone: 'risky', message: 'Exceeds max hours' };
  if (shift.required_certification && !employee.certifications.includes(shift.required_certification))
    return { tone: 'warning', message: `Missing ${shift.required_certification}` };
  if (employee.reliability_score >= 86) return { tone: 'strong', message: 'Strong fit' };
  return { tone: 'warning', message: 'Acceptable — compare alternatives' };
}

function shiftStatus(shift) {
  if (shift.assignments.length === 0) return 'open';
  if (shift.assignments.length < shift.required_count) return 'urgent';
  if (shift.readiness < 74) return 'watch';
  return 'good';
}

function calculateMetrics(schedule) {
  const totalSlots = schedule.shifts.reduce((s, sh) => s + sh.required_count, 0);
  const filled = schedule.shifts.reduce((s, sh) => s + sh.assignments.length, 0);
  const coveragePct = totalSlots ? Math.round((filled / totalSlots) * 100) : 0;
  const certified = schedule.shifts.filter(sh =>
    !sh.required_certification || sh.assignments.some(a => a.certifications.includes(sh.required_certification))
  ).length;
  const certPct = schedule.shifts.length ? Math.round((certified / schedule.shifts.length) * 100) : 0;
  const avgReadiness = schedule.shifts.length ? schedule.shifts.reduce((s, sh) => s + sh.readiness, 0) / schedule.shifts.length : 0;
  const otRisk = schedule.employees.filter(e => assignedHours(schedule.shifts, e.id) > e.max_hours_per_week * 0.85).length;
  return {
    totalSlots, filled, coveragePct,
    operationalReadiness: clamp(Math.round(coveragePct * 0.42 + avgReadiness * 0.32 + certPct * 0.2 + 8 - otRisk * 5), 0, 100)
  };
}

function buildFallbackCoach(shifts) {
  const open = shifts.find(s => s.assignments.length < s.required_count);
  if (open) return [{
    severity: 'Critical', level: 'urgent',
    title: 'Coverage Hole',
    message: `${open.name} has ${open.required_count - open.assignments.length} open slots.`,
    suggestedFix: `Assign a ${open.required_certification ?? 'qualified'} employee.`,
    impact: 'High', shiftId: open.id
  }];
  return [{
    severity: 'Opportunity', level: 'good',
    title: 'Strong Lineup',
    message: 'All shifts have baseline coverage.',
    suggestedFix: 'Review vulnerabilities and publish.',
    impact: 'Low'
  }];
}

function assignedHours(shifts, employeeId) {
  return shifts.reduce((sum, s) =>
    s.assignments.some(a => a.employee_id === employeeId) ? sum + shiftHours(s) : sum, 0);
}

function laborCost(shift) {
  return shift.assignments.reduce((sum, a) => sum + a.hourly_rate * shiftHours(shift), 0);
}

function shiftHours(shift) {
  const [sh, sm] = shift.start_time.split(':').map(Number);
  const [eh, em] = shift.end_time.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function fallbackReadiness(shift, assignments) {
  return Math.round(Math.min((assignments.length / Math.max(shift.required_count, 1)) * 100, 100));
}

function parseCertifications(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; }
  catch { return []; }
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
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(value.replace(' ', 'T')));
}

function formatWeekLabel(weekStart) {
  if (!weekStart) return '';
  const d = new Date(`${weekStart}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function severityFromLevel(level) {
  if (level === 'urgent') return 'Critical';
  if (level === 'good')   return 'Opportunity';
  return 'Warning';
}

function actionPhrase(item) {
  if (item.action === 'updated')   return 'updated lineup';
  if (item.action === 'generated') return 'optimized schedule';
  if (item.action === 'published') return 'published schedule';
  if (item.action === 'unlocked')  return 'unlocked schedule';
  return item.action;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function getRouteState() {
  const url = new URL(window.location.href);
  const aiStored = localStorage.getItem('lineupOps.aiCollapsed');
  const department = url.searchParams.get('department') || 'front-end';
  return {
    department: departmentFromSlug(department),
    aiCollapsed: aiStored === '1'
  };
}

function departmentFromSlug(value) {
  const known = ['Front End', 'Receiving', 'Stocking', 'Bakery', 'Deli', 'Membership', 'Tire Center', 'Night Merchandising', 'Morning Prep', 'Closing'];
  return known.find(d => d.toLowerCase().replace(/[^a-z0-9]+/g, '-') === value) ?? value;
}
