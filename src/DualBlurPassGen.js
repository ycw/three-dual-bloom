import { DownsampleShader, UpsampleShader } from './DualBlurShader.js'

export function DualBlurPassGen({ THREE, Pass, FullScreenQuad }) {

  class DownsamplePass extends Pass {
    constructor() {
      super();

      this.fsQuad = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(DownsampleShader.uniforms),
        vertexShader: DownsampleShader.vertexShader,
        fragmentShader: DownsampleShader.fragmentShader,
      }));
      this.fsQuad.material.uniforms['uHalfPixel'].value = new THREE.Vector2();
    }

    render(renderer, writeBuffer, readBuffer) {
      this.fsQuad.material.uniforms['tDiffuse'].value = readBuffer.texture;
      renderer.setRenderTarget(writeBuffer);
      this.fsQuad.render(renderer);
    }
  }

  class UpsamplePass extends Pass {
    constructor() {
      super();

      this.fsQuad = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(UpsampleShader.uniforms),
        vertexShader: UpsampleShader.vertexShader,
        fragmentShader: UpsampleShader.fragmentShader,
      }));
      this.fsQuad.material.uniforms['uOffset'].value = new THREE.Vector4();
    }

    render(renderer, writeBuffer, readBuffer) {
      this.fsQuad.material.uniforms['tDiffuse'].value = readBuffer.texture;
      renderer.setRenderTarget(writeBuffer);
      this.fsQuad.render(renderer);
    }
  }

  // expose
  return class DualBlurPass extends Pass {
    constructor({
      maxDuals = 8,
      duals = 4
    } = {}) {
      super();

      if (maxDuals < 1) {
        throw new Error(`maxDuals (${maxDuals}) must >= 1`);
      }

      this._rts = [];
      this._passes = [];
      this._maxDuals = maxDuals | 0;
      this._duals = duals;
      this._effectiveDuals = 0;
      this._computeEffectiveDuals();

      this._writeBuffer = null;
      this._readBuffer = new THREE.WebGLRenderTarget(0, 0);

      for (let i = 0, I = maxDuals; i < I; ++i) {
        this._passes[i] = new DownsamplePass();
        this._passes[maxDuals + i] = new UpsamplePass();
        this._rts[i] = new THREE.WebGLRenderTarget(0, 0);
        this._rts[maxDuals + i] = new THREE.WebGLRenderTarget(0, 0);
      }
    }

    setSize(w, h) {
      for (let i = 0, I = this._maxDuals; i < I; ++i) {
        this._rts[i].setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1)));
        this._rts[2 * I - i - 1].setSize(Math.max(1, w >> i), Math.max(1, h >> i));
      }
    }

    render(renderer, writeBuffer, readBuffer) {
      this._readBuffer = readBuffer;

      for (let i = 0, I = this._effectiveDuals; i < I; ++i) { // downsamples
        this._writeBuffer = this._rts[i];
        this._passes[i].fsQuad.material.uniforms['uHalfPixel'].value.set(
          .5 / this._readBuffer.width, .5 / this._readBuffer.height
        );
        this._passes[i].render(renderer, this._writeBuffer, this._readBuffer);
        this._readBuffer = this._writeBuffer; // swap
      }

      for (let I = this._rts.length, i = I - this._effectiveDuals; i < I; ++i) { // upsamples
        this._writeBuffer = (i === I - 1)
          ? (this.renderToScreen ? null : writeBuffer)
          : this._rts[i];
        this._passes[i].fsQuad.material.uniforms['uOffset'].value.set(
          .5 / this._readBuffer.width, .5 / this._readBuffer.height, // half px
          1 / this._readBuffer.width, 1 / this._readBuffer.height // full px
        );
        this._passes[i].render(renderer, this._writeBuffer, this._readBuffer);
        this._readBuffer = this._writeBuffer;
      }
    }

    _computeEffectiveDuals() {
      if (this._duals > this._maxDuals || this._duals < 1) {
        console.warn(`duals (${this._duals}) will be clamped (in 1..${this._maxDuals}) internally`);
        this._effectiveDuals = Math.max(1, Math.min(this._duals | 0, this._maxDuals));
      } else {
        this._effectiveDuals = this._duals | 0;
      }
    }

    get duals() { return this._duals }
    set duals(value) {
      this._duals = value;
      this._computeEffectiveDuals();
    }

    get maxDuals() { return this._maxDuals }
  }
}