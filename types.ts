
import * as THREE from 'three';

export enum ParticleType {
  LEAF = 'LEAF',
  LIGHT = 'LIGHT',
  ORNAMENT_SPHERE = 'ORNAMENT_SPHERE',
  ORNAMENT_BOX = 'ORNAMENT_BOX',
  ORNAMENT_GEM = 'ORNAMENT_GEM',
  ORNAMENT_HEPTAGRAM = 'ORNAMENT_HEPTAGRAM',
  PHOTO = 'PHOTO'
}

export interface ParticleData {
  id: number;
  type: ParticleType;
  treePos: THREE.Vector3;
  randPos: THREE.Vector3;
  color: string;
  scale: number;
  textureUrl?: string; // For photos
}
