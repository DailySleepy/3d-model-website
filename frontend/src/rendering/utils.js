import * as THREE from 'three'

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
