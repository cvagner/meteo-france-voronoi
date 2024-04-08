import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import {OSM, Vector as VectorSource} from 'ol/source.js';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer.js';
import {fromLonLat} from 'ol/proj.js';
import { Style, Fill, Circle } from 'ol/style.js';

import * as turf from '@turf/turf';
import voronoi from '@turf/voronoi';

const stationsSource = new VectorSource();
const voronoiCellsSource = new VectorSource();

// https://www.data.gouv.fr/fr/datasets/informations-sur-les-stations-metadonnees/
// https://donneespubliques.meteofrance.fr/metadonnees_publiques/fiches/fiches.json
fetch('data/stations-meteo.geojson')
  .then(function (response) {
    return response.json();
  })
  .then(function (json) {
    const format = new GeoJSON({ featureProjection: 'EPSG:3857' });

    const turfStations = turf.featureCollection(json.features);
    const stationFeatures = format.readFeatures(json);
    stationsSource.addFeatures(stationFeatures);
    const voronoiCells = voronoi(turfStations);
    voronoiCells.features.forEach(function (feature) {
      const olFeature = format.readFeature(feature);
      voronoiCellsSource.addFeature(olFeature);
    })
  })

const map = new Map({
  layers: [new TileLayer({
    source: new OSM(),
  }), new VectorLayer({
    source: voronoiCellsSource,
    declutter: true,
    style: {
      'stroke-color': 'blue',
      'stroke-width': 1,
      'text-value': ['get', 'NUM_POSTE'],
      'text-fill-color': 'blue',
      'text-overflow': false,
    },
  }),
  new VectorLayer({
    source: stationsSource,
    style: new Style({
      image: new Circle({
        radius: 3,
        fill: new Fill({
          color: '#00008B',
        }),
      }),
    })
  })],
  target: document.getElementById('map'),
  view: new View({
    center: fromLonLat([5, 45]),
    zoom: 5,
  }),
})

map.on('pointermove'/*click*/, function(evt) {
  displayFeatureInfo(evt.coordinate);
})

const displayFeatureInfo = function(coordinate) {
  const features = voronoiCellsSource.getFeaturesAtCoordinate(coordinate)
  let feature = features.length ? features[0] : undefined;
  displayStationInfo(feature);
}

const displayStationInfo = function(feature) {
  if (!feature) {
    return;
  }
  const num = feature.get('NUM_POSTE');
  const nom = feature.get('NOM_USUEL'); 
  document.getElementById('info').innerHTML = `Station : ${num} (${nom})`;
}