alter table public.join_applications
  add column if not exists committees text[] not null default '{}';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'join_applications'
      and column_name = 'interest'
  ) then
    update public.join_applications
    set committees = case interest
      when 'OC' then array['OC']::text[]
      when 'Projects' then array['Tech']::text[]
      when 'Events & media' then array['Media']::text[]
      else array['OC']::text[]
    end
    where cardinality(committees) = 0;
  end if;
end $$;

alter table public.join_applications
  drop constraint if exists join_applications_interest_check;

alter table public.join_applications
  drop column if exists interest;

alter table public.join_applications
  drop constraint if exists join_applications_committees_check;

alter table public.join_applications
  add constraint join_applications_committees_check check (
    cardinality(committees) between 1 and 3
  );
