// general purpose utility functions

function byte2Hex(x){
  var n = Math.round(x);
  var nybHexString = "0123456789ABCDEF";
  return String(nybHexString.substr((n >> 4) & 0x0F,1)) + nybHexString.substr(n & 0x0F,1);
}

function readTime(s){
	return(Number(s.substring(0,2)) + Number(s.substring(3, 5))/60); 
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


// load data 

function getFile(url){
	// attention sécurité : s'assurer que le fichier lu est dans un répertoire donné qui ne contient aucun fichier sensible
	var xhr_object = null; 
	 
	if(window.XMLHttpRequest) // Firefox 
	   xhr_object = new XMLHttpRequest(); 
	else if(window.ActiveXObject) // Internet Explorer 
	   xhr_object = new ActiveXObject("Microsoft.XMLHTTP"); 
	else { // XMLHttpRequest non supporté par le navigateur 
	   alert("Votre navigateur ne supporte pas les objets XMLHTTPRequest..."); 
	   return; 
	} 
	 
	xhr_object.open("GET", url, false); 
	xhr_object.send(null); 
	if(xhr_object.readyState == 4) 
		return (xhr_object.responseText);
	
}


function getData(){
	var startTime = performance.now();
	readStops(getFile("serveData.php?choice=22")); // defines global variable: stops
	computeDwalk(); // defines global variable: dWalk
	readRoutes(getFile("serveData.php?choice=23")); // defines global variable: routes
	readTrips(getFile("serveData.php?choice=20"));  // defines global variable: _trips, _tripIndex
	readStopTimes(getFile("serveData.php?choice=21"));  // defines global variable: subRoutes
	console.log("getData: "+(performance.now()-startTime));
}

function readStops(file){
	stops = new Array;
	stopIndex = new Array; 
	var flines=file.split(RegExp("\n", "g"));
	// skip first line: colNames
	for (var i=1; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(",","g"));
		//stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type,parent_station
		var id = stops.length;
		var originalId = String(descr[0]);
		stopIndex[originalId] = id;
		var newStop = L.latLng(Number(descr[3]), Number(descr[4]));
		newStop.originalId = originalId;		
		newStop.name = String(descr[2]);
		newStop.parentStation = (descr.length>6) ? String(descr[6]) :"";
		newStop.subRoutes = new Array;
		stops.push(newStop);
		// complete with remaining information...
	}
}


function readRoutes(file){
	routes = new Array;
	routeIndex = new Array;
	var flines=file.split(RegExp("\n", "g"));
	// skip first line: colNames
	for (var i=1; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(",","g"));
		//route_id,agency_id,route_short_name,route_long_name,route_desc,route_type,route_url,route_color,route_text_color
		var id = routes.length;
		var originalId = String(descr[0]);
		routeIndex[originalId] = id;
		var newRoute = new Object;
		newRoute.originalId = originalId;
		newRoute.shortName = descr[2];
		newRoute.longName = descr[3];
		newRoute.type = String(descr[5]);
		newRoute.subRoutes = new Array;
		routes.push(newRoute);
		// complete and take into account colors...
	}
}



function readTrips(file){
	var flines=file.split(RegExp("\n", "g"));
	_trips= new Array;	
	_tripIndex = new Array;
	// skip first line: colNames
	for (var i=1; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(",","g"));
		//trip_id,service_id,route_id,trip_headsign,direction_id,shape_id
		var tripId = String(descr[0]);		
		_tripIndex[tripId] = i-1;
		newTrip = new Object;
		newTrip.routeId = routeIndex[String(descr[2])];
		newTrip.stops = new Array;
		newTrip.times = new Array;
		_trips.push(newTrip);
	}
	// prendre en compte le "trip_headsign" pour l'affichage du bus dans lequel il faut monter !
	// ajouter les autres informations
}


