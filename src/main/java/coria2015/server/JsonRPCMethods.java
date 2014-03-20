/*
 * This file is part of experimaestro.
 * Copyright (c) 2013 B. Piwowarski <benjamin@bpiwowar.net>
 *
 * experimaestro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * experimaestro is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with experimaestro.  If not, see <http://www.gnu.org/licenses/>.
 */

package coria2015.server;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Multimap;
import org.apache.commons.lang.ClassUtils;
import org.apache.commons.lang.NotImplementedException;
import org.eclipse.jetty.server.Server;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;

import javax.script.ScriptException;
import javax.servlet.http.HttpServlet;
import java.io.*;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.*;
import java.util.logging.Logger;
import coria2015.utils.UtilsGPS;


import java.sql.ResultSet;
import java.util.logging.Level;

/**
 * @author B. Piwowarski <benjamin@bpiwowar.net>
 * @date 28/3/13
 */
public class JsonRPCMethods extends HttpServlet {

    private java.sql.Connection dbConnect = null;
    private java.sql.Statement dbStatement = null;




    final static private Logger LOGGER = Logger.getLogger("coria2015.JsonRPCMethods");
    /**
     * Server
     */
    private Server server;
    private final JSONRPCRequest mos;

    public JsonRPCMethods(Server server, JSONRPCRequest mos) {
        this.server = server;
        this.mos = mos;
    }


    static public interface Arguments {
        public abstract RPCArgument getArgument(int i);

        public abstract Class<?> getType(int i);

        public abstract int size();
    }

    static public class MethodDescription implements Arguments {
        Method method;
        private RPCArgument[] arguments;
        private Class<?>[] types;

        public MethodDescription(Method method) {
            this.method = method;
            types = method.getParameterTypes();
            Annotation[][] annotations = method.getParameterAnnotations();
            arguments = new RPCArgument[annotations.length];
            for (int i = 0; i < annotations.length; i++) {
                types[i] = ClassUtils.primitiveToWrapper(types[i]);
                for (int j = 0; j < annotations[i].length && arguments[i] == null; j++) {
                    if (annotations[i][j] instanceof RPCArgument)
                        arguments[i] = (RPCArgument) annotations[i][j];
                }

                if (arguments[i] == null)
                    throw new RuntimeException(String.format("No annotation for %dth argument of %s", i + 1, method));

            }
        }

        @Override
        public RPCArgument getArgument(int i) {
            return arguments[i];
        }

        @Override
        public Class<?> getType(int i) {
            return types[i];
        }

        @Override
        public int size() {
            return arguments.length;
        }
    }

    private static Multimap<String, MethodDescription> methods = HashMultimap.create();

    static {
        for (Method method : JsonRPCMethods.class.getDeclaredMethods()) {
            final RPCMethod rpcMethod = method.getAnnotation(RPCMethod.class);
            if (rpcMethod != null) {
                methods.put("".equals(rpcMethod.name()) ? method.getName() : rpcMethod.name(), new MethodDescription(method));
            }
        }

    }

    static public class RPCArrayArgument implements RPCArgument {
        @Override
        public String name() {
            return null;
        }

        @Override
        public boolean required() {
            return true;
        }

        @Override
        public String help() {
            return "Array element";
        }

        @Override
        public Class<? extends Annotation> annotationType() {
            return RPCArgument.class;
        }
    }

