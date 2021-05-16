import { LumaShader, CombineShader } from './DualBloomShader.js'
import { DualBlurPassGen } from './DualBlurPassGen.js'

export function DualBloomPassGen({ THREE, Pass, FullScreenQuad }) {

  const DualBlurPass = DualBlurPassGen({ THREE, Pass, FullScreenQuad });

  // expose
  return class DualBloomPass extends Pass {

    constructor({
      threshold = .5,
      blurriness = .5,
      intensity = .5,
      maxDuals = 8,
    }) {
      super();

      this._lumaPass = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(LumaShader.uniforms),
        vertexShader: LumaShader.vertexShader,
        fragmentShader: LumaShader.fragmentShader,
      }));
      this._lumaPass.material.uniforms['uThreshold'].value = threshold;
      this._lumaRT = new THREE.WebGLRenderTarget(0, 0);

      this._dualBlurPass = new DualBlurPass({ maxDuals });
      this._dualBlurRT = new THREE.WebGLRenderTarget(0, 0); 
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
        renderer.setRenderTarget(this._lumaRT);
        this._lumaPass.material.uniforms['tDiffuse'].value = readBuffer.texture;
        this._lumaPass.render(renderer);
        // ---- dual blur pass
        this._dualBlurPass.renderToScreen = false;
        this._dualBlurPass.render(renderer, this._dualBlurRT, this._lumaRT);
      }
      // ---- combine pass
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
        if (this.clear) renderer.clear();
      }
      this._combinePass.material.uniforms['tDiffuse'].value = readBuffer.texture;
      this._combinePass.material.uniforms['tBlurred'].value = this._dualBlurRT.texture;
      this._combinePass.render(renderer);
    }

    setSize(w, h) {
      this._lumaRT.setSize(w, h);
      this._dualBlurRT.setSize(w, h);
      this._dualBlurPass.setSize(w, h);
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
      this._blurriness = value;
      if (value > 1 || value < 0) {
        console.warn(`blurriness (${value}) will be clamped (in 0..1) internally`);
        this._dualBlurPass.duals = Math.ceil(Math.max(0, Math.min(1, value)) * this._dualBlurPass.maxDuals);
      } else {
        this._dualBlurPass.duals = Math.ceil(value * this._dualBlurPass.maxDuals);
      }
    }

    get maxDuals() { return this._dualBlurPass._maxDuals }
  };
}
