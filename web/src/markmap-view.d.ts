// markmap-view's index.d.ts re-exports from './view' without a .js extension,
// which NodeNext module resolution can't follow. Declare what we need here so
// TypeScript sees Markmap while Vite resolves the runtime bundle correctly.
declare module "markmap-view" {
  export class Markmap {
    static create(
      svg: SVGElement,
      options?: { colorFreezeLevel?: number; [key: string]: unknown },
      root?: unknown,
    ): Markmap;
    setData(root: unknown): void;
    fit(): void;
  }
}
