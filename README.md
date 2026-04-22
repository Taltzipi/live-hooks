# Live hooks — simple missing patterns for predictable hooks in React async code

One of the strongest ideas in React is how hooks let you compose behavior. A custom hook can expose a coherent interface — state and the methods that act on it — and callers get to reuse it without reaching for context, stores, or prop drilling.

That elegance holds across synchronous code. It quietly breaks once `await` enters the picture.

Nothing in the syntax changes. The code still reads naturally. But across an `await`, the meaning of a hook result silently shifts: what looked like a live handle on a component's state becomes a snapshot from the render that happened before the pause. State checks may no longer be current. Methods may no longer be the ones you meant to call. The compiler has no complaint, the types are still right, and nothing throws.

`live-hooks` is three small primitives that close this gap. They are not a framework, not a state library, not a replacement for `useState` or `useEffect`. They are the pieces that are missing when async flow meets hook composition.

## Install

```bash
npm install live-hooks
```

Peer dependency: `react ^18 || ^19`.

## The hooks

### `useLive(obj)` — live object view

**Challenge.** You get a hook result that bundles state and methods: `const session = useSession()`. Inside a sync handler, `session.isActive` and `session.stop()` refer to the right thing. Inside an async handler, one `await` later, they don't — they're still the values from the render before the pause. The component may have re-rendered, `isActive` may have flipped, `stop` may have been replaced. Your local variable didn't get the memo.

**Solution.** `useLive` wraps an object in a Proxy backed by a ref to the most recent version. Property reads dispatch through the ref; function calls always invoke the latest function. The object you hold is a live window, not a snapshot. Pass it around, stash it in closures, survive any number of awaits — reads and calls stay current.

```tsx
// Before — stale after await
function PlayerControls() {
  const player = usePlayer();

  async function handleTap() {
    await confirm('Stop playback?');
    if (player.isPlaying) {   // value from the render before confirm()
      player.stop();          // function from the render before confirm()
    }
  }
}

// After — always current
function PlayerControls() {
  const player = useLive(usePlayer());

  async function handleTap() {
    await confirm('Stop playback?');
    if (player.isPlaying) {   // reads the current value
      player.stop();          // calls the current function
    }
  }
}
```

**Memory & performance.** One Proxy per object-shape change, one `Map` of cached function wrappers keyed by property name. Proxy traps are constant-time. No cloning, no subscriptions, no work per render beyond a ref assignment and a shallow key-equality check against the previous object.

**React Compiler.** Compatible. The Proxy is re-created when the wrapped object's contents change, so the compiler sees a new referential identity rather than assuming the value is frozen.

---

### `useLiveCallback(fn)` — a single function that reads the latest state on call

**Challenge.** A callback captures state at the moment it's defined. When it runs later — after an `await`, inside a `setTimeout`, from a socket handler or external listener registered once — the state it closed over is stale: the component has re-rendered, newer values exist, but the callback still sees the old ones. `useCallback` doesn't fix this: list every captured variable in its deps and the function identity churns on every change (cascading through effects and listeners); list nothing and the stale-closure bug is back.

**Solution.** `useLiveCallback(fn)` wraps a single function so every invocation runs against the latest render's closure — whether it fires a second later or a minute later, in sync code or across an await. The returned function's identity is stable for the component's lifetime, so it can be passed as a dependency, stored in a ref, or handed to an external listener that you only register once.

```tsx
// Before — pick your poison
const onMessage = useCallback((msg) => {
  send(msg, userId);              // userId captured; stale when it changes
}, []);

const onMessage = useCallback((msg) => {
  send(msg, userId);
}, [userId]);                     // recreated on every userId change →
                                  // socket reattaches → reconnect storm

// After — stable identity, always current logic
const onMessage = useLiveCallback((msg) => {
  send(msg, userId);
});
```

**Memory & performance.** One ref, one `useLayoutEffect`, one `useMemo` with an empty dep array. Zero allocations per render after the first.

**React Compiler.** Compatible. Identity is stable across renders; the layout-effect ref update happens before the next paint, so there's no observable window where the callback's body lags behind the render it was meant to match.

**Prior art.** React has explored this pattern for years — the [`useEvent` RFC](https://github.com/reactjs/rfcs/pull/220) from 2022 and the current experimental [`useEffectEvent`](https://react.dev/learn/separating-events-from-effects#declaring-an-effect-event) are close cousins. `useLiveCallback` is the same shape, available on stable React, with no experimental flag. The practical difference: `useEffectEvent` is documented as only safe to call from inside an effect — React reserves the right to tighten this. `useLiveCallback` has no such restriction and can be called from anywhere.

---

### `useLiveDebounce(fn, delay)` / `useCancelableLiveDebounce(fn, delay, opts?)` — debounced, reads latest state when it fires

**Challenge.** Debouncing in hook form has two failure modes: reconstruct the debounced function on every render (which cancels and re-arms the timer, defeating the debounce), or capture `fn` once so the timer fires against a stale closure — when it runs, it executes the body as it was at the last call, not the latest render.

**Solution.** `useLiveDebounce(fn, delay)` returns a stable debounced function whose timer, when it fires, always runs the latest render's `fn` — even if the component has re-rendered many times since the call that armed it. Timer is cleared on unmount. `useCancelableLiveDebounce` adds a `cancel()` plus an optional `{ once: true }` that ignores repeat calls while a timer is pending.

```tsx
function SearchInput() {
  const [query, setQuery] = useState('');
  const search = useSearch();       // updates per render

  const runSearch = useLiveDebounce((q: string) => {
    search.fetch(q);                // always the latest search.fetch
  }, 300);

  return (
    <input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        runSearch(e.target.value);
      }}
    />
  );
}
```

```tsx
const [saveDraft, cancelSave] = useCancelableLiveDebounce(() => {
  submit(draft);
}, 1000);

// User hit Escape:
cancelSave();
```

**Memory & performance.** Two refs (timer handle, latest fn), one `useCallback`, one unmount cleanup effect. The returned function's identity changes only when `delay` (or `once`) changes. No extra subscriptions; cost per render is one layout-effect ref write.

**React Compiler.** Compatible. The debounced function is referentially stable for the component's lifetime (modulo `delay` / `once` changes), and the latest-fn ref is updated in a layout effect so no fire of the timer can dispatch to a callback from before the most recent render.

## Platforms

No platform-specific APIs. The package runs on:

- **Web** — React DOM, React 18 and 19
- **React Native** — React Native 0.70+

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