    private int convert(Object p, Arguments description, int score, Object args[], int index) {
        Object o;
        if (p instanceof JSONObject)
            // If p is a map, then use the json name of the argument
            o = ((JSONObject) p).get(description.getArgument(index).name());

        else if (p instanceof JSONArray)
            // if it is an array, then map it
            o = ((JSONArray) p).get(index);
        else {
            // otherwise, suppose it is a one value array
            if (index > 0)
                return Integer.MIN_VALUE;
            o = p;
        }

        final Class aType = description.getType(index);

        if (o == null) {
            if (description.getArgument(index).required())
                return Integer.MIN_VALUE;

            return score - 10;
        }

        if (aType.isArray()) {
            if (o instanceof JSONArray) {
                final JSONArray array = (JSONArray) o;
                final Object[] arrayObjects = args != null ? new Object[array.size()] : null;
                Arguments arguments = new Arguments() {
                    @Override
                    public RPCArgument getArgument(int i) {
                        return new RPCArrayArgument();
                    }

                    @Override
                    public Class<?> getType(int i) {
                        return aType.getComponentType();
                    }

                    @Override
                    public int size() {
                        return array.size();
                    }
                };
                for (int i = 0; i < array.size() && score > Integer.MIN_VALUE; i++) {
                    score = convert(array.get(i), arguments, score, arrayObjects, i);
                }
                return score;
            }
            return Integer.MIN_VALUE;
        }

        if (aType.isAssignableFrom(o.getClass())) {
            if (args != null)
                args[index] = o;
            return score;
        }

        if (o.getClass() == Long.class && aType == Integer.class) {
            if (args != null)
                args[index] = ((Long) o).intValue();
            return score - 1;
        }

        return Integer.MIN_VALUE;
    }


    public void handle(String message) {
        JSONObject object;
        try {
            Object parse = JSONValue.parse(message);
            object = (JSONObject) parse;

        } catch (Throwable t) {
            LOGGER.warning("Error while handling JSON request");

            try {
                mos.error(null, 1, "Could not parse JSON: " + t.getMessage());
            } catch (IOException e) {
                LOGGER.warning("Could not send the error message");
            }
            return;
        }

        handleJSON(object);
    }

    void handleJSON(JSONObject object) {
        String requestID = null;

        try {
            requestID = object.get("id").toString();
            if (requestID == null)
                throw new RuntimeException("No id in JSON request");


            Object command = object.get("method");
            if (command == null)
                throw new RuntimeException("No method in JSON");

            if (!object.containsKey("params"))
                throw new RuntimeException("No params in JSON");
            Object p = object.get("params");

            Collection<MethodDescription> candidates = methods.get(command.toString());
            int max = Integer.MIN_VALUE;
            MethodDescription argmax = null;
            for (MethodDescription candidate : candidates) {
                int score = Integer.MAX_VALUE;
                for (int i = 0; i < candidate.types.length && score > max; i++) {
                    score = convert(p, candidate, score, null, i);
                }
                if (score > max) {
                    max = score;
                    argmax = candidate;
                }
            }

            if (argmax == null)
                throw new RuntimeException("Cannot find a matching method");

            Object[] args = new Object[argmax.arguments.length];
            for (int i = 0; i < args.length; i++) {
                int score = convert(p, argmax, 0, args, i);
                assert score > Integer.MIN_VALUE;
            }
            Object result = argmax.method.invoke(this, args);
            mos.endMessage(requestID, result);
        } catch (Throwable t) {
            LOGGER.warning("Error while handling JSON request");
            try {
                while (t.getCause() != null)
                    t = t.getCause();
                mos.error(requestID, 1, t.getMessage());
            } catch (IOException e) {
                LOGGER.severe("Could not send the return code");
            }
            return;
        }
    }


    // -------- RPC METHODS -------

    /**
     * Shutdown the server
     */
    @RPCMethod(help = "Shutdown Experimaestro server")
    public boolean shutdown() {
        // Shutdown jetty (after 1s to allow this thread to finish)
        Timer timer = new Timer();
        timer.schedule(new TimerTask() {

            @Override
            public void run() {
                boolean stopped = false;
                try {
                    server.stop();
                    stopped = true;
                } catch (Exception e) {
                    LOGGER.warning("Could not stop properly jetty");
                }
                if (!stopped)
                    synchronized (this) {
                        try {
                            wait(10000);
                        } catch (InterruptedException e) {
                            LOGGER.severe(e.toString());
                        }
                        System.exit(1);

                    }
            }
        }, 2000);

        // Everything's OK
        return true;
    }


