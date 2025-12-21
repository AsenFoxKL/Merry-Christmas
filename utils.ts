
import * as THREE from 'three';
import { ParticleType, ParticleData } from './types';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const generateTreeData = (count: number): ParticleData[] => {
  const data: ParticleData[] = [];
  const height = 15;
  const maxRadius = 5;

  /**
   * 图片预置说明：
   * 1. 预览阶段：我们使用 picsum.photos 的网络图片确保应用不崩溃。
   * 2. 部署阶段：如果你要在 GitHub 仓库中放自己的照片，请：
   *    - 在根目录创建 memories/ 文件夹并放入 photo1.jpg 等。
   *    - 将下面的数组改为 ['./memories/photo1.jpg', './memories/photo2.jpg', ...]
   */
  const photoUrls = [
    'memories/photo2.jpg',
    'memories/photo3.jpg',
    'memories/photo4.jpg',
    'memories/photo5.jpg',
    'memories/photo6.jpg',
    'memories/photo7.jpg',
    'memories/photo8.jpg',
    'memories/photo9.jpg',
    'memories/photo10.jpg',
    'memories/photo11.jpg',    
    'memories/photo12.jpg',
    'memories/photo13.jpg',
    'memories/photo14.jpg',
    'memories/photo15.jpg',
    'memories/photo16.jpg',
    'memories/photo17.jpg',
    'memories/photo18.jpg',
    'memories/photo19.jpg',
    'memories/photo20.jpg',
    'memories/photo21.jpg',
    'memories/photo22.jpg',
  ];

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const y = t * height;
    const angle = i * GOLDEN_ANGLE;
    const baseR = (1 - t) * maxRadius;
    const layerWave = Math.sin(t * 25.0) * 0.8 * (1 - t);
    
    let type: ParticleType;
    let color: string = '#ffffff';
    let scale: number = 1;
    let radiusOffset = 0;
    let textureUrl: string | undefined;

    const rand = Math.random();
    const normalizedY = t;

    if (rand < 0.6) {
      type = ParticleType.LEAF;
      radiusOffset = Math.random() * 0.2;
      color = '#003318';
      scale = 0.6 + Math.random() * 0.4;
    } else if (rand < 0.75) {
      const ornamentRand = Math.random();
      radiusOffset = 0.4 + Math.random() * 0.2;
      color = Math.random() > 0.5 ? '#FFD700' : '#8a0a0a';
      
      if (ornamentRand < 0.25) type = ParticleType.ORNAMENT_SPHERE;
      else if (ornamentRand < 0.5) type = ParticleType.ORNAMENT_BOX;
      else if (ornamentRand < 0.75) type = ParticleType.ORNAMENT_GEM;
      else type = ParticleType.ORNAMENT_HEPTAGRAM;
      
      scale = 1.0 + Math.random() * 0.5;
    } else if (rand < 0.85 && normalizedY > 0.1 && normalizedY < 0.85) {
      type = ParticleType.PHOTO;
      radiusOffset = 0.8;
      const photoIndex = Math.floor(Math.random() * photoUrls.length);
      textureUrl = photoUrls[photoIndex];
      scale = 2.0; 
      color = '#ffffff';
    } else {
      type = ParticleType.LIGHT;
      radiusOffset = 0.25 + Math.random() * 0.2;
      const lightColors = ['#00FFFF', '#FF69B4', '#FFA500', '#FFFFFF'];
      color = lightColors[Math.floor(Math.random() * lightColors.length)];
      scale = 0.7;
    }

    const r = baseR + layerWave + radiusOffset;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const treePos = new THREE.Vector3(x, y, z);
    
    const randPos = new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40
    );

    data.push({ id: i, type, treePos, randPos, color, scale, textureUrl });
  }
  return data;
};

export const generateGoldDustData = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const t = Math.random();
    const y = t * 15.5;
    const angle = Math.random() * Math.PI * 2;
    const r = (1 - t) * 5.5 + 0.5;
    return {
      treePos: new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
      randPos: new THREE.Vector3((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40),
      velocity: new THREE.Vector3(),
      phase: Math.random() * Math.PI * 2
    };
  });
};

export const createStarShape = (spikes = 5, outerRadius = 1, innerRadius = 0.4) => {
  const shape = new THREE.Shape();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI * i) / spikes;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
};
