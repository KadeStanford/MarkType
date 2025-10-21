Place platform-specific icon files in this folder before running `npm run electron:build`.

- Windows: provide `icon.ico` (recommended sizes: 256x256, includes multiple sizes inside the ICO).
- macOS: provide `icon.icns` (generated from .png or .tiff sources).
- Linux: provide PNG icons (recommended sizes: 256x256 and 512x512) in this folder; electron-builder will use them for AppImage.

If you don't provide icons, electron-builder will build but the app will use a default icon.

You can create icons using a tool like `png2icons`, `iconutil` (macOS), or online icon generators. For testing you can reuse `docs/examples/assets/marktype-demo.svg` by converting it into PNG/ICO/ICNS formats.
