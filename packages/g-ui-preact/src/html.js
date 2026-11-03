// htm bound to Preact's h, and the hooks the kit uses. Bare imports: the consumer's bundler
// (or import map) resolves "preact" and "htm", so the kit shares the app's one Preact.
import { h, Fragment } from "preact";
import htm from "htm";
export const html = htm.bind(h);
export { h, Fragment };
export { useState, useEffect, useRef, useCallback, useLayoutEffect } from "preact/hooks";
