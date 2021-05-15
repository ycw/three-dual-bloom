import { LumaShader, DownsampleShader, UpsampleShader, CombineShader } from './DualBloomShader.js'

export function DualBloomPassGen({ THREE, Pass, FullScreenQuad }) {

  class DownsamplePass extends Pass {
    constructor() {
      super();

      const uniforms = THREE.UniformsUtils.clone(DownsampleShader.uniforms);
      uniforms.uHalfPixel.value = new THREE.Vector2();

      this.fsQuad = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms,
        vertexShader: DownsampleShader.vertexShader,
        fragmentShader: DownsampleShader.fragmentShader,
      }));
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

      const uniforms = THREE.UniformsUtils.clone(UpsampleShader.uniforms);
      uniforms.uOffset.value = new THREE.Vector4();

      this.fsQuad = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms,
        vertexShader: UpsampleShader.vertexShader,
        fragmentShader: UpsampleShader.fragmentShader,
      }));
    }

    render(renderer, writeBuffer, readBuffer) {
      this.fsQuad.material.uniforms['tDiffuse'].value = readBuffer.texture;
      renderer.setRenderTarget(writeBuffer);
      this.fsQuad.render(renderer);
    }
  }

  class BlurFx {
    constructor(maxDuals) {
      this.rts = [];
      this.passes = [];
      this.maxDuals = maxDuals;
      this.effectiveDuals = 0; // cache
      this.writeBuffer = null; // cache
      this.readBuffer = new THREE.WebGLRenderTarget(0, 0); // cache

      for (let i = 0, I = maxDuals; i < I; ++i) {
        this.passes[i] = new DownsamplePass();
        this.passes[maxDuals + i] = new UpsamplePass();
        this.rts[i] = new THREE.WebGLRenderTarget(0, 0);
        this.rts[maxDuals + i] = new THREE.WebGLRenderTarget(0, 0);
      }
    }

    setSize(w, h) {
      for (let i = 0, I = this.maxDuals; i < I; ++i) {
        this.rts[i].setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1)));
        this.rts[2 * I - i - 1].setSize(Math.max(1, w >> i), Math.max(1, h >> i));
      }
    }

    render(renderer, readBuffer, blurriness) {
      this.effectiveDuals = Math.ceil(Math.max(0, Math.min(1, blurriness)) * this.maxDuals);
      this.readBuffer = readBuffer;

      for (let i = 0, I = this.effectiveDuals; i < I; ++i) {
        this.writeBuffer = this.rts[i];
        this.passes[i].fsQuad.material.uniforms['uHalfPixel'].value.set(
          .5 / this.readBuffer.width, .5 / this.readBuffer.height
        );
        this.passes[i].render(renderer, this.writeBuffer, this.readBuffer);
        this.readBuffer = this.writeBuffer;
      }

      for (let I = this.rts.length, i = I - this.effectiveDuals; i < I; ++i) {
        this.writeBuffer = this.rts[i];
        this.passes[i].fsQuad.material.uniforms['uOffset'].value.set(
          .5 / this.readBuffer.width, .5 / this.readBuffer.height, // halfpixel
          1 / this.readBuffer.width, 1 / this.readBuffer.height // fullpixel
        );
        this.passes[i].render(renderer, this.writeBuffer, this.readBuffer);
        this.readBuffer = this.writeBuffer;
      }
    }
  }

  // expose
  return class DualBloomPass extends Pass {

    constructor({
      threshold = .5,
      blurriness = .5,
      intensity = .5,
      maxDuals = 8,
    }) {
      super();

      this._maxDuals = maxDuals;

      this._lumaPass = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(LumaShader.uniforms),
        vertexShader: LumaShader.vertexShader,
        fragmentShader: LumaShader.fragmentShader,
      }));
      this._lumaPass.material.uniforms['uThreshold'].value = threshold;

      this._blurFx = new BlurFx(maxDuals);
      this._blurriness = blurriness;

      this._combinePass = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(CombineShader.uniforms),
        vertexShader: CombineShader.vertexShader,
        fragmentShader: CombineShader.fragmentShader,
      }));
      this._combinePass.material.uniforms['uIntensity'].value = intensity;
    }

    render(renderer, writeBuffer, readBuffer) {
      if (this._combinePass.material.uniforms['uIntensity'].value !== 0) {
        // ---- luma pass
        renderer.setRenderTarget(writeBuffer);
        this._lumaPass.material.uniforms['tDiffuse'].value = readBuffer.texture;
        this._lumaPass.render(renderer);
        // ---- blur fx
        this._blurFx.render(renderer, writeBuffer, this._blurriness);
      }
      // ---- combine pass
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
        if (this.clear) renderer.clear();
      }
      this._combinePass.material.uniforms['tDiffuse'].value = readBuffer.texture;
      this._combinePass.material.uniforms['tBlurred'].value = this._blurFx.readBuffer.texture;
      this._combinePass.render(renderer);
    }

    setSize(w, h) {
      this._blurFx.setSize(w, h);
    }

    get intensity() { return this._combinePass.material.uniforms['uIntensity'].value }
    set intensity(value) {
      this._combinePass.material.uniforms['uIntensity'].value = value;
    }

    get threshold() { return this._lumaPass.material.uniforms['uThreshold'].value }
    set threshold(value) {
      this._lumaPass.material.uniforms['uThreshold'].value = value;
    }

    get blurriness() { return this._blurriness }
    set blurriness(value) {
      if (value > 1 || value < 0) {
        console.warn(`blurriness (${value}) will be clamped (in 0..1) internally`);
      }
      this._blurriness = value;
    }

    get maxDuals() { return this._maxDuals }
  };
}
