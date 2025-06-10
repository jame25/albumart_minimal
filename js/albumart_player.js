var fb;
var isworking = false;
var refresh_interval = 1000;
var timeoutid;
var currentAlbumArt = null;
var isAnimating = false;

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
            console.log('URL:', ['/', cmd, p1, 'param3=js/state.json'].join(''));
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
    
    console.log('Album art URL:', fb.albumArt);
    console.log('Track info:', fb.helper1, '-', fb.helper2);
    console.log('Is playing/paused:', fb.isPlaying, '/', fb.isPaused);
    
    // Update album art with sliding animation
    if (fb.albumArt && fb.albumArt !== '' && fb.albumArt !== '[ALBUMART]') {
        if (currentAlbumArt !== fb.albumArt && !isAnimating) {
            console.log('Album art changed, animating to:', fb.albumArt);
            animateAlbumArt(fb.albumArt);
        } else if (currentAlbumArt === null) {
            // First time loading
            console.log('Setting initial album art to:', fb.albumArt);
            $('#albumart-current').attr('src', fb.albumArt).show();
            $('#fallback').hide();
            currentAlbumArt = fb.albumArt;
        }
    } else {
        console.log('No album art available, showing fallback');
        $('#albumart-current').hide();
        $('#albumart-next').hide();
        $('#fallback').show();
        currentAlbumArt = null;
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
    
    // Start initial state retrieval
    retrievestate_schedule(100);
});
