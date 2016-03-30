"use strict";

/* colorize accessions by taxon name, with a set of defaults and
 * overrides. If the genera matches the colorMap, the species will be
 * used to darken/lighten for more unique color values. Requires
 * chroma.js https://github.com/gka/chroma.js/
 */

var taxonChroma = {};

(function () {

    var colorCache = {};

    var moreBrewerColors = chroma.brewer.Set2;

    this.defaultColor = '#d3d3d3';

    // define a set of default colors for legumes by genera. many of
    // these were originally defined by the LIS phylotree module.
    this.colorMap = {
        apios: moreBrewerColors[0],
        arachis: '#bcbd22',
        cajanus: '#ffbb78',
        chamaecrista: moreBrewerColors[5],
        cicer: '#2ca02c',
        glycine: '#1f77b4',
        lens: '#98df8a',
        lotus: '#17becf',
        lupinus: '#ff9896',
        medicago: '#8c564b',
        phaseolus: '#e377c2',
        pisum: '#f7b6d2',
        trifolium: moreBrewerColors[2],
        vicia: moreBrewerColors[4],
        vigna: '#d62728'
    };

    this.clearCache = function () {
        colorCache = {};
    };

    this.get = function (taxon, options) {
        // options is an object w/ properties lightnessFactor, overrides
        var color, parts, genus, species, genusColor, hcl, hclHi, hclLow,
            lightness;
        var t = (taxon) ? taxon.toLowerCase() : 'unknown';
        if (!options) {
            options = {};
        }
        // try cache first
        if (t in colorCache) {
            color = colorCache[t];
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
        if (t in this.colorMap) {
            color = this.colorMap[t];
            colorCache[t] = color;
            return color;
        }
        // create new mapping of lower(taxon) -> unique color+hue
        parts = t.split(' ');
        genus = parts[0];
        species = parts[1];
        if (genus in this.colorMap) {
            // colorize using genus for hue, and species for lightness
            genusColor = this.colorMap[genus];
            hcl = chroma(genusColor).hcl();
            // start with saturated color out of the hue found in hcl color space.
            // end with less saturated by equal valued (lighness) color from the hcl.
            // interpolate by adjusting the L (lightness) in HCL space.
            hclHi = chroma.hcl(hcl[0], 90, 100);
            hclLow = chroma.hcl(hcl[0], 90, 30);
            lightness = fnv32a(species, 1000) / 1000;
            color = chroma.interpolate(hclHi, hclLow, lightness, 'hcl').hex();
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
        for (var i = 0; i < str.length; ++i) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }
        return (hval >>> 0) % hashSize;
    }

}.call(taxonChroma));
