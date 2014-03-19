package coria2015.geoencoding;

import java.io.*;
import java.util.HashMap;
import java.util.HashSet;

/**
 * Created by sauvagna on 19/03/14.
 */
public class FindRecipeLocation {

    public static void main(String[] args) {


        System.out.println("Debut");


    // Lecture du fichier wikititle
    String wiki="../data/wikititles/index.dat";
    HashMap<String,WikiFile> index = new HashMap<String, WikiFile>();

    //Int2ObjectOpenHashMap<WikiFile>
    InputStream isr;



    try {
        isr = new FileInputStream(wiki);
        InputStreamReader isrc=new InputStreamReader(isr);
        BufferedReader br=new BufferedReader(isrc);

        String line;
        while ((line=br.readLine()) != null){
            //System.out.println(line);
            String[] tab= line.split("\t");
            index.put(tab[0], new WikiFile(tab[2],tab[3],tab[4]));
        }
        br.close();
    } catch (FileNotFoundException e) {
        e.printStackTrace();
    } catch (IOException e) {
        e.printStackTrace();
    }

    System.out.println("Index :"+index.size());



    String inFile ="files/recipes_matches";

    InputStream isr2;

    GeoNamesFinder gn = new GeoNamesFinder();

    try {
        isr2 = new FileInputStream(inFile);
        InputStreamReader isrc2=new InputStreamReader(isr2);
        BufferedReader br2=new BufferedReader(isrc2);


        FileWriter fw = new FileWriter("files/recipes_location",false);
        BufferedWriter output = new BufferedWriter(fw);

        String line=new String();
        while ((line=br2.readLine()) != null){
            String[] tab= line.split("\t");
            String recipe= tab[0];
            Float score=Float.parseFloat(tab[2]);
            if (score>0.4){

            System.out.println("Recipe : "+recipe);

            output.write(recipe+"\t");

            String id=tab[1];

            WikiFile wf= index.get(id);



            String wikiFile="../data/wiki/"+wf.file;
            System.out.println("File :"+wikiFile);
            System.out.println(wf.file+"-"+wf.start_offset+"-"+wf.end_offset);
            int iPartLength = Integer.parseInt(wf.end_offset)-Integer.parseInt(wf.start_offset);
            int iOffset = Integer.parseInt(wf.start_offset);

               /* // test
                String wikiFile="../data/wiki/wiki_00";
                int iPartLength= 1981742-1907554;
                int iOffset=1907554;
                */


            byte[] byData = new byte[iPartLength];
            FileInputStream isr3   = new FileInputStream (wikiFile);

            RandomAccessFile file = new RandomAccessFile(wikiFile, "r");

            file.seek(iOffset);
            byte[] bytes = new byte[iPartLength];
            file.read(bytes);
            file.close();
            String stringToParse= new String(bytes);


            gn.setString(stringToParse);


            HashSet<String> hs = gn.getGeoNames();

            for (String loc:hs){
                output.write(loc + "\t");
            }
            output.write("\n");
            output.flush();

            }



        }
        br2.close();
        output.close();






    } catch (FileNotFoundException e) {
        e.printStackTrace();
    } catch (IOException e) {
        e.printStackTrace();
    }


}
}
