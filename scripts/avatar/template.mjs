// Appearance is deliberately separate from the reusable acting contract.
export const appearance = {
  profile: 'default',
  label: 'Home office',
  person: 'A fictional adult in their thirties, approachable everyday appearance, natural skin texture, simple unbranded cotton shirt. No resemblance to a public figure.',
  scene: 'A quiet home office in soft daylight. Seated behind a wooden desk with an open laptop to their right. Waist-up composition, level locked camera, 16:9 landscape, natural photographic style.',
};

export const acting = {
  shared: 'One continuous shot. Keep the exact same person, clothing, furniture, lighting and locked camera throughout. No cuts, zooms, camera motion, text or graphics. Small natural movements only. Start exactly on the first supplied image and finish exactly on the second supplied image. Ease naturally into and out of the endpoint poses.',
  poses: {
    front: 'Facing the viewer, hands comfortably resting on the desk, relaxed attentive expression, mouth closed.',
    desk: 'Turned slightly to their right toward the laptop, eyes on its screen, hands settled by the keyboard, mouth closed.',
  },
};

export const clips = [
  { id: 'idle', from: 'front', to: 'front', kind: 'loop', durationMs: 4000, direction: 'Wait comfortably. A subtle breath and one natural blink, then settle back to the initial pose.' },
  { id: 'listening', from: 'front', to: 'front', kind: 'loop', durationMs: 4000, direction: 'Listen attentively to the viewer. Give one small acknowledging nod, then return to the initial pose.' },
  { id: 'thinking', from: 'front', to: 'front', kind: 'loop', durationMs: 4000, direction: 'Consider a question. Briefly look to the side thoughtfully and return attention to the viewer.' },
  { id: 'speaking', from: 'front', to: 'front', kind: 'loop', durationMs: 4000, direction: 'Explain something calmly with restrained natural mouth movements and one small hand gesture. Settle back to the initial closed-mouth pose. This is generic acting, without a fixed spoken script.' },
  { id: 'to-desk', from: 'front', to: 'desk', kind: 'transition', durationMs: 3000, direction: 'Naturally turn attention and shoulders toward the laptop and place hands by the keyboard.' },
  { id: 'working-a', from: 'desk', to: 'desk', kind: 'loop', durationMs: 4000, direction: 'Read the laptop screen, type briefly, pause, then return hands and gaze to the initial pose.' },
  { id: 'working-b', from: 'desk', to: 'desk', kind: 'loop', durationMs: 4000, direction: 'Read the laptop screen and use the trackpad briefly, then return to the initial pose.' },
  { id: 'to-front', from: 'desk', to: 'front', kind: 'transition', durationMs: 3000, direction: 'Finish at the laptop and naturally turn attention and shoulders back to the viewer.' },
];

export function makeManifest(profile, label, durations, placeholder = false) {
  return {
    profile, label, width: 1280, height: 720,
    poster: `/avatar/${profile}/poster.${placeholder ? 'svg' : 'jpg'}`,
    restPose: 'front', placeholder,
    clips: clips.map(({ id, from, to, kind, durationMs }) => ({
      id, from, to, kind, durationMs: durations?.[id] ?? durationMs,
      file: `/avatar/${profile}/${id}.mp4`,
    })),
    activities: {
      idle: { pose: 'front', loops: ['idle'] },
      listening: { pose: 'front', loops: ['listening'] },
      thinking: { pose: 'front', loops: ['thinking'] },
      speaking: { pose: 'front', loops: ['speaking'] },
      working: { pose: 'desk', loops: ['working-a', 'working-b'] },
    },
  };
}
