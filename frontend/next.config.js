/** @type {import('next').NextConfig} */
module.exports = (phase) => ({
  output: 'export',
  distDir: phase === 'phase-development-server' ? '.next-dev' : '.next',
  trailingSlash: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  webpack(config) {
    // Dictation explicitly uses CPU/WASM, not GPU/WebNN. Keep the same ONNX
    // kernels/models while avoiding unused GPU code and its larger runtimes.
    config.resolve.alias['onnxruntime-web/webgpu$'] = require.resolve('onnxruntime-web/wasm').replace(/\.js$/, '.mjs');
    return config;
  },
  images: { unoptimized: true }
});
