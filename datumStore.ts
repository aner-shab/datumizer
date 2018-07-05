import { Ellipsoid, Datum } from './models';

export class GeoData {
    
    static ellipsoidGRS80(): Ellipsoid {
        return {
            majorAxis: 6378137,
            minorAxis: 6356752.314140356,
            flattening: 1 / 298.257222101
        };
    }

    static ellipsoidWGS84(): Ellipsoid {
        return {
            majorAxis: 6378137,
            minorAxis: 6356752.314245,
            flattening: 1 / 298.257223563
        };
    }
    
    static NAD83(): Datum {
        return {
            ellipsoid: this.ellipsoidGRS80(),
            transform: {
                tx: 0.99343,
                ty: -1.90331,
                tz: -0.52655,
                s: 0.00171504,
                rx: 0.02591458,
                ry: 0.00942655,
                rz: 0.01159929
            }
        };
    }

    static WGS84(): Datum {
        return {
            ellipsoid: this.ellipsoidWGS84(),
            transform: {
                tx: 0.0,
                ty: 0.0,
                tz: 0.0,
                s: 0.0,
                rx: 0.0,
                ry: 0.0,
                rz: 0.0
            }
        };
    }

}