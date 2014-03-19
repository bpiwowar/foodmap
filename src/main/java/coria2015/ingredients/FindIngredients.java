package coria2015.ingredients;

/**
 * Created by sauvagna on 18/03/14.
 */
import java.io.BufferedWriter;

import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

import java.util.ArrayList;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;

import java.util.Map.Entry;
import java.util.Set;


import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

public class FindIngredients {

    public static void main(String[] args) {
        // TODO Auto-generated method stub

        JSONParser parser = new JSONParser();



        try {

            List<JSONObject> recipes = (ArrayList<JSONObject>)  parser.parse(new FileReader("/Users/sauvagna/Documents/PROJETS_EN_COURS/2014_Coriakathon/data_json/recipe/03_11_2013.json"));

            System.out.println("Number of recipes in file:"+recipes.size());

            // Contient l'ensemble de tous les ingrédients "bruts", en ne considérant que ce qu'il y a à gauche de la virgule
            Set<String> myIngredients = new HashSet<String>();
            // Contient l'ensemble de tous les ingredients finaux avec leur fréquence
            HashMap<String,Integer> mySubIngredients = new HashMap<String,Integer>();
            // Contient l'ensemble de tous les ingredients finaux avec leur recette
            HashMap<String,List<String>> myOutputIngredients = new HashMap<String,List<String>>();


            // Fichier de sortie ingredients, recettes
            FileWriter fw = new FileWriter("files/ingredients",false);
            BufferedWriter output = new BufferedWriter(fw);



            int i=0;

            for (JSONObject recipe: recipes)
            {
                JSONArray ingredients = (JSONArray) recipe.get("ingredients");
                Iterator iter = ingredients.iterator();
                while (iter.hasNext())
                {
                    JSONObject ing = (JSONObject) iter.next();
                    // ingredient "brut"
                    String ingredient = ((String) ing.get("name")).toLowerCase().trim();


                    // on ne garde que ce qu'il y a à gauche de la virgule
                    String[] subingredient=ingredient.split(",");
                    myIngredients.add((String) subingredient[0]);

                    // on enlève tout ce qui n'est pas lettre
                    //String normalized_ingredient= ingredient.replaceAll("[^a-z]", " ");
                    String normalized_ingredient= subingredient[0].replaceAll("[^a-z]", " ").replaceAll("\\s+", " ");;

					/*if (!mySubIngredients.containsKey(normalized_ingredient)){
						mySubIngredients.put(normalized_ingredient, new Integer(1));
					}
					else {
						mySubIngredients.put(
								normalized_ingredient,
								mySubIngredients.get(normalized_ingredient)+1
								);

					}*/


                    if (!myOutputIngredients.containsKey(normalized_ingredient)){
                        ArrayList<String> myList = new ArrayList<String>();
                        myList.add((String) recipe.get("name"));
                        myOutputIngredients.put(normalized_ingredient, myList );
                    }
                    else {
                        List<String> myList = myOutputIngredients.get(normalized_ingredient);
                        myList.add((String) recipe.get("name"));
                        myOutputIngredients.put(
                                normalized_ingredient,
                                myList
                        );

                    }

                    //System.out.println(ingredient+"-"+normalized_ingredient);
                    //Si on splite on perd les expressions...
					/*String[] subnormalized_ingredient = normalized_ingredient.split(" ");

					for (int j=0; j<normalized_ingredient.length;j++){

						if (!mySubIngredients.containsKey(subnormalized_ingredient[j])){
							mySubIngredients.put(subnormalized_ingredient[j], new Integer(1));
						}
						else {
							mySubIngredients.put(
									subnormalized_ingredient[j],
									mySubIngredients.get(subnormalized_ingredient[j])+1
									);

						}

					}
					*/

                    i++;
                }



            }

			/*int k=0;
			Comparator<Integer> valueComparator = new Comparator<Integer>() {
				   @Override
				   public int compare(Integer i1, Integer i2) {
					   if (i1<i2) return -1;
					   else if (i1==i2)  return 0;
					   else return 1;
				   }
				};
				MapValueComparator<String, Integer> mapComparator = new MapValueComparator<String, Integer>(mySubIngredients, valueComparator);
				Map<String, Integer> sortedOnValuesMap = new TreeMap<String, Integer>(mapComparator);
				sortedOnValuesMap.putAll(mySubIngredients);


				for(Entry<String, Integer> entry : sortedOnValuesMap.entrySet()) {
				    String cle = entry.getKey();
				    Integer valeur = entry.getValue();
				    System.out.println("C:"+cle+" - V:"+valeur);


					   k++;
				}


			System.out.println(mySubIngredients.keySet().size()+"-"+sortedOnValuesMap.size()+"("+k+")"+"-"+myIngredients.size()+"-"+i);
			*/

            for(Entry<String, List<String>> entry : myOutputIngredients.entrySet()) {
                String cle = entry.getKey();
                List<String> valeur = entry.getValue();
                System.out.println("C:"+cle+" - V:"+valeur.toString());
                output.write(cle+"\t");
                for (String recipe:valeur) {
                    output.write(recipe+"\t");
                }
                output.write("\n");
            }
            output.close();

			/* 4411-21772-405207
			 * mySubIngredients- myIngredients -ingredients
			 * IL y a 4000 ingrédients distincts, 21700 ingrédients en ne gardant que les parties gauches et 405000 ingrédients au total */


        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        } catch (ParseException e) {
            e.printStackTrace();
        }


    }



}

