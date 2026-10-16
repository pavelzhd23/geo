/** Минимальные типы для density-clustering (npm-пакет без .d.ts). */
declare module "density-clustering" {
  export class DBSCAN {
    run(
      dataset: number[][],
      epsilon: number,
      minPts: number,
      distanceFunction?: (a: number[], b: number[]) => number
    ): number[][];
  }
  export class OPTICS {
    run(
      dataset: number[][],
      epsilon: number,
      minPts: number,
      distanceFunction?: (a: number[], b: number[]) => number
    ): number[][];
    getReachabilityPlot(): [number, number][];
  }
  export class KMEANS {
    run(dataset: number[][], k: number): number[][];
  }
}
