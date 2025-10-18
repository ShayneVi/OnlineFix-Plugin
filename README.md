# OnlineFix - Steam Millennium Plugin

THANKS TO luthor112 AND HIS CUSTOM LOGO POSITION PLUGIN. i USED HIS AS A TEMPLATE.
THANKS TO CLAUSE AI FOR THE CODING HELP.
https://steambrew.app/plugin?id=113d5b98ee24


<div align="center">

**Seamlessly apply online fixes to your Steam games with one click**

[![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)](https://www.microsoft.com/windows)
[![Millennium](https://img.shields.io/badge/Millennium-Plugin-orange.svg)](https://github.com/SteamClientHomebrew/Millennium)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📋 Overview

OnlineFix is a [Millennium](https://github.com/SteamClientHomebrew/Millennium) plugin that integrates directly into the Steam client, allowing you to apply online multiplayer fixes to your games with a single click. No more manually downloading and extracting files - everything is automated and seamless.

### Key Features

- **🎮 One-Click Installation**
  - Apply fixes directly from the Steam library interface
  - Automatic download and extraction
  - No manual file management required

- **🔍 Smart Game Detection**
  - Automatically detects game installation paths
  - Verifies game installation before applying fixes
  - Supports all Steam library locations

- **📦 Comprehensive Fix Database**
  - Over 800+ supported game AppIDs
  - Regularly updated fix repository
  - Community-driven fix collection

- **🔔 Windows Notifications**
  - Real-time feedback on download progress
  - Success/error notifications
  - Non-intrusive toast notifications

- **⚙️ Configurable**
  - Enable/disable the fix button globally
  - Customizable per your preferences

---

## 🚀 Installation

### Prerequisites

1. **[Millennium](https://github.com/SteamClientHomebrew/Millennium)** - Steam client customization framework
2. **Windows 10 or later**
3. **Python 3.x** (for backend functionality)
4. **Steam Client** (obviously!)

### Manual Installation

1. Download the latest release from the [Releases](../../releases) page
2. Extract the `onlinefix` folder to your Millennium plugins directory:
   ```
   C:\Program Files (x86)\Steam\plugins
   ```
3. Restart Steam
4. The plugin should load automatically

---

## 📖 How to Use

### Applying a Fix

1. Open your Steam library
2. Navigate to any supported game's detail page
3. Look for the **FIX** button next to the settings/manage buttons
4. Click the **FIX** button
5. The plugin will:
   - Verify the game is installed
   - Download the fix from the repository
   - Extract files to the game directory
   - Show a success notification


## ⚙️ Configuration

The plugin can be configured via the `config.json` file located in the plugin directory.

### Configuration Options

```json
{
    "show_button": true
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `show_button` | boolean | `true` | Show/hide the FIX button globally |

### Supported Games

The plugin uses `appIDs.txt` to determine which games should show the FIX button. The file contains over 1,000 Steam AppIDs for games with available fixes.

**To add more games:**
 Replace appIDs.txt with the latest on my github.

**To disable filtering** (show button for all games):
- Delete or rename `appIDs.txt`
- The button will appear for all games (though fixes may not exist)

---

## 🛠️ Technical Details

### Architecture

- **Frontend**: TypeScript/React integrated into Steam's UI
- **Backend**: Python with Steam library integration
- **Fix Repository**: GitHub-hosted zip files

### Project Structure

```
onlinefix/
├── backend/
│   └── main.py              # Python backend logic
├── frontend/
│   └── index.tsx            # React frontend component
├── .millennium/
│   └── Dist/
│       └── index.js         # Compiled plugin bundle
├── appIDs.txt               # List of supported game AppIDs
├── config.json              # Plugin configuration
├── plugin.json              # Millennium plugin manifest
├── pos-db.json              # Position database for UI elements
└── metadata.json            # Plugin metadata
```

### Backend Functions

The Python backend provides several key functions:

- **Game Detection**: Finds Steam library folders and game install paths
- **Fix Download**: Downloads fixes from the GitHub repository
- **File Extraction**: Extracts and copies files to game directories
- **Notifications**: Shows Windows toast notifications
- **AppID Filtering**: Determines which games should show the fix button

### Frontend Integration

The TypeScript frontend:
- Injects a custom button into Steam's library interface
- Communicates with the Python backend via Millennium's IPC
- Provides visual feedback during operations
- Handles button positioning and styling

---

## 🎯 Supported Games

The plugin supports **1,000+ games**. Some examples include:

- Counter-Strike: Global Offensive
- Team Fortress 2
- Left 4 Dead 2
- Borderlands series
- Dead by Daylight
- Payday 2
- Many, many more...

For the complete list, see `appIDs.txt` in the plugin directory.

---

## 🐛 Troubleshooting

### "Game is not installed" Error
- Ensure the game is fully downloaded and installed
- Check that Steam recognizes the game in your library
- Verify game files through Steam if necessary

### "Could not find game installation path" Error
- The game may be in a non-standard location
- Try verifying the game files in Steam
- Check that the Steam library folder is readable

### "Fix not found for AppID" Error
- The fix may not exist in the repository yet
- Check if the AppID is correct
- Submit a request for the fix to be added

### FIX Button Doesn't Appear
- Verify `show_button` is `true` in `config.json`
- Check if the game's AppID is in `appIDs.txt`
- Restart Steam after configuration changes
- Ensure Millennium is running and loaded

### Download/Extraction Fails
- Check your internet connection
- Ensure you have write permissions to the game directory
- Try running Steam as administrator
- Check the Millennium console for error messages

---

## 📦 Fix Repository Structure

Fixes are hosted on GitHub in the following format:

```
https://github.com/ShayneVi/OnlineFix/raw/main/{AppID}.zip
```

Each fix is a zip file containing the necessary files to enable online functionality for the game. The plugin automatically:
1. Downloads the zip file
2. Extracts contents to a temporary directory
3. Copies files to the game installation directory
4. Cleans up temporary files

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Adding New Games

1. Find the game's Steam AppID
2. Create a fix zip file named `{AppID}.zip`
3. Submit to the OnlineFix repository
4. Add the AppID to `appIDs.txt`

### Reporting Issues

Please include:
- Game name and AppID
- Error message or unexpected behavior
- Steps to reproduce
- Millennium and plugin version

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request with a clear description

---

## ⚠️ Disclaimer

This plugin downloads and applies third-party modifications to games. Use at your own risk:

- **Game Integrity**: Applying fixes may modify game files
- **Online Safety**: Be cautious when playing online with modified files
- **Terms of Service**: Using modified files may violate game/Steam ToS
- **Antivirus**: Some fixes may be flagged by antivirus software (false positives)

**The developers of this plugin are not responsible for:**
- Bans or restrictions from game developers
- Data loss or corruption
- VAC bans or other anti-cheat actions
- Any consequences of using this plugin

**Always backup your game files before applying fixes.**

---

## 🔐 Privacy & Security

- The plugin only downloads files from the specified GitHub repository
- No personal data is collected or transmitted
- All operations are performed locally on your machine
- The plugin only accesses Steam game directories

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Millennium](https://github.com/SteamClientHomebrew/Millennium) - The Steam customization framework that makes this possible
- [OnlineFix Repository](https://github.com/ShayneVi/OnlineFix) - The community-maintained fix database
- All contributors who help maintain the fix database

---

## 📞 Support

- **Issues**: Report bugs on the [GitHub Issues](../../issues) page
- **Discussions**: Join the conversation in [GitHub Discussions](../../discussions)
- **Millennium Discord**: Get help from the Millennium community

---

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release
- Support for 1,000+ games
- One-click fix installation
- Windows notification system
- Configurable button display
- Automatic game path detection

---

<div align="center">

**⚠️ USE AT YOUR OWN RISK ⚠️**

This plugin is provided as-is. Always backup your games before applying fixes.

[Report Bug](../../issues) · [Request Feature](../../issues) · [Documentation](../../wiki)


</div>

