/**
 * flight-soundcloud
 *
 * This flight component makes use of the SoundCloud SDK
 * which is provided via the global variable `SC`.
 * The SoundCloud SDK script needs to be included and can be found
 * here: http://connect.soundcloud.com/sdk.js
 *
 * Unlike many flight components this component is a CommonJS module.
 */

'use strict';

var flight = require('flightjs');
var Q = require('q');

module.exports = flight.component(player);


// (function(define) {
//
//     define(function (require, exports, module) {
//         var b = require('b');
//
//         return function () {};
//     });
//
// }( // Help Node out by setting up define.
//      typeof module === 'object' && typeof define !== 'function'
//     ? function (factory) { module.exports = factory(require, exports, module); }
//     : define
// ));


function player () {
  var defaultAttrs = {
    clientId: null,
    defaultTrackUrl: 'https://soundcloud.com/agentlexie/irule'
  };

  this.attributes(defaultAttrs);
  this.after('initialize', afterInit);

  // SoundCloud functions.
  this.getTrack = getTrack;
  this.getSound = getSound;
  this.whilePlaying = whilePlaying;

  // Interact with sounds.
  this.soundPlay = soundPlay;
  this.soundStop = soundStop;
  this.soundPause = soundPause;
  this.sound = undefined;

  /**
   * The after initialization function.
   *
   * Here we initialize the SoundCloud SDK with the given `clientId`
   * and set up listeners for play, stop and pause.
   */
  function afterInit () {
    // Initialize SoundCloud SDK
    /* eslint camelcase: 0 */
    SC.initialize({ client_id: this.attr.clientId });

    // Listen to sound events
    this.on('sound.play', this.soundPlay);
    this.on('sound.stop', this.soundStop);
    this.on('sound.pause', this.soundPause);
  }

  /**
   * Play a SoundCloud sound
   *
   * This function gets a SoundCloud track via its URL
   * or unpauses a paused track.
   */
  function soundPlay (e, data) {
    var trackUrl;
    var currentlyPlaying = this.$node.data('currently-playing');

    // If the sound object exists and the sent URL is the same
    // as the one stored in currently-playing just unpause the track.
    if (this.sound && data.trackUrl === currentlyPlaying) {
      this.sound.play();
    } else {
    // Grab either the sent URL or the default URL with the SC API,
    // play the sound and store the url as the currently-playing one in a data attr.
      trackUrl = data.trackUrl || this.attr.defaultTrackUrl;

      this.getTrack(trackUrl)
      .then(this.getSound.bind(this))
      .then(function (sound) {

        if (this.sound) {
          this.sound.stop();
        }

        this.sound = global.sound = sound;
        this.sound.play();
        this.$node.data('currently-playing', trackUrl);

      }.bind(this))
      .done();
    }
  }

  /**
   * Stop a SoundCloud sound.
   */
  function soundStop () {
    if (this.sound) {
      this.sound.stop();
    } else {
      console.error('There seems to be no sound object available.');
    }
  }

  /**
   * Pause a SoundCloud sound.
   */
  function soundPause () {
    if (this.sound) {
      this.sound.pause();
    } else {
      console.error('There seems to be no sound object available.');
    }
  }

  /**
   * Use the SoundCloud SDK to get track data and play sounds
   */
  function getTrack (url) {
    var deferred = Q.defer();

    // Get track object from track URL
    SC.get('/resolve', { url: url }, function getTrackCb (track, err) {
      if (err) {
        deferred.reject(new Error(err.message));
      } else {
        deferred.resolve(track);
      }
    });

    return deferred.promise;
  }

  /**
   * Callback for SC.get
   *
   * The callback receives a track object resolved from the track URL.
   */
  function getSound (track) {
    var deferred = Q.defer();
    var wP = { whilePlaying: this.whilePlaying.bind(this) };

    // Make the data of the current track available.
    // In order to get the track data a flight component just
    // has to subscribe to the 'sound.data' event.
    this.trigger('sound.data', { soundData: track });

    SC.stream('/tracks/' + track.id, wP, function getSoundCb (sound, err) {
      if (err) {
        deferred.reject(new Error(err.message));
      } else {
        deferred.resolve(sound);
      }
    });

    return deferred.promise;
  }

  /**
   * Callback for the whileplaying method.
   */
  function whilePlaying () {
    // Remove loading ani if present.
    console.log(this.position, this.duration, this.position / this.duration);
  }
}