function readStopTimes(file){ // pb with data: several trips have first and second stop_sequence undefined!!!
	var flines=file.split(RegExp("\n", "g"));
	// skip first line: colNames
	for (var i=1; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(",","g"));
		//trip_id,stop_id,stop_sequence,arrival_time,departure_time,stop_headsign,pickup_type,drop_off_type,shape_dist_traveled
		var tripId = _tripIndex[String(descr[0])];
		var stopSequence = Number(descr[2]); // index of the stop in the trip
		_trips[tripId].stops[stopSequence] = stopIndex[String(descr[1])]; 
		_trips[tripId].times[stopSequence] = readTime(String(descr[3])); 
		// also load the remaining information
		// warning: should take both arrival_time and departure_time
	}

	//create sub-Routes
	subRoutes = new Array;
	for (var i=0; i<_trips.length; i++){
		if (_trips[i].stops in routes[_trips[i].routeId].subRoutes){
			var subRoute = subRoutes[routes[_trips[i].routeId].subRoutes[_trips[i].stops]];
			subRoute.trips.push(_trips[i].times);
		}
		else{
			var subRoute = new Object;
			subRoute.stops = _trips[i].stops;
			subRoute.trips = new Array;
			subRoute.trips.push(_trips[i].times); // ATTENTION : il faut pour la suite que les trips soient dans l'ordre chronologique dans subRoute.times! vérifier ici?
			subRoute.id = subRoutes.length;
			subRoute.routeId = _trips[i].routeId;
			subRoutes.push(subRoute);
			routes[subRoute.routeId].subRoutes[_trips[i].stops] = subRoute.id;
			for (var j=0; j<_trips[i].stops.length; j++) if (_trips[i].stops[j] !== undefined) {// test nécessaire avec les données TISSEO: certains trips ont leurs premiers stops undefined!
				pStop = new Object;
				pStop.subRouteId = subRoute.id;
				pStop.posInSubRoute = j;
				stops[_trips[i].stops[j]].subRoutes.push(pStop);
			}
		}
	}
}


function distance(p1,p2){ // haversine formula
	var R = 6371; // km
	var dLat = (p2.lat-p1.lat) / 180 * Math.PI;
	var dLon = (p2.lng-p1.lng) / 180 * Math.PI;
	var lat1 = p2.lat / 180 * Math.PI;
	var lat2 = p2.lat / 180 * Math.PI;

	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	return(R * c);
}


function computeDwalk(){
	var startTime = performance.now();
	var vWalk = 3; //km/h
	dWalk = new Array(stops.length);
	for(var i=0; i<stops.length; i++){
		dWalk[i] = new Array;
		for(var j=0; j<stops.length; j++){
			var dt = distance(stops[i], stops[j]) / vWalk;
			if(dt<15/60){ // maximum 15 minutes walk, it would be better to force the number of neighbors to, say, 10-20 and walk from station to station
				dWalk[i][j] = dt;
			}
		}
	}
	console.log("computeDwalk: "+(performance.now()-startTime));	
}


function checkData(){
	for (var i=0; i<subRoutes.length; i++){
		for(var j=0; j<subRoutes[i].trips.length; j++){
			for (var k=0; k<subRoutes[i].trips[j].length; k++){
				if (subRoutes[i].trips[j][k] === undefined){
					console.log("subRoute "+i + " trip "+j + " stop "+ k + " routeId = " + subRoutes[i].routeId);
				}
			}
		}
	}
	// -> pb sur la ligne 105: les stopSequence 0 et 1 n'existent pas !!!
	
	console.log("Number of stops: "+stops.length);
	console.log("Number of routes: "+routes.length);
	console.log("Number of subRoutes: "+subRoutes.length);
	var nbSubRoutesPerRoute = new Array;
	for(var i=0; i<routes.length; i++){
		tmp=0;
		for (var j in routes[i].subRoutes) ++tmp;
		if (tmp in nbSubRoutesPerRoute) ++nbSubRoutesPerRoute[tmp];
		else nbSubRoutesPerRoute[tmp]=1;
	}
	console.log(nbSubRoutesPerRoute);
	// [1: 3, 2: 70, 3: 6, 4: 12, 5: 1, 6: 4, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 2, 14: 1, 17: 1] 
	
	var nbWalkingNeighbors = new Array;
	for(var i=0; i<stops.length; i++){
		tmp=0;
		for (var j in dWalk[i]) ++tmp;
		if (tmp in nbWalkingNeighbors) ++nbWalkingNeighbors[tmp];
		else nbWalkingNeighbors[tmp]=1;
	}
	console.log(nbWalkingNeighbors);	
}

// create the map
activeNodeColor = "#FF0000";
inactiveNodeColor = "gray";
activeRouteColor =  "#009933";// "#009933";
inactiveRouteColor = "#CCCCFF";
highlightRouteColor = "#009933";
activeRouteCheckColor = "#FF66CC";
inactiveRouteCheckColor = "#CCCCFF";


