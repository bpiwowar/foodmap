package coria2015.geoencoding;

import edu.stanford.nlp.ie.AbstractSequenceClassifier;
import edu.stanford.nlp.ie.crf.CRFClassifier;
import edu.stanford.nlp.ling.CoreAnnotations;
import edu.stanford.nlp.ling.CoreLabel;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;


/**
 * Created by sauvagna on 18/03/14.
 */
public class TestGeoNamesFinder {

    public static void main(String[] args){

        String test="Coconut palms are grown in more than 80 countries of the world, with a total production of 61 million tonnes per year.[42] Coconut trees are very hard to establish in dry climates, and cannot grow there without frequent irrigation; in drought conditions, the new leaves do not open well, and older leaves may become desiccated; fruit also tends to be shed.[40]\n" +
                "The extent of cultivation in the tropics is threatening a number of habitats, such as mangroves; an example of such damage to an ecoregion is in the Petenes mangroves of the Yucatán.[43]\n" +
                "Harvesting[edit]\n" +
                "In some parts of the world (Thailand and Malaysia), trained pig-tailed macaques are used to harvest coconuts. Training schools for pig-tailed macaques still exist both in southern Thailand, and in the Malaysian state of Kelantan.[44] Competitions are held each year to find the fastest harvester.\n" +
                "India[edit]\n" +
                "\n" +
                "\n" +
                "Coconuts being sold on a street in India\n" +
                "\n" +
                "\n" +
                "Coconut plucking in Kerala, India\n" +
                "\n" +
                "\n" +
                "Coconut trees in Komarapalayam, Tamil Nadu\n" +
                "\n" +
                "\n" +
                "Green coconut fruit strands on the tree are featured on each Maldivian rufiyaa banknote\n" +
                "\n" +
                "\n" +
                "Coconut trees are among the most common sights throughout Kerala\n" +
                "Traditional areas of coconut cultivation in India are the states of Kerala, Tamil Nadu, Puducherry, Andhra Pradesh, Karnataka, Goa, Maharashtra, Odisha, West Bengal and the islands of Lakshadweep and Andaman and Nicobar. Four southern states combined account for almost 92% of the total production in the country: Kerala (45.22%), Tamil Nadu (26.56%), Karnataka (10.85%), and Andhra Pradesh (8.93%).[45] Other states, such as Goa, Maharashtra, Odisha, West Bengal, and those in the northeast (Tripura and Assam) account for the remaining 8.44%. Kerala, which has the largest number of coconut trees, is famous for its coconut-based products—coconut water, copra, coconut oil, coconut cake (also called coconut meal, copra cake, or copra meal), coconut toddy, coconut shell-based products, coconut wood-based products, coconut leaves, and coir pith.\n" +
                "Various terms, such as copra and coir, are derived from the native Malayalam language. In Kerala, the coconut tree is called \"Thengu\" also termed as kalpa vriksham, which essentially means all parts of a coconut tree is useful some way or other.";

        try{
            GeoNamesFinder gn = new GeoNamesFinder();
            gn.setString(test);
            HashSet<String> hs = gn.getGeoNames();

            for (String loc:hs){
                System.out.println(loc);
            }
        }
        catch(IOException ioe){
            ioe.printStackTrace();
        }

    }


    }


