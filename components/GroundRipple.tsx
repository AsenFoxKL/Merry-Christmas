
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Points = 'points' as any;
const BufferGeometry = 'bufferGeometry' as any;
const BufferAttribute = 'bufferAttribute' as any;
const Primitive = 'primitive' as any;

const rippleVertexShader = `
  uniform float uTime;
  uniform float uExplodeFactor;
  uniform float uAssembleProgress;
  varying float vHeight;
  varying float vDist;
  varying float vOriginalDist;

  void main() {
    vec3 pos = position;
    float originalDist = length(pos.xz);
    vOriginalDist = originalDist;

    // Bloom out: Push particles outward based on explode factor
    float expansion = 1.0 + uExplodeFactor * 0.6;
    pos.xz *= expansion;
    
    float dist = length(pos.xz);
    vDist = dist;

    // Complex wave logic
    float wave1 = sin(dist * 0.35 - uTime * 1.2) * (0.6 + uExplodeFactor * 0.4);
    float wave2 = sin(pos.x * 0.15 + uTime * 0.8) * cos(pos.z * 0.15 + uTime * 0.8) * 0.4;
    float wave3 = sin(dist * 0.8 + uTime * 2.0) * 0.2;
    
    pos.y += wave1 + wave2 + wave3;
    vHeight = pos.y;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    float sizeFactor = smoothstep(30.0, 0.0, dist);
    gl_PointSize = (3.5 + sizeFactor * 4.0) * (20.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const rippleFragmentShader = `
  uniform float uAssembleProgress;
  uniform float uExplodeFactor;
  varying float vHeight;
  varying float vDist;
  varying float vOriginalDist;

  void main() {
    float ptDist = distance(gl_PointCoord, vec2(0.5));
    if (ptDist > 0.5) discard;

    vec3 deepSpace = vec3(0.01, 0.02, 0.08);
    vec3 nebulaBlue = vec3(0.0, 0.2, 0.6);
    vec3 cosmicCyan = vec3(0.4, 0.8, 1.0);
    vec3 starWhite = vec3(0.9, 0.95, 1.0);
    
    float h = smoothstep(-1.2, 1.2, vHeight);
    vec3 baseColor = mix(deepSpace, nebulaBlue, h);
    float peakGlow = pow(smoothstep(0.2, 1.0, h), 2.5);
    vec3 color = mix(baseColor, cosmicCyan, peakGlow);
    float sparkle = pow(h, 6.0) * 0.8;
    color = mix(color, starWhite, sparkle);

    // Assembly radial wipe effect
    // Progress 0..1 corresponds to 0..radius wipe
    float radialReveal = smoothstep(uAssembleProgress * 40.0, uAssembleProgress * 40.0 - 5.0, vOriginalDist);
    
    // When exploded, we bypass the wipe or keep it at 1.0
    float wipeAlpha = mix(radialReveal, 1.0, uExplodeFactor);

    float diskAlpha = smoothstep(35.0, 25.0, vDist);
    float alpha = 0.9 * (1.0 - ptDist * 2.0) * diskAlpha * wipeAlpha;

    gl_FragColor = vec4(color, alpha);
  }
`;

const GroundRipple: React.FC<{ isExploded: boolean; isMobile?: boolean }> = ({ isExploded, isMobile = false }) => {
  const count = isMobile ? 5000 : 80000; // Mobile: 减少到 5000
  const radius = 29;
  const ref = useRef<THREE.Points>(null);
  
  // Transitions state
  const explodeFactor = useRef(0);
  const assembleProgress = useRef(1); // 1 = fully visible

  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const angle = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    return pos;
  }, [count, radius]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uExplodeFactor: { value: 0 },
    uAssembleProgress: { value: 1.0 }
  }), []);

  // Detect state changes to trigger "drop" effect on assembly
  useEffect(() => {
    if (!isExploded) {
      assembleProgress.current = 0; // Restart radial wipe
    }
  }, [isExploded]);

  useFrame((state) => {
    if (!ref.current) return;
    const material = ref.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = state.clock.getElapsedTime();

    // Smooth lerp for explode expansion
    const targetExplode = isExploded ? 1 : 0;
    explodeFactor.current = THREE.MathUtils.lerp(explodeFactor.current, targetExplode, 0.05);
    material.uniforms.uExplodeFactor.value = explodeFactor.current;

    // Assembly wipe logic
    if (!isExploded && assembleProgress.current < 1.0) {
      assembleProgress.current += 0.015; // Speed of the wipe
    } else if (isExploded) {
      assembleProgress.current = 1.0;
    }
    material.uniforms.uAssembleProgress.value = assembleProgress.current;
  });

  return (
    <Points ref={ref} position={[0, -0.2, 0]}>
      <BufferGeometry>
        <BufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={particles} 
          itemSize={3} 
        />
      </BufferGeometry>
      <Primitive 
        object={new THREE.ShaderMaterial({
          uniforms,
          vertexShader: rippleVertexShader,
          fragmentShader: rippleFragmentShader,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })} 
        attach="material" 
      />
    </Points>
  );
};

export default GroundRipple;
