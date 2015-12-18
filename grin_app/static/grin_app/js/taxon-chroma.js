/* use the chroma.js library to colorize taxons consistently and
 * predictably. Requires chroma.js https://github.com/gka/chroma.js/
 *
 * usage example: (always returns same hue for Arachis, but scaled
 * lightness depending on the Species -- completely abitrarily, but
 * consistently)
 *
 * taxonChroma.get('Arachis hypogaea');
 * taxonChroma.get('Arachis burkartii');
 */

var taxonChroma = {};

(function() {

  var colorCache = {};
  var LIGHTNESS_FACTOR = 1; // default lightness factor (1= don't post-adjust)
  var MIN_LIGHTNESS = 0.3;
  var SET1 = chroma.brewer.Set3; // brewer color set w/ 12 elements
  var SET2 = chroma.brewer.Pastel1 // brewer color set w/ 9 elements

  this.defaultColor = 'grey'; // used for non-legume genera
  
  this.legumeGenera = {
    apios :        SET1[0],
    arachis :      SET1[1],
    cajanus :      SET1[2],
    chamaecrista : SET1[3],
    cicer :        SET1[4],
    glycine :      SET1[5],
    lens :         SET1[6],
    lotus :        SET1[7],
    lupinus :      SET1[9], // 8 is grey-ish
    medicago :     SET1[10],
    phaseolus :    SET1[11],
    pisum :        SET2[0],
    trifolium :    SET2[1],
    vicia :        SET2[2],
    vigna :        SET2[3],
  };

  this.get = function(taxon, lightnessFactor) {

    // cache lookup
    var color = _.get(colorCache, taxon);
    if(color) { return color; }

    if(! lightnessFactor) {
      lightnessFactor = LIGHTNESS_FACTOR;
    }
    var parts = taxon.toLowerCase().split(' ');
    var genus = parts[0];
    var species = parts[1];
    var genusColor = _.get(this.legumeGenera, genus, null);
    if(genusColor) {
      var hue = chroma(genusColor).hsl()[0];
      var lightness = MIN_LIGHTNESS +
	             (fnv32a(species, 1000) / 1000) * (1 - 2 *MIN_LIGHTNESS);
      color = chroma(hue, 1, lightness * lightnessFactor, 'hsl').hex();
    }
    else {
      color = this.defaultColor;
    }
    colorCache[taxon] = color;
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
