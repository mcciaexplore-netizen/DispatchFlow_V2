declare module '@techstark/opencv-js' {
  interface Mat {
    delete(): void
    rows: number
    cols: number
    data32S: Int32Array
  }
  const cv: {
    imread(canvas: HTMLCanvasElement): Mat
    cvtColor(src: Mat, dst: Mat, code: number): void
    Canny(src: Mat, dst: Mat, threshold1: number, threshold2: number): void
    HoughLinesP(src: Mat, lines: Mat, rho: number, theta: number, threshold: number, minLineLength: number, maxLineGap: number): void
    Mat: new () => Mat
    COLOR_RGBA2GRAY: number
  }
  export = cv
  export default cv
}
