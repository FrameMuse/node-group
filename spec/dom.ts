/* eslint-disable @typescript-eslint/no-unused-vars */

import { GlobalWindow } from "happy-dom"

const window = new GlobalWindow

for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue

  try {
    // @ts-expect-error ok.
    globalThis[key] = window[key]
  } catch (_) { /** */ }
}
