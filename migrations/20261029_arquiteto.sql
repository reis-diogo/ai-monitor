alter table professionals
  add column if not exists is_architect boolean not null default false;
