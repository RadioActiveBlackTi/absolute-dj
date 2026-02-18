# Absolute DJ

A desktop application built with Electron that transforms your DJ into an animated character that responds to audio and screen activity. The application features a customizable character skin that dances and animates based on audio frequency analysis and desktop screen capture.

## Features

- **Interactive DJ Character**: An animated DJ character that reacts to audio input and desktop activity
- **Customizable Skins**: Load and switch between different character skins from the `assets` folder (supports PNG, JPG, JPEG, GIF, WebP)
- **Audio-Responsive Animation**: 
  - **Scale**: Character size responds to bass frequencies
  - **Skew**: Character skews based on mid-range frequencies  
  - **Rotation**: Character rotates based on high frequencies
  - **Flipping**: Character flips horizontally when bass exceeds threshold
- **Configurable Window**: 
  - Always-on-top frameless window with transparent background
  - Resizable and draggable interface
  - Persistent configuration storage
- **Easy Configuration**: JSON-based configuration system for animation parameters and window settings
- **Screen Capture Integration**: Desktop screen capture capability for visual feedback

## System Requirements

- Node.js and npm
- Windows (configured for Windows distribution with NSIS installer)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd absolute-dj
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Development

Start the application in development mode:
```bash
npm start
```

### Building

Create a Windows installer:
```bash
npm run dist
```

The installer will be created in the `dist` folder.

## Configuration

### General Configuration

Located in `configs/general_config.json`:
```json
{
  "window": {
    "width": 400,
    "height": 400,
    "alwaysOnTop": true
  },
  "appConfig": "default_config"
}
```

- **width/height**: Initial window size in pixels
- **alwaysOnTop**: Keep window above other windows
- **appConfig**: Which app configuration file to load

### Animation Configuration

Located in `configs/app_configs/default_config.json`:

```json
{
  "image": "character_skin.webp",
  "scale": {
    "base": 0.8,
    "pow": 1.2,
    "amp": 8.0,
    "bias": -4.0
  },
  "skew": {
    "amp": 80,
    "pow": 2.0,
    "dirIdx": 15
  },
  "rotate": {
    "amp": 60,
    "bias": -5
  },
  "flip": {
    "threshold": 200,
    "prob": 0.6
  },
  "lerpAmt": {
    "scale": 0.9,
    "skew": 0.3,
    "rotate": 0.2
  }
}
```

**Animation Parameters**:
- **scale**: Bass frequency response (controls character size)
  - `base`: Base scale value
  - `pow`: Power curve for frequency response
  - `amp`: Amplitude multiplier
  - `bias`: Bias offset

- **skew**: Mid-frequency response (controls character distortion)
  - `amp`: Skew amount
  - `pow`: Power curve
  - `dirIdx`: Frequency bin index for direction control

- **rotate**: High-frequency response (controls rotation)
  - `amp`: Rotation amount in degrees
  - `bias`: Base rotation offset

- **flip**: Bass threshold flipping
  - `threshold`: Bass level threshold for flipping
  - `prob`: Probability of flipping (0-1)

- **lerpAmt**: Smoothing/responsiveness (0-1)
  - Higher values = more responsive but less smooth
  - Lower values = smoother but less responsive

## Project Structure

```
absolute-dj/
├── main.js              # Electron main process
├── renderer.js          # Renderer process logic (configuration, animation)
├── index.html           # UI template
├── package.json         # Project dependencies and build config
├── assets/              # Character skins folder
├── configs/
│   ├── general_config.json           # Window and app settings
│   └── app_configs/
│       └── default_config.json       # Animation parameters
└── README.md            # This file
```

## Key Files

- **main.js**: Electron main process that creates the transparent, always-on-top window and handles IPC communication
- **renderer.js**: Handles audio analysis, animation logic, skin/configuration management, and canvas pixel checking
- **index.html**: UI structure with the DJ character container and styling

## License

See [LICENSE](LICENSE) file for details.

## Author

RadioActiveBlackTi
