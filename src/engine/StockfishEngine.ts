import type { EngineAnalysis, EngineLine, EngineMode } from '../types';

interface SearchOptions {
  depth?: number;
  movetime?: number;
  nodes?: number;
  multiPV?: number;
  skillLevel?: number;
  limitStrength?: boolean;
  elo?: number;
  hash?: number;
}

interface PendingSearch {
  resolve: (value: EngineAnalysis) => void;
  reject: (reason?: unknown) => void;
  fen: string;
  lines: Map<number, EngineLine>;
  bestDepth: number;
  timeout: number;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private pending: PendingSearch | null = null;
  private lineWaiters: Array<{ predicate: (line: string) => boolean; resolve: () => void; reject: (e: Error) => void; timer: number }> = [];

  constructor(public readonly mode: EngineMode) {}

  private get workerUrl() {
    const file = this.mode === 'full' ? 'stockfish-18-single.js' : 'stockfish-18-lite-single.js';
    const base = new URL(import.meta.env.BASE_URL || './', window.location.href);
    return new URL(`stockfish/${file}`, base).href;
  }

  async init(onProgress?: (percent: number) => void) {
    if (this.ready && this.worker) { onProgress?.(1); return; }
    this.dispose();

    this.worker = new Worker(this.workerUrl);
    this.worker.addEventListener('message', (event) => this.onMessage(String(event.data)));

    if (onProgress && typeof MessageChannel === 'function') {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        const percent = Number(event.data?.percent ?? 0);
        if (Number.isFinite(percent)) onProgress(Math.max(0, Math.min(1, percent)));
        if (percent >= 1) channel.port1.close();
      };
      const progressProbe = (event: MessageEvent) => {
        if (String(event.data) === 'info WillOutputEngineDownloadProgress' && this.worker) {
          this.worker.postMessage({ progressPort: channel.port2 }, [channel.port2]);
          this.worker.removeEventListener('message', progressProbe);
        }
      };
      this.worker.addEventListener('message', progressProbe);
      this.worker.postMessage('setoption name CanOutputEngineDownloadProgress');
    }
    this.worker.addEventListener('error', (event) => {
      const error = new Error(event.message || `Could not load Stockfish ${this.mode}.`);
      if (this.pending) {
        window.clearTimeout(this.pending.timeout);
        this.pending.reject(error);
        this.pending = null;
      }
      this.rejectWaiters(error);
    });

    this.send('uci');
    await this.waitFor((line) => line === 'uciok', 30_000);
    this.send('isready');
    await this.waitFor((line) => line === 'readyok', 30_000);
    this.ready = true;
  }

  private send(command: string) {
    if (!this.worker) throw new Error('Stockfish worker is not running.');
    this.worker.postMessage(command);
  }

  private waitFor(predicate: (line: string) => boolean, timeoutMs: number) {
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.lineWaiters = this.lineWaiters.filter((w) => w.timer !== timer);
        reject(new Error('Stockfish initialization timed out.'));
      }, timeoutMs);
      this.lineWaiters.push({ predicate, resolve, reject, timer });
    });
  }

  private rejectWaiters(error: Error) {
    for (const waiter of this.lineWaiters) {
      window.clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.lineWaiters = [];
  }

  private onMessage(raw: string) {
    const chunks = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of chunks) {
      for (const waiter of [...this.lineWaiters]) {
        if (waiter.predicate(line)) {
          window.clearTimeout(waiter.timer);
          waiter.resolve();
          this.lineWaiters = this.lineWaiters.filter((w) => w !== waiter);
        }
      }

      if (!this.pending) continue;
      if (line.startsWith('info ')) this.parseInfo(line, this.pending);
      if (line.startsWith('bestmove ')) this.finishSearch(line);
    }
  }

  private parseInfo(line: string, pending: PendingSearch) {
    const depthMatch = line.match(/\bdepth (\d+)/);
    const pvMatch = line.match(/\bpv (.+)$/);
    const cpMatch = line.match(/\bscore cp (-?\d+)/);
    const mateMatch = line.match(/\bscore mate (-?\d+)/);
    const multipvMatch = line.match(/\bmultipv (\d+)/);
    if (!pvMatch || (!cpMatch && !mateMatch)) return;

    const activeColor = pending.fen.split(' ')[1];
    const factor = activeColor === 'b' ? -1 : 1;
    const rawMate = mateMatch ? Number(mateMatch[1]) : undefined;
    const mate = rawMate === undefined ? undefined : rawMate * factor;
    const scoreCp = cpMatch
      ? Number(cpMatch[1]) * factor
      : (mate && mate > 0 ? 100_000 : -100_000);
    const depth = Number(depthMatch?.[1] || 0);
    const multipv = Number(multipvMatch?.[1] || 1);
    const pv = pvMatch[1].trim().split(/\s+/);

    pending.bestDepth = Math.max(pending.bestDepth, depth);
    pending.lines.set(multipv, { multipv, depth, scoreCp, mate, pv });
  }

  private finishSearch(line: string) {
    if (!this.pending) return;
    const pending = this.pending;
    this.pending = null;
    window.clearTimeout(pending.timeout);

    const bestMatch = line.match(/^bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);
    const bestMove = bestMatch?.[1] || '(none)';
    const ponder = bestMatch?.[2];
    const lines = [...pending.lines.values()].sort((a, b) => a.multipv - b.multipv);
    const principal = lines[0] || { multipv: 1, depth: pending.bestDepth, scoreCp: 0, pv: bestMove === '(none)' ? [] : [bestMove] };

    pending.resolve({
      fen: pending.fen,
      depth: principal.depth || pending.bestDepth,
      bestMove,
      ponder,
      lines,
      scoreCp: principal.scoreCp,
      mate: principal.mate,
    });
  }

  async analyze(fen: string, options: SearchOptions = {}): Promise<EngineAnalysis> {
    await this.init();
    await this.stop();

    const multiPV = Math.max(1, Math.min(5, options.multiPV ?? 1));
    this.send(`setoption name MultiPV value ${multiPV}`);
    if (options.hash) this.send(`setoption name Hash value ${Math.max(1, Math.round(options.hash))}`);
    this.send(`setoption name Skill Level value ${Math.max(0, Math.min(20, Math.round(options.skillLevel ?? 20)))}`);
    this.send(`setoption name UCI_LimitStrength value ${options.limitStrength ? 'true' : 'false'}`);
    if (options.elo !== undefined) this.send(`setoption name UCI_Elo value ${Math.round(options.elo)}`);
    this.send(`position fen ${fen}`);

    return new Promise<EngineAnalysis>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.send('stop');
        if (this.pending) {
          this.pending = null;
          reject(new Error('Stockfish search timed out.'));
        }
      }, Math.max(20_000, (options.movetime ?? 0) + 15_000));

      this.pending = { resolve, reject, fen, lines: new Map(), bestDepth: 0, timeout };
      if (options.movetime) this.send(`go movetime ${Math.max(25, Math.round(options.movetime))}`);
      else if (options.nodes) this.send(`go nodes ${Math.max(1000, Math.round(options.nodes))}`);
      else this.send(`go depth ${Math.max(1, Math.round(options.depth ?? 16))}`);
    });
  }

  async stop() {
    if (!this.worker || !this.ready) return;
    if (!this.pending) return;
    this.send('stop');
    for (let i = 0; i < 30 && this.pending; i++) await wait(10);
  }

  dispose() {
    if (this.pending) {
      window.clearTimeout(this.pending.timeout);
      this.pending.reject(new Error('Engine stopped.'));
      this.pending = null;
    }
    this.rejectWaiters(new Error('Engine stopped.'));
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}
