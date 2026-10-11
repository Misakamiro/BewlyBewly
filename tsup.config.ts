import path from 'node:path'

import fs from 'fs-extra'
import { defineConfig } from 'tsup'

import { isDev, isFirefox, isSafari, port } from './scripts/utils'

const outDir = isFirefox ? 'extension-firefox/dist' : isSafari ? 'extension-safari/dist' : 'extension/dist'

export default defineConfig(() => ({
  entry: {
    'background/index': './src/background/index.ts',
    ...(isDev ? { mv3client: './scripts/client.ts' } : {}),
  },
  async onSuccess() {
    fs.copySync(path.resolve(__dirname, './src/inject/index.js'), path.resolve(__dirname, `./${outDir}/inject/index.js`))
  },
  outDir,
  format: ['esm'],
  target: 'esnext',
  ignoreWatch: ['**/extension/**', '**/extension-firefox/**', '**/extension-safari/**'],
  splitting: false,
  sourcemap: false, // https://github.com/vitejs/vite-plugin-vue/issues/35
  define: {
    '__DEV__': JSON.stringify(isDev),
    'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
    'process.env.FIREFOX': isFirefox ? 'true' : 'false',
    // dev HMR 客户端要连回 Vite dev server,端口由 scripts/utils.ts 统一决定
    // (PORT 环境变量优先),不能在 client.ts 里再硬编码一份
    'process.env.PORT': JSON.stringify(String(port)),
  },
  platform: 'browser',
  minifyWhitespace: !isDev,
  minifySyntax: !isDev,
}))
