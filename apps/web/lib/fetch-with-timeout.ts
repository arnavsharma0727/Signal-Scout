/** Bound one public-provider request so a stalled upstream cannot hang a whole search. */
export function withFetchTimeout(fetcher: typeof fetch, timeoutMs = 12_000): typeof fetch {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const timeoutError = new Error(`Source request timed out after ${Math.ceil(timeoutMs / 1000)} seconds.`);
    const externalSignal = init.signal;
    const abortFromCaller = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted) abortFromCaller();
    else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

    const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);
    try {
      return await fetcher(input, { ...init, signal: controller.signal });
    } catch (cause) {
      if (controller.signal.reason === timeoutError) throw timeoutError;
      throw cause;
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    }
  };
}
