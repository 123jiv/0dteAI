"use client";

import { useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import type { Character } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";

const blank = (): Character => ({
  id: uid("char"),
  name: "",
  age: "",
  appearance: "",
  personality: "",
  goals: "",
  occupation: "",
  relationships: "",
  secrets: "",
  imageUrl: "",
});

function CharacterForm({
  character,
  onChange,
  onRemove,
}: {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-edge p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {character.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-glass text-muted">
              <UserRound size={15} />
            </span>
          )}
          {character.name || "New character"}
        </div>
        <button onClick={onRemove} className="rounded-full p-1.5 text-faint hover:text-red-400 cursor-pointer" aria-label="Remove character">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={character.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Isabella Moretti" />
        </Field>
        <Field label="Age" hint="adults only (18+)">
          <Input
            type="number"
            min={18}
            value={character.age}
            onChange={(e) => onChange({ age: e.target.value })}
            onBlur={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n < 18) onChange({ age: "18" });
            }}
            placeholder="27"
          />
        </Field>
        <Field label="Occupation">
          <Input value={character.occupation} onChange={(e) => onChange({ occupation: e.target.value })} placeholder="Art restorer" />
        </Field>
        <Field label="Image URL" hint="optional">
          <Input value={character.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} placeholder="https://…" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Appearance">
            <Textarea rows={2} value={character.appearance} onChange={(e) => onChange({ appearance: e.target.value })} placeholder="Dark curls, paint-stained hands, a scar she never explains…" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Personality">
            <Textarea rows={2} value={character.personality} onChange={(e) => onChange({ personality: e.target.value })} placeholder="Sharp-tongued, fiercely loyal, allergic to vulnerability…" />
          </Field>
        </div>
        <Field label="Goals">
          <Textarea rows={2} value={character.goals} onChange={(e) => onChange({ goals: e.target.value })} placeholder="Buy back her grandmother's gallery" />
        </Field>
        <Field label="Relationships">
          <Textarea rows={2} value={character.relationships} onChange={(e) => onChange({ relationships: e.target.value })} placeholder="Estranged brother in the family business" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Secrets">
            <Textarea rows={2} value={character.secrets} onChange={(e) => onChange({ secrets: e.target.value })} placeholder="She's the anonymous forger the family is hunting" />
          </Field>
        </div>
      </div>
    </div>
  );
}

export function CharacterBuilder({
  characters,
  onChange,
}: {
  characters: Character[];
  onChange: (chars: Character[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {characters.map((c) => (
          <button
            key={c.id}
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-full border border-edge bg-glass px-3 py-1.5 text-xs text-fg hover:border-edge-strong cursor-pointer"
          >
            <UserRound size={13} className="text-accent-strong" />
            {c.name || "Unnamed"}
            {c.age && <span className="text-faint">{c.age}</span>}
          </button>
        ))}
        <button
          onClick={() => {
            if (characters.length === 0) onChange([blank()]);
            setOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-edge-strong px-3 py-1.5 text-xs text-muted hover:text-fg cursor-pointer"
        >
          <Plus size={13} />
          {characters.length ? "Edit characters" : "Add characters"}
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Character Builder" wide>
        <div className="space-y-4">
          {characters.length === 0 && (
            <p className="text-sm text-muted">
              Create as many characters as you like — the AI will keep every one of them consistent
              across chapters. All characters are adults.
            </p>
          )}
          {characters.map((c) => (
            <CharacterForm
              key={c.id}
              character={c}
              onChange={(patch) =>
                onChange(characters.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))
              }
              onRemove={() => onChange(characters.filter((x) => x.id !== c.id))}
            />
          ))}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => onChange([...characters, blank()])}>
              <Plus size={14} /> Add character
            </Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
