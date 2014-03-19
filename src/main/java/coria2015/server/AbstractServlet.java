package coria2015.server;

import org.apache.commons.lang.StringEscapeUtils;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

/**
 * Created by bpiwowar on 18/3/14.
 */
public class AbstractServlet extends HttpServlet {

    public static String escapeHtml(String text) {
        return StringEscapeUtils.escapeHtml(text);
    }


    void header(PrintWriter out, String title) {
        out.format("<html><head><title></title>");
        out.format("</head>%n");
        out.format("<body>%n");
    }

    public void error404(HttpServletRequest request,
                         HttpServletResponse response) throws IOException {
        response.setContentType("text/html");
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        final PrintWriter out = response.getWriter();
        header(out, "Error");
        out.println("<h1>Page not found</h1>");
        out.format("<p>This URI was not found: %s</p>", request.getRequestURI());
        out.println("</body></html>");
    }
}
