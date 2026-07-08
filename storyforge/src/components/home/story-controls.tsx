"use client";

import { motion } from "framer-motion";
import type { StorySettings } from "@/lib/types";
import {
  DIALOGUE_AMOUNTS,
  ENDING_STYLES,
  GENRES,
  LENGTHS,
  PACINGS,
  POVS,
  ROMANCE_LEVELS,
  TIME_PERIODS,
  TONES,
} from "@/lib/constants";
import { Chip, Field, Input, Select, Textarea } from "@/components/ui";

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip key={o} active={value === o} onClick={() => onChange(value === o ? "" : o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

export function StoryControls({
  settings,
  onChange,
}: {
  settings: StorySettings;
  onChange: (patch: Partial<StorySettings>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="grid gap-5 pt-5 sm:grid-cols-2">
        <Field label="Story Title" hint="optional">
          <Input
            value={settings.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Leave blank and we'll name it"
          />
        </Field>
        <Field label="Setting">
          <Input
            value={settings.setting}
            onChange={(e) => onChange({ setting: e.target.value })}
            placeholder="A rain-soaked coastal town…"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Genre">
            <ChipRow options={GENRES} value={settings.genre} onChange={(genre) => onChange({ genre })} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Romance Level" hint="all characters are adults">
            <ChipRow
              options={ROMANCE_LEVELS}
              value={settings.romanceLevel}
              onChange={(romanceLevel) => onChange({ romanceLevel })}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Tone">
            <ChipRow options={TONES} value={settings.tone} onChange={(tone) => onChange({ tone })} />
          </Field>
        </div>

        <Field label="Time Period">
          <Select value={settings.timePeriod} onChange={(e) => onChange({ timePeriod: e.target.value })}>
            <option value="">Any</option>
            {TIME_PERIODS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Point of View">
          <Select value={settings.pov} onChange={(e) => onChange({ pov: e.target.value })}>
            <option value="">Author&apos;s choice</option>
            {POVS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Chapter Length">
          <Select value={settings.length} onChange={(e) => onChange({ length: e.target.value })}>
            <option value="">Author&apos;s choice</option>
            {LENGTHS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Dialogue Amount">
          <Select
            value={settings.dialogueAmount}
            onChange={(e) => onChange({ dialogueAmount: e.target.value })}
          >
            <option value="">Author&apos;s choice</option>
            {DIALOGUE_AMOUNTS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Pacing">
          <Select value={settings.pacing} onChange={(e) => onChange({ pacing: e.target.value })}>
            <option value="">Author&apos;s choice</option>
            {PACINGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ending Style">
          <Select value={settings.endingStyle} onChange={(e) => onChange({ endingStyle: e.target.value })}>
            <option value="">Surprise me</option>
            {ENDING_STYLES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>

        <Field label="Themes">
          <Input
            value={settings.themes}
            onChange={(e) => onChange({ themes: e.target.value })}
            placeholder="Forgiveness, forbidden loyalty, second chances…"
          />
        </Field>
        <Field label="Plot Twists">
          <Input
            value={settings.plotTwists}
            onChange={(e) => onChange({ plotTwists: e.target.value })}
            placeholder="The rival was the pen pal all along…"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Additional Instructions">
            <Textarea
              rows={3}
              value={settings.instructions}
              onChange={(e) => onChange({ instructions: e.target.value })}
              placeholder="Anything else — banter style, tropes to include or avoid, content preferences…"
            />
          </Field>
        </div>
      </div>
    </motion.div>
  );
}
