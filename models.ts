export interface Coordinates {
    lat: number,
    lon: number,
    datum: Datum
}

export interface Ellipsoid {
    majorAxis: number,
    minorAxis: number,
    flattening: number
}

export interface Datum {
    ellipsoid: Ellipsoid;
    transform: {
        tx: number,
        ty: number,
        tz: number,
        s: number,
        rx: number,
        ry: number,
        rz: number
    }
}

export interface Vector3d {
    x: number,
    y: number,
    z: number
}