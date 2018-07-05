import { Ellipsoid, Datum, Vector3d, Coordinates } from './models';
import { GeoData } from './datumStore'
import * as CONST from './constants';
import * as _ from 'lodash';

export class Datumizer {

    public static shift(latitude: number, longitude: number, origin: string, target: string) {
        // This is the 'main' method we use to throw one set of coordinates into and get another. 
        // Returns a simple object with lon/lat properties.

        var fromDatum: Datum;
        var toDatum: Datum;

        switch (origin) {
            case CONST.NAD83:
                fromDatum = GeoData.NAD83();
                break;
            case CONST.WGS84:
            case CONST.ITRF08:
            default:
                fromDatum = GeoData.WGS84();
                break;
        }

        switch (target) {
            case CONST.NAD83:
                toDatum = GeoData.NAD83();
                break;
            case CONST.WGS84:
            case CONST.ITRF08:
            default:
                toDatum = GeoData.WGS84();
                break;
        }

        var coordinates: Coordinates = {
            lat: latitude,
            lon: longitude,
            datum: fromDatum
        };

        var result = this.convertDatum(coordinates, toDatum);

        return {
            longitude: result.lon,
            latitude: result.lat
        };
    }

    private static convertDatum(coords: Coordinates, targetDatum: Datum): Coordinates {
        coords.lon = coords.lon * -1;
        var oldCoords = coords;
        var transform = null;
        if (_.isEqual(oldCoords.datum, GeoData.WGS84())) { // converting from WGS84
            transform = targetDatum.transform;
        }
        if (_.isEqual(targetDatum, GeoData.WGS84())) {
            // converting to WGS 84; use inverse transform (don't overwrite original!)
            transform = {
                tx: -oldCoords.datum.transform.tx,
                ty: -oldCoords.datum.transform.ty,
                tz: -oldCoords.datum.transform.tz,
                s: -oldCoords.datum.transform.s,
                rx: -oldCoords.datum.transform.rx,
                ry: -oldCoords.datum.transform.ry,
                rz: -oldCoords.datum.transform.rz
            };

        }
        if (transform == null) {
            // failsafe: if neither coords.datum nor targetDatum are WGS84, convert this to WGS84 first
            oldCoords = this.convertDatum(oldCoords, GeoData.WGS84());
            transform = targetDatum.transform;
        }

        var oldCartesian = this.toCartesian(oldCoords); // convert polar to cartesian...
        var newCartesian = this.applyTransform(oldCartesian, transform); // apply transform...
        var newLatLon = this.toLatLonE(newCartesian, targetDatum); // ..and convert cartesian to polar

        return newLatLon;
    }

    private static toCartesian(coords: Coordinates): Vector3d {
        var φ = this.toRadians(coords.lat);
        var λ = this.toRadians(coords.lon);
        var h = 0; // height above ellipsoid - not currently used
        var a = coords.datum.ellipsoid.majorAxis;
        var f = coords.datum.ellipsoid.flattening;

        var sinφ = Math.sin(φ), cosφ = Math.cos(φ);
        var sinλ = Math.sin(λ), cosλ = Math.cos(λ);

        var eSq = 2 * f - f * f;                      // 1st eccentricity squared ≡ (a²-b²)/a²
        var ν = a / Math.sqrt(1 - eSq * sinφ * sinφ); // radius of curvature in prime vertical

        var x = (ν + h) * cosφ * cosλ;
        var y = (ν + h) * cosφ * sinλ;
        var z = (ν * (1 - eSq) + h) * sinφ;

        var point: Vector3d = { x: x, y: y, z: z }

        return point;
    }

    private static applyTransform(oldCartesian: Vector3d, t) {
        var x1 = oldCartesian.x, y1 = oldCartesian.y, z1 = oldCartesian.z;
        var tx = t.tx;                    // x-shift
        var ty = t.ty;                    // y-shift
        var tz = t.tz;                    // z-shift
        var s1 = t.s / 1e6 + 1;            // scale: normalise parts-per-million to (s+1)
        var rx = this.toRadians(t.rx / 3600); // x-rotation: normalise arcseconds to radians
        var ry = this.toRadians(t.ry / 3600); // y-rotation: normalise arcseconds to radians
        var rz = this.toRadians(t.rz / 3600); // z-rotation: normalise arcseconds to radians
        var x2 = tx + x1 * s1 - y1 * rz - z1 * ry;
        var y2 = ty + x1 * rz - y1 * s1 + z1 * rx;
        var z2 = tz + x1 * ry + y1 * rx + z1 * s1;
        var final: Vector3d = { x: x2, y: y2, z: z2 };
        return final;
    }

    private static toLatLonE(newCartesian: Vector3d, toDatum: Datum) {
        var x = newCartesian.x, y = newCartesian.y, z = newCartesian.z;
        var a = toDatum.ellipsoid.majorAxis, b = toDatum.ellipsoid.minorAxis, f = toDatum.ellipsoid.flattening;
        var e2 = 2 * f - f * f;   // 1st eccentricity squared ≡ (a²-b²)/a²
        var ε2 = e2 / (1 - e2); // 2nd eccentricity squared ≡ (a²-b²)/b²
        var p = Math.sqrt(x * x + y * y); // distance from minor axis
        var R = Math.sqrt(p * p + z * z); // polar radius

        // parametric latitude (Bowring eqn 17, replacing tanβ = z·a / p·b)
        var tanβ = (b * z) / (a * p) * (1 + ε2 * b / R);
        var sinβ = tanβ / Math.sqrt(1 + tanβ * tanβ);
        var cosβ = sinβ / tanβ;

        // geodetic latitude (Bowring eqn 18: tanφ = z+ε²bsin³β / p−e²cos³β)
        var φ = isNaN(cosβ) ? 0 : Math.atan2(z + ε2 * b * sinβ * sinβ * sinβ, p - e2 * a * cosβ * cosβ * cosβ);

        // longitude
        var λ = Math.atan2(y, x);

        // height above ellipsoid (Bowring eqn 7) [not currently used]
        var sinφ = Math.sin(φ), cosφ = Math.cos(φ);
        var ν = a / Math.sqrt(1 - e2 * sinφ * sinφ); // length of the normal terminated by the minor axis
        var h = p * cosφ + z * sinφ - (a * a / ν);

        φ = this.toDegrees(φ);
        λ = this.toDegrees(λ);
        var point: Coordinates = {
            lat: φ,
            lon: λ,
            datum: toDatum
        };

        return point;
    }

    private static toRadians(num: number): number {
        return num * Math.PI / 180;
    }
    private static toDegrees(num: number): number {
        return num * 180 / Math.PI;
    }

}