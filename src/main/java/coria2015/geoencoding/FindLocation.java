package coria2015.geoencoding;

import java.io.*;
import java.util.HashMap;
import java.util.HashSet;

/**
 * Created by sauvagna on 18/03/14.
 */
public class FindLocation {


    public static void main(String[] args) {

        System.out.println("Debut");


        // Lecture du fichier wikititle
        String wiki="../data/wikititles/index.dat";
        HashMap<String,WikiFile> index = new HashMap<String, WikiFile>();

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



        String inFile ="files/ingredients_matched";

        InputStream isr2;

        try {
            isr2 = new FileInputStream(inFile);
            InputStreamReader isrc2=new InputStreamReader(isr2);
            BufferedReader br2=new BufferedReader(isrc2);


            FileWriter fw = new FileWriter("files/ingredients_location",false);
            BufferedWriter output = new BufferedWriter(fw);

            String line=new String();
            while ((line=br2.readLine()) != null){
                String[] tab= line.split("\t");
                String ingredient= tab[0];
                System.out.println("Ingredient : "+ingredient);

                output.write(ingredient+"\t");

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


                GeoNamesFinder gn = new GeoNamesFinder(stringToParse);


                HashSet<String> hs = gn.getGeoNames();

                for (String loc:hs){
                    output.write(loc + "\t");
                }
                output.write("\n");




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