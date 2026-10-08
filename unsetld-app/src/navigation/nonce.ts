let n = 0;

/** A fresh value for a route's `nonce` param, so re-navigating with the same params still lands. */
export function newNonce(): number {
  n += 1;
  return n;
}
