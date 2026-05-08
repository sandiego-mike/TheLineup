import express from 'express';
import { db } from '../db/connection.js';
import { audit, recentAudit } from '../domain/audit.js';
import { PERMISSIONS, getPermissionsForUser, getUser, requirePermission } from '../domain/permissions.js';
import { generateSchedule } from '../domain/scheduler.js';

export const apiRouter = express.Router();

apiRouter.use((req, _res, next) => {
  req.userId = Number(req.header('x-user-id') || 1);
  next();
});

apiRouter.get('/bootstrap', (req, res) => {
  const users = db.prepare(`
    SELECT users.id, users.name, users.email, roles.name AS role
    FROM users JOIN roles ON roles.id = users.role_id
    ORDER BY users.id
  `).all();
  const fallbackUserId = users[0]?.id;
  const activeUser = getUser(req.userId) ?? getUser(fallbackUserId);
  const permissions = getPermissionsForUser(activeUser.id);
  const schedule = getCurrentSchedule();

  res.json({
    activeUser,
    users,
    permissions,
    scheduleId: schedule.id,
    workspace: db.prepare(`
      SELECT organizations.name AS organization, locations.name AS location, locations.timezone
      FROM locations JOIN organizations ON organizations.id = locations.organization_id
      WHERE locations.id = ?
    `).get(schedule.location_id)
  });
});

apiRouter.get('/schedule', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.VIEW_SCHEDULE);
  const schedule = getCurrentSchedule();
  res.json(buildScheduleResponse(schedule.id));
});

apiRouter.post('/schedule/generate', (req, res) => {
  const { user } = requirePermission(req.userId, PERMISSIONS.GENERATE_SCHEDULE);
  const schedule = getCurrentSchedule();
  ensureScheduleEditable(schedule);
  const mode = ['fairness', 'balanced', 'seniority'].includes(req.body.mode) ? req.body.mode : 'balanced';
  const before = db.prepare('SELECT COUNT(*) AS count FROM shift_assignments WHERE shift_id IN (SELECT id FROM shifts WHERE schedule_id = ?)').get(schedule.id);
  const beforeByShift = assignmentNamesByShift(schedule.id);

  generateSchedule(schedule.id, mode, user.id);
  touchSchedule(schedule.id, user.id);
  const afterByShift = assignmentNamesByShift(schedule.id);
  audit({
    organizationId: schedule.organization_id,
    locationId: schedule.location_id,
    scheduleId: schedule.id,
    actorUserId: user.id,
    action: 'generated',
    entityType: 'schedule',
    entityId: schedule.id,
    fieldName: 'assignments',
    oldValue: `${before.count} assignments`,
    newValue: `generated in ${mode} mode`,
    reason: req.body.reason || `Generated using ${mode} mode`
  });

  for (const [shiftId, afterNames] of afterByShift.entries()) {
    const beforeNames = beforeByShift.get(shiftId) ?? 'Unassigned';
    if (beforeNames === afterNames) continue;
    audit({
      organizationId: schedule.organization_id,
      locationId: schedule.location_id,
      scheduleId: schedule.id,
      shiftId,
      actorUserId: user.id,
      action: 'generated',
      entityType: 'shift_assignment',
      entityId: shiftId,
      fieldName: 'assigned_employees',
      oldValue: beforeNames,
      newValue: afterNames,
      reason: req.body.reason || `Generated using ${mode} mode`
    });
  }

  res.json(buildScheduleResponse(schedule.id));
});

