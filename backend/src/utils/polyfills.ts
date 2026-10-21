// Polyfills for Node.js environments (especially Node 22+ / 24+ / 25+ and Windows)
// where headless environments lack browser canvas/DOM primitives required by PDF rendering engines (pdfjs-dist).

if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  class SimpleDOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;

    constructor(_init?: any) {}
    multiply() {
      return this;
    }
    inverse() {
      return this;
    }
    transformPoint(point: any) {
      return point;
    }
  }

  (globalThis as any).DOMMatrix = SimpleDOMMatrix;
}

if (typeof (globalThis as any).Path2D === 'undefined') {
  class SimplePath2D {
    constructor(_path?: any) {}
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  }

  (globalThis as any).Path2D = SimplePath2D;
}

if (typeof (globalThis as any).ImageData === 'undefined') {
  class SimpleImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  }

  (globalThis as any).ImageData = SimpleImageData;
}

export {};
