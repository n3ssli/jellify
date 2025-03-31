# Jellify

<p align="center">
  <img src="public/icon.png" alt="Jellify Logo" width="200"/>
</p>

<p align="center">
  <b>A modern Electron-based music player for Jellyfin with a Spotify-inspired UI</b>
</p>

<p align="center">
  <img src="screenshots/app-screenshot.png" alt="Jellify App Screenshot" width="800"/>
</p>

## About

Jellify is an elegant desktop music player that connects to your Jellyfin server to deliver a premium music listening experience. Featuring a clean, Spotify-inspired interface, Jellify brings the best of Jellyfin's media capabilities to a dedicated music application.

## Features

- **Spotify-like Interface**: Clean, modern UI inspired by Spotify for intuitive music browsing
- **Full Jellyfin Integration**: Connect to your self-hosted Jellyfin server to access your music library
- **Advanced Audio Playback**:
  - Gapless playback
  - Crossfading between tracks (customizable duration)
  - Professional-grade equalizer with multiple presets
  - Volume normalization
- **Comprehensive Library Management**:
  - Browse by artists, albums, genres
  - View recently added music
  - Create and manage playlists
  - Mark favorites/liked songs
- **Playback Controls**:
  - Shuffle and repeat modes (Off/All/One)
  - Queue management with drag-and-drop reordering
  - Play Next/Add to Queue functionality
- **Search**: Quickly find albums, artists, songs, or playlists
- **Rich Media Experience**: 
  - Album artwork display
  - Artist images
  - Track information
- **Desktop Integration**:
  - Media key support
  - System notifications
  - Discord Rich Presence integration
  - Taskbar/dock controls

## Installation

### Pre-built Binaries

The easiest way to install Jellify is to download the pre-built binaries from the [Releases](https://github.com/yourusername/jellify/releases) page.

#### Windows

1. Download the latest `Jellify-Setup-x.x.x.exe` from the Releases page
2. Run the installer and follow the on-screen instructions
3. Jellify will be installed and a desktop shortcut will be created

#### Linux

1. Download the latest `Jellify-x.x.x.AppImage` from the Releases page
2. Make the AppImage executable:
   ```bash
   chmod +x Jellify-x.x.x.AppImage
   ```
3. Run the AppImage:
   ```bash
   ./Jellify-x.x.x.AppImage
   ```
4. Optionally, you can use the `scripts/build-linux.sh` script to create a desktop shortcut:
   ```bash
   ./scripts/build-linux.sh
   ```

### Build from Source

#### Common Prerequisites

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jellify.git
   cd jellify
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

#### Build for Linux

1. Run the Linux build script:
   ```bash
   ./scripts/build-linux.sh
   ```
   This will:
   - Build the application
   - Create an AppImage in the `dist` directory
   - Ask you where to install the application
   - Create a desktop shortcut

Alternatively, you can build manually:
```bash
npm run build
```

#### Build for Windows

1. Run the Windows build script:
   ```cmd
   scripts\build-windows.bat
   ```
   This will:
   - Build the application
   - Create an NSIS installer in the `dist` directory
   - Ask you where to install the application
   - Create a desktop shortcut

Alternatively, you can build manually:
```cmd
npm run build:windows
```

#### Development Mode

Start the development version:
```bash
npm run dev
```

## Configuration

On first launch, you'll need to connect to your Jellyfin server:

1. Enter your Jellyfin server URL (e.g., http://192.168.1.100:8096)
2. Log in with your Jellyfin username and password
3. Your music library will be automatically imported

## Requirements

- **Jellyfin Server**: Running instance of Jellyfin with music libraries configured
- **Operating System**: Windows 10+ or Linux (Ubuntu 20.04+, Fedora 35+, Arch Linux, etc.)
- **Storage**: Minimal local storage required as music streams from your server
- **Network**: Stable network connection to your Jellyfin server

## Technology Stack

Jellify is built with modern web technologies packaged as a desktop application:

- **Electron**: Cross-platform desktop application framework
- **React**: Frontend UI library
- **Web Audio API**: For advanced audio processing
- **Axios**: For API communication with Jellyfin server
- **HTML5 Audio**: Core audio playback functionality
- **Material-UI**: UI components and styling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- [Jellyfin](https://jellyfin.org/) for the amazing media server
- [Electron](https://www.electronjs.org/) for making cross-platform desktop apps easy
- [React](https://reactjs.org/) for the UI framework
- All the contributors who have helped improve Jellify
- Amelia for the beautiful logo

---

<p align="center">
  Made with ❤️ for music lovers and self-hosters
</p> 