apiRouter.post('/schedule/publish', (req, res) => {
  const { user } = requirePermission(req.userId, PERMISSIONS.GENERATE_SCHEDULE);
  const schedule = getCurrentSchedule();
  db.prepare('UPDATE schedules SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('locked', user.id, schedule.id);
  audit({
    organizationId: schedule.organization_id,
    locationId: schedule.location_id,
    scheduleId: schedule.id,
    actorUserId: user.id,
    action: 'published',
    entityType: 'schedule',
    entityId: schedule.id,
    fieldName: 'status',
    oldValue: schedule.status,
    newValue: 'locked',
    reason: 'Published schedule and locked edits'
  });
  res.json(buildScheduleResponse(schedule.id));
});

apiRouter.post('/schedule/unlock', (req, res) => {
  const { user } = requirePermission(req.userId, PERMISSIONS.GENERATE_SCHEDULE);
  const schedule = getCurrentSchedule();
  if (!['Admin', 'Manager', 'Operations Manager'].includes(user.role_name)) {
    return res.status(403).json({ message: 'Only Admin or Operations Manager can unlock a published schedule.' });
  }
  db.prepare('UPDATE schedules SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('draft', user.id, schedule.id);
  audit({
    organizationId: schedule.organization_id,
    locationId: schedule.location_id,
    scheduleId: schedule.id,
    actorUserId: user.id,
    action: 'unlocked',
    entityType: 'schedule',
    entityId: schedule.id,
    fieldName: 'status',
    oldValue: schedule.status,
    newValue: 'draft',
    reason: 'Schedule unlocked for manager edits'
  });
  res.json(buildScheduleResponse(schedule.id));
});

apiRouter.put('/assignments/:shiftId', (req, res) => {
  const { user } = requirePermission(req.userId, PERMISSIONS.EDIT_ASSIGNMENTS);
  const shift = db.prepare(`
    SELECT shifts.*, schedules.organization_id, schedules.location_id
    FROM shifts JOIN schedules ON schedules.id = shifts.schedule_id
    WHERE shifts.id = ?
  `).get(req.params.shiftId);
  if (!shift) return res.status(404).json({ message: 'Shift not found.' });
  ensureScheduleEditable(db.prepare('SELECT * FROM schedules WHERE id = ?').get(shift.schedule_id));

  const nextEmployeeIds = Array.isArray(req.body.employeeIds)
    ? req.body.employeeIds.map(Number).filter(Boolean)
    : [];

  const conflict = findAssignmentConflict({
    scheduleId: shift.schedule_id,
    targetShift: shift,
    employeeIds: nextEmployeeIds,
    ignoredShiftId: shift.id
  });
  if (conflict) {
    return res.status(409).json({
      message: `${conflict.employeeName} is already assigned to ${conflict.department} ${periodLabel(conflict)} from ${formatClock(conflict.start_time)} – ${formatClock(conflict.end_time)}.`,
      conflict
    });
  }

  const previous = db.prepare(`
    SELECT employees.id, employees.name
    FROM shift_assignments
    JOIN employees ON employees.id = shift_assignments.employee_id
    WHERE shift_assignments.shift_id = ?
    ORDER BY employees.name
  `).all(shift.id);

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM shift_assignments WHERE shift_id = ?').run(shift.id);
    const insert = db.prepare(`
      INSERT INTO shift_assignments (shift_id, employee_id, assigned_by, updated_by)
      VALUES (?, ?, ?, ?)
    `);
    for (const employeeId of nextEmployeeIds.slice(0, shift.required_count)) {
      insert.run(shift.id, employeeId, user.id, user.id);
    }
    db.prepare('UPDATE shifts SET updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id, shift.id);
    touchSchedule(shift.schedule_id, user.id);
  });

  tx();

  const next = db.prepare(`
    SELECT employees.id, employees.name
    FROM shift_assignments
    JOIN employees ON employees.id = shift_assignments.employee_id
    WHERE shift_assignments.shift_id = ?
    ORDER BY employees.name
  `).all(shift.id);

  audit({
    organizationId: shift.organization_id,
    locationId: shift.location_id,
    scheduleId: shift.schedule_id,
    shiftId: shift.id,
    actorUserId: user.id,
    action: 'updated',
    entityType: 'shift_assignment',
    entityId: shift.id,
    fieldName: 'assigned_employees',
    oldValue: previous.map((employee) => employee.name).join(', ') || 'Unassigned',
    newValue: next.map((employee) => employee.name).join(', ') || 'Unassigned',
    reason: req.body.reason || null
  });

  res.json(buildScheduleResponse(shift.schedule_id));
});

apiRouter.put('/shifts/:shiftId', (req, res) => {
  const { user } = requirePermission(req.userId, PERMISSIONS.EDIT_ASSIGNMENTS);
  const shift = db.prepare(`
    SELECT shifts.*, schedules.organization_id, schedules.location_id
    FROM shifts JOIN schedules ON schedules.id = shifts.schedule_id
    WHERE shifts.id = ?
  `).get(req.params.shiftId);
  if (!shift) return res.status(404).json({ message: 'Shift not found.' });
  ensureScheduleEditable(db.prepare('SELECT * FROM schedules WHERE id = ?').get(shift.schedule_id));

  const startTime = normalizeTime(req.body.startTime ?? shift.start_time);
  const endTime = normalizeTime(req.body.endTime ?? shift.end_time);
  if (!startTime || !endTime) return res.status(400).json({ message: 'Start time and end time are required.' });
  if (minutes(startTime) >= minutes(endTime)) return res.status(400).json({ message: 'End time must be after start time.' });

  const targetShift = { ...shift, start_time: startTime, end_time: endTime };
  const employeeIds = db.prepare('SELECT employee_id FROM shift_assignments WHERE shift_id = ?').all(shift.id).map((row) => row.employee_id);
  const conflict = findAssignmentConflict({
    scheduleId: shift.schedule_id,
    targetShift,
    employeeIds,
    ignoredShiftId: shift.id
  });
  if (conflict) {
    return res.status(409).json({
      message: `${conflict.employeeName} would overlap with ${conflict.department} ${periodLabel(conflict)} from ${formatClock(conflict.start_time)} – ${formatClock(conflict.end_time)}.`,
      conflict
    });
  }

  db.prepare('UPDATE shifts SET start_time = ?, end_time = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(startTime, endTime, user.id, shift.id);
  touchSchedule(shift.schedule_id, user.id);
  audit({
    organizationId: shift.organization_id,
    locationId: shift.location_id,
    scheduleId: shift.schedule_id,
    shiftId: shift.id,
    actorUserId: user.id,
    action: 'updated',
    entityType: 'shift',
    entityId: shift.id,
    fieldName: 'time',
    oldValue: `${shift.start_time}-${shift.end_time}`,
    newValue: `${startTime}-${endTime}`,
    reason: req.body.reason || 'Manager edited shift time'
  });

  res.json(buildScheduleResponse(shift.schedule_id));
});

apiRouter.get('/employees', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.VIEW_SCHEDULE);
  res.json(getEmployees());
});

