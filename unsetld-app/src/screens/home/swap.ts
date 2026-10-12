// The day's swap limit, said the same way from Today's cards, the mission page and the swap
// sheet (screens/swap/SwapSheet), which does the swapping itself.
import { RULES } from '../../content';
import { HOME } from '../../content/copy/home';
import { entitlementsOf, useApp } from '../../state/store';
import { showDialog } from '../../ui/actions';

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
