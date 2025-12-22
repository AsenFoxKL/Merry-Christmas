
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Points = 'points' as any;
const BufferGeometry = 'bufferGeometry' as any;
const BufferAttribute = 'bufferAttribute' as any;
const Primitive = 'primitive' as any;
const PointsMaterial = 'pointsMaterial' as any;

const snowVertexShader = `
  uniform float uTime;
  attribute float aSize;
  attribute float aSpeed;
  attribute vec3 aOffset;
  varying float vAlpha;

  void main() {
    vec3 pos = position + aOffset;
    // Slow motion falling logic
    pos.y = mod(pos.y - uTime * aSpeed * 0.5, 50.0) - 15.0;
    pos.x += sin(uTime * 0.3 + aOffset.y) * 2.5;
    pos.z += cos(uTime * 0.15 + aOffset.x) * 2.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    // Depth-based size attenuation
    gl_PointSize = aSize * (500.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    // Smooth fade in/out at boundaries
    vAlpha = smoothstep(-15.0, -5.0, pos.y) * (1.0 - smoothstep(30.0, 35.0, pos.y));
  }
`;

const snowFragmentShader = `
  varying float vAlpha;
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    // Softer edges for snow flakes
    float strength = pow(1.0 - dist * 2.0, 1.5);
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * strength * 0.9);
  }
`;

const Atmosphere: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  const snowCount = isMobile ? 2000 : 4500; // Reduce snow particles on mobile
  const snowRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Points>(null);

  const snowData = useMemo(() => {
    const size = new Float32Array(snowCount);
    const speed = new Float32Array(snowCount);
    const offset = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      // Wider distribution
      offset[i * 3] = (Math.random() - 0.5) * (isMobile ? 60 : 100);
      offset[i * 3 + 1] = Math.random() * 50;
      offset[i * 3 + 2] = (Math.random() - 0.5) * (isMobile ? 60 : 100);
      size[i] = Math.random() * 0.6 + 0.15;
      speed[i] = Math.random() * 1.2 + 0.3; // Slower speed for "slow-mo" feel
    }
    return { size, speed, offset };
  }, []);

  const glowCount = isMobile ? 100 : 250; // Significantly reduce glow particles on mobile
  const glowData = useMemo(() => {
    const pos = new Float32Array(glowCount * 3);
    for (let i = 0; i < glowCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (isMobile ? 50 : 80);
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * (isMobile ? 50 : 80);
    }
    return pos;
  }, [glowCount, isMobile]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (snowRef.current) {
      (snowRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
    if (glowRef.current) {
        glowRef.current.rotation.y = time * 0.02;
        const opacities = glowRef.current.geometry.attributes.opacity;
        if (opacities) {
            for(let i=0; i<glowCount; i++) {
                (opacities.array as Float32Array)[i] = 0.15 + Math.sin(time * 1.2 + i) * 0.25;
            }
            opacities.needsUpdate = true;
        }
    }
  });

  const snowMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: snowVertexShader,
    fragmentShader: snowFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  return (
    <>
      <Points ref={snowRef}>
        <BufferGeometry>
          <BufferAttribute attach="attributes-position" count={snowCount} array={new Float32Array(snowCount * 3)} itemSize={3} />
          <BufferAttribute attach="attributes-aOffset" count={snowCount} array={snowData.offset} itemSize={3} />
          <BufferAttribute attach="attributes-aSize" count={snowCount} array={snowData.size} itemSize={1} />
          <BufferAttribute attach="attributes-aSpeed" count={snowCount} array={snowData.speed} itemSize={1} />
        </BufferGeometry>
        <Primitive object={snowMaterial} attach="material" />
      </Points>

      <Points ref={glowRef}>
        <BufferGeometry>
          <BufferAttribute attach="attributes-position" count={glowCount} array={glowData} itemSize={3} />
          <BufferAttribute attach="attributes-opacity" count={glowCount} array={new Float32Array(glowCount).fill(1)} itemSize={1} />
        </BufferGeometry>
        <PointsMaterial 
          size={0.8} 
          color="#FFD700" 
          transparent 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
          sizeAttenuation={true}
          opacity={0.4}
        />
      </Points>
    </>
  );
};

export default Atmosphere;
