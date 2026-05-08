import { db, migrate } from '../db/connection.js';
import { audit } from '../domain/audit.js';
import { PERMISSIONS } from '../domain/permissions.js';
import { generateSchedule } from '../domain/scheduler.js';

migrate();
db.exec(`
  DELETE FROM audit_logs;
  DELETE FROM shift_assignments;
  DELETE FROM shifts;
  DELETE FROM schedules;
  DELETE FROM employee_shift_restrictions;
  DELETE FROM employee_shift_preferences;
  DELETE FROM employee_availability;
  DELETE FROM employees;
  DELETE FROM user_locations;
  DELETE FROM users;
  DELETE FROM role_permissions;
  DELETE FROM permissions;
  DELETE FROM roles;
  DELETE FROM locations;
  DELETE FROM organizations;
  DELETE FROM sqlite_sequence;
`);

const orgId = db.prepare('INSERT INTO organizations (name) VALUES (?)').run('Costco Warehouse #1123').lastInsertRowid;
const locationId = db.prepare('INSERT INTO locations (organization_id, name) VALUES (?, ?)').run(orgId, 'Seattle, WA').lastInsertRowid;

const roles = [
  ['Admin', 'Owns setup, users, publishing, and schedule controls.'],
  ['Operations Manager', 'Creates, publishes, unlocks, and updates schedules.'],
  ['Department Manager', 'Creates and updates department lineups.'],
  ['Trusted Employee', 'Can help with assigned scheduling tasks when allowed.'],
  ['Employee', 'Views the shared schedule.']
];
for (const [name, description] of roles) db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)').run(name, description);

const permissions = [
  [PERMISSIONS.VIEW_SCHEDULE, 'View the shared schedule.'],
  [PERMISSIONS.GENERATE_SCHEDULE, 'Generate schedules.'],
  [PERMISSIONS.EDIT_ASSIGNMENTS, 'Edit assigned employees.'],
  [PERMISSIONS.EDIT_SHIFTS, 'Create and edit shift requirements.'],
  [PERMISSIONS.EDIT_EMPLOYEES, 'Create and edit employees.'],
  [PERMISSIONS.VIEW_AUDIT, 'View audit history.'],
  [PERMISSIONS.EXPORT_SCHEDULE, 'Export schedules.'],
  [PERMISSIONS.MANAGE_ROLES, 'Change role capabilities.'],
  [PERMISSIONS.MANAGE_USERS, 'Invite and manage users.']
];
for (const [key, description] of permissions) db.prepare('INSERT INTO permissions (key, description) VALUES (?, ?)').run(key, description);

const roleId = (name) => db.prepare('SELECT id FROM roles WHERE name = ?').get(name).id;
const grant = (role, keys) => {
  const id = roleId(role);
  for (const key of keys) db.prepare('INSERT INTO role_permissions (role_id, permission_key, enabled) VALUES (?, ?, 1)').run(id, key);
};

grant('Admin', Object.values(PERMISSIONS));
grant('Operations Manager', [
  PERMISSIONS.VIEW_SCHEDULE,
  PERMISSIONS.GENERATE_SCHEDULE,
  PERMISSIONS.EDIT_ASSIGNMENTS,
  PERMISSIONS.EDIT_SHIFTS,
  PERMISSIONS.EDIT_EMPLOYEES,
  PERMISSIONS.VIEW_AUDIT,
  PERMISSIONS.EXPORT_SCHEDULE
]);
grant('Department Manager', [
  PERMISSIONS.VIEW_SCHEDULE,
  PERMISSIONS.GENERATE_SCHEDULE,
  PERMISSIONS.EDIT_ASSIGNMENTS,
  PERMISSIONS.EDIT_SHIFTS,
  PERMISSIONS.EDIT_EMPLOYEES,
  PERMISSIONS.VIEW_AUDIT,
  PERMISSIONS.EXPORT_SCHEDULE
]);
grant('Trusted Employee', [PERMISSIONS.VIEW_SCHEDULE, PERMISSIONS.EDIT_ASSIGNMENTS, PERMISSIONS.EXPORT_SCHEDULE]);
grant('Employee', [PERMISSIONS.VIEW_SCHEDULE]);

