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
  
  this.defaultColor = '#d3d3d3';

  // define a set of default colors for legumes by genera. many of
  // these were originally defined by the LIS phylotree module.
  this.colorMap = {
    apios :        moreBrewerColors[0],
    arachis :      '#bcbd22',
    cajanus :      '#ffbb78',
    chamaecrista : moreBrewerColors[5],
    cicer :        '#2ca02c',
    glycine :      '#1f77b4',
    lens :         '#98df8a',
    lotus :        '#17becf',
    lupinus :      '#ff9896',
    medicago :     '#8c564b',
    phaseolus :    '#e377c2',
    pisum :        '#f7b6d2',
    trifolium :    moreBrewerColors[2],
    vicia :        moreBrewerColors[4],
    vigna :        '#d62728',
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
