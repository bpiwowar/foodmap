package coria2015.geoencoding;

/**
 * Created by sauvagna on 18/03/14.
 */
public class WikiFile {

    public String file;
    public String start_offset;
    public String end_offset;

    WikiFile(String file, String start_offset, String end_offset){
        this.file=file;
        this.start_offset=start_offset;
        this.end_offset=end_offset;
    }
}