function createMap() {
	var startTime = performance.now();
 	network = new L.LayerGroup();						
	var cmAttr = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
		cmUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/{styleId}/256/{z}/{x}/{y}.png';
						
	/* Quelques styleId : représentation du fond de la carte: http://maps.cloudmade.com/editor */					
	var minimal   = L.tileLayer(cmUrl, {styleId: 22677, attribution: cmAttr}),
		complete  = L.tileLayer(cmUrl, {styleId: 1,   attribution: cmAttr});
	var toulouse = L.latLng(43.617, 1.450);
	map = L.map('myMap', {
	center: toulouse,
	zoom: 13,
	layers: [minimal,  network]
	});
	var baseLayers = {
		"Minimal": minimal,
		"Complet": complete
	};
	var overlays = {
		"network": network
	};
	L.control.layers(baseLayers, overlays).addTo(map);

	console.log("createMap: "+(performance.now()-startTime));	
}

function affRoutes(){ // change to affSubRoutes and modify php!
	var startTime = performance.now();
	for (var id=0; id<subRoutes.length; id++){
		var pl = new Array;
		for (var j = 0; j<subRoutes[id].stops.length; j++) if (subRoutes[id].stops[j]!==undefined)  pl.push(stops[subRoutes[id].stops[j]]); // small patch to address pb1: some subRoutes have stop_sequence 0 and 1 undefined
		subRoutes[id].polyline = L.polyline(pl, {"color":activeRouteColor}).addTo(network);
		subRoutes[id].polyline.subRouteId = id;
	}/*// if the former is too heavy
	for (var id=0; id<subRoutes.length; id++){// too heavy like this!!!
		if (routes[subRoutes[id].routeId].polyLine){
			subRoutes[id].polyline = routes[subRoutes[id].routeId].polyLine;
		}		
		else{
			var pl = new Array;
			for (var j = 0; j<subRoutes[id].stops.length; j++) if (subRoutes[id].stops[j]!==undefined)  pl.push(stops[subRoutes[id].stops[j]]); // small patch to address pb1: some subRoutes have stop_sequence 0 and 1 undefined
			subRoutes[id].polyline = L.polyline(pl, {"color":activeRouteColor}).addTo(network);
			subRoutes[id].polyline.subRouteId = id;
			routes[subRoutes[id].routeId].polyLine = subRoutes[id].polyline;
		}
	}*/
	console.log("affRoutes: "+(performance.now()-startTime));
}

function affStops(){
	var startTime = performance.now();
	for (var i = 0; i<stops.length; i++){
		c = new L.circleMarker(stops[i], {"color":activeNodeColor, "radius":6, "stroke": false, "fillOpacity":0.5});
		stops[i].circle = c;
		c.id = i;
		c.addTo(network);
	}
	console.log("affStops: "+(performance.now()-startTime));
}

// IHM

function changeMaxMinute(e){
	maxMinute = Number($("#maxMinute").val());
	$("#maxMinuteSpan").text(maxMinute);
	if (startId>=0) drawAccessible();
}

function changeStartHour(e){
	startHour = Number($("#startHour").val());
	$("#startHourSpan").text(real2hour(startHour));
	if (startId>=0){
		computeShortestPath();
		drawAccessible();
	}
}


function disactivateRoute(routeId){
	isActiveRoute[routeId] = false;
	activeRouteSpans[routeId].css({"background-color":inactiveRouteCheckColor});
	for (var i in routes[routeId].subRoutes){ // i is an array of StopIds:  for (var i=0; i<routes[routeId].subRoutes.length; i++){ ???
		subRoutes[routes[routeId].subRoutes[i]].polyline.setStyle({"color": inactiveRouteColor});
	}
}

function activateRoute(routeId){
	isActiveRoute[routeId] = true;
	activeRouteSpans[routeId].css({"background-color":activeRouteCheckColor});
	for (var i in routes[routeId].subRoutes){ // i is an array of StopIds:  for (var i=0; i<routes[routeId].subRoutes.length; i++){ ???
		subRoutes[routes[routeId].subRoutes[i]].polyline.setStyle({"color": activeRouteColor});
	}
}

function toggleRouteActivity(routeId){
	isActiveRoute[routeId]?disactivateRoute(routeId):activateRoute(routeId);
	if (startId>=0){
		computeShortestPath();
		drawAccessible();
	}	
}

