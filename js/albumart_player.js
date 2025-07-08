var fb;
var isworking = false;
var refresh_interval = 1000;
var timeoutid;
var currentAlbumArt = null;
var isAnimating = false;
var lastTrackInfo = '';

// API configuration for internet radio streams
var enable_deezer_api = true; // Set to false to disable Deezer API search
var skip_direct_api_calls = true; // Set to false to try direct API calls before proxies
var lastfm_api_key = "";
var discogs_api_key = "";
var discogs_consumer_key = ""; // Add your Discogs Consumer Key here  
var discogs_consumer_secret = ""; // Add your Discogs Consumer Secret here
var lastfm_cache = {};
var discogs_cache = {};
var deezer_cache = {};

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
                console.log('No real album art available (got fallback image), trying API lookup for internet radio');
                console.log('Album art src was:', albumArtSrc);
                // No real album art found - this could be an internet radio stream
                tryApiLookupForStream();
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

function tryApiLookupForStream() {
    if (!fb || !fb.helper1 || !fb.helper2) {
        console.log('Missing track info for API lookup');
        showFallback();
        return;
    }
    
    var artist = decodeHtmlEntities(fb.helper2 || '');  // helper2 is [%artist%]
    var title = decodeHtmlEntities(fb.helper1 || '');   // helper1 is [%title%]
    
    console.log('Decoded artist:', artist, 'title:', title);
    
    // Try Deezer first if enabled
    if (enable_deezer_api) {
        tryDeezerForStream(artist, title);
    } else {
        console.log('Deezer API disabled, trying Discogs');
        tryDiscogsForStream(artist, title);
    }
}

function tryDeezerForStream(artist, title) {
    var cacheKey = artist + '|' + title;
    
    // Check cache first
    if (deezer_cache[cacheKey]) {
        if (deezer_cache[cacheKey] === 'not_found') {
            console.log('Deezer cache shows not found, trying Discogs');
            tryDiscogsForStream(artist, title);
        } else {
            console.log('Using cached Deezer artwork:', deezer_cache[cacheKey]);
            setArtwork(deezer_cache[cacheKey]);
        }
        return;
    }
    
    console.log('Trying Deezer lookup for internet radio stream:', artist, '-', title);
    
    // Deezer Search API endpoint - search for tracks
    var query = encodeURIComponent(artist + ' ' + title);
    var deezerUrl = "https://api.deezer.com/search/track?q=" + query + "&limit=5";
    
    // Try multiple CORS proxy services (ordered by reliability)
    var corsProxies = [
        'https://corsproxy.io/?',  // Most reliable for Deezer
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://crossorigin.me/',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    
    // First try without proxy
    var tryDirectly = function() {
        console.log('Trying Deezer API directly (no proxy)');
        $.ajax({
            url: deezerUrl,
            type: 'GET',
            timeout: 3000,
            success: function(data) {
                handleDeezerResponse(data, artist, title, cacheKey, function() {
                    tryWithProxy(0);
                });
            },
            error: function(jqxhr, textStatus, error) {
                console.log('Direct Deezer API failed, trying proxies:', error);
                tryWithProxy(0);
            }
        });
    };

    var tryWithProxy = function(proxyIndex) {
        if (proxyIndex >= corsProxies.length) {
            console.log('All Deezer CORS proxies failed, trying Discogs');
            deezer_cache[cacheKey] = 'not_found';
            tryDiscogsForStream(artist, title);
            return;
        }
        
        var proxyUrl = corsProxies[proxyIndex] + encodeURIComponent(deezerUrl);
        console.log('Trying Deezer via proxy:', corsProxies[proxyIndex]);
        
        $.ajax({
            url: proxyUrl,
            type: 'GET',
            timeout: 5000,
            success: function(data) {
                handleDeezerResponse(data, artist, title, cacheKey, function() {
                    tryWithProxy(proxyIndex + 1);
                });
            },
            error: function(jqxhr, textStatus, error) {
                console.log('Deezer proxy failed:', corsProxies[proxyIndex], 'Error:', error);
                tryWithProxy(proxyIndex + 1);
            }
        });
    };
    
    // Start with direct attempt or skip to proxies
    if (skip_direct_api_calls) {
        console.log('Skipping direct API call, using proxies immediately');
        tryWithProxy(0);
    } else {
        tryDirectly();
    }
}

function handleDeezerResponse(data, artist, title, cacheKey, onError) {
    try {
        // Handle different proxy response formats
        var responseData = data;
        if (data.contents) responseData = data.contents; // allorigins format
        if (typeof responseData === 'string') responseData = JSON.parse(responseData);
        
        console.log('Deezer response:', responseData);
        
        var album_url = null;
        if (responseData.data && responseData.data.length > 0) {
            // Look for the best match with album artwork
            for (var i = 0; i < responseData.data.length; i++) {
                var track = responseData.data[i];
                if (track.album && track.album.cover_xl) {
                    // Use the highest quality cover (cover_xl)
                    album_url = track.album.cover_xl;
                    break;
                } else if (track.album && track.album.cover_big) {
                    // Fallback to cover_big
                    album_url = track.album.cover_big;
                    break;
                } else if (track.album && track.album.cover_medium) {
                    // Fallback to cover_medium
                    album_url = track.album.cover_medium;
                    break;
                }
            }
        }
        
        if (album_url && album_url.trim() !== '') {
            console.log('Found Deezer artwork for stream:', album_url);
            deezer_cache[cacheKey] = album_url;
            setArtwork(album_url);
        } else {
            console.log('No artwork found in Deezer response, trying Discogs');
            deezer_cache[cacheKey] = 'not_found';
            tryDiscogsForStream(artist, title);
        }
    } catch (e) {
        console.log('Deezer response parsing error:', e);
        if (onError) onError();
    }
}

function tryDiscogsForStream(artist, title) {
    // Check if Discogs API credentials are configured
    if (!((discogs_api_key && discogs_api_key !== '') || (discogs_consumer_key && discogs_consumer_key !== ''))) {
        console.log('No Discogs credentials configured, trying Last.fm');
        tryLastFmForStream(artist, title);
        return;
    }
    
    var cacheKey = artist + '|' + title;
    
    // Check cache first
    if (discogs_cache[cacheKey]) {
        if (discogs_cache[cacheKey] === 'not_found') {
            console.log('Discogs cache shows not found, trying Last.fm');
            tryLastFmForStream(artist, title);
        } else {
            console.log('Using cached Discogs artwork:', discogs_cache[cacheKey]);
            setArtwork(discogs_cache[cacheKey]);
        }
        return;
    }
    
    console.log('Trying Discogs lookup for internet radio stream:', artist, '-', title);
    
    // Discogs search API endpoint with flexible authentication
    var query = encodeURIComponent(artist + ' - ' + title);
    var discogsUrl;
    
    if (discogs_api_key && discogs_api_key !== '') {
        // Use personal access token
        discogsUrl = "https://api.discogs.com/database/search?q=" + query + 
                     "&type=release&token=" + discogs_api_key;
    } else if (discogs_consumer_key && discogs_consumer_key !== '') {
        // Use consumer key/secret
        discogsUrl = "https://api.discogs.com/database/search?q=" + query + 
                     "&type=release&key=" + discogs_consumer_key + "&secret=" + discogs_consumer_secret;
    } else {
        console.log('No Discogs credentials configured');
        tryLastFmForStream(artist, title);
        return;
    }
    
    // Try multiple CORS proxy services with additional options
    var corsProxies = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://crossorigin.me/',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    
    // First try without proxy (might work in some browsers/environments)
    var tryDirectly = function() {
        console.log('Trying Discogs API directly (no proxy)');
        $.ajax({
            url: discogsUrl,
            type: 'GET',
            timeout: 8000,
            headers: {
                'User-Agent': 'foobar2000HttpControl/1.0'
            },
            success: function(data) {
                handleDiscogsResponse(data, artist, title, cacheKey, function() {
                    tryWithProxy(0);
                });
            },
            error: function(jqxhr, textStatus, error) {
                console.log('Direct Discogs API failed, trying proxies:', error);
                tryWithProxy(0);
            }
        });
    };

    var tryWithProxy = function(proxyIndex) {
        if (proxyIndex >= corsProxies.length) {
            console.log('All Discogs CORS proxies failed, trying Last.fm');
            discogs_cache[cacheKey] = 'not_found';
            tryLastFmForStream(artist, title);
            return;
        }
        
        var proxyUrl = corsProxies[proxyIndex] + encodeURIComponent(discogsUrl);
        console.log('Trying Discogs via proxy:', corsProxies[proxyIndex]);
        
        $.ajax({
            url: proxyUrl,
            type: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'foobar2000HttpControl/1.0'
            },
            success: function(data) {
                handleDiscogsResponse(data, artist, title, cacheKey, function() {
                    tryWithProxy(proxyIndex + 1);
                });
            },
            error: function(jqxhr, textStatus, error) {
                console.log('Discogs proxy failed:', corsProxies[proxyIndex], 'Error:', error);
                tryWithProxy(proxyIndex + 1);
            }
        });
    };
    
    // Start with direct attempt
    tryDirectly();
}

