// The swap sheet, for Today's cards and the mission page: WHY ARE YOU SWAPPING? (one tap), then
// RECOMMENDED FOR YOU (up to three, for that reason) and + CREATE MY OWN. The reason goes with
// the swap so the plan learns from it (core/personalize). A mission of the user's own comes up
// as a taller sheet over the choices, and going back drops it to show them again.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SWAP } from '../../content/copy/swap';
import type { SlotPick } from '../../core/missions';
import type { DayKey } from '../../core/time';
import type { SwapReason } from '../../core/types';
import { selection, warning } from '../../services/haptics';
import { entitlementsOf, replacementsFor, useApp } from '../../state/store';
import { Sheet } from '../../ui/Sheet';
import { useAnnounce } from '../../ui/useAnnounce';
import { showSwapLimit } from '../home/swap';
import { ChoicesStep } from './ChoicesStep';
import { CreateStep } from './CreateStep';
import { canAddOwn, draftInput, recentOwn, sameAs, slotWorth, startDraft, type OwnDraft } from './logic';
import { FadeIn } from './parts';
import { ReasonStep, SwapsLeft } from './ReasonStep';

export interface SwapTarget {
  /** The mission's place in the day's plan. */
  index: number;
  missionId: string;
  title: string;
  day: DayKey;
}

type Step = 'why' | 'choices' | 'create';

/** The sheet's closing slide (ui/Sheet), and a frame to spare. */
const CLOSE_MS = 280;
/** Steps 1 and 2: about 0.62 of a tall phone, more on a short one, so six reasons fit. */
const STEP_HEIGHT = 548;
/** Step 3: room for the form above the keyboard. */
const CREATE_DETENT = 0.9;

const EMPTY: never[] = [];

