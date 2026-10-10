// The swap flow, one for Today's cards and the mission page, so both say the same thing: the
// area the swap draws from, the swaps left, nothing else fitting, or the day's limit.
import { swapArea } from '../../core/missions';
import type { DayKey } from '../../core/time';
import { MISSIONS, RULES, TRACK_BY_ID } from '../../content';
import { HOME } from '../../content/copy/home';
import { entitlementsOf, useApp } from '../../state/store';
import { showDialog } from '../../ui/actions';

interface SwapOptions {
  /** The mission's place in today's plan. */
  index: number;
  title: string;
  day: DayKey;
  swapsLeft: number;
  /** After a swap: the new mission's id. */
  onSwapped: (id: string) => void;
  /** The day turned while the dialog was up (the mission page closes). */
  onDayOver?: () => void;
  /** "See UNSETLD+" from the limit dialog. */
  onPaywall: () => void;
}

/** No swaps left: say so, and where more come from (members are told when they come back). */
export function showSwapLimit(onPaywall: () => void) {
  const member = entitlementsOf(useApp.getState()).maxSwaps > RULES.rerolls.free;
  showDialog(
    HOME.swap.limitTitle,
    member ? HOME.swap.limitFull : HOME.swap.limitFree,
    member
      ? [{ label: HOME.swap.ok, cancel: true }]
      : [
          { label: HOME.swap.ok, cancel: true },
          { label: HOME.swap.seeFull, onPress: onPaywall },
        ],
  );
}

export function confirmSwap({ index, title, day, swapsLeft, onSwapped, onDayOver, onPaywall }: SwapOptions) {
  // The dialog names the area the swap draws from: the one the mission is in the day for, or
  // (a plan's mission in an area since dropped) one of the user's areas.
  const s = useApp.getState();
  const dayPlan = s.plans[day];
  const to = dayPlan ? swapArea(dayPlan, index, { library: MISSIONS, profile: s.profile, day }) : undefined;
  const area = (to && TRACK_BY_ID[to]?.short) || '';
  if (swapsLeft <= 0) {
    showSwapLimit(onPaywall);
    return;
  }
  const doSwap = () => {
    // 4:00 AM passed while the dialog was up: this mission belongs to a day that's over.
    useApp.getState().refreshDay();
    if (useApp.getState().currentDay !== day) {
      onDayOver?.();
      return;
    }
    const result = useApp.getState().rerollMission(index);
    if (result === 'ok') {
      const id = useApp.getState().plans[day]?.missions[index]?.missionId;
      if (id) onSwapped(id);
    } else if (result === 'none') {
      showDialog(HOME.swap.noneTitle, HOME.swap.noneBody(area), [{ label: HOME.swap.ok, cancel: true }]);
    } else showSwapLimit(onPaywall);
  };
  showDialog(HOME.swap.confirmTitle(title), HOME.swap.confirmBody(swapsLeft, area), [
    { label: HOME.swap.no, cancel: true },
    { label: HOME.swap.yes, onPress: doSwap },
  ]);
}
