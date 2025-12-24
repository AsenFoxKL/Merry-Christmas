Local HDR environment assets for offline/China-friendly loading.

Expected file for current scene:
- lobby.hdr (matches @react-three/drei `preset="lobby"`)

Suggested sources:
- Poly Haven HDRI (choose the Lobby/Equirectangular variant): https://polyhaven.com/hdris
- PMNDRS/drei CDN file (download once, then self-host): https://cdn.pmndrs.com/drei

Place HDR at:
- /assets/env/lobby.hdr

Notes:
- Keep resolution modest (1k~2k) for faster initial load on GitHub Pages.
- Ensure file name matches `App.tsx` configuration.
