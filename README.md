# Twitch Spam Filter

An advanced spam filter for Twitch chats with debug overlay, whitelist, and "Ignore Replies" functionality.

## ⚠️ Important Notice

**NO SUPPORT PROVIDED**: I do not offer any support for this script. I cannot program and created this script purely out of curiosity using Cursor's AI assistance. Use it at your own risk. If you encounter issues, you'll need to figure them out yourself or modify the code as needed.

**MODIFICATION ENCOURAGED**: Not only do I allow everyone to modify this script to their heart's content, I actively encourage anyone who is interested to do so! Feel free to improve it, customize it, or use it as a learning resource.

## Versions

- **DE**: German version (`Twitch Spam Filter v1.24 DE.js`)
- **EN**: English version (`Twitch Spam Filter v1.24 EN.js`)

## Features

The Twitch Spam Filter automatically detects and filters:

- Too many emotes per message
- Too high emote density
- Emote series (same emotes in a row)
- Emote trains (same emote combinations from multiple users)
- ASCII/Braille art
- Repeated messages (exact and similar)
- Copy/paste spam between different users
- All uppercase text
- Excessive character repetition

## Installation

### Prerequisites

You need a userscript manager for your browser:

- **Chrome/Edge/Brave**: [Tampermonkey](https://www.tampermonkey.net/)
- **Firefox**: [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)
- **Safari**: [Tampermonkey](https://www.tampermonkey.net/)

### Installation Steps

1. **Install Userscript Manager**
   - Install Tampermonkey (or another userscript manager) as a browser extension
   - Follow the installation instructions for your browser

2. **Install Script**
   - Open the desired version (DE or EN) on GitHub
   - Click on "Raw" or copy the entire code
   - Tampermonkey should automatically detect that it's a userscript
   - Click "Install" or "Installieren"

3. **Done!**
   - The script is now active and runs automatically on all Twitch pages

### Alternative Installation (Manual)

1. Open Tampermonkey → "Dashboard"
2. Click "New script" or "Neues Script"
3. Delete the default code
4. Copy the entire content of the desired `.js` file
5. Paste the code into the editor window
6. Save the script (Ctrl+S or Cmd+S)

## Usage

### Basic Functions

The script runs automatically in the background and filters spam messages in the Twitch chat.

### Debug Overlay

**F9 Key**: Toggles the debug overlay on/off
- Useful for quick show/hide during streaming
- Shows all filtered messages in real-time
- Detailed information about filter rules and thresholds
- Color highlighting: Green = target value, Red = reached value

**Drag & Drop**: The debug overlay can be moved with the mouse
- Click and drag to position it anywhere on screen

### Debug Overlay Functions

- **Filter on/off**: Activates or deactivates the spam filter
- **Marking on/off**: Activates or deactivates visual marking of filtered messages
- **Minimize**: Reduces the overlay to a compact view
- **Message Counter**: Shows the number of processed messages

### Ignore Replies

- When enabled, replies (e.g., "Replying to …") are skipped by the filter
- Keeps thread conversations intact and prevents over-filtering
- Can be toggled on/off in the debug overlay

### Whitelist

- Specific users can be added to the whitelist
- Whitelisted users are never filtered, regardless of their messages
- Use the debug overlay or console to add users to the whitelist

### Privileged Users

The script automatically detects and never filters messages from:
- Moderators
- Broadcasters (channel owners)
- VIPs
- Staff/Partners/Verified accounts
- Whitelisted users
- Common/Verified bots

## Customization

Filter thresholds can be adjusted in the script code. Open the script in the Tampermonkey dashboard and adjust the values as needed.

## Troubleshooting

- **Script not running**: Make sure Tampermonkey is enabled and the script is set to "Enabled"
- **Debug overlay not appearing**: Press F9 to toggle it on/off
- **Too many/too few messages being filtered**: Adjust the thresholds in the script code

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.**

**Disclaimer**: The author assumes no responsibility for damages arising from the use of this software. The software is provided "as is" without any warranty. Each user uses the software at their own risk.

