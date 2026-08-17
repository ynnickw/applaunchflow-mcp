import { AsyncLocalStorage } from "node:async_hooks";

const requestSignalStorage = new AsyncLocalStorage<AbortSignal>();

export function runWithRequestSignal<T>(
  signal: AbortSignal | undefined,
  callback: () => T,
): T {
  return signal ? requestSignalStorage.run(signal, callback) : callback();
}

export function upstreamSignal(
  timeoutMs: number,
  explicitSignal?: AbortSignal,
): AbortSignal {
  const signals = [
    explicitSignal,
    requestSignalStorage.getStore(),
    AbortSignal.timeout(timeoutMs),
  ].filter((signal): signal is AbortSignal => signal !== undefined);

  return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
}
