import { db } from '../db/connection.js';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function generateSchedule(scheduleId, mode = 'balanced', actorUserId) {
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId);
  const employees = getEmployees(schedule.location_id);
  const shifts = db.prepare('SELECT * FROM shifts WHERE schedule_id = ? ORDER BY day, start_time').all(scheduleId)
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start_time.localeCompare(b.start_time));

  const state = new Map(employees.map((employee) => [employee.id, {
    hours: 0,
    count: 0,
    undesirable: 0,
    assignments: []
  }]));

  const existing = db.prepare(`
    SELECT shift_assignments.*, shifts.day, shifts.start_time, shifts.end_time, shifts.desirability
    FROM shift_assignments
    JOIN shifts ON shifts.id = shift_assignments.shift_id
    WHERE shifts.schedule_id = ?
  `).all(scheduleId);

  for (const row of existing) {
    const employeeState = state.get(row.employee_id);
    if (!employeeState) continue;
    const hours = hoursBetween(row.start_time, row.end_time);
    employeeState.hours += hours;
    employeeState.count += 1;
    if (row.desirability <= 2) employeeState.undesirable += 1;
    employeeState.assignments.push(row);
  }

  const assignments = [];
  const clear = db.prepare('DELETE FROM shift_assignments WHERE shift_id = ?');
  const insert = db.prepare(`
    INSERT INTO shift_assignments (shift_id, employee_id, assigned_by, updated_by)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const shift of shifts) {
      clear.run(shift.id);
      const chosen = new Set();

      for (let slot = 0; slot < shift.required_count; slot += 1) {
        const candidate = pickCandidate({ employees, shift, state, chosen, mode });
        if (!candidate) break;

        chosen.add(candidate.id);
        const employeeState = state.get(candidate.id);
        const hours = hoursBetween(shift.start_time, shift.end_time);
        employeeState.hours += hours;
        employeeState.count += 1;
        if (shift.desirability <= 2) employeeState.undesirable += 1;
        employeeState.assignments.push(shift);
        insert.run(shift.id, candidate.id, actorUserId, actorUserId);
        assignments.push({ shiftId: shift.id, employeeId: candidate.id });
      }
      db.prepare('UPDATE shifts SET updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(actorUserId, shift.id);
    }
  });

  tx();
  return assignments;
}

function getEmployees(locationId) {
  const employees = db.prepare('SELECT * FROM employees WHERE location_id = ? AND active = 1').all(locationId);
  return employees.map((employee) => ({
    ...employee,
    availability: db.prepare('SELECT day, start_time, end_time FROM employee_availability WHERE employee_id = ?').all(employee.id),
    preferences: db.prepare('SELECT shift_name FROM employee_shift_preferences WHERE employee_id = ?').all(employee.id).map((row) => row.shift_name),
    restrictions: db.prepare('SELECT shift_name FROM employee_shift_restrictions WHERE employee_id = ?').all(employee.id).map((row) => row.shift_name)
  }));
}

function pickCandidate({ employees, shift, state, chosen, mode }) {
  const hours = hoursBetween(shift.start_time, shift.end_time);

  const candidates = employees
    .filter((employee) => !chosen.has(employee.id))
    .filter((employee) => isAvailable(employee, shift))
    .filter((employee) => !employee.restrictions.includes(shift.name))
    .filter((employee) => state.get(employee.id).hours + hours <= employee.max_hours_per_week)
    .filter((employee) => !hasOverlap(state.get(employee.id).assignments, shift))
    .map((employee) => ({ employee, score: scoreCandidate(employee, shift, state.get(employee.id), mode) }))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.employee ?? null;
}

function hasOverlap(assignments, shift) {
  return assignments.some((assignment) =>
    assignment.day === shift.day &&
    assignment.start_time < shift.end_time &&
    shift.start_time < assignment.end_time
  );
}

function scoreCandidate(employee, shift, employeeState, mode) {
  const seniority = employee.seniority_score / 100;
  const reliability = employee.reliability_score / 100;
  const fairness = 1 / (1 + employeeState.hours + employeeState.count * 2);
  const preference = employee.preferences.includes(shift.name) ? 0.2 : 0;
  const certification = !shift.required_certification || parseCertifications(employee.certifications).includes(shift.required_certification) ? 0.35 : -1.5;
  const undesirablePenalty = shift.desirability <= 2 ? employeeState.undesirable * 0.15 : 0;
  const overtimePressure = (employeeState.hours / employee.max_hours_per_week) * 0.2;
  const costPressure = employee.hourly_rate > 24 ? 0.08 : 0;

  if (mode === 'seniority') return seniority * 1.2 + reliability * 0.45 + fairness * 0.35 + preference + certification - undesirablePenalty - overtimePressure - costPressure;
  if (mode === 'fairness') return fairness * 1.4 + reliability * 0.45 + seniority * 0.25 + preference + certification - undesirablePenalty * 1.6 - overtimePressure - costPressure;
  return fairness * 0.85 + seniority * 0.75 + reliability * 0.55 + preference + certification - undesirablePenalty - overtimePressure - costPressure;
}

function isAvailable(employee, shift) {
  return employee.availability.some((availability) =>
    availability.day === shift.day &&
    availability.start_time <= shift.start_time &&
    availability.end_time >= shift.end_time
  );
}

export function hoursBetween(start, end) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
}

function parseCertifications(value) {
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
}
