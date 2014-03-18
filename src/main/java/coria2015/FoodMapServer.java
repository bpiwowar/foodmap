package coria2015;

import org.apache.commons.configuration.ConfigurationException;
import org.apache.commons.configuration.HierarchicalINIConfiguration;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.util.thread.ThreadPool;

import java.io.File;
import java.util.logging.Logger;

/**
 * Created by bpiwowar on 18/3/14.
 */
public class FoodMapServer {
    final static Logger LOGGER = Logger.getLogger("server");

    public static int main(String [] args) throws Exception {
        File configurationFile = new File(args[0]);
        LOGGER.info("Reading configuration from " + configurationFile);

        // --- Get the server settings
        HierarchicalINIConfiguration configuration = new HierarchicalINIConfiguration(configurationFile);

        // --- Get the port
        int port = configuration.getInt("server.port", 8080);
        LOGGER.info(String.format("Starting server on port %d", port));

        // Create the server
        Server webServer = new Server();

        // TCP-IP socket
        ServerConnector connector=new ServerConnector(webServer);
        connector.setPort(port);
        webServer.addConnector(connector);


        ServletContextHandler context = new ServletContextHandler(webServer, "/");

        // --- Add the JSON RPC servlet
        final JsonRPCServlet jsonRpcServlet = new JsonRPCServlet(webServer);
        final ServletHolder jsonServletHolder = new ServletHolder(jsonRpcServlet);
        context.addServlet(jsonServletHolder, "/json-rpc");


        // --- Add the default servlet
        context.addServlet(new ServletHolder(new ContentServlet()), "/*");


        // --- start the server
        webServer.start();
        ThreadPool threadPool = webServer.getThreadPool();

        // --- Wait for servers to close
        threadPool.join();


        LOGGER.info("Servers are stopped. Clean exit!");

        return 0;
    }

}