function disactivateAllLines(){ // change Lines->Routes and php accordingly!
	for (var i=0; i<routes.length; i++) disactivateRoute(i);
	if (startId>=0){
		computeShortestPath();
		drawAccessible();
	}
}

function activateAllLines(){ // change Lines->Routes and php accordingly!
	for (var i=0; i<routes.length; i++) activateRoute(i);
	if (startId>=0){
		computeShortestPath();
		drawAccessible();
	}
}

function affRouteControls(){
	isActiveRoute = new Array(routes.length);
	activeRouteSpans = new Array(routes.length);
	for(var i=0; i<routes.length; i++){
		var s = $("<span class=\"lineCheck\" id=\""+i+"\">"+routes[i].shortName+"</>").css({"background-color":activeRouteCheckColor}); // changer line->route dans le css et le php!
		s.click(function(){toggleRouteActivity($(this).attr('id'));});
		$("#activeLines").append(s);// changer line->route dans le css et le php!
		activeRouteSpans[i] = s;
		isActiveRoute[i] = true;
	}
	// add buttons: activate all, desactivate all, activate/desactivate all bus, all metros...
}

function initIHM(){
	highLightedPath = L.polyline([stops[startId]], {clickable: false}).addTo(network); 
	for (var i=0; i<stops.length; i++){
		stops[i].circle.on('click', function(e){
			startId = e.target.id;
			$("#startStation").html(stops[startId].name);
			computeShortestPath();
			drawAccessible();			
		});
		stops[i].circle.on('mouseover', function(e){
			var path = getPath(e.target.id);
			info.update("<h4>Station " + stops[e.target.id].name+ " : " + Math.floor(60*(arrivalTime[e.target.id]-startHour)) + " minutes</h4>" + pathDescription(path));
			highLightPath(path);
		});
		stops[i].circle.on('mouseout', function(e){
			highLightedPath.setLatLngs([stops[startId]]);
			info.update();
		});
	}
	affRouteControls(); 
}


function highLightPath(p){
	highLightedPath.setLatLngs(p.map(function(i){return stops[i];}));
}


function highlightRoute(e){
	var subRoute = subRoutes[e.target.subRouteId];
	e.target.setStyle({color: highlightRouteColor});
	info.update('<h4>Ligne '+routes[subRoute.routeId].shortName+ "</h4> " + routes[subRoute.routeId].longName);
}

function resetHighlightRoute(e) {
	var color = isActiveRoute[subRoutes[e.target.subRouteId].routeId] ? activeRouteColor:inactiveRouteColor;
	e.target.setStyle({color:color});
	info.update();
}

function setMapInteractions(){
	// information span on the map
	info = L.control();
	info.onAdd = function (map) {
		div = L.DomUtil.create('div', 'info'); 
		this.update();
		return div;
	};
		
	info.update = function(msg) {
		div.innerHTML = msg || 'sélectionnez la station de départ (clic gauche)<br/> puis survolez la station d\'arrivée';
	};
			
	info.addTo(map);
	
	for (var i=0; i<subRoutes.length; i++)
		subRoutes[i].polyline.on({
			click:function(e){toggleRouteActivity(subRoutes[e.target.subRouteId].routeId);},
			mouseover: highlightRoute,
			mouseout: resetHighlightRoute
		});
}

// compute the shortest paths

