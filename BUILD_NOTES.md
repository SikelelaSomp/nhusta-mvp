# NHUSTA MVP build notes

process: see DEV_LIFECYCLE.md. one step at a time, gate before moving on.
deadline: testable build to ezethu by midday tue 10 nov. she tests tue-wed. wed night fixes only. pitch thu.

## build order

- [ ] 1 repo + schema + seed <- in progress
  - [x] supabase project `nhusta` created (ref wbgyhuprcugdcnuykhuu, eu-west-1)
  - [x] 001_init.sql applied, 9 tables, rls on
  - [x] seeded 4 topics + 4 scenes
  - [ ] next.js scaffold + env vars + vercel preview
  - [ ] seed cards/questions/knowledge from cue cards
- [ ] 2 shell + topic hub (welcome > name/grade sign in > home > hub with 4 stages)
- [ ] 3 cue card viewer
- [ ] 4 practise marking (server-side, mathjs, answers never to browser)
- [ ] 5 nono (askNono() wrapper, deepseek, server-side key, never gives final answer)
- [ ] 6 scenes: taxi fare (algebra) then rondavel roof (trig)
- [ ] 7 progress

## rules

- grade 10 maths only. algebra + trig full (all 4 stages), euclid + analytical = cue cards + practise, explore "coming soon"
- questions only visible when approved = true (ezethu/teacher signs off answer keys)
- cut: roles, payments, upload studio, badges, calculator, voice, other languages, 3d sims

## open

- third thing ezethu wanted for the mvp
- one card or two per cue card image?
- character art (learner, nono), rondavel photo
- her sign-off on the flow message

## parked

(new ideas go here, not into the current step)
