"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Manifest } from "@/lib/avatar/types";
import type { AvatarPreferences } from "./use-avatar-preferences";

export const ROLE_LABELS = { everyday: "Everyday support", paperwork: "Letters & paperwork", shopping: "Thoughtful shopping" };
export const TONE_LABELS = { calm: "Calm", direct: "To the point", warm: "Warm" };

export function AvatarSettings({ profiles, initial, onSave, onClose }: {
  profiles: Manifest[]; initial: AvatarPreferences; onSave: (value: AvatarPreferences) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '\u2019-]{0,31}$/u.test(draft.name.trim())) { setError("Start with a letter or number. Use up to 32 characters."); return; }
    onSave({ ...draft, name: draft.name.trim() });
  }
  return <section className="studio-settings" aria-labelledby="personalize-heading">
    <header className="studio-panel-header"><button className="studio-icon-button" onClick={onClose} aria-label="Back to conversation"><ArrowLeft size={19} /></button><h2 id="personalize-heading">Make it yours</h2></header>
    <form onSubmit={submit} className="studio-settings-form">
      <fieldset><legend>Choose a look</legend><div className="studio-look-options">{profiles.map((profile) => <button key={profile.profile} type="button" className="studio-look" aria-pressed={draft.profile === profile.profile} onClick={() => setDraft({ ...draft, profile: profile.profile })}>
        {/* Local media assets keep all preview choices available without a provider. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.poster} alt="" width={160} height={100} />
        <span>{profile.profile === "office" ? "Office" : profile.label.split(" · ")[0]}</span>
        {draft.profile === profile.profile && <Check size={16} aria-hidden="true" />}
      </button>)}</div><p className="studio-help">Ready-made looks for this prototype.</p></fieldset>
      <label htmlFor="companion-name">What should I call myself?<input id="companion-name" maxLength={32} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoComplete="off" /></label>
      <fieldset><legend>What can I help with?</legend><div className="studio-focus-options">{(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((role) => <button type="button" key={role} aria-pressed={draft.role === role} onClick={() => setDraft({ ...draft, role })}><span>{ROLE_LABELS[role]}</span>{draft.role === role && <Check size={17} />}</button>)}</div></fieldset>
      <fieldset><legend>How should I respond?</legend><div className="studio-tone-options">{(Object.keys(TONE_LABELS) as (keyof typeof TONE_LABELS)[]).map((tone) => <button type="button" key={tone} aria-pressed={draft.tone === tone} onClick={() => setDraft({ ...draft, tone })}>{TONE_LABELS[tone]}</button>)}</div></fieldset>
      <p className="studio-help">Your name, focus and tone apply to your next live message. The room and prepared scenes stay the same. Preferences stay in this browser.</p>
      {error && <p className="studio-error" role="alert">{error}</p>}
      <button className="studio-primary" type="submit">Save companion <Check size={17} /></button>
    </form>
  </section>;
}
