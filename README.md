# ChronoGhost

This is a stay on top timer app that can be locked on top other applications while it can be controlled via the keyboard. In gaming it's easy to tunnel vision so having a timer visible all the time but subtly is very helpful to keep track of things if you know how long a process will take, for example a respawn.

## Features & Controls

### Timer Controls

Each timer includes:
- **Time Adjustment Buttons**: Click `+` or `-` to adjust hours, minutes, and seconds
  - Maximum: 99 hours, 59 minutes, 59 seconds
  - Buttons are disabled while the timer is running
- **Start/Pause Button**: Toggle between running and paused states
- **Reset Button**: Returns timer to its initial time
- **Timer Display**: Shows countdown in `HH:MM:SS` format

### Multi-Timer Support

- Create up to **9 independent timers** running simultaneously
- **Click any timer** to select it (shows yellow border)
- Selected timer can be controlled via keyboard shortcuts
- Each timer can have different start times and states

### Toolbar

The top toolbar provides quick access to:
- **➕ Add Timer**: Create a new timer (up to 9 total)
- **🗑️ Delete Timer**: Remove the currently selected timer
- **⚙️ Settings**: Open settings panel for customization
- **🔓/🔒 Lock**: Toggle lock mode (click-through overlay)
- **Window Controls**: Minimize and close buttons
- **Drag Region**: Click and drag anywhere on toolbar to move window

### Settings Panel

Access via the ⚙️ button to customize:

**Transparency Control**
- Slider to adjust opacity from 30% to 100%
- Useful for subtle overlays during gaming

**Keybind Customization**
- **Selected Timer Shortcuts**: Configure reset keybind for whichever timer is selected
- **Per-Timer Slot Shortcuts**: Set unique toggle and reset keybinds for each of the 9 timer positions
  - Default: Ctrl/Cmd+1-9 (toggle), Ctrl/Cmd+Shift+1-9 (reset)
- **Duplicate Detection**: Prevents assigning the same shortcut twice
- **Restore Defaults**: Reset all keybinds and opacity to default values

### Lock Mode

Lock mode turns ChronoGhost into a true overlay:
- **Click-Through**: Window ignores all mouse clicks, passing them to apps below
- **Collapsed Toolbar**: Minimizes to a small lock icon to reduce visual clutter
- **Keyboard Control Only**: Timer can still be controlled via keyboard shortcuts
- **Toggle**: Press `Ctrl+Shift+L` (Windows/Linux) or `⌘+Shift+L` (macOS)
- **Perfect for Gaming**: Keep timers visible without interfering with gameplay

### ⚠️ Windows SmartScreen Warning

Windows will show a security warning when running the installer because this app is not code-signed.

**To install:**
1. Click "More info"
2. Click "Run anyway"

This is normal for unsigned open-source software. The code is available for review - I just didn't pay for a code signing certificate for a learning project.

### Keyboard Shortcuts

ChronoGhost supports cross-platform keyboard shortcuts that automatically adapt to your operating system.

#### Lock/Unlock (Global)

| Windows/Linux | macOS | Action |
|---------------|-------|--------|
| `Ctrl+Shift+L` | `⌘+Shift+L` | Toggle lock (makes window click-through and collapses toolbar) |

#### Selected Timer Shortcuts

These control whichever timer is currently selected (highlighted):

| Windows/Linux | macOS | Action |
|---------------|-------|--------|
| `Ctrl+Space` | `⌘+Space` | Toggle start/pause |
| `Ctrl+R` | `⌘+R` | Reset timer |

#### Per-Timer Shortcuts (Default)

These shortcuts target specific timer slots directly:

| Windows/Linux | macOS | Action |
|---------------|-------|--------|
| `Ctrl+1` to `Ctrl+9` | `⌘+1` to `⌘+9` | Toggle specific timer (selects and starts/pauses) |
| `Ctrl+Shift+1` to `Ctrl+Shift+9` | `⌘+Shift+1` to `⌘+Shift+9` | Reset specific timer |

> **Note:** All per-timer shortcuts are customizable in Settings. You can assign any key combination to any timer slot.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Attribution

Mixkit - audio
Chatgpt - icon
