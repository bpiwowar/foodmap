package coria2015.geoencoding;

import bpiwowar.argparser.ArgParser;
import bpiwowar.argparser.ArgParserException;
import bpiwowar.argparser.Argument;
import bpiwowar.argparser.OrderedArgument;
import it.unimi.dsi.fastutil.ints.Int2ObjectArrayMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import it.unimi.dsi.fastutil.objects.Object2ObjectArrayMap;
import it.unimi.dsi.fastutil.objects.Object2ObjectOpenHashMap;

import java.io.*;
import java.util.ArrayList;
import java.util.logging.Logger;
import java.util.zip.GZIPInputStream;

/**
 * Created by bpiwowar on 18/3/14.
 */
public class NameFinder {
    static private final Logger LOGGER = Logger.getLogger("NameFinder");

    @Argument(name="sql")
    boolean sqlMode = false;

    @OrderedArgument(required = true)
    File full = null;

    @OrderedArgument(required = true)
    File alternates = null;

    @OrderedArgument(required = true)
    File recipesFile = null;

    static public void main(String [] args) throws IOException, ArgParserException {
        ArgParser parser = new ArgParser("namefinder");
        NameFinder nameFinder = new NameFinder();
        parser.addOptions(nameFinder);
        parser.matchAllArgs(args);
        nameFinder.process();
    }

    static public class Place {
        private String name;
        float lattitude;
        float longitude;
        String feature_class;
        String feature_code;

        public Place(String name, float lattitude, float longitude, String feature_class, String feature_code) {
            this.name = name;
            this.lattitude = lattitude;
            this.longitude = longitude;
            this.feature_class = feature_class;
            this.feature_code = feature_code;
        }

        @Override
        public String toString() {
            return String.format("%f,%f,%s,%s", lattitude, longitude, feature_class, feature_code);
        }
    }


    public void process() throws IOException {
        readPlaces();

        BufferedReader recipes = new BufferedReader(new FileReader(recipesFile));

        String line;
        LOGGER.info("Reading full file");
        while ((line = recipes.readLine()) != null) {
            String[] fields = line.split("\t");
            final String name = fields[0];
            if (!sqlMode) {
                System.out.print(name);
            }
            for(int i = 1; i < fields.length; i++) {
                String namePlace = fields[i].toLowerCase();
                ArrayList<Place> places = placesByName.get(namePlace);
                if (places != null)
                    for(Place place: places) {
                        if (sqlMode) {
                            System.out.format("INSERT INTO Geo VALUES('%s', POINT(%f,%f));\n",
                                    name.replace("'", "''"), place.lattitude, place.longitude);

                        } else {
                            System.out.format("\t%s", place);
                        }
                    }
            }
            System.out.println();
        }

    }
    Object2ObjectOpenHashMap<String, ArrayList<Place>> placesByName = new Object2ObjectOpenHashMap<>();

    public void readPlaces() throws IOException {
        Int2ObjectOpenHashMap<Place> placesById = new Int2ObjectOpenHashMap<>();

        /*
        The main 'geoname' table has the following fields :
---------------------------------------------------
0 geonameid         : integer id of record in geonames database
1 name              : name of geographical point (utf8) varchar(200)
2 asciiname         : name of geographical point in plain ascii characters, varchar(200)
3 alternatenames    : alternatenames, comma separated, ascii names automatically transliterated, convenience attribute from alternatename table, varchar(8000)
4 latitude          : latitude in decimal degrees (wgs84)
5 longitude         : longitude in decimal degrees (wgs84)
6 feature class     : see http://www.geonames.org/export/codes.html, char(1)
7 feature code      : see http://www.geonames.org/export/codes.html, varchar(10)
8 country code      : ISO-3166 2-letter country code, 2 characters
9 cc2               : alternate country codes, comma separated, ISO-3166 2-letter country code, 60 characters
10 admin1 code       : fipscode (subject to change to iso code), see exceptions below, see file admin1Codes.txt for display names of this code; varchar(20)
11 admin2 code       : code for the second administrative division, a county in the US, see file admin2Codes.txt; varchar(80)
12 admin3 code       : code for third level administrative division, varchar(20)
13 admin4 code       : code for fourth level administrative division, varchar(20)
14 population        : bigint (8 byte int)
15 elevation         : in meters, integer
16 dem               : digital elevation model, srtm3 or gtopo30, average elevation of 3''x3'' (ca 90mx90m) or 30''x30'' (ca 900mx900m) area in meters, integer. srtm processed by cgiar/ciat.
17 timezone          : the timezone id (see file timeZone.txt) varchar(40)
18 modification date : date of last modification in yyyy-MM-dd format
         */
        BufferedReader fullReader = new BufferedReader(new InputStreamReader(new GZIPInputStream(new FileInputStream(full))));
        String line;
        int count = 0;
        int totalCount = 0;
        LOGGER.info("Reading full file");
        while ((line = fullReader.readLine()) != null) {
            String[] fields = line.split("\\t");
            switch(fields[6]) {
                case "A":
                case "P":
                case "L":
                case "V":
                    int id = Integer.parseInt(fields[0]);
                    String name = fields[1].toLowerCase();
                    Place place = new Place(name, Float.parseFloat(fields[4]), Float.parseFloat(fields[5]), fields[6], fields[7]);
                    placesById.put(id, place);
                    ArrayList<Place> places = placesByName.get(name);
                    if (places == null) {
                        places = new ArrayList<>();
                        placesByName.put(name, places);
                    }
                    places.add(place);
                    totalCount++;
            }
            if (++count % 100000 == 0) {
                LOGGER.info(String.format("Read %d entries [%d added]", count, totalCount));
            }
        }

        /*
        The table 'alternate names' :
-----------------------------
0. alternateNameId   : the id of this alternate name, int
1. geonameid         : geonameId referring to id in table 'geoname', int
2. isolanguage       : iso 639 language code 2- or 3-characters; 4-characters 'post' for postal codes and 'iata','icao' and faac for airport codes, fr_1793 for French Revolution names,  abbr for abbreviation, link for a website, varchar(7)
3. alternate name    : alternate name or name variant, varchar(200)
4. isPreferredName   : '1', if this alternate name is an official/preferred name
5. isShortName       : '1', if this is a short name like 'California' for 'State of California'
6. isColloquial      : '1', if this alternate name is a colloquial or slang term
7. isHistoric        : '1', if this alternate name is historic and was used in the past
         */
        int altCount = 0;
        int altTotalCount = 0;
        BufferedReader alternateReader = new BufferedReader(new InputStreamReader(new GZIPInputStream(new FileInputStream(alternates))));
        while ((line = alternateReader.readLine()) != null) {
            String[] fields = line.split("\\t");
            if (fields[2].equals("en") || fields[2].equals("")) {
                int geoid =  Integer.parseInt(fields[1]);
                String alternateName = fields[3];
                if (alternateName != null)
                    alternateName = alternateName.toLowerCase();
                Place place = placesById.get(geoid);

                if (alternateName != null || !alternateName.equals(place.name)) {
                    if (place != null) {
                        ArrayList<Place> places = placesByName.get(alternateName);
                        if (places == null) {
                            places = new ArrayList<>();
                            placesByName.put(alternateName, places);
                        }
                        places.add(place);
                        altTotalCount++;
//                        System.err.format("Adding alternate: [%s] for [%s]\n", alternateName, place.name);
                    }
                }
            }
            if (++altCount % 100000 == 0) {
                LOGGER.info(String.format("Read %d altenate entries [%d added]", altCount, altTotalCount));
            }
        }
    }
}
