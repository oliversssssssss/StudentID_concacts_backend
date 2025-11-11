/* 初始化数据库与表（幂等，不会破坏已有数据结构） */

CREATE DATABASE IF NOT EXISTS student_management
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE student_management;

CREATE TABLE IF NOT EXISTS contacts (
                                        id         INT PRIMARY KEY AUTO_INCREMENT,
                                        name       VARCHAR(100)  NOT NULL,
    phone      VARCHAR(32)   NOT NULL,
    email      VARCHAR(120)  NULL,
    note       VARCHAR(255)  NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contacts_phone UNIQUE (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* 触发器：写入前规范化 phone（去空格/短横/括号/点），与后端一致 */
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS trg_contacts_bi
BEFORE INSERT ON contacts FOR EACH ROW
BEGIN
  SET NEW.phone = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.','');
END$$

CREATE TRIGGER IF NOT EXISTS trg_contacts_bu
BEFORE UPDATE ON contacts FOR EACH ROW
BEGIN
  SET NEW.phone = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(NEW.phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.','');
END$$

DELIMITER ;
