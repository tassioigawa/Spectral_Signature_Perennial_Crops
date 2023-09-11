var culturas_perenes_estagio = ee.Image("users/tassioigawa/culturas_perenes_estagio_final");
var culturas_perenes_fenologia = ee.FeatureCollection("users/tassioigawa/culturas_perenes_fenologia_final");
var points = ee.FeatureCollection("users/tassioigawa/pts_culturas_perenes_fenologia");

////////////////////////////////////////////////////Funções///////////////////////////////////////////////////
//Máscara de nuvens
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

// Função para a criação das máscara de nuvem usando Sentinel-2 QA60 band.
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}


//Adicionar NDVI Landsat 8
function addNDVILS8(image) {
  var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

//função para adicionar indices de vegetação
function addNDVIS2(image){
  return image.addBands([
    image.select('B8','B4').normalizedDifference().multiply(10000).add(10000).rename('NDVI')]);
    
}


/////////////////////////////////////////////Carregar Imagens /////////////////////////////////////////////////
//Carregar Sentinel-2 TOA reflectance data//
var s2 = ee.ImageCollection('COPERNICUS/S2');
var s2filtered = s2.filterDate('2020-01-01', '2020-12-31')
                  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE','less_than', 10)  
                  .select(['B1', 'B2', 'B3', 'B4', 'B5', 'B6','B7','B8', 'B8A','B9','B10', 'B11', 'B12'])
                  .map(addNDVIS2)
                  .median()
                  .clip(culturas_perenes_fenologia);

                  
//Carregar Landsat TOA reflectance data//
var landsatSR = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
  .filterDate('2020-06-01', '2020-10-31')
  .map(maskL8sr)
  .map(addNDVILS8)
  .median();


var ndvi = landsatSR.select('NDVI').clip(culturas_perenes_fenologia);

//Relacionar os dados de NDVI com as de Culturas Perenes
var ndvi_ct = ndvi.addBands(culturas_perenes_estagio).aside(print, 'NDVI & Culturas Perenes');

////////////////////////////////////////////////Gráfico Média NDVI////////////////////////////////////////////
//Calcular a média de NDVI para cada tipo de estagio
// Vale lembrar: 1-Açaí Inicial(Monocultivo); 2-Açaí Intermediário(Monocultivo),3-Açaí Maduro(Monocultivo);
//4-Cacau Inicial, 5-Cacau Intermediario. 6-Cacau Maduro (Monocultivo), 
//7-Citrus Inicial; 8-Citrus Intermediário; 9-Citrus Maduro;
//10-Coco Maduro (Monocultivo), 11-Dendê Inicial; 12-Dendê Intermediário; 13-Dendê Maduro;

var mean = ndvi_ct.reduceRegion({
  reducer:ee.Reducer.mean().group({groupField: 1, groupName:'Culturas Perenes'}),
  geometry: culturas_perenes_fenologia,
  scale:4,
  maxPixels:1e20
});
print(mean, 'Media do NDVI em Culturas Perenes');

var list = ee.List(mean.values().get(0)).aside(print, 'lista');
var features = list.map(function (dic){
  return ee.Feature(null,dic)
}).aside(print, 'features');

var chart = ui.Chart.feature.byFeature({
  features: features,   
  xProperty: 'Culturas Perenes',
  yProperties:'mean',
}).setChartType('ColumnChart')
.setOptions({'title': 'Media do NDVI em Culturas Perenes',
             vAxis: {title: 'Média NDVI'},
             hAxis: {title: 'Culturas Perenes', ticks: [1,2,3,4,5,6,7,8,9,10,11,12,13]},
             legend: 'none'
});
print(chart);

////////////////////////////////////////////Histograma//////////////////////////////////////////////////////////
//Açaí - Inicial
var Culturas_acaiinicial = culturas_perenes_estagio.eq(1);  
var ndvi_acaiinicial = ndvi.mask(Culturas_acaiinicial);
var hist_acaiinicial = ui.Chart.image.histogram(ndvi_acaiinicial, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Açaí (Fase: Inicial)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_acaiinicial);


//Açaí - Intermediário
var Culturas_acaiintermediario = culturas_perenes_estagio.eq(2);  
var ndvi_acaiintermediario = ndvi.mask(Culturas_acaiintermediario);
var hist_acaiintermediario = ui.Chart.image.histogram(ndvi_acaiintermediario, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Açaí (Fase: Intermediário)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_acaiintermediario);

//Açaí - Maduro
var Culturas_acaimaduro = culturas_perenes_estagio.eq(3);  
var ndvi_acaimaduro = ndvi.mask(Culturas_acaimaduro);
var hist_acaimaduro = ui.Chart.image.histogram(ndvi_acaimaduro, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Açaí (Fase: Maduro)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_acaimaduro);

//Cacau - Maduro
var Culturas_cacaumaduro = culturas_perenes_estagio.eq(4);  
var ndvi_cacaumaduro = ndvi.mask(Culturas_cacaumaduro);
var hist_cacaumaduro  = ui.Chart.image.histogram(ndvi_cacaumaduro, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Cacau (Fase: Maduro)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_cacaumaduro);

//Citrus - Inicial
var Culturas_citrusinicial = culturas_perenes_estagio.eq(5);  
var ndvi_citrusinicial = ndvi.mask(Culturas_citrusinicial);
var hist_citrusinicial = ui.Chart.image.histogram(ndvi_citrusinicial, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Citrus (Fase: Inicial)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_citrusinicial);

//Citrus - Intermediário
var Culturas_citrusintermediario = culturas_perenes_estagio.eq(6);  
var ndvi_citrusintermediario = ndvi.mask(Culturas_citrusintermediario);
var hist_citrusintermediario = ui.Chart.image.histogram(ndvi_citrusintermediario, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Citrus (Fase: Intermediário)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_citrusintermediario);

//Citrus - Maduro
var Culturas_citrusmaduro = culturas_perenes_estagio.eq(7);  
var ndvi_citrusmaduro = ndvi.mask(Culturas_citrusmaduro);
var hist_citrusmaduro = ui.Chart.image.histogram(ndvi_citrusmaduro, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Citrus (Fase: Maduro)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_citrusmaduro);

//Coco - Maduro 
var Culturas_cocomaduro = culturas_perenes_estagio.eq(8);  
var ndvi_cocomaduro = ndvi.mask(Culturas_cocomaduro);
var hist_cocomaduro = ui.Chart.image.histogram(ndvi_cocomaduro, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Coco (Fase: Maduro)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_cocomaduro);

//Dendê Inicial
var Culturas_dendeinicial = culturas_perenes_estagio.eq(9);  
var ndvi_dendeinicial = ndvi.mask(Culturas_dendeinicial);
var hist_dendeinicial = ui.Chart.image.histogram(ndvi_dendeinicial, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Dendê (Fase: Inicial)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_dendeinicial);

//Dendê Intermediário
var Culturas_dendeintermediario = culturas_perenes_estagio.eq(10);  
var ndvi_dendeintermediario = ndvi.mask(Culturas_dendeintermediario);
var hist_dendeintermediario = ui.Chart.image.histogram(ndvi_dendeintermediario, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Dendê (Fase: Intermediário)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_dendeintermediario);

//Dendê Maduro
var Culturas_dendemaduro = culturas_perenes_estagio.eq(11);  
var ndvi_dendemaduro = ndvi.mask(Culturas_dendemaduro);
var hist_dendemaduro = ui.Chart.image.histogram(ndvi_dendemaduro, culturas_perenes_fenologia, 75)
                 .setOptions({title: 'NDVI do Dendê (Fase: Maduro)',
                              vAxis: {title: 'Número de pixels'},
                              hAxis: {title: 'NDVI', ticks: [-1, -0.5, 0, 0.5, 1]},
                              legend: 'none'
                 }); 
print(hist_dendemaduro);

Map.addLayer(culturas_perenes_fenologia)

/////////////////////////////////////Assinatura Espectral///////////////////////////////////////

var options = {
  title: 'Assinatura Espectral',
  hAxis: {title: 'Comprimento de onda (micrômetros)'},
  vAxis: {title: 'Reflectância'},
  lineWidth: 1,
  pointSize: 4,
  series: {
    0: {color: 'DDA0DD'},
    1: {color: 'DA70D6'},
    2: {color: '8B008B'},
    3: {color: '00FF7F'},
    4: {color: '2E8B57'},
    5: {color: '228B22'},
    6: {color: '008000'},
    7: {color: 'FFB6C1'},
    8: {color: 'FA8072'},
    9: {color: 'DC143C'},
    10: {color: 'FAA460'},
    11: {color: 'FFA500'},
    12: {color: 'FF7F50'}

}};


var wavelengths = [0.44, 0.49, 0.56, 0.66, 0.7, 0.74, 0.78, 0.83, 0.86, 0.93, 1.38, 1.61, 2.19];
var wavelengthslv = [0.44, 0.49, 0.56, 0.66, 0.7];
var wavelengthsifr = [0.74, 0.78, 0.83, 0.86, 0.93, 1.38, 1.61, 2.19];

var sentinel2 =  ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2020-01-01', '2020-12-31')
                  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE','less_than', 10)  
                  .select(['B1', 'B2', 'B3', 'B4', 'B5', 'B6','B7','B8', 'B8A','B9','B10', 'B11', 'B12'])
                  .median();

var sentinel2lv =  ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2020-01-01', '2020-12-31')
                  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE','less_than', 10)  
                  .select(['B1', 'B2', 'B3', 'B4', 'B5'])
                  .median();
var sentinel2ifr =  ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2020-01-01', '2020-12-31')
                  .filterMetadata('CLOUDY_PIXEL_PERCENTAGE','less_than', 10)  
                  .select([ 'B6','B7','B8', 'B8A','B9','B10', 'B11', 'B12'])
                  .median();                  
//Gráfico Geral                  
var spectraChart = ui.Chart.image.regions(
    sentinel2, points, ee.Reducer.mean(), 20, 'label', wavelengths)
        .setChartType('ScatterChart')
        .setOptions(options);

print(spectraChart);

//Gráfico Luz Visível
var spectraChart = ui.Chart.image.regions(
    sentinel2lv, points, ee.Reducer.mean(), 20, 'label', wavelengthslv)
        .setChartType('ScatterChart')
        .setOptions(options);

print(spectraChart);

//Gráfico Infravermelho Próximo e Médio
var spectraChart = ui.Chart.image.regions(
    sentinel2ifr, points, ee.Reducer.mean(), 20, 'label', wavelengthsifr)
        .setChartType('ScatterChart')
        .setOptions(options);

print(spectraChart);