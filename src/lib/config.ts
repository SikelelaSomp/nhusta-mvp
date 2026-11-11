// topics that are open to learners right now. add 'algebra' when it passes its gates.
export const LIVE_TOPICS = ['trigonometry']

// stages that are built. switch each on as its step passes.
export const LIVE_STAGES = ['practise', 'watch']

export const STAGES = [
  { key: 'watch', label: 'Watch', desc: 'a short animation' },
  { key: 'explore', label: 'Explore', desc: 'see the maths in real life' },
  { key: 'practise', label: 'Practise', desc: 'questions with Nono hints' },
  { key: 'homework', label: 'Homework', desc: 'from your teacher' },
] as const