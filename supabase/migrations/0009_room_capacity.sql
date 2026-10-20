alter table rooms
  add column if not exists capacity integer check (capacity is null or capacity >= 0);
