/**
 * A very small DevTools-protocol client.
 *
 * Shared by the phone-interface check and the two-party call check, so a second
 * tool can drive a real browser without a second copy of this.
 */
/** A very small DevTools-protocol client: send, and wait for events. */
export class Devtools {
  private socket: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private waiters = new Map<string, (params: unknown) => void>();

  constructor(url: string) {
    this.socket = new WebSocket(url);
  }

  async open(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve(), { once: true });
      this.socket.addEventListener('error', () => reject(new Error('devtools socket failed')), { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String((event as MessageEvent).data)) as {
        id?: number;
        method?: string;
        params?: unknown;
        result?: unknown;
        error?: { message: string };
      };
      if (message.id && this.pending.has(message.id)) {
        const entry = this.pending.get(message.id)!;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      if (message.method && this.waiters.has(message.method)) {
        const waiter = this.waiters.get(message.method)!;
        this.waiters.delete(message.method);
        waiter(message.params);
      }
    });
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  event(name: string, timeoutMs = 15000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.waiters.set(name, resolve);
      setTimeout(() => {
        if (this.waiters.delete(name)) reject(new Error(`timed out waiting for ${name}`));
      }, timeoutMs);
    });
  }

  /** Evaluates an expression in the page and returns its value. */
  async evaluate<T>(expression: string): Promise<T> {
    const result = await this.send<{ result: { value: T } }>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result.result.value;
  }

  close(): void {
    this.socket.close();
  }
}

