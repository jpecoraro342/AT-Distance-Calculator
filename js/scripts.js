//Locations
var locationsCSV;
var locations;
var indexMap = {key: 'value'};

var selected_start;
var selected_end;

//Document Setup/Prep
function parseCSV(){
	Papa.parse(locationsCSV, {
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        locations = results.data;
        addLocationsToList();
      }
    });
}

function addLocationsToList() {
	var select1 = document.getElementById("startLocationList"); 
	var select2 = document.getElementById("endLocationList"); 

	for(var i = 0; i < locations.length; i++) {
		var loc = locations[i];

		var textvalue = loc.name + " - " + loc.distprev + " mi";
		var key = loc.name;
		key = key.replace(/\s/g,''); 
		indexMap[key] = i;



		var optionElement = document.createElement("li");
		optionElement.appendChild(document.createTextNode(textvalue));
		optionElement.setAttribute("class", "location col-xs-12");
		optionElement.setAttribute("key", key);
		optionElement.setAttribute("onclick", "newStartLocationSelected(this)")

		var optionElement2 = document.createElement("li");
		optionElement2.appendChild(document.createTextNode(textvalue));
		optionElement2.setAttribute("class", "location col-xs-12");
		optionElement2.setAttribute("key", key);
		optionElement2.setAttribute("onclick", "newEndLocationSelected(this)")

		select1.appendChild(optionElement);
		select2.appendChild(optionElement2);
	}
}

$(document).ready(function(){
	$.ajax({
            url: "./atdist.csv",
            async: false,
            success: function (data) {
                locationsCSV = data;
                parseCSV();
            }
        });
});

//END Document Setup/Prep

//ACTION
function newStartLocationSelected(new_start_location) {
	if (selected_start != null) {
		selected_start.setAttribute("class", "location col-xs-12");
	}
	new_start_location.setAttribute("class", "location selected_loc col-xs-12");
	selected_start = new_start_location;

	UpdateInformation();
}

function newEndLocationSelected(new_end_location) {
	if (selected_end != null) {
		selected_end.setAttribute("class", "location col-xs-12");
	}
	new_end_location.setAttribute("class", "location selected_loc col-xs-12");
	selected_end = new_end_location;

	UpdateInformation();
}

//UI Updates
function UpdateInformation() {
	if (selected_start == null || selected_end == null) {
		return;
	}
	var start_key = selected_start.getAttribute("key"); 
	var end_key = selected_end.getAttribute("key");

	var start_index = indexMap[start_key];
	var end_index = indexMap[end_key];

	var distance = locations[end_index].springdist - locations[start_index].springdist;
	var elevationUp = getElevationUp(start_index, end_index);
	var elevationDown = getElevationDown(start_index, end_index);
	var amenities = locations[end_index].amenities;

	var ul = document.getElementById("databox");
	while (ul.firstChild) {
	    ul.removeChild(ul.firstChild);
	}

	var li = document.createElement("li");
	li.setAttribute("class", "noliststyle");

	li.appendChild(document.createTextNode("Distance: " + Math.round( distance * 100 ) / 100 + " mi"));
	li.appendChild(document.createElement("br"));
	li.appendChild(document.createTextNode("Elevation Gain: " + Math.round( elevationUp * 100 ) / 100 + " ft"));
	li.appendChild(document.createElement("br"));
	li.appendChild(document.createTextNode("Elevation Loss: " + Math.round( elevationDown * 100 ) / 100 + " ft"));
	li.appendChild(document.createElement("br"));
	li.appendChild(document.createTextNode("Start Elevation: " + locations[start_index].elevation + "       End Elevation: " + locations[end_index].elevation));
	li.appendChild(document.createElement("br"));
	li.appendChild(document.createElement("br"));
	li.appendChild(document.createTextNode("Amenities: " + amenities));
	ul.appendChild(li);
}

function getElevationUp(start_index, end_index) {
	var elevation = 0;
	for (var i = start_index +1; i <= end_index; i++) {
		temp_diff = locations[i].elevationdiff;
		if (temp_diff > 0 ) {
			elevation += temp_diff;
		}
	}

	return elevation;
}

function getElevationDown(start_index, end_index) {
	var elevation = 0;
	for (var i = start_index +1; i <= end_index; i++) {
		temp_diff = locations[i].elevationdiff;
		if (temp_diff < 0 ) {
			elevation += temp_diff;
		}
	}

	return elevation;
}








