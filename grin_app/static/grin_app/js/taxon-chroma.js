/* use the chroma.js library to colorize taxons consistently and
 * predictably. Requires chroma.js https://github.com/gka/chroma.js/
 *
 * usage example: (always returns same hue for Arachis, but scaled in
 * saturation and darkness)
 *
 * taxonChroma.get('Arachis hypogaea');
 * taxonChroma.get('Arachis burkartii');
 */

var taxonChroma = {};

(function() {
  
  var colorScale = chroma.scale('Spectral');
  var colorCache = {};
  var COLOR_SATURATION_FACTOR = 4;

  this.get = function(taxon) {
    var color = _.get(colorCache, taxon);
    if(color) { return color; }
    var parts = taxon.toLowerCase().split(' ');
    var genus = parts[0];
    // map the genus to a color hue in [0,1]
    var hue = fnv32a(genus, 1000) / 1000;
    // map the species to darkness and saturation in [0,1]
    var saturation = 1;
    for(var i=1; i<parts.length; i++) {
      var part = parts[i];
      saturation *= fnv32a(part, 1000) / 1000;
    }
    // call color scale function then convert to get hex code
    saturation = saturation * COLOR_SATURATION_FACTOR;
    var col = colorScale(hue)
	.saturate(saturation)
	.darken(saturation).hex();
    // cache it
    colorCache[taxon] = col;
    return col;
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