    @RPCMethod(help = "Get GPS coordinates from the user's click")
    public String getCoordinates(@RPCArgument(name="lat") double latClick, @RPCArgument(name="long")double lngClick){

        System.out.println(lngClick);

        double dist = UtilsGPS.gps2m(latClick,lngClick,(double) 4.0,(double) 1.0);
        System.out.println("Distance: "+dist);


        // Connection à la bd
        String url ="jdbc:mysql://localhost:3306/foodMap";
        connect(url,"root","");

        // Requete

        String jsonData = "[";
<<<<<<< .merge_file_TpOEIa
        String query = "select ingredients,st_distance(p, point("+latClick+","+lngClick+")) as d, asText(p) as point from Geo where st_distance(p, point(\"+latClick+\",\"+lngClick+\"))> 0 order by (d) limit 25 ;";
=======
        String query = "select ingredients,st_distance(p, point("+latClick+","+lngClick+")) as d, asText(p) as point from Geo where st_distance(p, point(\"+latClick+\",\"+lngClick+\"))<3;";
>>>>>>> .merge_file_EkR83b

        ResultSet rs = exec(query);
        try {
          if (rs != null) while (rs.next()) {

             String p =  rs.getString(3);
<<<<<<< .merge_file_TpOEIa
              String p1 = p.replaceAll("POINT\\(","");
              String p2 = p1.replaceAll("\\)","");
              //System.out.println(p2);

              String[] split = p2.split(" ");
              String latRes = split[0];
              String lngRes = split[1];
=======
              p.replace("POINT(","");
              p.replace(")","");

              String[] split = p.split(" ");
              String latRes = split[1];
              String lngRes = split[0];
>>>>>>> .merge_file_EkR83b

              // {"label":"paella","img":"json/img/paella.jpg","distance":2000,"lat":41.3833,"lng":2.1833}
              jsonData += "{";
              jsonData += "\"label\":\""+rs.getString(1)+"\",\"img\":\"\",\"distance\":"+rs.getString(2)+",\"lat\":"+latRes+",\"lng\":"+lngRes;
              jsonData += "},";

            // System.out.println(rs.getString(1)+" "+rs.getString(2)+" "+p);
         }

            jsonData = jsonData.substring(0,jsonData.length()-1);
            jsonData += "]";

        }
        catch (SQLException ex) {
            System.out.println(ex);
        }
        // Mapping to JSON




        String fakeResult = "[{\"label\":\"paella\",\"img\":\"json/img/paella.jpg\",\"distance\":2000,\"lat\":41.3833,\"lng\":2.1833},{\"label\":\"choucroute\",\"img\":\"json/img/choucroute.jpg\",\"distance\":1000,\"lat\":48.583333,\"lng\":7.75},{\"label\":\"tajine\",\"img\":\"json/img/tajine.jpg\",\"distance\":500000,\"lat\":32.54681,\"lng\":4.3}]";

<<<<<<< .merge_file_TpOEIa
        System.out.println(jsonData);
        return jsonData;
       // return fakeResult;
=======
       // return jsonData;
        return fakeResult;
>>>>>>> .merge_file_EkR83b
    }




    /**
     * Connecter à la base de donnée
     * @return false en cas d'échec
     */
    public Boolean connect(String url, String user, String pwd) {
        try {
            Class.forName("com.mysql.jdbc.Driver").newInstance();
            this.dbConnect = DriverManager.getConnection(url, user, pwd);
            this.dbStatement = this.dbConnect.createStatement();
            return true;
        } catch (SQLException ex) {
            System.out.println(ex);
        } catch (ClassNotFoundException ex) {
            System.out.println(ex);
        } catch (InstantiationException ex) {
            System.out.println(ex);
        } catch (IllegalAccessException ex) {
            System.out.println(ex);
        }
        return false;
    }



    /**
     * Executer une requete SQL
     * @param sql
     * @return resultat de la requete
     */
    public ResultSet exec(String sql) {
        try {
            ResultSet rs = this.dbStatement.executeQuery(sql);
            return rs;
        } catch (SQLException ex) {
            System.out.println(ex);
        }
        return null;
    }



}
