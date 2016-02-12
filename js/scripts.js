
$(function(){
	$.ajax({
            url: "./atdistfull.csv",
            async: false,
            success: function (data) {
                parseCSV(data);
            }
        });
});

function parseCSV(locationsCSV){
	Papa.parse(locationsCSV, {
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        setupViewModel(results.data);
      }
    });
}

function setupViewModel(locations) {
	var startLocations = [];
	var endLocations = [];

	locations.forEach(function(locDict) {
		startLocations.push(new Location(locDict));
		endLocations.push(new Location(locDict));
	});

	var viewModel = new ATViewModel(startLocations, endLocations);

	ko.applyBindings(viewModel);
}

function Location(locationDict) {
	this.name = locationDict.name;
	this.springdist = locationDict.springdist;
	this.distprev = locationDict.distprev;
	this.elevation = locationDict.elevation;
	this.elevationdiff = locationDict.elevationdiff;
	this.amenities = locationDict.amenities;
	this.links = locationDict.links;

	this.isSelected = ko.observable(false);
}

Location.prototype.setSelected = function() {
	
}

function ATViewModel(startLocations, endLocations) {
	this.startLocations = ko.observableArray(startLocations);
	this.endLocations = ko.observableArray(endLocations);

	this.selectedStartIndex = ko.observable(0);
	this.selectedEndIndex = ko.observable(4);

	this.selectedStartLocation = ko.observable(this.startLocations()[this.selectedStartIndex()]);
	this.selectedEndLocation = ko.observable(this.endLocations()[this.selectedEndIndex()]);

	this.setStartSelected(this.selectedStartLocation(), this.selectedStartIndex());
	this.setEndSelected(this.selectedEndLocation(), this.selectedEndIndex());

	this.startElevation = ko.computed(function() { return this.selectedStartLocation().elevation }, this);
	this.endElevation = ko.computed(function() { return this.selectedEndLocation().elevation }, this);

	this.amenities = ko.computed(function() { return this.selectedEndLocation().amenities }, this);
	this.links = ko.computed(function() { return this.selectedEndLocation().links }, this);

	this.distance = ko.computed(function() {
		var tempDistance = this.selectedEndLocation().springdist - this.selectedStartLocation().springdist;
		return Math.round(tempDistance * 100) / 100;
	}, this);

	this.elevationGain = ko.computed(function() {
		var tempGain = this.getElevationUp(this.selectedStartIndex(), this.selectedEndIndex());
		return Math.round(tempGain * 100 ) / 100
	}, this);

	this.elevationLoss = ko.computed(function() {
		var tempLoss = this.getElevationDown(this.selectedStartIndex(), this.selectedEndIndex());
		return Math.round(tempLoss * 100 ) / 100
	}, this);	

	//TODO: Update Chart
}

ATViewModel.prototype.getElevationUp = function(start_index, end_index) {
	var elevation = 0;
	for (var i = start_index +1; i <= end_index; i++) {
		temp_diff = this.startLocations()[i].elevationdiff;
		if (temp_diff > 0 ) {
			elevation += temp_diff;
		}
	}
	return elevation;
}

ATViewModel.prototype.getElevationDown = function(start_index, end_index) {
	var elevation = 0;
	for (var i = start_index +1; i <= end_index; i++) {
		temp_diff = this.startLocations()[i].elevationdiff;
		if (temp_diff < 0 ) {
			elevation += temp_diff;
		}
	}
	return elevation;
}

ATViewModel.prototype.setStartSelected = function(newStartLocation, newIndex) {
	this.selectedStartIndex(newIndex);
	this.selectedStartLocation().isSelected(false);
	newStartLocation.isSelected(true);
	this.selectedStartLocation(newStartLocation);

	this.updateChart();
}

ATViewModel.prototype.setEndSelected = function(newEndLocation, newIndex) {
	this.selectedEndIndex(newIndex);
	this.selectedEndLocation().isSelected(false);
	newEndLocation.isSelected(true);
	this.selectedEndLocation(newEndLocation);

	this.updateChart();
}

ATViewModel.prototype.updateChart = function() {
	var dataArray = [];
	var names = [];

	var startDist = this.selectedStartLocation().springdist;

	for (var i = this.selectedStartIndex(); i <= this.selectedEndIndex(); i++) {
		var loc = this.startLocations()[i];
		var xvalue = loc.springdist - startDist;
		var yvalue = loc.elevation;
		var nameValue = loc.name;
		dataArray[i - this.selectedStartIndex()] = [xvalue, yvalue];
		names[i - this.selectedStartIndex()] = loc.name;
	}

	$(function () {
    $('#chart-container').highcharts({
        chart: {
            type: 'spline',
            zoomType: 'xy'
        },
        title: {
            text: 'Elevation Profile'
        },
        xAxis: {
            title: {
                enabled: true,
                text: 'Distance (mi)'
            },
            startOnTick: true,
            endOnTick: true,
            showLastLabel: true
        },
        yAxis: {
            title: {
                text: 'Elevation (ft)'
            }
        },
        legend: {
            layout: 'vertical',
            align: 'left',
            verticalAlign: 'top',
            x: 100,
            y: 70,
            floating: true,
            backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
            borderWidth: 1
        },
        plotOptions: {
            spline: {
                marker: {
                    radius: 5,
                    states: {
                        hover: {
                            enabled: true,
                            lineColor: 'rgb(100,100,100)'
                        }
                    }
                },
                states: {
                    hover: {
                        marker: {
                            enabled: false
                        }
                    }
                }
            }
        },
        tooltip: {
	        //headerFormat: '<b>{series.name}</b><br>',
	        //pointFormat: '{point.y} ft'
	        formatter: function () {
	    		return '<b>' + names[this.series.data.indexOf( this.point )] + '</b>'+ '<br/>' + this.y + ' ft';
			}
		},
        series: [{
            name: 'Elevation',
            color: 'rgba(119, 152, 191, .5)',
            data: dataArray
        }]
    });
});
}








