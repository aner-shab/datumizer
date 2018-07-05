# datumizer
Datum converter for maps with different projections.

Once upon a time, I had to figure out datum transformations using the Helmert transformation (https://en.wikipedia.org/wiki/Helmert_transformation).

Requires lodash (but you can easily enough substitute isEqual with something else)

This example contains only WGS84 and NAD83 in datumStore.ts -- to use different projections, you will need to find their datum values and relevant ellipsoids on the web and add them yourself!