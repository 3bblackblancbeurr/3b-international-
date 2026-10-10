package app.vercel.threebinternational.ar;

import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import com.google.ar.core.AugmentedImageDatabase;
import com.google.ar.core.Config;
import com.google.ar.core.Session;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/** Only reviewed image files bundled with the app can become recognition targets.
 * Registry intentionally ships empty until the owner supplies a drawing and place.
 */
final class ImageTargetRegistry {
    static Set<String> configure(Session session,Config config,AssetManager assets)throws Exception{
        String text;try(InputStream in=assets.open("hidden-ar/targets.json")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] bytes=new byte[4096];int count;while((count=in.read(bytes))!=-1)out.write(bytes,0,count);text=out.toString(StandardCharsets.UTF_8.name());}
        JSONObject root=new JSONObject(text);if(root.getInt("version")!=1)throw new IllegalArgumentException("Unknown target registry");
        JSONArray targets=root.getJSONArray("targets");if(targets.length()>16)throw new IllegalArgumentException("Too many active image targets");
        AugmentedImageDatabase database=new AugmentedImageDatabase(session);Set<String> names=new HashSet<>();
        for(int i=0;i<targets.length();i++){
            JSONObject target=targets.getJSONObject(i);String id=target.getString("id"),file=target.getString("file");float size=(float)target.getDouble("widthMeters");
            if(!PortalPolicy.validImageTarget(id,file,size)||!"floor-marker".equals(target.getString("placement"))||!names.add(id))throw new IllegalArgumentException("Invalid image target");
            Bitmap bitmap;try(InputStream in=assets.open("hidden-ar/"+file)){bitmap=BitmapFactory.decodeStream(in);}
            if(bitmap==null)throw new IllegalArgumentException("Unreadable target image");
            try{database.addImage(id,bitmap,size);}finally{bitmap.recycle();}
        }
        if(!names.isEmpty())config.setAugmentedImageDatabase(database);
        return Collections.unmodifiableSet(names);
    }
}
