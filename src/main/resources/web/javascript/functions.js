/*YOANN'S FUNCTIONS*/


$.jsonRPC.setup({
endPoint: '/json-rpc',
});



  $(function() {
$("#toggle").click(function() {
  $( "#slide" ).toggle( "blind","slow" );
});
  });


var lat1, long1;
var map ;
var distMax;
var markers;
var jsonData;


var roundIcon;


function init(){
	
	console.log("chargement");
	
	testMap();
	markers=new Array();
	
	$("#distMax").bind("slider:changed", function (event, data) {
		// The currently selected value of the slider
		 $("#valSlider").text(data.value);
		 distMax = data.value;
		 
		/*
		 for (var i = 0 ; jsonData.length ; i++){
			console.log(jsonData[i].distance);
			if (jsonData[i].distance > distMax) {
				map.removeLayer(markers[i]);
			}	
		 }
		 */
	});
	
	
	distMax = 100000000000;
	
	roundIcon = L.icon({	
		iconUrl: '../images/icon.png'});	
}




function testMap() {

var nancy = L.latLng(48.6833, 6.2);
//myMap est le div html dans lequel va s'afficher la carte
map = L.map('myMap').setView(nancy, 2);

//Création d'une couche, obligatoire pour afficher des choses ensuite 
// Sur cette couche il y a dejà les stations de bus/metro
L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', {
maxZoom: 18,
attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
}).addTo(map);



map.on('click', onMapClick);


}


function onMapClick(e) {
	
	
	/*
	popup
		.setLatLng(e.latlng)
		.setContent("You clicked the map at " + e.latlng.toString())
		.openOn(map);
		
	
	*/
		lat1 = e.latlng.lat;
		long1 = e.latlng.lng;
		
		sendCoordinates();
		
		/*Le process pour generer les bons JSON*/
		
		displayMarker();

				    

}




function displayMarker(){
		$.ajax({
			url: "json/map.json",
			dataType: "json",
			mimeType: "textPlain",
			success: function(data){
				
				jsonData = data;
				var tab=new Array();
				for (var i = 0  ; i < data.length ; i++){
					//console.log(data[i]);
					
					//console.log(data[i].distance+"<="+distMax)
					
					if (data[i].distance <= distMax) {
						
						var marker = L.marker([data[i].lat, data[i].lng],{icon: roundIcon});
						map.addLayer(marker);
						markers[marker._leaflet_id] = marker;
						markers[marker._leaflet_id].bindPopup("<b>"+data[i].label+"</b><div><img class='imgPopup' src='"+data[i].img+"'></div>");
						
					}
				}

			}
		});

}

 function sendCoordinates() {
	$.jsonRPC.request('getCoordinates', {
          params: { "lat": lat1, "long": long1},
          success: function(r) {
              //console.log("Succés de l'envoi des coordonnées");
	      console.log(r);
          },
          error: function(error)  { console.log('There was an error', error); }
      });
};


/*KAREN'S FUNCTIONS*/
function byte2Hex(x){
  var n = Math.round(x);
  var nybHexString = "0123456789ABCDEF";
  return String(nybHexString.substr((n >> 4) & 0x0F,1)) + nybHexString.substr(n & 0x0F,1);
}

function real2hour(x){
	var h = Math.floor(x);
	var dm= Math.floor((6*(x-h)));
	var m = Math.floor(60*(x-h)-10*dm);
	return(h+"h"+dm+m);
}

function val2color(x){ // 0<=x<=1
	return('#FF'+byte2Hex(255*x)+'00');
}



function caption(){
	
	info = L.control();
	info.onAdd = function (map) {
		div = L.DomUtil.create('div', 'info'); 
		this.update();
		return div;
	};
		
	info.update = function (name, direction) {
		div.innerHTML =  (name ? '<h4>Ligne '+ name + '</h4>' + ' Direction : ' + direction : 'Passer la souris sur une ligne' );
	};
		
	info.addTo(map);

	//fin script guillaume
}

function highlightLine(e){
	var line = e.target;
	line.setStyle({color: 'blue'});
	info.update(line.name, line.direction);
}


function resetHighlightLine(e) {
	var line=e.target;
	line.setStyle({color:'gray'});
	info.update();
}






/* Attention ici, la plupart des variables sont définies comme globales (obligatoire pour qu'elles puissent être utilisées partout) */
function testMapLayer() {
	
	stations= new L.LayerGroup();
						
	var cmAttr = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
		cmUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/{styleId}/256/{z}/{x}/{y}.png';
	
	/* Quelques styleId : représentation du fond de la carte: http://maps.cloudmade.com/editor */					
	var minimal   = L.tileLayer(cmUrl, {styleId: 22677, attribution: cmAttr}),
		complet  = L.tileLayer(cmUrl, {styleId: 1,   attribution: cmAttr});

	var toulouse = L.latLng(43.617, 1.450);
	
	map = L.map('myMap', {
		center: toulouse,
		zoom: 13,
		layers: [minimal,  stations]
	});

	var baseLayers = {
		"Minimal": minimal,
		"Complet": complet
	};

	var overlays = {
		"Stations": stations
	};

	L.control.layers(baseLayers, overlays).addTo(map);
						
}


// Crée une carte avec 3 couches metro/bus/tram
function create3LayersMap() {
 	
 	metro= new L.LayerGroup();
	bus= new L.LayerGroup();
	tramway= new L.LayerGroup();
						
	var cmAttr = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
		cmUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/{styleId}/256/{z}/{x}/{y}.png';
						
	/* Quelques styleId : représentation du fond de la carte: http://maps.cloudmade.com/editor */					
	var minimal   = L.tileLayer(cmUrl, {styleId: 22677, attribution: cmAttr}),
		complet  = L.tileLayer(cmUrl, {styleId: 1,   attribution: cmAttr});
		
						
	var toulouse = L.latLng(43.617, 1.450);
	
	map = L.map('myMap', {
	center: toulouse,
	zoom: 13,
	layers: [minimal,  bus]
	});

	var baseLayers = {
		"Minimal": minimal,
		"Complet": complet
	};

	var overlays = {
		"Metro": metro,
		"Bus": bus,
		"Tramway": tramway
	};

	L.control.layers(baseLayers, overlays).addTo(map);
					
}



// Crée une carte avec une seule couche de transports
function createMap() {
 	
 	bus= new L.LayerGroup();
						
	var cmAttr = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
		cmUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/{styleId}/256/{z}/{x}/{y}.png';
						
	/* Quelques styleId : représentation du fond de la carte: http://maps.cloudmade.com/editor */					
	var minimal   = L.tileLayer(cmUrl, {styleId: 22677, attribution: cmAttr}),
		complet  = L.tileLayer(cmUrl, {styleId: 1,   attribution: cmAttr});
		
						
	var toulouse = L.latLng(43.617, 1.450);
	
	map = L.map('myMap', {
	center: toulouse,
	zoom: 13,
	layers: [minimal,  bus]
	});

	var baseLayers = {
		"Minimal": minimal,
		"Complet": complet
	};

	var overlays = {
		"Lignes": bus
	};

	L.control.layers(baseLayers, overlays).addTo(map);
					
}

