var fb;
var isworking = false;
var refresh_interval = 1000;
var timeoutid;
var currentAlbumArt = null;
var isAnimating = false;
var lastTrackInfo = '';

// Last.fm API configuration for internet radio streams
var lastfm_api_key = "your_api_key_here";
var lastfm_cache = {};

function decodeHtmlEntities(text) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || '';
}

function startwork() {
    isworking = true;
}

function finishwork() {
    isworking = false;
}

function command(command, p1, p2) {
    startwork();
    
    var params = {};
    if (command) params['cmd'] = command;
    if (p1 || p1 == 0) params['param1'] = p1;
    if (p2 || p2 == 0) params['param2'] = p2;
    params['param3'] = 'NoResponse';
    
    $.get('/albumart_minimal/', params, function (data) {
        if (!(command == "VolumeDB")) {
            retrievestate_schedule(command == "Start" ? 500 : 250);
        } else {
            finishwork();
        }
    });
}

function retrievestate_schedule(timeout, cmd) {
    timeout = timeout || 500;
    cmd = cmd || '';
    
    if (timeoutid) {
        clearTimeout(timeoutid);
        timeoutid = null;
    }
    
    if (!timeoutid) {
        timeoutid = setTimeout('retrievestate("' + cmd + '")', timeout);
    }
}

function retrievestate(cmd, p1) {
    startwork();
    
    if (timeoutid) {
        clearTimeout(timeoutid);
        timeoutid = null;
    }
    
    cmd = cmd || '';
    p1 = p1 || '';
    cmd = cmd ? ['?cmd=', cmd, '&'].join('') : '?';
    p1 = p1 ? ['&param1=', p1, '&'].join('') : '';
    
    fb = null;
    
    var url = ['/albumart_minimal/', cmd, p1, 'param3=js/state.json'].join('');
    console.log('Requesting URL:', url);
    
    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'text',
        headers: {
            'Accept': 'application/json, text/plain, */*'
        },
        success: function(data, status, xhr) {
            console.log('Raw response received:', data);
            console.log('Response length:', data.length);
            console.log('Response Content-Type:', xhr.getResponseHeader('Content-Type'));
            console.log('First 200 chars:', data.substring(0, 200));
            
            try {
                fb = JSON.parse(data);
                
                if (fb.isPlaying == '1' && fb.helper1 == '' || fb.isEnqueueing == '1') {
                    retrievestate_schedule(refresh_interval * 2);
                } else {
                    fb.playingItem = parseInt(fb.playingItem);
                    fb.playlistItemsCount = parseInt(fb.playlistItemsCount);
                    fb.playlistPlaying = parseInt(fb.playlistPlaying);
                    fb.playlistActive = parseInt(fb.playlistActive);
                    
                    updateUI();
                    finishwork();
                }
            } catch (e) {
                console.log('JSON parsing failed:', e);
                console.log('Raw data that failed to parse:', data);
                finishwork();
            }
        },
        error: function(jqxhr, textStatus, error) {
            console.log('AJAX request failed:', textStatus, error);
            console.log('URL:', ['/albumart_minimal/', cmd, p1, 'param3=js/state.json'].join(''));
            console.log('Response text:', jqxhr.responseText);
            finishwork();
        }
    });
}

function animateAlbumArt(newArtUrl) {
    if (isAnimating) return;
    
    isAnimating = true;
    
    // Preload the new image to ensure smooth animation
    var newImg = new Image();
    newImg.onload = function() {
        console.log('New image preloaded, starting bounce animation');
        
        // Set up the next album art image
        $('#albumart-next').attr('src', newArtUrl).show();
        
        // Remove any existing animation classes
        $('#albumart-wrapper').removeClass('bouncing');
        
        // Trigger the bouncing animation
        setTimeout(function() {
            $('#albumart-wrapper').addClass('bouncing');
        }, 10);
        
        // After animation completes
        setTimeout(function() {
            // Swap the images
            $('#albumart-current').attr('src', newArtUrl);
            $('#albumart-next').hide();
            
            // Remove animation class and reset position
            $('#albumart-wrapper').removeClass('bouncing');
            $('#albumart-wrapper').css('transform', 'translateX(0)');
            
            // Complete the animation
            isAnimating = false;
            currentAlbumArt = newArtUrl;
            console.log('Bounce animation complete');
        }, 800); // Match new animation duration
    };
    
    newImg.onerror = function() {
        console.log('Failed to load new image, skipping animation');
        $('#albumart-current').attr('src', newArtUrl);
        isAnimating = false;
        currentAlbumArt = newArtUrl;
    };
    
    newImg.src = newArtUrl;
}

