package coria2015.geoencoding;

import edu.stanford.nlp.ie.AbstractSequenceClassifier;
import edu.stanford.nlp.ie.crf.CRFClassifier;
import edu.stanford.nlp.ling.CoreAnnotations;
import edu.stanford.nlp.pipeline.Annotation;
import edu.stanford.nlp.pipeline.StanfordCoreNLP;
import edu.stanford.nlp.util.CoreMap;

import java.io.IOException;
import java.util.*;

/**
 * Created by sauvagna on 18/03/14.
 */
public class GeoNamesFinder {

    private String text;

    GeoNamesFinder(String text){
        this.text=text;
    }

    public HashSet<String> getGeoNames() throws IOException {

       HashSet<String> location= new HashSet();

        String serializedClassifier = "files/classifiers/english.all.3class.distsim.crf.ser.gz";


        AbstractSequenceClassifier classifier = CRFClassifier.getClassifierNoExceptions(serializedClassifier);

        String[] tags= (classifier.classifyToString(text)).split(" ");

        for (String tag:tags){
            //System.out.println("Tag: "+tag);
            String loc[]= tag.split("/");
            //System.out.println(loc[0]+"-"+loc[1]);
            if (loc[1].contains("LOCATION")){
                location.add(loc[0]);
            }
        }

        /*for (String loc:location){

          System.out.println(loc);
        }*/

        return location;

    }
}
