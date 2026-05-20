import * as THREE from 'three'

const TEXTURE_KEYS = [
  'map', 'lightMap', 'aoMap', 'emissiveMap', 'bumpMap', 
  'normalMap', 'displacementMap', 'roughnessMap', 'metalnessMap', 
  'alphaMap', 'envMap', 'gradientMap'
];

export function createRadialGradientTexture(WIDTH, HEIGHT) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT / 2, 0,
    WIDTH / 2, HEIGHT / 2, WIDTH / 2
  )

  gradient.addColorStop(0, '#303030')
  gradient.addColorStop(1, '#121212')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function debugMaterial(rootObject) {
  console.group('Material Debugger');

  rootObject.traverse((node) => {
    if (node.isMesh && node.material) {
      console.group(`Mesh: ${node.name || 'Unnamed Mesh'}`);

      const materials = Array.isArray(node.material) ? node.material : [node.material];

      materials.forEach((mat, index) => {
        console.log(`%c[Material ${index}]: ${mat.name || 'Unnamed'} (${mat.type})`, 'color: #00ff00; font-weight: bold;');

        const info = {
          'Color (Hex)': mat.color ? mat.color.getHexString() : 'N/A',
          'Metalness': mat.metalness ?? 'N/A (Not Standard)',
          'Roughness': mat.roughness ?? 'N/A (Not Standard)',
          'Emissive': mat.emissive ? mat.emissive.getHexString() : 'N/A',
          'Side': mat.side === 0 ? 'Front' : (mat.side === 1 ? 'Back' : 'Double'),
          'FlatShading': mat.flatShading,
          'Transparent': mat.transparent,
          'Opacity': mat.opacity
        };

        console.table(info);

        const maps = [];
        if (mat.map) maps.push('Albedo Map');
        if (mat.normalMap) maps.push('Normal Map');
        if (mat.roughnessMap) maps.push('Roughness Map');
        if (mat.metalnessMap) maps.push('Metalness Map');
        if (mat.envMap) maps.push('Environment Map (IBL)');

        if (maps.length > 0) {
          console.log('Textures:', maps.join(', '));
        } else {
          console.log('Textures: None');
        }
      });
      console.groupEnd();
    }
  });
  console.groupEnd();
}

/**
 * 
 * @param {THREE.Object3D | null} obj 
 * @returns 
 */
export function disposeScene(obj) {
  console.log("is disposing Scene")
  if (!obj) return

  if (obj.children) {
    [...obj.children].forEach(disposeScene)
  }

  obj.removeFromParent()

  if (obj.isLight) {
    if (obj.shadow && obj.shadow.map) {
      obj.shadow.map.dispose()
    }
  }

  if (obj.geometry) {
    obj.geometry.dispose()
  }

  if (obj.material) {
    disposeMaterial(obj.material)
  }

  if (obj.isSkinnedMesh) {
    if (obj.skeleton) {
      if (obj.skeleton.boneTexture) {
        obj.skeleton.boneTexture.dispose()
      }
      obj.skeleton.dispose()
    }
  }
}

/**
 * 
 * @param {THREE.Material | THREE.Material[] | null} material 
 * @returns 
 */
export function disposeMaterial(material) {
  console.log("is disposing Material")
  if (!material) return

  if (Array.isArray(material)) {
    material.forEach(disposeMaterial)
    return
  }

  for (const key of TEXTURE_KEYS) {
    let texture = material[key]
    if (texture && texture.isTexture) {
      texture.dispose()
    }
  }

  material.dispose()
}