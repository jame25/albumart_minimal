var fb;
var isworking = false;
var refresh_interval = 1000;
var timeoutid;

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

function updateUI() {
    if (!fb) {
        return;
    }
    
    console.log('Album art URL:', fb.albumArt);
    console.log('Track info:', fb.helper1, '-', fb.helper2);
    console.log('Is playing/paused:', fb.isPlaying, '/', fb.isPaused);
    
    // Update album art using the [ALBUMART] macro from state JSON
    if (fb.albumArt && fb.albumArt !== '' && fb.albumArt !== '[ALBUMART]') {
        console.log('Setting album art to:', fb.albumArt);
        $('#albumart').attr('src', fb.albumArt).show();
        $('#fallback').hide();
    } else {
        console.log('No album art available, showing fallback');
        $('#albumart').hide();
        $('#fallback').show();
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
