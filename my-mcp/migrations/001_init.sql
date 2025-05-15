-- Master tables
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department TEXT
);

CREATE TABLE equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT
);

-- 1) Daily work reports
CREATE TABLE daily_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,                 -- YYYY-MM-DD
  employee_id INTEGER REFERENCES employees(id),
  work_plan   TEXT,
  work_result TEXT,
  issues      TEXT,
  next_plan   TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2) Inspection logs
CREATE TABLE inspection_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER REFERENCES equipment(id),
  inspect_date TEXT NOT NULL,                -- YYYY-MM-DD
  inspect_by   INTEGER REFERENCES employees(id),
  result       TEXT,                         -- e.g. "OK", "Needs-Fix"
  notes        TEXT,
  next_schedule TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3) Anomaly reports
CREATE TABLE anomaly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER REFERENCES equipment(id),
  occurred_at  TEXT NOT NULL,                -- ISO timestamp
  reported_by  INTEGER REFERENCES employees(id),
  title        TEXT,
  description  TEXT,
  cause        TEXT,
  action       TEXT,
  resolved_at  TEXT,
  severity     INTEGER,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indices
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX idx_inspection_logs_equipment_date
  ON inspection_logs(equipment_id, inspect_date);
CREATE INDEX idx_anomaly_reports_equipment_time
  ON anomaly_reports(equipment_id, occurred_at DESC);
