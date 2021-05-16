# About

Dual Bloom ( and Dual Blur ) pass for threejs postprocessing.

[Live examples](https://ycw.github.io/three-dual-bloom/example/)



## Installation

via cdn

https://cdn.jsdelivr.net/gh/ycw/three-dual-bloom@{VERSION}/src/index.js

via npm

`$ npm i ycw/three-dual-bloom` or

`$ npm i ycw/three-dual-bloom#{VERSION_TAG}`



## Usage

Dual Bloom: ( [example](https://ycw.github.io/three-dual-bloom/example/dual-bloom/) )

```js
import * as THREE from 'three'
import { EffectComposer, Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { DualBloomPassGen } from 'three-dual-bloom'

// Generate DualBloomPass class
const DualBloomPass = DualBloomPassGen({ THREE, Pass, FullScreenQuad }); 

// Create DualBloomPass instance
const myDualBloomPass = new DualBloomPass({
  maxDuals: 8, // Max available blur size, immutable after creation. ( >= 1 ) 
  blurriness: .5, // Ratio of `maxDuals`, mutable. ( 0. <= blurriness <= 1. ) 
  threshold: .5, // Bloom if luma > `threshold`. ( 0. <= threshold <= 1. )
  intensity: 2. // Bloom intensity. ( >= 0. )
});

// Add to EffectComposer 
const fx = new EffectComposer(renderer);
fx.addPass(new RenderPass(scene, camera));
fx.addPass(myDualBloomPass);

// APIs
myDualBloomPass.maxDuals; //-> 8 
myDualBloomPass.threshold = 0.; // =always pass 
myDualBloomPass.blurriness = 1.; // =max blur 
myDualBloomPass.intensity = 0.; // =no bloom 
```

Dual Blur: ( [example](https://ycw.github.io/three-dual-bloom/example/dual-blur/) )

```js
...
import { DualBlurPassGen } from 'three-dual-bloom'

...
const DualBlurPass = DualBlurPassGen({ THREE, Pass, FullScreenQuad });
const myDualBlurPass = new DualBlurPass({ 
  maxDuals: 8, // Max available blur size, immutable after creation. ( >= 1 ) 
  duals: 4 // prop. to blurriness; ( >= 1 )
});

// APIs
myDualBlurPass.maxDuals; //-> 8
myDualBlurPAss.duals = 0; // warn ( will clamp in range 1..maxDuals internally )
```



## Credits

[mrdoob / three.js](https://github.com/mrdoob/three.js/)

[Marius Bjørge / Bandwidth-efficient graphics - siggraph2015](https://community.arm.com/cfs-file/__key/communityserver-blogs-components-weblogfiles%2F00-00-00-20-66%2Fsiggraph2015_2D00_mmg_2D00_marius_2D00_notes.pdf)




## License

[MIT](./LICENSE)