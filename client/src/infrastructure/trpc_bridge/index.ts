/** A narrow async boundary that can be adapted to an authenticated tRPC procedure. */
export type KernelProcedure<Input, Output> = (input: Input) => Promise<Output>;

export type KernelBridge<Input, Output> = {
  run: (input: Input) => Promise<Output>;
};

/**
 * Wraps an injected procedure rather than coupling mathematical domains to a
 * network implementation. A page can supply a typed tRPC mutation or query here.
 */
export function createKernelBridge<Input, Output>(procedure: KernelProcedure<Input, Output>): KernelBridge<Input, Output> {
  return { run: (input) => procedure(input) };
}
