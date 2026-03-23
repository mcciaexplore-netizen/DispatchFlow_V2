declare module '@techstark/opencv-js' {
  const cv: {
    imread(canvas: HTMLCanvasElement): any
    cvtColor(src: any, dst: any, code: number): void
    Canny(src: any, dst: any, threshold1: number, threshold2: number): void
    HoughLinesP(src: any, lines: any, rho: number, theta: number, threshold: number, minLineLength: number, maxLineGap: number): void
    Mat: new () => any
    COLOR_RGBA2GRAY: number
  }
  export = cv
  export default cv
}