const users = [
  ['Maya Chen', 'maya.chen@costco.example', 'Admin'],
  ['Jason Miller', 'jason.miller@costco.example', 'Operations Manager'],
  ['Hector Arias', 'hector.arias@costco.example', 'Department Manager'],
  ['Maria Santos', 'maria.santos@costco.example', 'Department Manager'],
  ['Alicia Martinez', 'alicia.martinez@costco.example', 'Trusted Employee']
];
const userIds = new Map();
for (const [name, email, role] of users) {
  const userId = db.prepare('INSERT INTO users (organization_id, role_id, name, email) VALUES (?, ?, ?, ?)').run(orgId, roleId(role), name, email).lastInsertRowid;
  userIds.set(name, userId);
  db.prepare('INSERT INTO user_locations (user_id, location_id) VALUES (?, ?)').run(userId, locationId);
}

const adminId = userIds.get('Maya Chen');
const scheduleId = db.prepare(`
  INSERT INTO schedules (organization_id, location_id, week_start, created_by, updated_by)
  VALUES (?, ?, ?, ?, ?)
`).run(orgId, locationId, '2026-05-11', adminId, adminId).lastInsertRowid;

const employees = [
  ['Elena Brooks', 92, 92, 27, ['Lead', 'Cashier', 'Front End', 'Self Checkout'], 40, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], ['Front End'], ['Night Merchandising']],
  ['Marcus Lee', 84, 91, 25, ['Receiving', 'Forklift', 'Closing'], 34, ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'], ['Receiving'], []],
  ['Grace Kim', 76, 88, 23, ['Cashier', 'Membership', 'Front End'], 29, ['Monday', 'Wednesday', 'Friday'], ['Front End'], []],
  ['Nina Shah', 71, 86, 22, ['Deli', 'Closing', 'Morning Prep'], 30, ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'], ['Deli'], []],
  ['Owen Carter', 63, 79, 21, ['Forklift', 'Stocking', 'Receiving'], 28, ['Wednesday', 'Thursday', 'Friday', 'Saturday'], ['Stocking'], []],
  ['Theo Adams', 58, 81, 20, ['Bakery', 'Morning Prep', 'Stocking'], 30, ['Monday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], ['Bakery'], []],
  ['Alicia Martinez', 66, 90, 24, ['Front End', 'Cashier', 'Membership', 'Trusted'], 40, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], ['Front End'], []],
  ['Jason Miller', 95, 96, 31, ['Operations Manager', 'Forklift', 'Receiving', 'Front End'], 40, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], ['Front End'], []],
  ['Maria Santos', 88, 94, 29, ['Department Manager', 'Deli', 'Bakery', 'Morning Prep'], 38, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], ['Deli'], []],
  ['David Lee', 52, 77, 20, ['Tire Center', 'Stocking', 'Forklift'], 26, ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'], ['Tire Center'], []],
  ['Tanya Roberts', 61, 83, 22, ['Membership', 'Cashier', 'Self Checkout', 'Front End'], 29, ['Tuesday', 'Thursday', 'Saturday', 'Sunday'], ['Front End'], []],
  ['Luis Moreno', 49, 74, 21, ['Night Merchandising', 'Stocking', 'Closing'], 30, ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'], ['Night Merchandising'], []],
  ['Chris Johnson', 57, 82, 21, ['Cart Runner', 'Stocking', 'Front End'], 29, ['Saturday', 'Sunday', 'Monday'], ['Front End'], []],
  ['Taylor Nguyen', 70, 89, 24, ['Closing Support', 'Cashier', 'Front End'], 40, ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], ['Front End'], []]
];

for (const [name, seniority, reliability, hourlyRate, certifications, maxHours, days, preferred, restricted] of employees) {
  const employeeId = db.prepare(`
    INSERT INTO employees (organization_id, location_id, name, external_employee_id, home_department, seniority_score, reliability_score, hourly_rate, certifications, max_hours_per_week, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orgId, locationId, name, employeeExternalId(name), preferred[0] ?? certifications[0], seniority, reliability, hourlyRate, JSON.stringify(certifications), maxHours, adminId, adminId).lastInsertRowid;
  for (const day of days) {
    const fixed = name === 'Grace Kim';
    db.prepare('INSERT INTO employee_availability (employee_id, day, start_time, end_time) VALUES (?, ?, ?, ?)').run(employeeId, day, fixed ? '10:00' : '05:00', fixed ? '18:00' : '23:00');
  }
  for (const shiftName of preferred) db.prepare('INSERT INTO employee_shift_preferences (employee_id, shift_name) VALUES (?, ?)').run(employeeId, shiftName);
  for (const shiftName of restricted) db.prepare('INSERT INTO employee_shift_restrictions (employee_id, shift_name) VALUES (?, ?)').run(employeeId, shiftName);
}

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const departmentShiftPlans = [
  { name: 'Front End', requiredCertification: 'Cashier', shifts: [['06:00', '14:00', 7, 3, 1320], ['10:00', '18:00', 5, 3, 980], ['14:00', '22:00', 6, 2, 1180]] },
  { name: 'Receiving', requiredCertification: 'Forklift', shifts: [['06:00', '14:00', 5, 3, 980], ['14:00', '22:00', 4, 2, 820]] },
  { name: 'Stocking', requiredCertification: 'Stocking', shifts: [['06:00', '12:00', 4, 3, 560], ['12:00', '20:00', 3, 3, 620]] },
  { name: 'Bakery', requiredCertification: 'Bakery', shifts: [['05:00', '13:00', 3, 4, 560], ['13:00', '21:00', 2, 3, 380]] },
  { name: 'Deli', requiredCertification: 'Deli', shifts: [['07:00', '15:00', 3, 3, 600], ['15:00', '22:00', 3, 2, 540]] },
  { name: 'Membership', requiredCertification: 'Membership', shifts: [['08:00', '16:00', 3, 4, 600], ['12:00', '20:00', 2, 3, 420]] },
  { name: 'Tire Center', requiredCertification: 'Tire Center', shifts: [['08:00', '16:00', 2, 3, 380], ['12:00', '20:00', 2, 3, 360]] },
  { name: 'Night Merchandising', requiredCertification: 'Night Merchandising', shifts: [['18:00', '23:00', 3, 2, 360]] },
  { name: 'Morning Prep', requiredCertification: 'Morning Prep', shifts: [['05:00', '11:00', 3, 4, 420]] },
  { name: 'Closing', requiredCertification: 'Closing', shifts: [['16:00', '22:00', 3, 1, 430]] }
];

const shifts = weekDays.flatMap((day) => departmentShiftPlans.flatMap((department) => (
  department.shifts.map(([start, end, requiredCount, desirability, laborBudget]) => [
    department.name,
    day,
    start,
    end,
    requiredCount,
    desirability,
    department.requiredCertification,
    laborBudget
  ])
)));

for (const shift of shifts) {
  db.prepare(`
    INSERT INTO shifts (schedule_id, external_shift_id, name, day, start_time, end_time, required_count, desirability, required_certification, labor_budget, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(scheduleId, shiftExternalId(shift), ...shift, adminId);
}

generateSchedule(scheduleId, 'balanced', adminId);

audit({
  organizationId: orgId,
  locationId,
  scheduleId,
  actorUserId: adminId,
  action: 'created',
  entityType: 'schedule',
  entityId: scheduleId,
  fieldName: 'week_start',
  oldValue: null,
  newValue: '2026-05-11',
  reason: 'Initial seeded schedule'
});

console.log('Seeded Lineup Ops demo data.');

function employeeExternalId(name) {
  return `CST-${name.toUpperCase().replace(/[^A-Z]+/g, '-').replace(/-$/, '')}`;
}

function shiftExternalId(shift) {
  return `SHIFT-${shift[1].slice(0, 3).toUpperCase()}-${shift[0].toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${shift[2].replace(':', '')}`;
}
