# Album Art Minimal - foobar2000 HTTP Control Template

A clean, minimalist web interface for foobar2000 that displays full-screen album art with elegant hover controls.

![albumart_minimal](https://github.com/user-attachments/assets/8336bc4c-4743-45ec-a771-af1458e698f5)


## Features

### 🎨 **Minimal Album Art Display**
- Full-screen album art presentation with automatic scaling
- Responsive design that adapts to different screen sizes
- Dark background optimized for album art viewing
- Smooth hover effects and transitions

### 🎵 **Hover Controls**
- Clean control buttons that appear on album art hover
- Previous track, play/pause, and next track controls
- Semi-transparent overlay design
- Smooth animations and visual feedback

### 🖱️ **Interactive Elements**
- Click album art to play/pause
- Control buttons with hover effects and scaling
- Dynamic play/pause icon switching
- Real-time playback state updates

### 📱 **Responsive Design**
- Works on desktop and mobile devices
- Automatic album art sizing (max 90% viewport)
- Flexible layout that adapts to screen dimensions
- Touch-friendly control buttons

### 🔄 **Real-time Updates**
- Automatic album art updates when tracks change
- Dynamic title updates in browser tab
- Live playback state synchronization
- Smart fallback handling for missing album art

## Installation

1. **Install foo_httpcontrol component** in foobar2000
2. **Copy the albumart_minimal folder** to your foo_httpcontrol templates directory
3. **Configure HTTP server** in foobar2000 preferences
4. **Access the template** via: `http://localhost:8888/albumart_minimal/`
   - Replace `localhost:8888` with your actual server address and port

## Usage

- **Album art display**: Current track's album art fills the screen
- **Hover controls**: Move mouse over album art to reveal playback controls
- **Click to play/pause**: Click anywhere on the album art
- **Navigation**: Use previous/next buttons for track control

## Configuration

The template includes these optimizations:

- **Playlist generation disabled** for minimal server overhead
- **Album art search paths**: Looks for `folder.jpg` and `*.jpg` files
- **Fallback images**: Uses template icon when album art is unavailable
- **Dynamic updates**: Real-time synchronization with foobar2000 playback

### Album Art Sources
- Embedded album art (preferred)
- External files: `folder.jpg`, `*.jpg` in track directory
- Fallback: Template icon (`img/icon1rx.png`)

## Customization

### CSS Styling
Edit the `<style>` section in `index.html` to customize:
- Control button appearance and size
- Hover effects and animations
- Background colors and transparency
- Album art styling (borders, shadows, etc.)

### JavaScript Behavior
Modify `js/albumart_player.js` to adjust:
- Update intervals and timing
- Album art loading logic
- Control command handling
- Error handling and fallbacks

## Browser Compatibility

- Modern browsers with JavaScript enabled
- CSS3 support for animations and flexbox
- Works on desktop and mobile devices
- Tested with Chrome, Firefox, Safari, and Edge

## File Structure

```
albumart_minimal/
├── index.html          # Main template file with embedded CSS
├── js/
│   ├── albumart_player.js    # Template logic and controls
│   ├── jquery-1.11.0.min.js # jQuery library
│   └── state.json           # State file for foobar2000 communication
├── img/
│   ├── favicon.ico          # Browser tab icon
│   └── icon1rx.png         # Fallback album art image
├── config                   # foo_httpcontrol configuration
└── readme.txt             # Original template documentation
```

## License

This template is part of the foo_httpcontrol component for foobar2000. Check the main component's license for usage terms.
