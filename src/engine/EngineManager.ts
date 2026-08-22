import type { EngineMode } from '../types';
import { StockfishEngine } from './StockfishEngine';

export class EngineManager {
  private engine: StockfishEngine | null = null;
  private mode: EngineMode | null = null;

  async get(mode: EngineMode, onProgress?: (percent: number) => void) {
    if (this.engine && this.mode === mode) { onProgress?.(1); return this.engine; }
    this.engine?.dispose();
    this.engine = new StockfishEngine(mode);
    this.mode = mode;
    await this.engine.init(onProgress);
    return this.engine;
  }

  async switch(mode: EngineMode) {
    this.engine?.dispose();
    this.engine = null;
    this.mode = null;
    return this.get(mode);
  }

  dispose() {
    this.engine?.dispose();
    this.engine = null;
    this.mode = null;
  }
}

export const engineManager = new EngineManager();
