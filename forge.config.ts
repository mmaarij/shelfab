import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDeb } from '@electron-forge/maker-deb';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/*.{node,dll}"
    },
    ignore: [/node_modules\/(?!(better-sqlite3|bindings|file-uri-to-path|electron-squirrel-startup|update-electron-app|debug|ms)\/)/],
    icon: './src/renderer/assets/shelfab-logo', // Forge handles extension based on OS
    executableName: 'shelfab',
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'shelfab',
      setupIcon: './src/renderer/assets/shelfab-logo.ico',
      loadingGif: './src/renderer/assets/installing.gif',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDMG({
      icon: './src/renderer/assets/shelfab-logo.ico'
    }, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'mmaarij',
        name: 'shelfab'
      },
      prerelease: false,
      draft: false, // Set to false for direct public releases if desired, or keep as draft
    })
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
