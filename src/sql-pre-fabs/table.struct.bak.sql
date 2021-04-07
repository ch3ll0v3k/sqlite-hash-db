CREATE TABLE IF NOT EXISTS data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_parts varchar(255) NOT NULL DEFAULT '',
  art_brands varchar(255) NOT NULL DEFAULT '',
  art_code_parts varchar(255) NOT NULL DEFAULT '',
  ttc_art_id varchar(255) NOT NULL DEFAULT '',
  brands varchar(255) NOT NULL DEFAULT '',
  code_parts varchar(255) NOT NULL DEFAULT '',
  code_parts_advanced varchar(255) NOT NULL DEFAULT ''
)
