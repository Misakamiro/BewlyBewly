// prepare extension assets and write manifest.json
// (options/popup demo pages已移除,不再生成它们的 dev stub)
import chokidar from 'chokidar'
import fs from 'fs-extra'

import { writeManifest } from './manifest'
import { isDev, isFirefox, isSafari, r } from './utils'

async function main() {
  fs.ensureDirSync(r(isFirefox ? 'extension-firefox' : isSafari ? 'extension-safari' : 'extension'))
  fs.copySync(r('assets'), r(isFirefox ? 'extension-firefox/assets' : isSafari ? 'extension-safari/assets' : 'extension/assets'))
  await writeManifest()

  if (isDev) {
    chokidar.watch([r('src/manifest.ts'), r('package.json')])
      .on('change', () => {
        writeManifest().catch(console.error)
      })
  }
}

main()
