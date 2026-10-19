// Delete data on this phone (launch pass P0-5): everything UNSETLD keeps on this phone, the
// Keychain record included, goes; the membership stays with the Apple ID.
//
// Step 0 placeholder: this is the interface the age gate (under 13) and You › YOUR DATA call.
// Stream F replaces the body with the real deletion (the Keychain record first, as the only
// gate; then the session, notifications, the store reset, proof files, caches and widgets).

/** 'done' once everything is gone; 'failed' when the Keychain record couldn't be deleted (nothing else was touched). */
export type DeleteResult = 'done' | 'failed';

/** Deletes everything UNSETLD keeps on this phone. Not implemented yet: it throws until stream F lands. */
export async function deleteLocalData(): Promise<DeleteResult> {
  throw new Error('deleteLocalData not implemented yet');
}
