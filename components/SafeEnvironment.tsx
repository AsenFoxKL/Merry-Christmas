import React, { useEffect, useState } from 'react';
import { Environment } from '@react-three/drei';

/**
 * 安全加载环境贴图：
 * 1) 优先尝试本地 HDR (/assets/env/lobby.hdr)
 * 2) 若本地文件不可读或格式异常，则回退到 preset="lobby"
 * 保持显示效果一致，同时避免首屏因 HDR 拉取失败而报错阻塞
 */
const SafeEnvironment: React.FC = () => {
  const baseUrl = (import.meta as any)?.env?.BASE_URL || '/';
  const localEnv = `${baseUrl}assets/env/lobby.hdr`;
  const [useLocal, setUseLocal] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(localEnv, { cache: 'no-cache' });
        if (!resp.ok) throw new Error('HDR not found');
        const buf = await resp.arrayBuffer();
        const header = new TextDecoder('ascii').decode(new Uint8Array(buf.slice(0, 12)));
        // Radiance HDR 应以 "#?RADIANCE" 开头
        if (!header.startsWith('#?RADIANCE')) throw new Error('Bad HDR header');
        if (!cancelled) setUseLocal(true);
      } catch {
        if (!cancelled) setUseLocal(false);
      }
    })();
    return () => { cancelled = true; };
  }, [localEnv]);

  if (useLocal) return <Environment files={localEnv} />;
  return <Environment preset="lobby" />;
};

export default SafeEnvironment;
