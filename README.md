# Lineup Ops

Lineup Ops is a lean MVP workforce scheduling app for warehouse and retail operations. It is the operational planning layer above systems like UKG/Kronos, Workday, ADP, Dayforce, Blue Yonder, SAP Workforce, Oracle, and Reflexis: managers build better schedules visually in Lineup Ops, then export, sync, or transfer finalized schedules into official systems.

## Product Spec

### What Makes It Different

- **Schedule faster:** one weekly workspace, one Generate button, three clear generation modes.
- **Operations-first UX:** employees appear as roster cards with role, skills, reliability, cost, availability, and current hour pressure.
- **AI Recommendations:** the app flags coverage holes, missing certifications, callout vulnerability, labor pressure, and strong lineups in plain operational language.
- **Two core modes:** Weekly Operations View for command-center planning, and Tactical Lineup Builder for fantasy-lineup-style drag/drop staffing.
- **Integration-ready exports:** CSV, Excel-ready CSV, JSON, and API-ready structures with employee IDs, shift IDs, departments, roles, certifications, labor budgets, and assignments.
- **Collaborate without confusion:** all managers see the same schedule, last editor, and recent activity.
- **Trust every edit:** schedule and shift changes are attributed to a named user with old value, new value, timestamp, and optional reason.
- **Balance tradeoffs explicitly:** managers choose `fairness`, `balanced`, or `seniority` while the engine also accounts for reliability, certifications, overtime pressure, and labor cost.
- **Simple role model:** Admin, Manager, Trusted Employee, and Employee are visible and configurable from a compact permissions panel.

### MVP User Flow

1. Add or review team members with availability, priority score, reliability, certifications, hourly rate, max hours, preferred shifts, and restricted shifts.
2. Define weekly shift requirements with required certifications, headcount, desirability, and labor budget.
3. Pick a generation mode and generate the lineup.
4. Drag roster cards into shift lineups or remove players from a shift card.
5. Share by workspace, CSV, print, or copy/paste text.
6. Scan coach notes, readiness scores, and per-shift history to see exactly who changed what.
7. Export or sync the finalized plan into the official WFM/payroll system.

### Version 1 Scope

- One seeded organization and one location.
- Shared weekly schedule.
- Role-based permissions.
- Rule-based schedule generation.
- Drag-and-drop lineup editing.
- Shift readiness scores, staffing heat indicators, certification badges, labor budget warnings, and overtime pressure.
- Audit log for schedule creation, schedule generation, shift updates, and assignment changes.
- CSV and copy/paste export.
- Mobile-friendly responsive layout.

## Technical Architecture

### Stack

- **Frontend:** React with Vite
- **Backend:** Node.js with Express
- **Database:** SQLite via `better-sqlite3`
- **Architecture:** small modular API with separate scheduling, permissions, audit, and data layers

### Folder Structure

```text
server/
  db/
    connection.js
    schema.sql
  domain/
    audit.js
    permissions.js
    scheduler.js
  routes/
    api.js
  scripts/
    seed.js
src/
  api/
    client.js
  components/
  App.jsx
  main.jsx
  styles.css
```

## Database Schema

Core tables:

- `organizations`, `locations`
- `users`, `roles`, `role_permissions`, `user_locations`
- `employees`, including seniority score, reliability score, hourly rate, certifications, max hours, availability, preferences, and restrictions
- `schedules`, `shifts`, `shift_assignments`
- `audit_logs`

Audit fields include actor, entity, action, field name, old value, new value, timestamp, and optional reason.

## Permission Model

Default permissions:

| Role | Key Capabilities |
| --- | --- |
| Admin | manage roles, manage users, edit employees, edit shifts, generate schedules, edit assignments, view audit, export |
| Manager | edit employees, edit shifts, generate schedules, edit assignments, view audit, export |
| Trusted Employee | view schedule, request/edit assignment only when granted, view limited history |
| Employee | view schedule |

The permission engine is intentionally centralized in `server/domain/permissions.js`, so future approval workflows and field-level permissions can be added without rewriting the UI.

## Scheduling Logic

The generator:

- Filters employees by availability, restricted shifts, and remaining weekly hours.
- Scores candidates per shift using seniority, fairness, reliability, certification match, preferences, overtime pressure, undesirable-shift burden, and labor cost pressure.
- Fills each required headcount one assignment at a time.
- Tracks hours, undesirable shift burden, and assignment count.
- Calculates readiness for every shift from coverage, reliability, certification coverage, and labor budget health.
- Supports three modes:
  - `fairness`: favors lower assigned hours and avoids repeatedly assigning undesirable shifts.
  - `seniority`: favors higher priority score.
  - `balanced`: blends seniority with fairness.

## UI Wireframe

The first screen is an operations lineup board, not a spreadsheet:

- **Compact header:** Costco Warehouse #1123, Seattle, week, status, active manager, publish/unlock controls.
- **Operational KPI row:** slots filled, operational readiness, certification coverage, and last updated by/time.
- **Roster panel:** draggable employee cards with initials, certification badges, reliability, seniority, hourly rate, and assigned hours.
- **Lineup board:** day lanes with shift cards. Each shift shows readiness, open roster spots, assigned team members, certification coverage, labor budget, and last editor.
- **AI Recommendations panel:** severity, issue title, explanation, suggested fix, impact, view shift, and apply suggestion affordance.

The goal is to reduce manager stress by making weak spots visually obvious before the schedule is shared.

## Future-Ready Hooks

The MVP keeps boundaries ready for:

- payroll/time-clock imports
- AI suggestions
- call-out replacements
- recurring templates
- multiple locations
- labor cost optimization
- notifications
- approvals

## Local Setup

```bash
npm install
npm run seed
npm run dev
```

Open the web app at `http://localhost:5173`. The API runs at `http://localhost:3001`.

Seeded demo users:

- `Maya Chen` - Admin
- `Jordan Miles` - Manager
- `Ari Patel` - Trusted Employee
- `Sam Rivera` - Employee

The app uses `x-user-id` internally for the demo user switcher so every change is attributed to a real user.
