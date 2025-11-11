USE student_management;

-- 检查列是否存在
SET @has_group := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contacts' AND COLUMN_NAME='group_name'
);
SET @has_black := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contacts' AND COLUMN_NAME='is_blacklisted'
);

-- 按需新增列
SET @sql1 := IF(@has_group=0,
  'ALTER TABLE contacts ADD COLUMN group_name VARCHAR(50) NULL AFTER email;',
  'SELECT "group_name exists";'
);
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @sql2 := IF(@has_black=0,
  'ALTER TABLE contacts ADD COLUMN is_blacklisted TINYINT(1) NOT NULL DEFAULT 0 AFTER group_name;',
  'SELECT "is_blacklisted exists";'
);
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

-- 索引同理（先查后建）
SET @has_idx_group := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contacts' AND INDEX_NAME='idx_contacts_group_name'
);
SET @has_idx_black := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contacts' AND INDEX_NAME='idx_contacts_blacklisted'
);

SET @sql3 := IF(@has_idx_group=0,
  'CREATE INDEX idx_contacts_group_name ON contacts(group_name);',
  'SELECT "idx_contacts_group_name exists";'
);
PREPARE s3 FROM @sql3; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @sql4 := IF(@has_idx_black=0,
  'CREATE INDEX idx_contacts_blacklisted ON contacts(is_blacklisted);',
  'SELECT "idx_contacts_blacklisted exists";'
);
PREPARE s4 FROM @sql4; EXECUTE s4; DEALLOCATE PREPARE s4;