export function SwapSheet({
  target,
  onClose,
  onSwapped,
  onDayOver,
  onPaywall,
}: {
  target: SwapTarget | null;
  onClose: () => void;
  /** After a swap: the new mission's id. */
  onSwapped: (id: string) => void;
  /** 4:00 AM passed while the sheet was open: the day it was for is over. */
  onDayOver?: () => void;
  /** "See UNSETLD+" from the limit dialog. */
  onPaywall: () => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // What the sheet is for: the last target, kept through the closing slide.
  const [shown, setShown] = useState<SwapTarget | null>(target);
  const [step, setStep] = useState<Step>('why');
  const [reason, setReason] = useState<SwapReason>('another');
  const [choices, setChoices] = useState<SlotPick[]>(EMPTY);
  const [draft, setDraft] = useState<OwnDraft | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Done (swapped, the day over, no swaps left): the sheet goes, then the screen hears of it.
  const [leaving, setLeaving] = useState(false);

  // Each time it opens: step 1, nothing kept from the last one.
  if (target && target !== shown) {
    setShown(target);
    setStep('why');
    setReason('another');
    setChoices(EMPTY);
    setDraft(null);
    setNote(null);
    setLeaving(false);
  }

  const open = Boolean(target) && !leaving;
  // The modal stays up for the sheet's closing slide.
  const [up, setUp] = useState(open);
  if (open && !up) setUp(true);
  useEffect(() => {
    if (open || !up) return;
    const t = setTimeout(() => setUp(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [open, up]);

  // What to do once the modal is down (the mission page closing, the limit dialog): on iOS when
  // it says it's dismissed (a screen or an alert can't come up while a modal is going away),
  // elsewhere as soon as it's hidden (the browser's dialogs draw under an open modal).
  const after = useRef<(() => void) | null>(null);
  const gone = useCallback(() => {
    const run = after.current;
    after.current = null;
    run?.();
  }, []);
  useEffect(() => {
    if (up) return;
    if (Platform.OS !== 'ios') {
      gone();
      return;
    }
    // In case onDismiss never comes.
    const t = setTimeout(gone, 600);
    return () => clearTimeout(t);
  }, [up, gone]);

  const day = shown?.day;
  const index = shown?.index ?? -1;
  const plan = useApp(s => (day ? s.plans[day] : undefined));
  const tracks = useApp(s => s.profile.tracks);
  const customMissions = useApp(s => s.customMissions);
  const recent = recentOwn(customMissions, plan, tracks);

  useAnnounce(open ? (step === 'why' ? SWAP.why.title : step === 'choices' ? SWAP.choices.kicker : SWAP.create.title) : null);
  useAnnounce(open ? note : null);

  // The target the sheet is done with, set at once: a second quick tap can't swap twice.
  const doneWith = useRef<SwapTarget | null>(null);
  const leave = (then: () => void) => {
    doneWith.current = shown;
    after.current = then;
    Keyboard.dismiss();
    setLeaving(true);
  };
  const idle = () => Boolean(shown) && !leaving && doneWith.current !== shown;

  /** 4:00 AM passed while the sheet was open: this mission belongs to a day that's over. */
  const dayIsOver = (): boolean => {
    if (!shown) return true;
    useApp.getState().refreshDay();
    if (useApp.getState().currentDay === shown.day) return false;
    leave(() => (onDayOver ?? onClose)());
    return true;
  };

  const settle = (result: 'ok' | 'none' | 'limit' | 'invalid', id: string) => {
    if (result === 'ok') leave(() => onSwapped(id));
    else if (result === 'limit') {
      leave(() => {
        onClose();
        showSwapLimit(onPaywall);
      });
    } else {
      // Proven meanwhile, or it no longer fits the day: nothing was used. Stay.
      warning();
      setNote(SWAP.choices.cantGoIn);
    }
  };

  const pickReason = (r: SwapReason) => {
    if (!shown || !idle()) return;
    selection();
    if (dayIsOver()) return;
    setReason(r);
    setChoices(replacementsFor(shown.index, r));
    setNote(null);
    setStep('choices');
  };

  const pick = (missionId: string) => {
    if (!shown || !idle()) return;
    selection();
    if (dayIsOver()) return;
    settle(useApp.getState().replaceMission(shown.index, missionId, reason), missionId);
  };

  const toOwn = () => {
    if (!shown) return;
    selection();
    const s = useApp.getState();
    setDraft(d => d ?? startDraft(s.plans[shown.day], shown.index, s.profile.tracks));
    setNote(null);
    setStep('create');
  };

  const back = (to: Step) => {
    setNote(null);
    setStep(to);
  };

  const addOwn = () => {
    const input = draftInput(draft);
    if (!shown || !idle() || !input) return;
    if (dayIsOver()) return;
    const s = useApp.getState();
    const today = s.plans[shown.day];
    // No swaps left: say so before anything new is kept.
    if (today && today.rerolls >= entitlementsOf(s).maxSwaps) return settle('limit', '');
    // One of their own from before, exactly as it was: use it again rather than make another.
    const id = recent.find(m => sameAs(m, input))?.id ?? s.createCustomMission(input)?.id;
    if (!id) return settle('invalid', '');
    settle(useApp.getState().replaceMission(shown.index, id, reason), id);
  };

  const detent = Math.min(0.88, Math.max(0.62, (STEP_HEIGHT + insets.bottom) / Math.max(1, height)));

  return (
    <Modal
      visible={up}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      // Android back and the browser's Escape: a step back from the form, else close.
      onRequestClose={() => (step === 'create' && open ? back('choices') : onClose())}
      onDismiss={Platform.OS === 'ios' ? gone : undefined}>
      {shown ? (
        <View style={{ flex: 1 }}>
          <Sheet
            visible={open}
            onClose={onClose}
            detent={detent}
            accessibilityLabel={SWAP.a11y}
            footer={step === 'why' ? <SwapsLeft day={shown.day} /> : undefined}>
            {step === 'why' ? (
              <FadeIn key="why">
                <ReasonStep title={shown.title} onPick={pickReason} />
              </FadeIn>
            ) : (
              <FadeIn key="choices">
                <ChoicesStep
                  choices={choices}
                  canOwn={canAddOwn(plan, index)}
                  note={step === 'choices' ? note : null}
                  onPick={pick}
                  onOwn={toOwn}
                  onBack={() => back('why')}
                />
              </FadeIn>
            )}
          </Sheet>
          <Sheet visible={open && step === 'create'} onClose={() => back('choices')} detent={CREATE_DETENT} dim={0.35} accessibilityLabel={SWAP.create.title}>
            {draft ? (
              <CreateStep
                draft={draft}
                onChange={setDraft}
                recent={recent}
                tracks={tracks}
                worth={slotWorth(plan, index)}
                note={step === 'create' ? note : null}
                onAdd={addOwn}
                onBack={() => back('choices')}
              />
            ) : null}
          </Sheet>
        </View>
      ) : null}
    </Modal>
  );
}
