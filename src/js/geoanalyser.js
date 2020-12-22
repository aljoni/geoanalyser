/**
 * GeoAnalsyer
 *
 * Written by: Alex Nicholson
 */

(function () {
    class AverageMethod {
        constructor() {
        }

        lerp(start, end, ratio) {
            if (start == end) {
                return start;
            }
            return start * (1 - ratio) + end * ratio;
        }

        lerpPoints(start, end, ratio) {
            console.assert(start != end, 'Start should not equal end');

            return [
                this.lerp(start[0], end[0], ratio),
                this.lerp(start[1], end[1], ratio),
            ];
        }

        distBetweenPoints(start, end) {
            console.assert(start != end, 'Start should not equal end');

            const dLon = end[0] - start[0];
            const dLat = end[1] - start[1];
            return Math.sqrt(dLon * dLon + dLat * dLat);
        }

        angleBetweenPoints(start, end) {
            console.assert(start != end, 'Start should not equal end');

            const dLon = end[0] - start[0];
            const dLat = end[1] - start[1];
            return Math.atan2(dLat, dLon);
        }

        findRatioToGetDistance(start, end, distTravelled, distWanted) {
            console.assert(start != end, 'Start should not equal end');

            const totalDist = this.distBetweenPoints(start, end);
            const distRemain = distWanted - (distTravelled - totalDist);
            return distRemain / totalDist;
        }

        getPoint(points, distWanted) {
            if (distWanted == 0) {
                return [points[0], 0];
            }

            let distTravelled = 0;
            let currentPoint = points[0];
            let pointIndex = 0;

            for (let i = 1; i <= points.length; ++i) {
                if (distTravelled >= distWanted) {
                    break;
                }
                let nextPoint = points[i];
                if (!nextPoint) {
                    return null;
                }
                distTravelled += this.distBetweenPoints(currentPoint, nextPoint);
                currentPoint = nextPoint;
                pointIndex = i - 1;
            }

            let prevPoint = points[pointIndex];
            let ratio = this.findRatioToGetDistance(prevPoint, currentPoint, distTravelled, distWanted);

            if (prevPoint == currentPoint) {
                return [prevPoint, pointIndex];
            }
            return [this.lerpPoints(prevPoint, currentPoint, ratio), pointIndex];
        }

        // lineLineIntersect(l1s, l1e, l2s, l2e) {
        //     const a1 = l1e[1] - l1s[1];
        //     const b1 = l1s[0] - l1e[0];
        //     const c1 = a1 * l1s[0] + b1 * l1s[1];

        //     const a2 = l2e[1] - l2s[1];
        //     const b2 = l2s[0] - l2e[0];
        //     const c2 = a2 * l2s[0] + b1 * l2s[1];

        //     const delta = a1 * b2 - a2 * b2;
        //     return [
        //         (b2 * c1 - b1 * c2) / delta,
        //         (a1 * c2 - a2 * c1) / delta
        //     ];
        // }

        lineLineIntersect(l1s, l1e, l2s, l2e) {
            var denominator, a, b, numerator1, numerator2, result = {
                x: null,
                y: null,
                onLine1: false,
                onLine2: false
            };
            denominator = ((l2e[1] - l2s[1]) * (l1e[0] - l1s[0])) - ((l2e[0] - l2s[0]) * (l1e[1] - l1s[1]));
            if (denominator == 0) {
                return result;
            }
            a = l1s[1] - l2s[1];
            b = l1s[0] - l2s[0];
            numerator1 = ((l2e[0] - l2s[0]) * a) - ((l2e[1] - l2s[1]) * b);
            numerator2 = ((l1e[0] - l1s[0]) * a) - ((l1e[1] - l1s[1]) * b);
            a = numerator1 / denominator;
            b = numerator2 / denominator;

            // if we cast these lines infinitely in both directions, they intersect here:
            result.x = l1s[0] + (a * (l1e[0] - l1s[0]));
            result.y = l1s[1] + (a * (l1e[1] - l1s[1]));
            /*
                    // it is worth noting that this should be the same as:
                    x = l2s[0] + (b * (l2e[0] - l2s[0]));
                    y = l2s[0] + (b * (l2e[1] - l2s[1]));
                    */
            // if line1 is a segment and line2 is infinite, they intersect if:
            if (a > 0 && a < 1) {
                result.onLine1 = true;
            }
            // if line2 is a segment and line1 is infinite, they intersect if:
            if (b > 0 && b < 1) {
                result.onLine2 = true;
            }
            // if line1 and line2 are segments, they intersect if both of the above are true
            return [result.x, result.y];
        }
    }

    /**
     * Read file as a string.
     *
     * @param {File} file File to read.
     * @param {Function} loadCb Callback on successful load.
     * @param {Function} errorCb Callback on error.
     */
    async function readText(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');

            reader.onload = (ev) => {
                resolve(ev.target.result);
            };
            reader.onerror = () => {
                resolve(null);
                alert('Failed to load file');
            };
        });
    }

    async function waypointsToArrays(waypoints) {
        return new Promise(resolve => {
            let arrays = [];
            for (let i = 0; i < waypoints.length; ++i) {
                arrays.push([
                    waypoints[i].lon,
                    waypoints[i].lat
                ]);
            }
            resolve(arrays);
        });
    }

    async function waypointsToPoints(waypoints) {
        return new Promise(resolve => {
            let points = [];
            for (let i = 0; i < waypoints.length; ++i) {
                points.push(ol.proj.fromLonLat([
                    waypoints[i].lon,
                    waypoints[i].lat
                ]));
            }
            resolve(points);
        });
    }

    async function pointsToVector(points, name, color) {
        return new Promise(resolve => {
            const vector = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: [
                        new ol.Feature({
                            geometry: new ol.geom.LineString(points),
                            name: name
                        })
                    ]
                }),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: color,
                        width: 2
                    })
                })
            });
            resolve(vector);
        });
    }

    function createCircle(point, color) {
        return new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [
                    new ol.Feature({
                        geometry: new ol.geom.Circle(point, 2)
                    })
                ]
            }),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: color,
                    width: 2
                })
            })
        });
    }

    function createLine(points, color) {
        const vector = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [
                    new ol.Feature({
                        geometry: new ol.geom.LineString(points),
                    })
                ]
            }),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: color,
                    width: 3
                })
            })
        });
        return vector;
    }

    /**
     * Initialise map, and setup handlers.
     */
    function init() {
        const map = new ol.Map({
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({

                center: ol.proj.fromLonLat([37.41, 8.82]),
                zoom: 4
            })
        });

        const fileLine = document.getElementById('gpx_line');
        const fileTrack = document.getElementById('gpx_track');
        const btnProcess = document.getElementById('process');

        btnProcess.addEventListener('click', async () => {
            const txtLine = await readText(fileLine.files[0]);
            const txtTrack = await readText(fileTrack.files[0]);

            await process(map, txtLine, txtTrack);
        });
    }

    function checkIntersection(int) {
        return !(Math.abs(int[0]) == Infinity || Math.abs(int[1]) == Infinity);
    }

    function deg2rad(deg) {
        return deg * Math.PI / 180;
    }

    function rad2deg(deg) {
        return deg * 180 / Math.PI;
    }

    // Using algorithm from: https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
    function distanceInMeters(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d * 1000;
    }

    async function process(map, line, track) {
        const gpxLine = new gpxParser();
        const gpxTrack = new gpxParser();

        gpxLine.parse(line);
        gpxTrack.parse(track);

        const arrLine = await waypointsToArrays(gpxLine.waypoints);
        const arrTrack = await waypointsToArrays(gpxTrack.waypoints);

        const ptsLine = await waypointsToPoints(gpxLine.waypoints);
        const vecLine = await pointsToVector(ptsLine, 'line', '#0000ff');
        delete ptsLine;

        const ptsTrack = await waypointsToPoints(gpxTrack.waypoints);
        const vecTrack = await pointsToVector(ptsTrack, 'track', '#ff0000');
        delete ptsTrack;

        map.addLayer(vecLine);
        map.addLayer(vecTrack);

        const am = new AverageMethod();

        // TODO: Move in N meter increments, currently moving an arbitrary amount.
        let d = 0;
        let pt = am.getPoint(arrTrack, d);
        let count = 0;
        let totalDist = 0;
        while (true) {
            const start = arrTrack[pt[1]];
            const end = arrTrack[pt[1] + 1];
            const angle = am.angleBetweenPoints(start, end);

            const perp = [
                pt[0][0] + (Math.cos(angle + (Math.PI * 0.5)) * 1000),
                pt[0][1] + (Math.sin(angle + (Math.PI * 0.5)) * 1000)
            ];

            d += 0.0002;
            pt = am.getPoint(arrTrack, d);
            if (pt == null) {
                break;
            }

            for (let i = 1; i < arrLine.length; ++i) {
                const lineS = arrLine[i - 1];
                const lineE = arrLine[i];

                const intersection = am.lineLineIntersect(pt[0], perp, lineS, lineE);

                if (checkIntersection(intersection)) {
                    const dist = distanceInMeters(pt[0][0], pt[0][1], intersection[0], intersection[1]);

                    totalDist += dist;
                    ++count;

                    const p2 = ol.proj.fromLonLat(intersection, 'EPSG:3857');
                    const p1 = ol.proj.fromLonLat(pt[0], 'EPSG:3857');
                    map.addLayer(createLine([p1, p2], '#00ff00'));
                    break;
                }
            }
        }

        const result = document.getElementById("result");
        result.style.display = "block";
        result.innerHTML = `Average distance: <b>${(totalDist / count).toFixed(3)}m</b>`;

        map.setView(new ol.View({
            center: [ptsLine[0][0], ptsLine[0][1]],
            zoom: 16
        }));
    }

    window.addEventListener('load', init);
}());