function updateUI() {
    if (!fb) {
        return;
    }
    
    console.log('Track info:', fb.helper1, '-', fb.helper2);
    console.log('Is playing/paused:', fb.isPlaying, '/', fb.isPaused);
    
    // Create current track identifier
    var currentTrackInfo = fb.helper1 + '|' + fb.helper2;
    
    // Check if track has changed
    if (currentTrackInfo !== lastTrackInfo && fb.helper1 && fb.helper2) {
        console.log('Track changed, updating album art');
        lastTrackInfo = currentTrackInfo;
        updateAlbumArt();
    }
    
    
    // Update play/pause button
    if (fb.isPlaying == '1') {
        $('#play-icon').hide();
        $('#pause-icon').show();
    } else {
        $('#play-icon').show();
        $('#pause-icon').hide();
    }
    
    // Update browser title
    if (fb.helper1 && fb.helper1 !== '' && fb.helper1 !== '?') {
        document.title = fb.helper1 + ' - foobar2000';
    } else {
        document.title = 'foobar2000 - Album Art Player';
    }
    
    // Schedule next update - continue polling for state changes
    retrievestate_schedule(refresh_interval);
}

function updateAlbumArt() {
    // Force reload by requesting the template with a timestamp to get fresh metadata
    var timestamp = new Date().getTime();
    var templateUrl = '/albumart_minimal/?t=' + timestamp;
    
    console.log('Requesting fresh template for album art and metadata:', templateUrl);
    
    $.ajax({
        url: templateUrl,
        type: 'GET',
        timeout: 5000,
        success: function(data) {
            console.log('Template response received, extracting metadata and album art');
            
            // Parse the HTML response to extract both album art and current metadata
            var tempDiv = $('<div>').html(data);
            var albumArtSrc = tempDiv.find('#albumart-current').attr('src');
            
            // Extract title from the HTML title tag which contains current metadata
            var pageTitle = tempDiv.find('title').text();
            console.log('Page title from template:', pageTitle);
            
            // Check if metadata in template differs from our cached fb state
            if (pageTitle && pageTitle !== 'foobar2000 - Album Art Player' && pageTitle.includes(' - ')) {
                var titleParts = pageTitle.replace(' - foobar2000 Album Art', '').split(' - ');
                if (titleParts.length >= 2) {
                    var templateTrackInfo = titleParts.join(' - '); // Get full track info from title
                    var currentFbTrackInfo = fb ? (fb.helper1 + ' - ' + fb.helper2) : '';
                    
                    console.log('Metadata comparison:');
                    console.log('  Template metadata:', templateTrackInfo);
                    console.log('  FB state metadata:', currentFbTrackInfo);
                    
                    // If template has different metadata than fb state, we have a fresh track
                    if (templateTrackInfo !== currentFbTrackInfo) {
                        console.log('=== METADATA CHANGED (detected via template) ===');
                        // Update our last track info to prevent duplicate processing
                        lastTrackInfo = templateTrackInfo;
                    }
                }
            }
            
            console.log('Extracted album art src:', albumArtSrc);
            
            // Check if this is a fallback image (indicating no real album art)
            var isFallbackImage = albumArtSrc && (
                albumArtSrc.includes('/img/icon1rx.png') || 
                albumArtSrc.includes('albumart_not_found') ||
                albumArtSrc.includes('albumart_not_available')
            );
            
            if (albumArtSrc && albumArtSrc !== '' && albumArtSrc !== '[ALBUMART]' && !isFallbackImage) {
                console.log('Updating album art with animation to:', albumArtSrc);
                
                // Check if this is different from current album art
                if (currentAlbumArt !== albumArtSrc && !isAnimating) {
                    animateAlbumArt(albumArtSrc);
                } else if (currentAlbumArt === null) {
                    // First time loading
                    $('#albumart-current').attr('src', albumArtSrc).show();
                    $('#fallback').hide();
                    currentAlbumArt = albumArtSrc;
                }
            } else {
                console.log('No real album art available (got fallback image), trying Last.fm for internet radio');
                console.log('Album art src was:', albumArtSrc);
                // No real album art found - this could be an internet radio stream
                tryLastFmForStream();
            }
        },
        error: function(jqxhr, textStatus, error) {
            console.log('Template request failed:', error);
            $('#albumart-current').hide();
            $('#fallback').show();
        }
    });
}

// Initialize when page loads
$(document).ready(function() {
    console.log('Album Art Player initialized');
    
    // Button click handlers
    $('#prev-btn').click(function() {
        command('StartPrevious');
    });
    
    $('#play-pause-btn').click(function() {
        command('PlayOrPause');
    });
    
    $('#next-btn').click(function() {
        command('StartNext');
    });
    
    // Add keyboard shortcut to force album art refresh (press 'R' key)
    $(document).keypress(function(e) {
        if (e.which == 114 || e.which == 82) { // 'r' or 'R'
            console.log('Manual album art refresh triggered');
            needsAlbumArtUpdate = true;
            if (fb && fb.helper1 && fb.helper2) {
                updateAlbumArt();
            }
        }
    });
    
    // Start initial state retrieval
    retrievestate_schedule(100);
});