function computeShortestPath(){
	var myHeap = Array(stops.length);
	var myHeapSize = 0;
	var myHeapIndex = Array(stops.length);
	for (var i=0; i<stops.length; i++) myHeapIndex[i] = -1;
	
	function pushMyHeap(x){
		myHeap[myHeapSize] = x;
		myHeapIndex[x] = myHeapSize;
		bubbleUp(myHeapSize++);
	}

	function popMyHeap(){
		var res = myHeap[0];
		myHeapIndex[res] = -1; // should not be necessary (as popped elements never come back into the heap), but does not harm a lot!
		myHeap[0] = myHeap[--myHeapSize];
		myHeapIndex[myHeap[0]] = 0;
		bubbleDown();
		return(res);
	}

	function bubbleUp(i){
		var cur = i;
		var curValue = myHeap[cur];
		var father = Math.floor((cur-1)/2); 
		while ((father>=0) && (arrivalTime[myHeap[cur]]<arrivalTime[myHeap[father]])){
			myHeap[cur] = myHeap[father];
			myHeap[father] = curValue;
			myHeapIndex[curValue] = father;
			myHeapIndex[myHeap[cur]] = cur;
			cur = father;
			curValue = myHeap[cur];
			father = Math.floor((cur-1)/2); 
		}
	}

	function bubbleDown(){
		var cur = 0;
		var curValue = myHeap[cur];
		var goon = true;
		while ((2*cur+2<myHeapSize) && goon){
			var smallestChild = arrivalTime[myHeap[2*cur+1]]<arrivalTime[myHeap[2*cur+2]]?2*cur+1:2*cur+2;
			if (arrivalTime[myHeap[cur]]>arrivalTime[myHeap[smallestChild]]){
				myHeap[cur] = myHeap[smallestChild];
				myHeap[smallestChild] = curValue;
				myHeapIndex[curValue] = smallestChild;
				myHeapIndex[myHeap[cur]] = cur;
				cur = smallestChild;
				curValue = myHeap[smallestChild];			
			}
			else{
				goon = false;
			}		
		}
		if ((myHeapSize == 2*cur+2) && arrivalTime[myHeap[2*cur+1]]<curValue){
			myHeap[cur] = myHeap[2*cur+1];
			myHeap[2*cur+1] = curValue;
			myHeapIndex[curValue] = 2*cur+1;
			myHeapIndex[myHeap[cur]] = cur;
		}
	}
	
	function checkIfBetter(dest, atime){	
		var id = myHeapIndex[dest];
		if (id>=0){
			if (arrivalTime[dest] > atime){
				arrivalTime[dest] = atime;
				bubbleUp(id);
				father[dest] = active;
			}
		}
		else{
			arrivalTime[dest] = atime;
			father[dest] = active;
			pushMyHeap(dest);
		}		
	}

	var startTime = performance.now();
	arrivalTime = new Array(stops.length);
	for (var i=0; i<stops.length; i++) arrivalTime[i] = Infinity;
	father = new Array(stops.length);
	myHeapSize = 0; // re-initialize heap 
	pushMyHeap(startId);
	finished = new Array(stops.length); // when finished[id] is set, means that arrivalTime[id] is definitively correct
	arrivalTime[startId] = startHour;
	father[startId] = -1;
	while (myHeapSize>0){
		var active = popMyHeap();
		finished[active] = 1;
		
		for(var dest in dWalk[active]) if (finished[dest] != 1) checkIfBetter(Number(dest), arrivalTime[active]+dWalk[active][dest]); // Number because dest is of type String!

		for(var i=0; i<stops[active].subRoutes.length; i++){
			var subRouteId = stops[active].subRoutes[i].subRouteId;
			if (isActiveRoute[subRoutes[subRouteId].routeId]){
				var trips = subRoutes[subRouteId].trips;
				var posInSubRoute = stops[active].subRoutes[i].posInSubRoute;
				var nextTrip = 0; // index of the next transit of the route in which to step in
				while (nextTrip<trips.length && trips[nextTrip][posInSubRoute]<arrivalTime[active]) ++nextTrip; // should be departureTime of the bus
				if (nextTrip<trips.length){
					for(var j=posInSubRoute+1; j<subRoutes[subRouteId].stops.length; j++){
						var dest = subRoutes[subRouteId].stops[j];
						if (finished[dest] != 1) checkIfBetter(dest, trips[nextTrip][j]); // should be arrivalTime of the bus
					}
				}
			}
		}
	}
	console.log("computeShortestPath: "+(performance.now()-startTime));
}



function drawAccessible(){
	var startTime = performance.now();	
	for(var i=0; i<stops.length; i++){
		if (arrivalTime[i] < startHour + maxMinute/60){
			var myColor = val2color((arrivalTime[i] - startHour)/(maxMinute/59));
			stops[i].circle.setStyle({fillColor:myColor, fillOpacity:0.5}); 
		}
		else{
			stops[i].circle.setStyle({fillColor:inactiveNodeColor, fillOpacity:0.2}); 
		}
	}
	console.log("drawAccessible: "+(performance.now()-startTime));	
}

function getPath(dest){ // warning: returns only the bus stations we step in and out!
	if (father[dest]>=0){
		//return(getPath(father[dest]).push(dest));
		var pathFather = getPath(father[dest]);
		pathFather.push(dest);
		return(pathFather);
	}
	else return([dest]);
}

function pathDescription(p){
	return(p.map(function(i){return(stops[i].name);}));
}