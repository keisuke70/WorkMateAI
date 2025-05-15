-- Seed: employees  (従業員マスタ)
INSERT INTO employees (name, department) VALUES
  ('Taro Sato',      'Manufacturing'),
  ('Hanako Suzuki',  'Maintenance'),
  ('Ken Yamada',     'Quality'),
  ('Aki Tanaka',     'Production Engineering');

-- Seed: equipment  (設備マスタ)
INSERT INTO equipment (name, location) VALUES
  ('Line-1 Packer',      'Plant-1'),
  ('Line-2 Filler',      'Plant-1'),
  ('Boiler #3',          'Utility Room'),
  ('Robot Arm A-17',     'Assembly Hall');
