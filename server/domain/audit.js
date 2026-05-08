import { db } from '../db/connection.js';

export function audit({
  organizationId,
  locationId = null,
  scheduleId = null,
  shiftId = null,
  actorUserId,
  action,
  entityType,
  entityId = null,
  fieldName = null,
  oldValue = null,
  newValue = null,
  reason = null
}) {
  db.prepare(`
    INSERT INTO audit_logs (
      organization_id, location_id, schedule_id, shift_id, actor_user_id,
      action, entity_type, entity_id, field_name, old_value, new_value, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    organizationId,
    locationId,
    scheduleId,
    shiftId,
    actorUserId,
    action,
    entityType,
    entityId,
    fieldName,
    serialize(oldValue),
    serialize(newValue),
    reason
  );
}

export function serialize(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function recentAudit(scheduleId, limit = 30) {
  return db.prepare(`
    SELECT audit_logs.*, users.name AS actor_name
    FROM audit_logs
    JOIN users ON users.id = audit_logs.actor_user_id
    WHERE audit_logs.schedule_id = ?
    ORDER BY audit_logs.created_at DESC
    LIMIT ?
  `).all(scheduleId, limit);
}
