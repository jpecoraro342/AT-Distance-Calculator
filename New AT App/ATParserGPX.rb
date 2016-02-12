require 'Nokogiri'
require 'geo-distance'
require 'csv'

module ATParser

	class Trek
		@@list_of_locations

		def initialize
			@list_of_locations = Array.new
		end

		def add_location(location)
			@list_of_locations.push(location)
		end

	end

	class Location 
		
		attr_accessor :lattitude, :longitude, :elevation, :springdist, :springelevationup, :springelevationdown

		def initialize(lattitude, longitude, elevation)
			@lattitude = lattitude
			@longitude = longitude
			@elevation = elevation.to_f

			@springdist = 0
			@springelevationup = 0
			@springelevationdown = 0
		end

		def to_s
	   		"Location: lat #{@lattitude}, lon #{@longitude} | Elevation: #{@elevation} ft"
	  	end
	  	
	end

	class Shelter < Location
		
		attr_accessor :name, :comment, :symbol, :closest_location

		def initialize(name, comment, symbol, lattitude, longitude)
			super(lattitude, longitude, 0)
			@name = name
			@comment = comment
			@symbol = symbol

			@springdist = 0
			@springelevationup = 0
			@springelevationdown = 0
		end

		def to_s
	   		"Name : #{@name}\nLocation: lat #{@lattitude}, lon #{@longitude}\nInfo: #{@symbol}, #{@comment}"
	  	end

	end

	class GPXParser
		@@file_path
		@@file
		@@parsed_document

		@@GPXList

		def initialize(file_path)
			@file_path = file_path
			@GPXList = Array.new
		end

		def parse

		end

		def print_document
			puts @parsed_document.gpx
		end

		def print_items
			@GPXList.each { |item| puts "#{item}\n" }
		end

		def get_gpx_list
			return @GPXList
		end

	end

	class ShelterParser < GPXParser

		def parse
			@file = File.open(@file_path)
			@parsed_document = Nokogiri::XML(@file).slop!
			@file.close

			@parsed_document.gpx.wpt.each do |shelter_node|
				temp_location = Shelter.new(shelter_node.children[3].text, defined?(shelter_node.cmt) ? shelter_node.cmt.text : '', defined?(shelter_node.sym) ? shelter_node.sym.text : '', shelter_node.attr('lat'), shelter_node.attr('lon'))
				@GPXList.push(temp_location)
			end
		end

		def print_shelters
			puts @parsed_document.gpx.wpt
		end

	end

	class LocationParser < GPXParser
		@@list_of_treks

		def initialize(file_path)
			super(file_path)
			@list_of_treks = Array.new
		end

		def parse
			@file = File.open(@file_path)
			@parsed_document = Nokogiri::XML(@file).slop!
			@file.close

			trek = Trek.new

			@parsed_document.gpx.trk.trkseg.trkpt.each do |location_node|
				loc = Location.new(location_node.attr('lat'), location_node.attr('lon'), location_node.ele.text)
				trek.add_location(loc)
				@GPXList.push(loc)
			end
			@list_of_treks.push(trek)

			# @parsed_document.gpx.trk.each do |trek_node|
			# 	trek = Trek.new

			# 	trek_node.trkseg.trkpt.each do |location_node|
			# 		loc = Location.new(location_node.attr('lat'), location_node.attr('lon'), location_node.ele.text)
			# 		trek.add_location(loc)
			# 		@GPXList.push(loc)
			# 	end
			# 	@list_of_treks.push(trek)
			# end

		end

	end

	def self.get_haversine_distance(lat1, lon1, lat2, lon2)
		earth_radius = 6371000
		d_lat = (lat2 - lat1) * Math::PI / 180.0
		d_lon = (lon2 - lon1) * Math::PI / 180.0

		a = Math.sin(d_lat/2) * Math.sin(d_lat/2) + Math.cos(lat1 * Math::PI / 180 ) * Math.cos(lat2 * Math::PI / 180 ) * Math.sin(d_lon/2) * Math.sin(d_lon/2);
		c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		distance = earth_radius * c;

		return distance
	end

	def self.get_distance(lat1, lon1, lat2, lon2)
		d_lat = lat2 - lat1
		d_lon = lon2 - lon1

		distance = Math.sqrt(d_lat*d_lat + d_lon*d_lon)

		return distance
	end

	shelter_parser = ShelterParser.new('at_shelters_sym.gpx')
	shelter_parser.parse
	shelters = shelter_parser.get_gpx_list

	# location_parser = LocationParser.new('at_centerline_full_10k_split_500.gpx')
	location_parser = LocationParser.new('at_centerline_full.gpx')
	location_parser.parse
	locations = location_parser.get_gpx_list

	previous_location = locations.at(0)

	locations.each do |location|
		distance = get_haversine_distance(previous_location.lattitude.to_f, previous_location.longitude.to_f, location.lattitude.to_f, location.longitude.to_f)
		location.springdist = (previous_location.springdist + distance)

		elevationdiff = location.elevation.to_f - previous_location.elevation.to_f
		if elevationdiff > 0
			location.springelevationup += elevationdiff
		else
			location.springelevationdown += elevationdiff
		end

		previous_location = location
	end

	previous_location = locations.at(0)

	shelters.each do |shelter|
		min_distance = nil
		closest_location = nil

		locations.each do |location|
			current_distance = get_haversine_distance(shelter.lattitude.to_f, shelter.longitude.to_f, location.lattitude.to_f, location.longitude.to_f)
			if min_distance == nil || (current_distance < min_distance)
				min_distance = current_distance
				closest_location = location
			end
		end

		shelter.closest_location = closest_location
	end

	shelters.sort! {|left, right| left.closest_location.springdist <=> right.closest_location.springdist}

	CSV.open("atdistfullgpx.csv", "wb", {:force_quotes=>true}) do |csv|
		csv << ["name", "springdist", "distprev", "elevation", "elevationdiff", "elevationloss", "elevationgain", "shelterdist", "amenities"]

		previous_location = shelters.at(0).closest_location

		shelters.each do |shelter|
			amenities = nil

			if shelter.symbol != "" && shelter.comment != ""
				amenities = "#{shelter.symbol}, #{shelter.comment}"
			elsif shelter.symbol != ""
				amenities = "#{shelter.symbol}"
			elsif shelter.comment != ""
				amenities = "#{shelter.comment}"
			end

			min_distance = get_haversine_distance(shelter.lattitude.to_f, shelter.longitude.to_f, shelter.closest_location.lattitude.to_f, shelter.closest_location.longitude.to_f)*0.00062137
			amenities = "#{min_distance.round(2)} mi from trail. #{amenities}"
			
			csv << ["#{shelter.name}", "#{(shelter.closest_location.springdist*0.00062137).round(2)}", "#{((shelter.closest_location.springdist - previous_location.springdist)*0.00062137).round(2)}", "#{shelter.closest_location.elevation.round(2)}", "#{(shelter.closest_location.elevation - previous_location.elevation).round(2)}", "#{(shelter.closest_location.springelevationdown + previous_location.springelevationdown).round(2)}", "#{(shelter.closest_location.springelevationup + previous_location.springelevationup).round(2)}", "#{min_distance.round(2)}", "#{amenities}"]
			previous_location = shelter.closest_location
		end
	end

end