apiRouter.post('/employees', (req, res) => {
  const { user } = requirePermission(req.userId, PERMISSIONS.EDIT_EMPLOYEES);
  const schedule = getCurrentSchedule();
  const payload = req.body;
  const result = db.prepare(`
    INSERT INTO employees (organization_id, location_id, name, seniority_score, reliability_score, hourly_rate, certifications, max_hours_per_week, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    schedule.organization_id,
    schedule.location_id,
    payload.name,
    Number(payload.seniorityScore ?? 50),
    Number(payload.reliabilityScore ?? 80),
    Number(payload.hourlyRate ?? 18),
    JSON.stringify(payload.certifications ?? []),
    Number(payload.maxHoursPerWeek ?? 40),
    user.id,
    user.id
  );

  upsertEmployeeDetails(result.lastInsertRowid, payload);
  audit({
    organizationId: schedule.organization_id,
    locationId: schedule.location_id,
    scheduleId: schedule.id,
    actorUserId: user.id,
    action: 'created',
    entityType: 'employee',
    entityId: result.lastInsertRowid,
    fieldName: 'employee',
    oldValue: null,
    newValue: payload.name,
    reason: payload.reason || null
  });

  res.status(201).json(getEmployees());
});

apiRouter.get('/audit', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.VIEW_AUDIT);
  const schedule = getCurrentSchedule();
  res.json(recentAudit(schedule.id, 80));
});

apiRouter.get('/audit/shifts/:shiftId', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.VIEW_AUDIT);
  res.json(db.prepare(`
    SELECT audit_logs.*, users.name AS actor_name
    FROM audit_logs
    JOIN users ON users.id = audit_logs.actor_user_id
    WHERE audit_logs.shift_id = ?
    ORDER BY audit_logs.created_at DESC
  `).all(req.params.shiftId));
});

apiRouter.get('/permissions', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.VIEW_SCHEDULE);
  res.json(db.prepare(`
    SELECT roles.name AS role, permissions.key, permissions.description, role_permissions.enabled
    FROM role_permissions
    JOIN roles ON roles.id = role_permissions.role_id
    JOIN permissions ON permissions.key = role_permissions.permission_key
    ORDER BY roles.id, permissions.key
  `).all());
});

apiRouter.get('/export/text', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.EXPORT_SCHEDULE);
  const schedule = buildScheduleResponse(getCurrentSchedule().id);
  const lines = [`${schedule.workspace.location} schedule - week of ${schedule.schedule.week_start}`];
  for (const shift of schedule.shifts) {
    const names = shift.assignments.map((assignment) => assignment.employee_name).join(', ') || 'Unassigned';
    lines.push(`${shift.day} ${formatClock(shift.start_time)} – ${formatClock(shift.end_time)} ${shift.name}: ${names}`);
  }
  res.type('text/plain').send(lines.join('\n'));
});

apiRouter.get('/export/csv', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.EXPORT_SCHEDULE);
  const schedule = buildScheduleResponse(getCurrentSchedule().id);
  const lines = ['Day,Shift,Start,End,Required,Assigned,Last Modified By,Last Modified At'];
  for (const shift of schedule.shifts) {
    lines.push([
      shift.day,
      shift.name,
      formatClock(shift.start_time),
      formatClock(shift.end_time),
      shift.required_count,
      quote(shift.assignments.map((assignment) => assignment.employee_name).join('; ')),
      quote(shift.updated_by_name),
      shift.updated_at
    ].join(','));
  }
  res.type('text/csv').send(lines.join('\n'));
});

apiRouter.get('/export/json', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.EXPORT_SCHEDULE);
  const schedule = buildScheduleResponse(getCurrentSchedule().id);
  res.json(toIntegrationPayload(schedule));
});

apiRouter.get('/integrations/metadata', (req, res) => {
  requirePermission(req.userId, PERMISSIONS.VIEW_SCHEDULE);
  res.json({
    positioning: 'Lineup Ops is the operational planning layer above WFM/payroll systems.',
    supportedFutureSystems: ['UKG/Kronos', 'Workday', 'ADP', 'Dayforce', 'Blue Yonder', 'SAP Workforce', 'Oracle', 'Reflexis'],
    importCapabilities: ['employee_rosters', 'departments', 'certifications', 'shift_templates', 'labor_budgets', 'availability', 'existing_schedules'],
    exportCapabilities: ['weekly_schedules', 'shift_assignments', 'lineup_allocations', 'labor_summaries', 'staffing_coverage_reports'],
    formats: ['CSV', 'Excel-ready CSV', 'JSON', 'API-ready structure'],
    mappingKeys: ['external_employee_id', 'external_shift_id', 'department', 'role', 'certification_tags', 'schedule_metadata']
  });
});

function getCurrentSchedule() {
  return db.prepare('SELECT * FROM schedules ORDER BY week_start DESC LIMIT 1').get();
}

function buildScheduleResponse(scheduleId) {
  const schedule = db.prepare(`
    SELECT schedules.*, creator.name AS created_by_name, updater.name AS updated_by_name
    FROM schedules
    JOIN users creator ON creator.id = schedules.created_by
    JOIN users updater ON updater.id = schedules.updated_by
    WHERE schedules.id = ?
  `).get(scheduleId);

  const workspace = db.prepare(`
    SELECT organizations.name AS organization, locations.name AS location, locations.timezone
    FROM locations JOIN organizations ON organizations.id = locations.organization_id
    WHERE locations.id = ?
  `).get(schedule.location_id);

  const shifts = db.prepare(`
    SELECT shifts.*, users.name AS updated_by_name
    FROM shifts
    JOIN users ON users.id = shifts.updated_by
    WHERE schedule_id = ?
  `).all(scheduleId).map((shift) => ({
    ...shift,
    readiness: scoreShiftReadiness(shift),
    assignments: db.prepare(`
      SELECT shift_assignments.*, employees.name AS employee_name, employees.external_employee_id,
        employees.home_department, employees.seniority_score,
        employees.reliability_score, employees.hourly_rate, employees.certifications, employees.max_hours_per_week
      FROM shift_assignments
      JOIN employees ON employees.id = shift_assignments.employee_id
      WHERE shift_id = ?
      ORDER BY employees.name
    `).all(shift.id).map((assignment) => ({
      ...assignment,
      certifications: parseJson(assignment.certifications, [])
    }))
  })).sort((a, b) => dayIndex(a.day) - dayIndex(b.day) || a.start_time.localeCompare(b.start_time));

  return {
    workspace,
    schedule,
    shifts,
    employees: getEmployees(),
    coach: buildCoachInsights(scheduleId, shifts),
    audit: recentAudit(scheduleId, 30)
  };
}

function getEmployees() {
  const schedule = getCurrentSchedule();
  return db.prepare(`
    SELECT employees.*, users.name AS updated_by_name
    FROM employees
    JOIN users ON users.id = employees.updated_by
    WHERE employees.location_id = ? AND employees.active = 1
    ORDER BY employees.name
  `).all(schedule.location_id).map((employee) => ({
    ...employee,
    certifications: parseJson(employee.certifications, []),
    availability: db.prepare('SELECT day, start_time, end_time FROM employee_availability WHERE employee_id = ?').all(employee.id),
    preferredShifts: db.prepare('SELECT shift_name FROM employee_shift_preferences WHERE employee_id = ?').all(employee.id).map((row) => row.shift_name),
    restrictedShifts: db.prepare('SELECT shift_name FROM employee_shift_restrictions WHERE employee_id = ?').all(employee.id).map((row) => row.shift_name)
  }));
}

function scoreShiftReadiness(shift) {
  const assignments = db.prepare(`
    SELECT employees.*
    FROM shift_assignments
    JOIN employees ON employees.id = shift_assignments.employee_id
    WHERE shift_assignments.shift_id = ?
  `).all(shift.id);
  const fill = Math.min(assignments.length / shift.required_count, 1);
  const reliability = assignments.length
    ? assignments.reduce((sum, employee) => sum + employee.reliability_score, 0) / assignments.length / 100
    : 0;
  const hasCertification = !shift.required_certification || assignments.some((employee) =>
    parseJson(employee.certifications, []).includes(shift.required_certification)
  );
  const certificationScore = hasCertification ? 1 : 0;
  const labor = estimateLaborCost(shift, assignments);
  const budgetScore = shift.labor_budget ? Math.max(0, Math.min(1, 1 - Math.max(0, labor - shift.labor_budget) / shift.labor_budget)) : 1;
  return Math.round((fill * 45) + (reliability * 25) + (certificationScore * 20) + (budgetScore * 10));
}

function buildCoachInsights(_scheduleId, shifts) {
  const insights = [];
  for (const shift of shifts) {
    const assigned = shift.assignments.length;
    const certified = !shift.required_certification || shift.assignments.some((assignment) =>
      assignment.certifications.includes(shift.required_certification)
    );
    const laborCost = estimateLaborCost(shift, shift.assignments);
    if (assigned < shift.required_count) {
      insights.push({
        severity: 'Critical',
        level: 'urgent',
        title: 'Coverage Hole',
        message: `${shift.name} on ${shift.day} has ${shift.required_count - assigned} open roster ${shift.required_count - assigned === 1 ? 'spot' : 'spots'}.`,
        suggestedFix: `Assign a ${shift.required_certification ?? 'qualified'} employee before publishing.`,
        impact: 'High',
        shiftId: shift.id
      });
    }
    if (!certified) {
      insights.push({
        severity: 'Warning',
        level: 'watch',
        title: 'No Certified Backup',
        message: `${shift.name} has no ${shift.required_certification}-certified employee assigned.`,
        suggestedFix: `Move a ${shift.required_certification}-certified employee into this shift or add one as backup.`,
        impact: 'Medium',
        shiftId: shift.id
      });
    }
    if (assigned === shift.required_count && assigned <= 2) {
      insights.push({
        severity: 'Warning',
        level: 'watch',
        title: 'Thin Backup Depth',
        message: `${shift.name} becomes vulnerable if 1 employee calls out.`,
        suggestedFix: 'Add one cross-trained backup if labor budget allows.',
        impact: 'Medium',
        shiftId: shift.id
      });
    }
    if (shift.labor_budget && laborCost > shift.labor_budget) {
      insights.push({
        severity: 'Warning',
        level: 'watch',
        title: 'Labor Budget Pressure',
        message: `${shift.name} is projected at $${Math.round(laborCost)} vs $${Math.round(shift.labor_budget)} target.`,
        suggestedFix: 'Review hourly mix or move a lower-cost qualified employee.',
        impact: 'Medium',
        shiftId: shift.id
      });
    }
    if (shift.readiness >= 85) {
      insights.push({
        severity: 'Opportunity',
        level: 'good',
        title: 'Strong Coverage',
        message: `${shift.name} on ${shift.day} is ready with strong coverage.`,
        suggestedFix: 'No action needed.',
        impact: 'Low',
        shiftId: shift.id
      });
    }
  }
  return insights.slice(0, 8);
}

function estimateLaborCost(shift, assignments) {
  const [startHour, startMinute] = shift.start_time.split(':').map(Number);
  const [endHour, endMinute] = shift.end_time.split(':').map(Number);
  const hours = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
  return assignments.reduce((sum, employee) => sum + (employee.hourly_rate * hours), 0);
}

function findAssignmentConflict({ scheduleId, targetShift, employeeIds, ignoredShiftId }) {
  const uniqueEmployeeIds = Array.from(new Set(employeeIds));
  if (uniqueEmployeeIds.length !== employeeIds.length) {
    const duplicateId = employeeIds.find((id, index) => employeeIds.indexOf(id) !== index);
    const employee = db.prepare('SELECT name FROM employees WHERE id = ?').get(duplicateId);
    return {
      employeeId: duplicateId,
      employeeName: employee?.name ?? 'This employee',
      department: targetShift.name,
      day: targetShift.day,
      start_time: targetShift.start_time,
      end_time: targetShift.end_time
    };
  }

  if (!uniqueEmployeeIds.length) return null;
  const rows = db.prepare(`
    SELECT employees.id AS employeeId, employees.name AS employeeName,
      shifts.id AS shiftId, shifts.name AS department, shifts.day, shifts.start_time, shifts.end_time
    FROM shift_assignments
    JOIN shifts ON shifts.id = shift_assignments.shift_id
    JOIN employees ON employees.id = shift_assignments.employee_id
    WHERE shifts.schedule_id = ?
      AND shifts.id != ?
      AND shift_assignments.employee_id IN (${uniqueEmployeeIds.map(() => '?').join(',')})
  `).all(scheduleId, ignoredShiftId, ...uniqueEmployeeIds);

  return rows.find((row) =>
    row.day === targetShift.day &&
    rangesOverlap(targetShift.start_time, targetShift.end_time, row.start_time, row.end_time)
  ) ?? null;
}

function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return minutes(firstStart) < minutes(secondEnd) && minutes(secondStart) < minutes(firstEnd);
}

function normalizeTime(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return null;
  const suffix = match[3]?.toUpperCase();
  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    if (suffix === 'PM' && hour !== 12) hour += 12;
    if (suffix === 'AM' && hour === 12) hour = 0;
  }
  if (hour > 23) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function minutes(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function formatClock(value) {
  const [hourText, minute] = value.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

function periodLabel(shift) {
  const hour = Number(shift.start_time.split(':')[0]);
  if (hour < 12) return 'AM';
  if (hour < 16) return 'MID';
  return 'PM';
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function upsertEmployeeDetails(employeeId, payload) {
  const availability = payload.availability?.length ? payload.availability : [
    { day: 'Monday', startTime: '08:00', endTime: '18:00' },
    { day: 'Tuesday', startTime: '08:00', endTime: '18:00' },
    { day: 'Wednesday', startTime: '08:00', endTime: '18:00' },
    { day: 'Thursday', startTime: '08:00', endTime: '18:00' },
    { day: 'Friday', startTime: '08:00', endTime: '18:00' }
  ];
  const insertAvailability = db.prepare('INSERT INTO employee_availability (employee_id, day, start_time, end_time) VALUES (?, ?, ?, ?)');
  for (const item of availability) {
    insertAvailability.run(employeeId, item.day, item.startTime, item.endTime);
  }
  const insertPreference = db.prepare('INSERT OR IGNORE INTO employee_shift_preferences (employee_id, shift_name) VALUES (?, ?)');
  for (const shiftName of payload.preferredShifts ?? []) insertPreference.run(employeeId, shiftName);
  const insertRestriction = db.prepare('INSERT OR IGNORE INTO employee_shift_restrictions (employee_id, shift_name) VALUES (?, ?)');
  for (const shiftName of payload.restrictedShifts ?? []) insertRestriction.run(employeeId, shiftName);
}

function touchSchedule(scheduleId, userId) {
  db.prepare('UPDATE schedules SET updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(userId, scheduleId);
}

function assignmentNamesByShift(scheduleId) {
  const rows = db.prepare(`
    SELECT shifts.id AS shift_id, employees.name AS employee_name
    FROM shifts
    LEFT JOIN shift_assignments ON shift_assignments.shift_id = shifts.id
    LEFT JOIN employees ON employees.id = shift_assignments.employee_id
    WHERE shifts.schedule_id = ?
    ORDER BY shifts.id, employees.name
  `).all(scheduleId);
  const map = new Map();
  for (const row of rows) {
    const current = map.get(row.shift_id) ?? [];
    if (row.employee_name) current.push(row.employee_name);
    map.set(row.shift_id, current);
  }
  return new Map(Array.from(map.entries()).map(([shiftId, names]) => [shiftId, names.join(', ') || 'Unassigned']));
}

function dayIndex(day) {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
}

function quote(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function toIntegrationPayload(schedule) {
  return {
    source: 'Lineup Ops',
    purpose: 'planning_layer_export',
    targetSystems: ['UKG/Kronos', 'Workday', 'ADP', 'Dayforce', 'Blue Yonder', 'SAP Workforce', 'Oracle', 'Reflexis'],
    workspace: schedule.workspace,
    weekStart: schedule.schedule.week_start,
    status: schedule.schedule.status,
    exportedAt: new Date().toISOString(),
    employees: schedule.employees.map((employee) => ({
      lineupsOpsEmployeeId: employee.id,
      externalEmployeeId: employee.external_employee_id,
      name: employee.name,
      homeDepartment: employee.home_department,
      certifications: employee.certifications,
      maxHoursPerWeek: employee.max_hours_per_week
    })),
    shifts: schedule.shifts.map((shift) => ({
      lineupOpsShiftId: shift.id,
      externalShiftId: shift.external_shift_id,
      department: shift.name,
      day: shift.day,
      startTime: formatClock(shift.start_time),
      endTime: formatClock(shift.end_time),
      requiredRole: shift.required_certification,
      requiredCount: shift.required_count,
      laborBudget: shift.labor_budget,
      readiness: shift.readiness,
      assignments: shift.assignments.map((assignment) => ({
        employeeId: assignment.employee_id,
        externalEmployeeId: assignment.external_employee_id,
        name: assignment.employee_name,
        certifications: assignment.certifications
      }))
    }))
  };
}

function ensureScheduleEditable(schedule) {
  if (schedule?.status === 'locked') {
    const error = new Error('This schedule is locked. An Admin or Operations Manager must unlock it before edits.');
    error.status = 423;
    throw error;
  }
}
