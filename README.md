# ChronoGhost

A modern, transparent countdown timer built with Tauri and React. Features a beautiful glassmorphism design with smooth animations and always-on-top functionality.

## 📌 Project Status

**This is a learning project.** Built to explore Tauri and practice building desktop apps. I don't intend to actively maintain or update it.

Feel free to:
- Fork it and make it your own
- Submit pull requests (but I might not review them quickly, or at all)
- Use the code for your own projects

No guarantees, no roadmap, no active support. It works for what I needed, and now it's here if it helps anyone else.

## ✨ Features

- 🎨 **Glassmorphism Design** - Beautiful transparent UI with backdrop blur
- 🪟 **Frameless Window** - Custom window controls with Windows-style buttons
- 📌 **Always On Top** - Stays visible while you work
- 🎯 **Fully Responsive** - Scales beautifully from 320px to any size
- ⌨️ **Keyboard Support** - Spacebar to start/pause, R to reset, Escape to reset
- 🎭 **Animated Title** - Eye-catching BlurText animation on startup
- ⏱️ **Countdown Timer** - Set hours, minutes, and seconds with +/- buttons
- 🚀 **Cross-Platform** - Windows, macOS, and Linux support

## 📦 Installation

### Download Pre-built Binaries

Download the latest release for your platform from the [Releases](../../releases/latest) page:

- **Windows**: `.exe` or `.msi` installer
- **macOS**: `.dmg` or `.app` bundle (Apple Silicon)
- **Linux**: `.deb` package or `.AppImage`

### ⚠️ Windows SmartScreen Warning

Windows will show a security warning when running the installer because this app is not code-signed.

**To install:**
1. Click "More info"
2. Click "Run anyway"

This is normal for unsigned open-source software. The code is available for review - I just didn't pay for a code signing certificate for a learning project.

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [Rust](https://rustup.rs/) (latest stable)
- Platform-specific dependencies:
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: See [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites#setting-up-linux)

#### Build Steps

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ChronoGhost.git
cd ChronoGhost

# Install dependencies
npm install

# Build the frontend
npm run build

# Run in development mode
cargo tauri dev

# Build for production
cargo tauri build
```

## 🎮 Usage

### Setting the Timer

- Use the **+** and **-** buttons below each time unit (Hours, Minutes, Seconds)
- Increment/decrement buttons are disabled while the timer is running
- Maximum values: 99 hours, 59 minutes, 59 seconds

### Controlling the Timer

- **Start/Pause Button** - Begins countdown or pauses it
- **Reset Button** - Returns timer to the initially set time
- Timer automatically stops when it reaches 00:00:00

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `R` | Reset timer |
| `Escape` | Reset timer |

### Window Controls

- **Minimize** (left button) - Minimizes to taskbar
- **Close** (right button) - Exits the application

## 🛠️ Technology Stack

- **Frontend**: React 18 + Vite
- **Backend**: Tauri 2.0 (Rust)
- **Animations**: Framer Motion
- **Styling**: Custom CSS with glassmorphism effects
- **CI/CD**: GitHub Actions (multi-platform builds)

## 📁 Project Structure

```
ChronoGhost/
├── src/                      # React source files
│   ├── components/
│   │   ├── BlurText.jsx     # Animated title component
│   │   └── Timer.jsx        # Main timer component
│   ├── App.jsx              # Root component
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── src/                     # Rust backend (root level)
│   └── main.rs              # Rust backend with window commands
├── dist/                    # Built frontend (committed for Tauri)
├── icons/                   # Application icons
├── tauri.conf.json          # Tauri configuration
├── vite.config.js           # Vite build configuration
└── package.json             # Node dependencies
```

## 🤝 Contributing

Since this is a learning project, I won't be actively reviewing PRs. But if you want to fork it and make something cool, go for it!

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI inspired by modern glassmorphism design trends
- BlurText component adapted from [reactbits](https://github.com/premieroctet/react-ui-snippets)
- Based on [PhantomDigits](https://github.com/YOUR_USERNAME/PhantomDigits) architecture

---

Made with ❤️ as a learning project
