/*
 * This file is part of experimaestro.
 * Copyright (c) 2012 B. Piwowarski <benjamin@bpiwowar.net>
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

package coria2015;

import edu.stanford.nlp.io.ReaderInputStream;
import it.unimi.dsi.fastutil.objects.Object2ObjectOpenHashMap;
import org.apache.commons.vfs2.FileObject;
import org.apache.commons.vfs2.FileSystemManager;
import org.apache.commons.vfs2.FileType;
import org.apache.commons.vfs2.VFS;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.URL;

import static java.lang.String.format;
import java.util.logging.Logger;

public class ContentServlet extends AbstractServlet {
	final static private Logger LOGGER = Logger.getLogger("content-servlet");

	private static final long serialVersionUID = 1L;

    /** Images of recipes */
    private File imagePath;
    Object2ObjectOpenHashMap<String, String> recipeImages = new Object2ObjectOpenHashMap<>();
    private String IMAGE_URI = "/recipe/image/";
    ;

    public ContentServlet(File imagePath) throws IOException {
        this.imagePath = imagePath;
        URL url = ContentServlet.class.getResource("/recipe-images.txt");
        BufferedReader in = new BufferedReader(new InputStreamReader(url.openStream()));
        String s;
        while ((s = in.readLine()) != null) {
            String[] fields = s.split("\\s");
            if (fields.length != 2) {
                LOGGER.severe("Cannot handle line: " + s);
            } else {
                recipeImages.put(fields[0], fields[1]);
            }
        }

    }

    protected void doGet(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {

         final URL url;
        IMAGE_URI = "/recipe/image/";
        if (request.getRequestURI().startsWith(IMAGE_URI)) {
            String recipeName = request.getRequestURI().substring(IMAGE_URI.length()).replace(" ", "-");
            String name = recipeImages.get(recipeName);
            File file = new File(imagePath, name);
            url = file.toURI().toURL();
        } else {
            url = ContentServlet.class.getResource(format("/web%s",
                    request.getRequestURI()));
        }

		if (url != null) {
			FileSystemManager fsManager = VFS.getManager();
			FileObject file = fsManager.resolveFile(url.toExternalForm());
			if (file.getType() == FileType.FOLDER) {
				response.setStatus(HttpServletResponse.SC_MOVED_PERMANENTLY);
				response.setHeader("Location",
						format("%sindex.html", request.getRequestURI()));
				return;
			}

            String filename = url.getFile();
            if (filename.endsWith(".html"))
			    response.setContentType("text/html");
            else if (filename.endsWith(".png"))
                response.setContentType("image/png");
            else if (filename.endsWith(".css"))
                response.setContentType("text/css");
			response.setStatus(HttpServletResponse.SC_OK);

			final ServletOutputStream out = response.getOutputStream();
			InputStream in = url.openStream();
			byte[] buffer = new byte[8192];
			int read;
			while ((read = in.read(buffer)) > 0) {
				out.write(buffer, 0, read);
			}
			out.flush();
			in.close();
			return;
		}

		// Not found
		error404(request, response);

	}

}