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
    'arachis batizocoi':                   '#e5c494',
    'arachis benthamii':                   '#377eb8',
    'arachis burchellii':                  '#e41a1c',
    'arachis burkartii':                   '#fdb462',
    'arachis cardenasii':                  '#ccebc5',
    'arachis correntina':                  '#8dd3c7',
    'arachis cryptopotamica':              '#984ea3',
    'arachis dardanoi':                    '#ffffb3',
    'arachis diogoi':                      '#fc8d62',
    'arachis duranensis':                  '#e78ac3',
    'arachis glabrata':                    '#999999',
    'arachis helodes':                     '#8da0cb',
    'arachis hybr.':                       '#ff7f00',
    'arachis hypogaea' :                   '#a65628',
    'arachis kuhlmannii':                  '#b3b3b3',
    'arachis lutescens':                   '#66c2a5',
    'arachis macedoi':                     '#f781bf',
    'arachis magna':                       '#4daf4a',
    'arachis major':                       '#b3de69',
    'arachis matiensis':                   '#bebada',
    'arachis paraguariensis':              '#ffed6f',
    'arachis pintoi':                      '#a6d854',
    'arachis prostrata':                   '#80b1d3',
    'arachis pusilla':                     '#d9d9d9',
    'arachis spp.':                        '#ffff33',
    'arachis stenosperma':                 '#fb8072',
    'arachis sylvestris':                  '#ffd92f',
    'arachis villosa':                     '#fccde5',
    'arachis villosulicarpa':              '#bc80bd',
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
    // handle edge case where t is actually just the genus
    if(t in this.colorMap) {
      color = this.colorMap[t];
      colorCache[t] = color;
      return color;
    }
    var parts = t.split(' ');
    var genus = parts[0];
    var species = parts[1];
    // handle edge case where species was followed by var. or subst, etc.
    if(genus + ' ' + species in this.colorMap) {
      var tmp = genus + ' ' + species;
      color = this.colorMap[tmp];
      colorCache[t] = color; // map original taxon string to the color
      return color;
    }
    // create new mapping of lower(taxon) -> unique color+hue
    if(genus in this.colorMap) {
      // colorize using genus for hue, and species for lightness
      if (options.lightnessFactor === undefined) {
	options.lightnessFactor = LIGHTNESS_FACTOR;
      }
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
