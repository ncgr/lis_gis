/* colorize accessions by taxon name, with a set of defaults and
 * overrides. If the genera matches the colorMap, the species will be
 * used to darken/lighten for more unique color values. Requires
 * chroma.js https://github.com/gka/chroma.js/
 */
"use strict";

var taxonChroma = {};

(function() {

  var colorCache = {};
  var LIGHTNESS_FACTOR = 1; // default lightness factor (1= don't post-adjust)
  var MIN_LIGHTNESS = 0.3;
  var moreBrewerColors = chroma.brewer.Set2; 
  
  this.defaultColor = 'lightgrey';
 
  // define a set of default colors for Arachis species. These are the
  // most common taxon strings in the grin accessions, mapped to
  // Brewer nominal category colors (from chroma.js sets 1-3)
  this.colorMap = {
    'arachis hypogaea' :                   '#e41a1c',
    'arachis hypogaea var. fastigiata':    '#377eb8',
    'arachis hypogaea var. hypogaea':      '#4daf4a',
    'arachis hypogaea subsp. fastigiata':  '#984ea3',
    'arachis hybr.':                       '#ff7f00',
    'arachis spp.':                        '#ffff33',
    'arachis hypogaea subsp. hypogaea':    '#a65628',
    'arachis hypogaea var. vulgaris':      '#f781bf',
    'arachis glabrata':                    '#999999',
    'arachis glabrata var. glabrata':      '#66c2a5',
    'arachis hypogaea var. aequatoriana':  '#fc8d62',
    'arachis burchellii':                  '#8da0cb',
    'arachis duranensis':                  '#e78ac3',
    'arachis pintoi':                      '#a6d854',
    'arachis sylvestris':                  '#ffd92f',
    'arachis hypogaea var. hirsuta':       '#e5c494',
    'arachis kuhlmannii':                  '#b3b3b3',
    'arachis glabrata var. hagenbeckii':   '#8dd3c7',
    'arachis dardanoi':                    '#ffffb3',
    'arachis matiensis':                   '#bebada',
    'arachis stenosperma':                 '#fb8072',
    'arachis prostrata':                   '#80b1d3',
    'arachis hypogaea var. peruviana':     '#fdb462',
    'arachis major':                       '#b3de69',
    'arachis villosa':                     '#fccde5',
    'arachis pusilla':                     '#d9d9d9',
    'arachis villosulicarpa':              '#bc80bd',
    'arachis cardenasii':                  '#ccebc5',
    'arachis paraguariensis':              '#ffed6f',
    'arachis magna':                       'cyan',
    'arachis batizocoi':                   'goldenrod',
  };

  this.clearCache = function() {
    colorCache = {};
  };
  
  this.get = function(taxon, options) {
    // options is an object w/ properties lightnessFactor, overrides
    var color = null;
    var t = taxon.toLowerCase();
    if (! options) {
      options = {};
    }
    // try cache first
    if(t in colorCache) {
      color = colorCache[t]
      return color;
    }
    // try caller's overrides-- this is only useful if caller doesn't
    // want to check it's own list first.
    if (options.overrides && (t in options.overrides)) {
      color = options.overrides[t];
      colorCache[t] = color;
      return color;
    }
    if (options.lightnessFactor === undefined) {
      options.lightnessFactor = LIGHTNESS_FACTOR;
    }
    // handle edge case where t is actually just the genus
    if(t in this.colorMap) {
      color = this.colorMap[t]      
      colorCache[t] = color;
      return color;
    }
    // create new mapping of lower(taxon) -> unique color+hue
    var parts = t.split(' ');
    var genus = parts[0];
    var species = parts[1];
    if(genus in this.colorMap) {
      // colorize using genus for hue, and species for lightness
      var genusColor = this.colorMap[genus];
      var hue = chroma(genusColor).hsl()[0];
      var lightness = MIN_LIGHTNESS +
	             (fnv32a(species, 1000) / 1000) * (1 - 2 *MIN_LIGHTNESS);
      color = chroma(hue, 1, lightness * options.lightnessFactor, 'hsl').hex();
    }
    else {
      // fallback to default color
      color = this.defaultColor;
    }
    colorCache[t] = color;
    return color;
  };
  
  function fnv32a(str, hashSize) {
    /* a consistent hashing algorithm
       https://gist.github.com/vaiorabbit/5657561
       http://isthe.com/chongo/tech/comp/fnv/#xor-fold
    */
    var FNV1_32A_INIT = 0x811c9dc5;
    var hval = FNV1_32A_INIT;
    for ( var i = 0; i < str.length; ++i ) {
      hval ^= str.charCodeAt(i);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    return (hval >>> 0) % hashSize;
  }
  
}.call(taxonChroma));
