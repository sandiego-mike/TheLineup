import { db } from '../db/connection.js';

export const PERMISSIONS = {
  VIEW_SCHEDULE: 'schedule:view',
  GENERATE_SCHEDULE: 'schedule:generate',
  EDIT_ASSIGNMENTS: 'assignment:edit',
  EDIT_SHIFTS: 'shift:edit',
  EDIT_EMPLOYEES: 'employee:edit',
  VIEW_AUDIT: 'audit:view',
  EXPORT_SCHEDULE: 'schedule:export',
  MANAGE_ROLES: 'roles:manage',
  MANAGE_USERS: 'users:manage'
};

export function getUser(userId) {
  return db.prepare(`
    SELECT users.*, roles.name AS role_name
    FROM users
    JOIN roles ON roles.id = users.role_id
    WHERE users.id = ? AND users.active = 1
  `).get(userId);
}

export function getPermissionsForUser(userId) {
  return db.prepare(`
    SELECT permission_key
    FROM role_permissions
    JOIN users ON users.role_id = role_permissions.role_id
    WHERE users.id = ? AND role_permissions.enabled = 1
  `).all(userId).map((row) => row.permission_key);
}

export function requirePermission(userId, permissionKey) {
  const user = getUser(userId);
  if (!user) {
    const error = new Error('A signed-in user is required.');
    error.status = 401;
    throw error;
  }

  const permissions = getPermissionsForUser(userId);
  if (!permissions.includes(permissionKey)) {
    const error = new Error('This role does not have permission for that action.');
    error.status = 403;
    throw error;
  }

  return { user, permissions };
}

export function can(userId, permissionKey) {
  return getPermissionsForUser(userId).includes(permissionKey);
}
