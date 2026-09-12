import { AsyncLocalStorage } from "node:async_hooks";

const requestSignalStorage = new AsyncLocalStorage<AbortSignal>();
const widgetFallbackStorage = new AsyncLocalStorage<boolean>();

export function withWidgetFallback<T>(enabled: boolean, run: () => T): T {
  return widgetFallbackStorage.run(enabled, run);
}

export function needsWidgetFallback(): boolean {
  return widgetFallbackStorage.getStore() === true;
}
const requestTelemetryStorage = new AsyncLocalStorage<{ requestId: string }>();

export function runWithRequestTelemetry<T>(requestId: string, callback: () => T): T {
  return requestTelemetryStorage.run({ requestId }, callback);
}

export function requestTelemetry(): { requestId?: string } {
  return requestTelemetryStorage.getStore() || {};
}

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
