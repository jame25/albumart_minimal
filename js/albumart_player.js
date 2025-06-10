var fb;
var isworking = false;
var refresh_interval = 1000;
var timeoutid;
var updateAlbumArtTimeout;

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
                    retrievestate_schedule(refresh_interval);
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

function updateUI() {
    if (!fb) {
        return;
    }
    
    console.log('Album art URL:', fb.albumArt);
    console.log('Track info:', fb.helper1, '-', fb.helper2);
    console.log('Album art enabled:', !!fb.albumArt);
    console.log('Current playing item:', fb.playingItem);
    console.log('Is playing/paused:', fb.isPlaying, '/', fb.isPaused);
    
    // Update play/pause button
    if (fb.isPlaying == '1') {
        $('#play-icon').hide();
        $('#pause-icon').show();
    } else {
        $('#play-icon').show();
        $('#pause-icon').hide();
    }
    
    // Update browser title only
    if (fb.helper1 && fb.helper1 !== '' && fb.helper1 !== '?') {
        document.title = fb.helper1 + ' - foobar2000';
    } else {
        document.title = 'foobar2000 - Album Art Player';
    }
    
    // Update album art dynamically
    updateAlbumArt();
    
    // Schedule next update - continue polling even when paused for album art updates
    retrievestate_schedule(refresh_interval);
}

function updateAlbumArt() {
    if (!fb) {
        return;
    }
    
    // For dynamic album art updates, make a direct request to get the current album art
    // This approach requests the current album art URL from the server
    var currentSrc = $('#albumart').attr('src');
    
    // Check if we have a valid album art URL from the JSON response
    if (fb.albumArt && fb.albumArt !== '' && fb.albumArt !== '?') {
        var newSrc = fb.albumArt;
        
        // Don't modify the URL - keep it as the server generated it
        // The album art should be served within the template context
        // newSrc stays as: /albumart_minimal/albumart_32176
        
        console.log('Attempting to load album art:', newSrc);
        
        if (newSrc !== currentSrc) {
            // Try multiple potential album art URLs
            var albumArtMatch = newSrc.match(/albumart_(\d+)(\.\w+)?$/);
            if (albumArtMatch) {
                var albumArtId = albumArtMatch[1];
                var extension = albumArtMatch[2] || '';  // .jpg or empty
                
                var testUrls = [
                    '/default/albumart_' + albumArtId + extension,  // Try default template path (most likely to work)
                    newSrc,  // Original: /albumart_minimal/albumart_9628.jpg
                    '/ajquery/albumart_' + albumArtId + extension,  // Try ajquery template path
                    '/albumart_' + albumArtId + extension           // Try root path
                ];
                
                console.log('Trying multiple album art URLs:', testUrls);
                tryAlbumArtUrls(testUrls, 0);
            } else {
                // If we can't extract the ID, just try the original URL
                var img = new Image();
                img.onload = function() {
                    console.log('Successfully loaded album art:', newSrc);
                    $('#albumart').attr('src', newSrc);
                };
                img.onerror = function() {
                    console.log('Failed to load album art:', newSrc);
                    tryFallbackImages();
                };
                img.src = newSrc;
            }
        }
    }
}

function tryAlbumArtUrls(urls, index) {
    if (index >= urls.length) {
        console.log('All album art URLs failed, trying fallbacks');
        tryFallbackImages();
        return;
    }
    
    var testUrl = urls[index];
    var img = new Image();
    
    img.onload = function() {
        console.log('Successfully loaded album art from:', testUrl);
        $('#albumart').attr('src', testUrl);
    };
    
    img.onerror = function() {
        console.log('Failed album art URL:', testUrl);
        // Try next URL
        tryAlbumArtUrls(urls, index + 1);
    };
    
    img.src = testUrl;
}

function tryFallbackImages() {
    // Try the fallback images in order: albumart_not_found, albumart_not_available, then our default
    var fallbackUrls = [
        '/albumart_minimal/img/icon1rx.png',  // Our fallback
        'albumart_minimal/img/icon1rx.png',   // Config format without leading slash
        '/albumart_minimal/img/nocover.jpg',  // Alternative name
        'albumart_minimal/img/nocover.jpg'    // Alternative name without slash
    ];
    
    console.log('Trying fallback images:', fallbackUrls);
    tryFallbackUrl(fallbackUrls, 0);
}

function tryFallbackUrl(urls, index) {
    if (index >= urls.length) {
        console.log('All fallback images failed, album art will remain empty');
        return;
    }
    
    var fallbackUrl = urls[index];
    var img = new Image();
    
    img.onload = function() {
        console.log('Successfully loaded fallback image:', fallbackUrl);
        $('#albumart').attr('src', fallbackUrl);
    };
    
    img.onerror = function() {
        console.log('Fallback image failed:', fallbackUrl);
        // Try next fallback
        tryFallbackUrl(urls, index + 1);
    };
    
    img.src = fallbackUrl;
}

// jQuery ready function
$(function() {
    $(document).ready(function() {
        // Button event handlers
        $('#prev-btn').click(function(e) {
            e.preventDefault();
            command('StartPrevious');
        });
        
        $('#play-pause-btn').click(function(e) {
            e.preventDefault();
            command('PlayOrPause');
        });
        
        $('#next-btn').click(function(e) {
            e.preventDefault();
            command('StartNext');
        });
        
        // Album art click to play/pause
        $('#albumart').click(function(e) {
            e.preventDefault();
            command('PlayOrPause');
        });
        
        // Keyboard shortcuts removed per user request
        
        // Handle AJAX errors
        $(document).ajaxError(function(event, XMLHttpRequest, settings, thrownError) {
            if (event.type == 'ajaxError') {
                console.log('AJAX Error:', XMLHttpRequest.statusText);
                finishwork();
            }
        });
        
        // Check what the [ALBUMART] macro resolved to on page load
        var initialAlbumArt = $('#albumart').attr('src');
        console.log('Initial album art from [ALBUMART] macro:', initialAlbumArt);
        
        // If the macro didn't resolve properly, set fallback
        if (!initialAlbumArt || initialAlbumArt === '[ALBUMART]' || initialAlbumArt === '') {
            console.log('ALBUMART macro not resolved, using fallback');
            $('#albumart').attr('src', '/albumart_minimal/img/icon1rx.png');
        }
        
        // Initial state retrieval
        retrievestate();
    });
});