function handleDiscogsResponse(data, artist, title, cacheKey, onError) {
    try {
        // Handle different proxy response formats
        var responseData = data;
        if (data.contents) responseData = data.contents; // allorigins format
        if (typeof responseData === 'string') responseData = JSON.parse(responseData);
        
        console.log('Discogs response:', responseData);
        
        var album_url = null;
        if (responseData.results && responseData.results.length > 0) {
            // Look for the best match with cover art
            for (var i = 0; i < Math.min(responseData.results.length, 5); i++) {
                var result = responseData.results[i];
                if (result.cover_image && result.cover_image !== '') {
                    album_url = result.cover_image;
                    break;
                }
            }
        }
        
        if (album_url && album_url.trim() !== '') {
            console.log('Found Discogs artwork for stream:', album_url);
            discogs_cache[cacheKey] = album_url;
            setArtwork(album_url);
        } else {
            console.log('No artwork found in Discogs response, trying Last.fm');
            discogs_cache[cacheKey] = 'not_found';
            tryLastFmForStream(artist, title);
        }
    } catch (e) {
        console.log('Discogs response parsing error:', e);
        if (onError) onError();
    }
}

function tryLastFmForStream(artist, title) {
    if (!lastfm_api_key || lastfm_api_key === '') {
        console.log('Last.fm API key not configured');
        showFallback();
        return;
    }
    
    var cacheKey = artist + '|' + title;
    
    // Check cache first
    if (lastfm_cache[cacheKey]) {
        if (lastfm_cache[cacheKey] === 'not_found') {
            showFallback();
        } else {
            console.log('Using cached Last.fm artwork:', lastfm_cache[cacheKey]);
            setArtwork(lastfm_cache[cacheKey]);
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
            console.log('All Last.fm CORS proxies failed');
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
                        setArtwork(album_url);
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

function setArtwork(artworkUrl) {
    if (currentAlbumArt !== artworkUrl && !isAnimating) {
        console.log('Setting artwork with animation:', artworkUrl);
        animateAlbumArt(artworkUrl);
    } else if (currentAlbumArt === null) {
        console.log('Setting initial artwork:', artworkUrl);
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
