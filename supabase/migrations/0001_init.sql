-- NHUSTA MVP schema (grade 10 maths). marking is server-side only.

create table topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- algebra | trigonometry | euclidean-geometry | analytical-geometry
  title text not null,
  grade int not null default 10,
  position int not null default 0,
  depth text not null default 'full' check (depth in ('full','light')),  -- light = cue cards + practise only
  watch_video_url text,                -- animation, filled in when ezethu sends them
  created_at timestamptz default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  position int not null,
  title text not null,
  body_md text,                        -- cleaned text (katex via $...$)
  image_path text,                     -- supabase storage path if card is an image
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  card_id uuid references cards(id) on delete set null,
  position int not null default 0,
  prompt_md text not null,
  kind text not null check (kind in ('numeric','algebra','mcq')),
  options jsonb,                       -- mcq only: [{"id":"a","text":"..."}]
  is_homework boolean not null default false,
  approved boolean not null default false,   -- answer key signed off by ezethu/teacher
  created_at timestamptz default now()
);

-- answers live apart. rls on + zero policies = only service role (server) can read.
create table question_answers (
  question_id uuid primary key references questions(id) on delete cascade,
  answer text not null,                -- canonical answer (mathjs-parsable for algebra)
  accepted jsonb default '[]',         -- equivalent accepted forms
  working_md text                      -- worked solution, never sent to browser pre-attempt
);

create table scenes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  slug text unique not null,           -- taxi-fare | rondavel-roof
  title text not null,
  config jsonb not null default '{}',  -- character, dialogue nodes, visual component key
  status text not null default 'live' check (status in ('live','coming_soon'))
);

-- nono's knowledge: cleaned cue card text, server-side only
create table knowledge (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  card_id uuid references cards(id) on delete cascade,
  content text not null
);

-- learner = supabase anonymous auth user + name/grade (simple sign in)
create table learners (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  grade int not null default 10,
  created_at timestamptz default now()
);

create table stage_progress (
  learner_id uuid references learners(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  stage text check (stage in ('watch','explore','practise','homework')),
  status text not null default 'done' check (status in ('started','done')),
  updated_at timestamptz default now(),
  primary key (learner_id, topic_id, stage)
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  response text not null,
  correct boolean not null,
  created_at timestamptz default now()
);

-- rls
alter table topics enable row level security;
alter table cards enable row level security;
alter table questions enable row level security;
alter table question_answers enable row level security;   -- no policies on purpose
alter table scenes enable row level security;
alter table knowledge enable row level security;          -- no policies on purpose
alter table learners enable row level security;
alter table stage_progress enable row level security;
alter table attempts enable row level security;

create policy "read topics" on topics for select to authenticated using (true);
create policy "read cards" on cards for select to authenticated using (true);
create policy "read approved questions" on questions for select to authenticated using (approved);
create policy "read scenes" on scenes for select to authenticated using (true);

create policy "own learner select" on learners for select to authenticated using (id = auth.uid());
create policy "own learner insert" on learners for insert to authenticated with check (id = auth.uid());
create policy "own learner update" on learners for update to authenticated using (id = auth.uid());

create policy "own progress select" on stage_progress for select to authenticated using (learner_id = auth.uid());
create policy "own progress insert" on stage_progress for insert to authenticated with check (learner_id = auth.uid());
create policy "own progress update" on stage_progress for update to authenticated using (learner_id = auth.uid());

create policy "own attempts select" on attempts for select to authenticated using (learner_id = auth.uid());
-- attempts inserted by the server (service role) after marking, so no insert policy

create index on cards (topic_id, position);
create index on questions (topic_id, position);
create index on attempts (learner_id, question_id);