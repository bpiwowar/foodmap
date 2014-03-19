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
	readStops(getFile("serveData.php?choice=11")); // defines global variable: stops
	readDwalk(getFile("serveData.php?choice=13"));  // defines global variable: dWalk
	readLines(getFile("serveData.php?choice=18")); // defines global variable: lines
	readTimeTable(getFile("serveData.php?choice=19"));  // defines global variable: routes
}


function readStops(file){
	stops = new Array;
	stopIndex = new Array; 
	var flines=file.split(RegExp("\n", "g"));
	// skip first line: colNames
	for (var i=1; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(";","g"));
		//originalId; name; lat; lon; parent_station
		var id = stops.length;
		var originalId = String(descr[0]);
		stopIndex[originalId] = id;
		var newStop = L.latLng(Number(descr[2]), Number(descr[3]));
		newStop.originalId = originalId;		
		newStop.name = String(descr[1]);
		newStop.parentStation = (descr.length>4) ? String(descr[4]) : "";
		newStop.routes = new Array;
		stops.push(newStop);
	}
}

function readDwalk(file){
	dWalk = new Array(stops.length);
	for (var i=0; i<stops.length; i++) dWalk[i] = new Array;
	var flines=file.split(RegExp("\n", "g"));
	for (var i=0; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(";","g"));
		//start; (dest; dt;)* 
		var start = stopIndex[String(descr[0])];
		for (var j=0; j<(descr.length-1)/2; j++) if (descr[2*j+1]){ // if is because of the possible final ";" in the line
			dWalk[start][stopIndex[String(descr[2*j+1])]] = Number(descr[2*j+2]);
		}
	}
	//WARNING: (i in dWalk) has type String and not Number!!!
}


function readLines(file){
	lines = new Array;
	lineIndex = new Array;
	var flines=file.split(RegExp("\n", "g"));
	// skip first line: colNames
	for (var i=1; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(";","g"));
		// originalId;short_name;long_name;type
		var id = lines.length;
		var originalId = String(descr[0]);
		lineIndex[originalId] = id;
		var newLine = new Object;
		newLine.originalId = originalId;
		newLine.shortName = descr[1];
		newLine.longName = descr[2];
		newLine.type = String(descr[3]);
		newLine.routes = new Array;
		lines.push(newLine);
	}
}

function readTimeTable(file){
	routes = new Array;
	var flines=file.split(RegExp("\n", "g"));
	// skip first line: colNames
	var oldStamp = "";
	var curRoute = 0;
	for (var i=1; i<flines.length; i++) if (flines[i].length>0){
		var descr=flines[i].split(RegExp(";","g"));
		//route_id;route_var;stop_id;stop_time*;
		var stamp = String(descr[0])+"."+String(descr[1]);
		if (stamp != oldStamp){
			curRoute = new Object();
			var id = routes.length;
			routes[id] = curRoute;
			curRoute.lineId = lineIndex[String(descr[0])];
			curRoute.lineVar = String(descr[1]);
			lines[curRoute.lineId].routes.push(id);
			curRoute.stops = new Array();
			curRoute.transits = new Array();
			for (var j=3; j<descr.length; j++) if (descr[j].length>1) curRoute.transits[j-3]=new Array;
			oldStamp = stamp;
		}
		stopId = stopIndex[String(descr[2])];
		var posInRoute = curRoute.stops.length;
		stops[stopId].routes.push({routeId: routes.length-1, posInRoute: posInRoute});//[routes.length-1] = posInRoute;// position of the stop in the route // WARNING: assumes that stops are in the order of the transit, which seems not to be always the case!
		for (var j=3; j<descr.length; j++) if (descr[j].length>1) // if() to avoid void hour
			curRoute.transits[j-3].push(readTime(descr[j]));
		curRoute.stops.push(stopId);		
	}
}
// create the map
activeNodeColor = "#FF0000";
inactiveNodeColor = "gray";
activeLineColor =  "#606060";// "#009933";
inactiveLineColor = "#CCCCFF";
highlightLineColor = "red";
activeLineCheckColor = "#FF66CC";
inactiveLineCheckColor = "#CCCCFF";


function createMap() {
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
}

function affRoutes(){
	for (var id=0; id<routes.length; id++){
		var pl = new Array;
		for (var j = 0; j<routes[id].stops.length; j++) pl[j] = stops[routes[id].stops[j]];
		routes[id].polyline = L.polyline(pl, {"color":activeLineColor}).addTo(network);
		routes[id].polyline.routeId = id;
	}
}

