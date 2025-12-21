
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
    pos.y = mod(pos.y - uTime * aSpeed, 40.0) - 10.0;
    pos.x += sin(uTime * 0.4 + aOffset.y) * 1.5;
    pos.z += cos(uTime * 0.2 + aOffset.x) * 1.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    vAlpha = smoothstep(-10.0, -5.0, pos.y) * (1.0 - smoothstep(25.0, 30.0, pos.y));
  }
`;

const snowFragmentShader = `
  varying float vAlpha;
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * (0.8 - dist * 2.0));
  }
`;

const Atmosphere: React.FC = () => {
  const snowCount = 1000;
  const snowRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Points>(null);

  const snowData = useMemo(() => {
    const size = new Float32Array(snowCount);
    const speed = new Float32Array(snowCount);
    const offset = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      offset[i * 3] = (Math.random() - 0.5) * 60;
      offset[i * 3 + 1] = Math.random() * 40;
      offset[i * 3 + 2] = (Math.random() - 0.5) * 60;
      size[i] = Math.random() * 0.4 + 0.1;
      speed[i] = Math.random() * 1.5 + 0.5;
    }
    return { size, speed, offset };
  }, []);

  const glowCount = 100;
  const glowData = useMemo(() => {
    const pos = new Float32Array(glowCount * 3);
    for (let i = 0; i < glowCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = Math.random() * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (snowRef.current) {
      (snowRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
    // 降低频率更新 Glow
    if (glowRef.current && Math.floor(time * 60) % 2 === 0) {
        glowRef.current.rotation.y = time * 0.03;
        const opacities = glowRef.current.geometry.attributes.opacity;
        if (opacities) {
            for(let i=0; i<glowCount; i++) {
                (opacities.array as Float32Array)[i] = 0.1 + Math.sin(time * 1.5 + i) * 0.2;
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
          size={0.6} 
          color="#ffcc00" 
          transparent 
          blending={THREE.AdditiveBlending} 
          depthWrite={false}
          sizeAttenuation={true}
          opacity={0.3}
        />
      </Points>
    </>
  );
};

export default Atmosphere;
