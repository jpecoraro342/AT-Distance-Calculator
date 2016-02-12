require 'Nokogiri'
require 'open-uri'
require 'bigdecimal'
require 'csv'

module ATParser

	class Shelter
		attr_accessor :name, :link, :springdist, :elevation, :amenities, 

		def initialize(name, link, springdist, elevation, amenities)
			@name = name
			@link = link
			@springdist = springdist
			@elevation = elevation
			@amenities = amenities
		end

		def to_s
	   		"Name : #{@name} Spring Distance: #{@springdist}\n Elevation: #{@elevation} Info: #{@amenities} Link #{@link}"
	  	end
	end

	class HTMLParser
		@@webpage_path
		@@parsed_document

		def initialize(webpage_path)
			@webpage_path = webpage_path
		end

		def parse

		end

		def print_document
			puts @parsed_document
		end

		def print_items
			
		end

		def get_gpx_list
			return @GPXList
		end

	end

	class ShelterParser < HTMLParser
		attr_accessor :shelters

		def initialize(webpage_path)
			super(webpage_path)
			@shelters = Array.new
		end

		def parse
			@parsed_document = Nokogiri::HTML(open(@webpage_path))  

			@temp_shelters = Array.new

			shelter_table_rows = @parsed_document.xpath("//tr")
			shelter_table_rows.each do |shelter_row|
				shelter = shelter_row.css("td")
				if is_number?(shelter.at(0).text)
					@temp_shelters.push(shelter)
				end
			end

			@temp_shelters.each do |shelter|
				the_shelter = Shelter.new # Shelter.new(shelter.at(1).text, shelter.at(1).css('a').text, shelter.at(0).text, shelter.at(2).text, shelter.at(3).text)
				the_shelter.name = shelter.at(1).text

				begin 
					the_shelter.link = shelter.at(1).css('a').attr('href') 
				rescue 

				end

				the_shelter.springdist = BigDecimal(shelter.at(0).text.tr(' ', ''))
				the_shelter.elevation = BigDecimal(shelter.at(2).text.tr('\’', '').tr(' ', ''))
				the_shelter.amenities = shelter.at(3).text

				@shelters.push(the_shelter)
			end
		end

		def is_number? string
  			true if Float(string) rescue false
		end

		def print_shelters
			# puts @shelters
		end

	end

	shelter_parser = ShelterParser.new('http://www.summitpost.org/appalachian-trail-mileage-chart/593282')
	shelter_parser.parse
	shelter_parser.print_shelters
	shelters = shelter_parser.shelters

	CSV.open("atdistfull.csv", "wb", {:force_quotes=>true}) do |csv|
		csv << ["name", "springdist", "distprev", "elevation", "elevationdiff", "amenities"]

		previous_shelter = shelters.at(0)

		shelters.each do |shelter|
			amenities = shelter.amenities

			if !shelter.link.nil? && shelter.link != "" 
				amenities = "#{amenities}, More Info: #{shelter.link}"
			end

			csv << ["#{shelter.name}", "#{shelter.springdist}", "#{shelter.springdist - previous_shelter.springdist}", "#{shelter.elevation}", "#{shelter.elevation - previous_shelter.elevation}", "#{amenities}"]
			previous_shelter = shelter
		end
	end

end