function affStops(){
	for (var i = 0; i<stops.length; i++){
		c = new L.circleMarker(stops[i], {"color":activeNodeColor, "radius":6, "stroke": false, "fillOpacity":0.5});
		stops[i].circle = c;
		c.id = i;
		c.addTo(network);
	}
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


function disactivateLine(lineId){
	isActiveLine[lineId] = false;
	activeLineSpans[lineId].css({"background-color":inactiveLineCheckColor});
	for (var i=0; i<lines[lineId].routes.length; i++){
		routes[lines[lineId].routes[i]].polyline.setStyle({"color": inactiveLineColor});
	}
}

function activateLine(lineId){
	isActiveLine[lineId] = true;
	activeLineSpans[lineId].css({"background-color":activeLineCheckColor});
	for (var i=0; i<lines[lineId].routes.length; i++){
		routes[lines[lineId].routes[i]].polyline.setStyle({"color": activeLineColor});
	}
}

function toggleLineActivity(lineId){
	isActiveLine[lineId]?disactivateLine(lineId):activateLine(lineId);
	if (startId>=0){
		computeShortestPath();
		drawAccessible();
	}	
}

function disactivateAllLines(){
	for (var i=0; i<lines.length; i++) disactivateLine(i);
	if (startId>=0){
		computeShortestPath();
		drawAccessible();
	}
}

function activateAllLines(){
	for (var i=0; i<lines.length; i++) activateLine(i);
	if (startId>=0){
		computeShortestPath();
		drawAccessible();
	}
}

function affLineControls(){
	isActiveLine = new Array(lines.length);
	activeLineSpans = new Array(lines.length);
	for(var i=0; i<lines.length; i++){
		var s = $("<span class=\"lineCheck\" id=\""+i+"\">"+lines[i].shortName+"</>").css({"background-color":activeLineCheckColor});
		s.click(function(){toggleLineActivity($(this).attr('id'));});
		$("#activeLines").append(s);
		activeLineSpans[i] = s;
		isActiveLine[i] = true;
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
	affLineControls(); 
}


function highLightPath(p){
	highLightedPath.setLatLngs(p.map(function(i){return stops[i];}));
}


function highlightLine(e){
	var route = routes[e.target.routeId];
	e.target.setStyle({color: highlightLineColor});
	info.update('<h4>Ligne '+lines[route.lineId].shortName+ "</h4> " + lines[route.lineId].longName);
}

function resetHighlightLine(e) {
	var color = isActiveLine[routes[e.target.routeId].lineId] ? activeLineColor:inactiveLineColor;
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
	
	for (var i=0; i<routes.length; i++)
		routes[i].polyline.on({
			click:function(e){toggleLineActivity(routes[e.target.routeId].lineId);},
			mouseover: highlightLine,
			mouseout: resetHighlightLine
		});
}

// compute the shortest paths

function computeShortestPath_noHeap(){ //
	function checkIfBetter(dest, atime){
		if (accessibles[dest]){
			if (arrivalTime[dest] > atime){
				arrivalTime[dest] = atime;
				father[dest] = active;
			}
		}
		else{
			arrivalTime[dest] = atime;
			father[dest] = active;
			accessibles[dest] = 1;
		}		
	}

	var startTime = performance.now();
	arrivalTime = new Array(stops.length);
	for (var i=0; i<stops.length; i++) arrivalTime[i] = Infinity;
	father = new Array(stops.length);
	var accessibles = new Array; 
	accessibles[startId] = 1;// or anything else: justs needs to be defined; USE Fibonacci heap or BINARY SEARCH TREES INSTEAD
	finished = new Array(stops.length); // when finished[id] is set, means that arrivalTime[id] is definitively correct
	arrivalTime[startId] = startHour;
	father[startId] = -1;
	while (!$.isEmptyObject(accessibles)){
		var active = -1; var minDt = Infinity;
		for(var i in accessibles){
			if (arrivalTime[i]<minDt){
				active = i;
				minDt = arrivalTime[i];
			}
		}
		delete accessibles[active];
		finished[active] = 1;
		
		for(var dest in dWalk[active]) if (finished[dest] != 1) checkIfBetter(Number(dest), arrivalTime[active]+dWalk[active][dest]); // Number because dest is of type String!

		for(var i=0; i<stops[active].routes.length; i++){
			var routeId = stops[active].routes[i].routeId;
			if (isActiveLine[routes[routeId].lineId]){
				var transits = routes[routeId].transits;
				var posInRoute = stops[active].routes[i].posInRoute;
				var nextTransit = 0; // index of the next transit of the route in which to step in
				while (nextTransit<transits.length && transits[nextTransit][posInRoute]<arrivalTime[active]) ++nextTransit;
				if (nextTransit<transits.length){
					for(var j=posInRoute+1; j<routes[routeId].stops.length; j++){
						var dest = routes[routeId].stops[j];
						if (finished[dest] != 1) checkIfBetter(dest, transits[nextTransit][j]);
					}
				}
			}
		}
	}
	console.log("computeShortestPath: "+(performance.now()-startTime));
}


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
		
		for(var dest in dWalk[active]) if (finished[dest] != 1) checkIfBetter(Number(dest), arrivalTime[active]+dWalk[active][dest]); // Number because dest is of type String! Vérifier que toujours utile!

		for(var i=0; i<stops[active].routes.length; i++){
			var routeId = stops[active].routes[i].routeId;
			if (isActiveLine[routes[routeId].lineId]){
				var transits = routes[routeId].transits;
				var posInRoute = stops[active].routes[i].posInRoute;
				var nextTransit = 0; // index of the next transit of the route in which to step in
				while (nextTransit<transits.length && transits[nextTransit][posInRoute]<arrivalTime[active]) ++nextTransit; // should be departureTime of the bus
				if (nextTransit<transits.length){
					for(var j=posInRoute+1; j<routes[routeId].stops.length; j++){
						var dest = routes[routeId].stops[j];
						if (finished[dest] != 1) checkIfBetter(dest, transits[nextTransit][j]); // should be arrivalTime of the bus
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