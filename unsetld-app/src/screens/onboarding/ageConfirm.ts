// The Age step's Continue asks once before the answer is kept: the answer can't be changed, and
// an under-13 answer deletes everything on this phone. The question is the same for every year,
// so it says nothing about which answer gets in. Apple's age range (where it answers) isn't asked
// about: that answer wasn't tapped.
import { AGE } from '../../content/copy/age';
import { showDialog } from '../../ui/actions';

/** "Born in 2016?" Change (nothing happens) or Continue (`go`). */
export function confirmBirth(year: number, month: number | null, go: () => void): void {
  showDialog(AGE.confirm.title(year, month), AGE.confirm.body, [
    { label: AGE.confirm.change, cancel: true },
    { label: AGE.confirm.yes, onPress: go },
  ]);
}
