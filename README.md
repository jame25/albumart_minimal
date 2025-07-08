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
2. **Copy the albumart_minimal folder** to your foo_httpcontrol directory (i.e %appdata%\foobar2000-v2\foo_httpcontrol_data\)
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
- **Local Files**: Embedded album art and external files (`folder.jpg`, `*.jpg`)
- **Internet Radio Streams**: Automatic iTunes artwork lookup
- **Fallback**: Template icon when no artwork is available

### 📻 **Internet Radio Stream Support**
This template includes full support for internet radio streams with automatic artwork:

#### **Automatic Metadata Detection**
- Real-time detection of track changes in internet radio streams
- Automatic artist and title extraction from stream metadata
- HTML entity decoding for proper character handling

#### **Multi-Source Artwork Integration**
- **Deezer API**: Primary source for high-quality album artwork (no API key required)
- **Discogs.com API**: Secondary source for comprehensive music database coverage  
- **Last.fm API**: Final fallback source for maximum compatibility
- High-quality artwork retrieval (600x600 for iTunes)
- Smart caching to prevent duplicate API calls
- Multiple CORS proxy fallbacks for reliable access

#### **Stream vs Local File Detection**
- Intelligent detection between local files and streaming content
- Local files use standard foobar2000 album art (embedded/external)
- Streams automatically fall back through iTunes → Discogs → Last.fm when no artwork is provided

#### **Enhanced foo_httpcontrol Component**
This template requires a **modified foo_httpcontrol component** that includes:
- Dynamic metadata change detection for internet radio
- Proper callback registration for `on_playback_dynamic_info_track`
- Real-time state updates when stream metadata changes

### Requirements for Internet Radio Support

#### **Modified foo_httpcontrol Component**
The template requires an enhanced version of foo_httpcontrol with these additions:
```cpp
// Added to get_flags() in callbacks.cpp:
flag_on_playback_dynamic_info | flag_on_playback_dynamic_info_track

// Added callback implementations:
void on_playback_dynamic_info_track(const file_info& p_info) {
    httpc::state_changed |= httpc::FSC_PLAYBACK;
    httpc::should_update_playlist = true;
}
```

#### **API Keys Configuration**

**Deezer API (Primary - No Setup Required)**
- No API key needed! Deezer API works immediately
- Provides high-quality album artwork
- Searches Deezer's comprehensive music database
- **To disable**: Set `var enable_deezer_api = false;` in `js/albumart_player.js`

**Discogs.com API Key (Secondary - Optional)**
- Get a free API token from [Discogs Developer Settings](https://www.discogs.com/settings/developers)
- Add your token to `js/albumart_player.js`:
```javascript
var discogs_api_key = "your_discogs_token_here";
```

**Last.fm API Key (Final Fallback - Pre-configured)**
- Last.fm is already configured with a working API key
- Provides high-resolution artwork as final fallback
- You can get your own key from [Last.fm API](https://www.last.fm/api/account/create) if desired

**Fallback Chain**: iTunes → Discogs (if configured) → Last.fm → Fallback image

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
