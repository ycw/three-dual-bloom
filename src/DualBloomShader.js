export const LumaShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'uThreshold': { value: 0. }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uThreshold;
    varying vec2 vUv;
    void main() {
      vec4 T = texture2D( tDiffuse, vUv );
      float L = (T.r + T.r + T.g + T.g + T.g + T.b) / 6.;
      gl_FragColor = step( uThreshold, L ) * T;
    }
  `
};



export const DownsampleShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'uHalfPixel': { value: null }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uHalfPixel;
    varying vec2 vUv;
    void main() {
      gl_FragColor = (4. * texture2D( tDiffuse, vUv )
        + texture2D( tDiffuse, vUv - uHalfPixel.xy)
        + texture2D( tDiffuse, vUv + uHalfPixel.xy)
        + texture2D( tDiffuse, vUv + vec2( uHalfPixel.x, -uHalfPixel.y ) )
        + texture2D( tDiffuse, vUv + vec2( -uHalfPixel.x, uHalfPixel.y ) )
      ) / 8.;
    }
  `
};



export const UpsampleShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'uOffset': { value: null } // .xy=half px; .zw=full px
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec4 uOffset;
    varying vec2 vUv;
    void main() {
      // half px
      gl_FragColor = ( 2. * (
        texture2D( tDiffuse, vUv + uOffset.xy )
        + texture2D( tDiffuse, vUv - uOffset.xy )
        + texture2D( tDiffuse, vUv + vec2( uOffset.x, -uOffset.y ) )
        + texture2D( tDiffuse, vUv + vec2( -uOffset.x, uOffset.y ) )
      ) + texture2D( tDiffuse, vUv + vec2( uOffset.z, 0. ) )
        + texture2D( tDiffuse, vUv + vec2( 0., uOffset.w ) )
        + texture2D( tDiffuse, vUv + vec2( -uOffset.z, 0. ) )
        + texture2D( tDiffuse, vUv + vec2( 0., -uOffset.w ) )
      ) / 12.;
    }
  `
};



export const CombineShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'tBlurred': { value: null },
    'uIntensity': { value: 0. },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBlurred;
    uniform float uIntensity;
    varying vec2 vUv;
    void main() {
      vec4 D = texture2D( tDiffuse, vUv );
      vec4 B = texture2D( tBlurred, vUv );
      gl_FragColor = D + uIntensity * B;
    }
  `
};