function tryLastFmForStream() {
    if (!lastfm_api_key || lastfm_api_key === '') {
        console.log('Last.fm API key not configured');
        showFallback();
        return;
    }
    
    if (!fb || !fb.helper1 || !fb.helper2) {
        console.log('Missing track info for Last.fm lookup');
        showFallback();
        return;
    }
    
    var artist = decodeHtmlEntities(fb.helper2 || '');  // helper2 is [%artist%]
    var title = decodeHtmlEntities(fb.helper1 || '');   // helper1 is [%title%]
    
    console.log('Decoded artist:', artist, 'title:', title);
    
    var cacheKey = artist + '|' + title;
    
    // Check cache first
    if (lastfm_cache[cacheKey]) {
        if (lastfm_cache[cacheKey] === 'not_found') {
            showFallback();
        } else {
            console.log('Using cached Last.fm artwork:', lastfm_cache[cacheKey]);
            setLastFmArtwork(lastfm_cache[cacheKey]);
        }
        return;
    }
    
    console.log('Trying Last.fm lookup for internet radio stream:', artist, '-', title);
    
    // Use multiple CORS proxies for Last.fm API
    var lastfmUrl = "https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=" + 
                    lastfm_api_key + 
                    "&artist=" + encodeURIComponent(artist) + 
                    "&track=" + encodeURIComponent(title) + 
                    "&format=json";
    
    // Try multiple CORS proxy services
    var corsProxies = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/'
    ];
    
    var tryWithProxy = function(proxyIndex) {
        if (proxyIndex >= corsProxies.length) {
            console.log('All CORS proxies failed');
            lastfm_cache[cacheKey] = 'not_found';
            showFallback();
            return;
        }
        
        var proxyUrl = corsProxies[proxyIndex] + encodeURIComponent(lastfmUrl);
        console.log('Trying Last.fm via proxy:', corsProxies[proxyIndex]);
        
        $.ajax({
            url: proxyUrl,
            type: 'GET',
            timeout: 10000,
            success: function(data) {
                try {
                    // Handle different proxy response formats
                    var responseData = data;
                    if (data.contents) responseData = data.contents; // allorigins format
                    if (typeof responseData === 'string') responseData = JSON.parse(responseData);
                    
                    console.log('Last.fm response:', responseData);
                    
                    var album_url = null;
                    if (responseData.track && 
                        responseData.track.album && 
                        responseData.track.album.image) {
                        
                        var imageArray = responseData.track.album.image;
                        
                        // Get the largest available image
                        for (var i = imageArray.length - 1; i >= 0; i--) {
                            if (imageArray[i] && imageArray[i]['#text'] && imageArray[i]['#text'].trim() !== '') {
                                album_url = imageArray[i]['#text'];
                                
                                // Convert to higher quality URL format
                                album_url = album_url.replace('/300x300/', '/770x0/');
                                album_url = album_url.replace('/174s/', '/770x0/');
                                album_url = album_url.replace('/64s/', '/770x0/');
                                album_url = album_url.replace('/i/u/34s/', '/i/u/770x0/');
                                album_url = album_url.replace('/i/u/64s/', '/i/u/770x0/');
                                album_url = album_url.replace('/i/u/174s/', '/i/u/770x0/');
                                album_url = album_url.replace('/i/u/300x300/', '/i/u/770x0/');
                                break;
                            }
                        }
                    }
                    
                    if (album_url && album_url.trim() !== '') {
                        console.log('Found Last.fm artwork for stream:', album_url);
                        lastfm_cache[cacheKey] = album_url;
                        setLastFmArtwork(album_url);
                    } else {
                        console.log('No artwork found in Last.fm response');
                        lastfm_cache[cacheKey] = 'not_found';
                        showFallback();
                    }
                } catch (e) {
                    console.log('Last.fm proxy response parsing error:', e);
                    tryWithProxy(proxyIndex + 1);
                }
            },
            error: function(jqxhr, textStatus, error) {
                console.log('Last.fm proxy failed:', corsProxies[proxyIndex], 'Error:', error);
                tryWithProxy(proxyIndex + 1);
            }
        });
    };
    
    tryWithProxy(0);
}

function setLastFmArtwork(artworkUrl) {
    if (currentAlbumArt !== artworkUrl && !isAnimating) {
        console.log('Setting Last.fm artwork with animation:', artworkUrl);
        animateAlbumArt(artworkUrl);
    } else if (currentAlbumArt === null) {
        console.log('Setting initial Last.fm artwork:', artworkUrl);
        $('#albumart-current').attr('src', artworkUrl).show();
        $('#fallback').hide();
        currentAlbumArt = artworkUrl;
    }
}

function showFallback() {
    console.log('Showing fallback artwork');
    $('#albumart-current').hide();
    $('#albumart-next').hide();
    $('#fallback').show();
    currentAlbumArt = null;
}
