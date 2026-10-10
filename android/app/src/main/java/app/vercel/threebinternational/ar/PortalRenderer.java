package app.vercel.threebinternational.ar;

import android.app.Activity;
import android.media.Image;
import android.opengl.GLES11Ext;
import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import android.os.SystemClock;
import com.google.ar.core.Anchor;
import com.google.ar.core.Camera;
import com.google.ar.core.Coordinates2d;
import com.google.ar.core.Frame;
import com.google.ar.core.HitResult;
import com.google.ar.core.LightEstimate;
import com.google.ar.core.Plane;
import com.google.ar.core.Pose;
import com.google.ar.core.Session;
import com.google.ar.core.TrackingState;
import com.google.ar.core.exceptions.NotYetAvailableException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Native camera + spatial anchor + procedural artwork + per-pixel depth occlusion.
 * No CPU camera readback, no uploads, no GPS, no mission or geospatial validation.
 */
public final class PortalRenderer implements GLSurfaceView.Renderer {
    public interface Guidance { void show(String message, boolean ready); }
    private final Activity activity;
    private final Guidance guidance;
    private final Consumer<String> fail;
    private volatile Session session;
    private volatile boolean textureBound;
    private final AtomicBoolean placeRequested=new AtomicBoolean();
    private Anchor anchor;
    private float yaw;
    private int width=1,height=1,rotation=-1,cameraTexture,depthTexture,cameraProgram,portalProgram;
    private boolean depthReady,broken;
    private final float[] projection=new float[16],view=new float[16],model=new float[16],depthUV=new float[9];
    private final FloatBuffer quad=buffer(new float[]{-1,-1,1,-1,-1,1,1,1}),cameraUV=buffer(new float[8]);
    private final FloatBuffer uvBasis=buffer(new float[]{-1,-1,1,-1,-1,1}),depthCoords=buffer(new float[6]);
    private ByteBuffer depthPixels;
    private Mesh frameMesh,discMesh,baseMesh,shadowMesh,reticleMesh;
    private float light=1f;
    private final float[] lightWorld={0.3f,0.8f,0.5f,0},lightEye=new float[4];
    private final long started=SystemClock.elapsedRealtime();

    public PortalRenderer(Activity activity,Guidance guidance,Consumer<String> fail){this.activity=activity;this.guidance=guidance;this.fail=fail;}
    public void setSession(Session value){session=value;textureBound=false;if(value==null)placeRequested.set(false);}
    public void requestPlacement(){placeRequested.set(true);}
    public void resetAnchor(){if(anchor!=null){anchor.detach();anchor=null;}placeRequested.set(false);}

    @Override public void onSurfaceCreated(GL10 ignored,EGLConfig config){
        try{
            cameraProgram=program("camera");portalProgram=program("portal");
            int[] textures=new int[2];GLES20.glGenTextures(2,textures,0);cameraTexture=textures[0];depthTexture=textures[1];
            GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,cameraTexture);textureParameters(GLES11Ext.GL_TEXTURE_EXTERNAL_OES);
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D,depthTexture);textureParameters(GLES20.GL_TEXTURE_2D);
            // A valid transparent depth texture even before the first depth frame.
            GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D,0,GLES20.GL_RGBA,1,1,0,GLES20.GL_RGBA,GLES20.GL_UNSIGNED_BYTE,ByteBuffer.allocateDirect(4));
            frameMesh=torus();discMesh=disc();baseMesh=pedestal();shadowMesh=ground(1.45f);reticleMesh=ground(.2f);
            textureBound=false;rotation=-1;
        }catch(Exception error){broken=true;fail.accept("Le rendu spatial ne peut pas être initialisé sur cet appareil.");}
    }
    @Override public void onSurfaceChanged(GL10 ignored,int w,int h){width=w;height=h;rotation=-1;GLES20.glViewport(0,0,w,h);}
    @Override public void onDrawFrame(GL10 ignored){
        if(broken)return;
        GLES20.glClearColor(.015f,.025f,.04f,1);GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT|GLES20.GL_DEPTH_BUFFER_BIT);
        Session active=session;if(active==null)return;
        try{
            if(!textureBound){active.setCameraTextureName(cameraTexture);textureBound=true;rotation=-1;}
            int currentRotation=activity.getWindowManager().getDefaultDisplay().getRotation();
            if(rotation!=currentRotation){active.setDisplayGeometry(currentRotation,width,height);rotation=currentRotation;}
            Frame frame=active.update();if(frame.getTimestamp()==0)return;
            drawCamera(frame);
            Camera camera=frame.getCamera();
            if(camera.getTrackingState()!=TrackingState.TRACKING){placeRequested.set(false);guidance.show("Suivi interrompu. Bouge doucement dans un endroit bien éclairé.",false);return;}
            camera.getViewMatrix(view,0);camera.getProjectionMatrix(projection,0,.05f,30f);
            updateDepth(frame);updateLight(frame);
            HitResult candidate=null;
            if(anchor==null){
                for(HitResult hit:frame.hitTest(width*.5f,height*.5f)){
                    if(!(hit.getTrackable() instanceof Plane))continue;
                    Plane plane=(Plane)hit.getTrackable();
                    if(plane.getTrackingState()!=TrackingState.TRACKING||plane.getType()!=Plane.Type.HORIZONTAL_UPWARD_FACING)continue;
                    float[] normal=hit.getHitPose().getYAxis();
                    if(PortalPolicy.validPlacement(hit.getDistance(),normal[1],plane.isPoseInPolygon(hit.getHitPose()))){candidate=hit;break;}
                }
                if(placeRequested.getAndSet(false)&&candidate!=null){
                    anchor=candidate.createAnchor();Pose cp=camera.getPose(),ap=anchor.getPose();yaw=PortalPolicy.facingYaw(cp.tx(),cp.tz(),ap.tx(),ap.tz());
                }
            }else placeRequested.set(false);
            if(anchor!=null&&anchor.getTrackingState()==TrackingState.STOPPED){resetAnchor();guidance.show("Repère perdu. Choisis une nouvelle surface.",false);return;}
            if(anchor!=null&&anchor.getTrackingState()==TrackingState.TRACKING){
                anchoredModel(anchor.getPose(),yaw);drawVirtual(shadowMesh,2,false);drawVirtual(baseMesh,0,true);drawVirtual(frameMesh,0,true);drawVirtual(discMesh,1,true);
                guidance.show("Le passage est placé. Déplace-toi doucement pour l’observer.",false);
            }else if(anchor==null&&candidate!=null){
                candidate.getHitPose().toMatrix(model,0);drawVirtual(reticleMesh,3,false);guidance.show("Sol trouvé. Garde de l’espace devant toi, puis place le portail.",true);
            }else guidance.show(anchor==null?"Vise un sol dégagé à 1–5 mètres et bouge doucement.":"Le repère se retrouve. Patiente sans déplacer le portail.",false);
        }catch(Exception error){broken=true;fail.accept("Le suivi spatial s’est interrompu. Ferme les autres applications caméra puis réessaie.");}
    }
    private void anchoredModel(Pose pose,float angle){
        Matrix.setIdentityM(model,0);Matrix.translateM(model,0,pose.tx(),pose.ty(),pose.tz());Matrix.rotateM(model,0,(float)Math.toDegrees(angle),0,1,0);
    }
    private void drawCamera(Frame frame){
        GLES20.glDisable(GLES20.GL_DEPTH_TEST);GLES20.glDisable(GLES20.GL_BLEND);GLES20.glDepthMask(false);
        quad.position(0);cameraUV.position(0);frame.transformCoordinates2d(Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES,quad,Coordinates2d.TEXTURE_NORMALIZED,cameraUV);
        GLES20.glUseProgram(cameraProgram);attribute(cameraProgram,"aPosition",quad,2,0,0);attribute(cameraProgram,"aUV",cameraUV,2,0,0);
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0);GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES,cameraTexture);GLES20.glUniform1i(uniform(cameraProgram,"uCamera"),0);
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP,0,4);GLES20.glDepthMask(true);
    }
    private void updateDepth(Frame frame){
        depthReady=false;
        if(session==null||session.getConfig().getDepthMode()==com.google.ar.core.Config.DepthMode.DISABLED)return;
        try(Image image=frame.acquireDepthImage16Bits()){
            if(!PortalPolicy.freshDepth(frame.getTimestamp(),image.getTimestamp()))return;
            int w=image.getWidth(),h=image.getHeight(),size=w*h*4;
            if(depthPixels==null||depthPixels.capacity()!=size)depthPixels=ByteBuffer.allocateDirect(size);
            depthPixels.clear();Image.Plane p=image.getPlanes()[0];ByteBuffer input=p.getBuffer();int start=input.position();
            for(int y=0;y<h;y++)for(int x=0;x<w;x++){int offset=start+y*p.getRowStride()+x*p.getPixelStride();depthPixels.put(input.get(offset)).put(input.get(offset+1)).put((byte)0).put((byte)255);}
            depthPixels.flip();GLES20.glActiveTexture(GLES20.GL_TEXTURE1);GLES20.glBindTexture(GLES20.GL_TEXTURE_2D,depthTexture);
            GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D,0,GLES20.GL_RGBA,w,h,0,GLES20.GL_RGBA,GLES20.GL_UNSIGNED_BYTE,depthPixels);
            uvBasis.position(0);depthCoords.position(0);frame.transformCoordinates2d(Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES,uvBasis,Coordinates2d.TEXTURE_NORMALIZED,depthCoords);
            float x=depthCoords.get(0),y=depthCoords.get(1),dx=(depthCoords.get(2)-x)/2,dy=(depthCoords.get(3)-y)/2,ex=(depthCoords.get(4)-x)/2,ey=(depthCoords.get(5)-y)/2;
            depthUV[0]=dx;depthUV[1]=dy;depthUV[2]=0;depthUV[3]=ex;depthUV[4]=ey;depthUV[5]=0;depthUV[6]=x+dx+ex;depthUV[7]=y+dy+ey;depthUV[8]=1;depthReady=true;
        }catch(NotYetAvailableException expected){/* Depth takes motion; never reuse stale occlusion. */}
    }
    private void updateLight(Frame frame){
        LightEstimate estimate=frame.getLightEstimate();
        if(estimate.getState()==LightEstimate.State.VALID){float[] intensity=estimate.getEnvironmentalHdrMainLightIntensity(),direction=estimate.getEnvironmentalHdrMainLightDirection();
            float target=PortalPolicy.lightIntensity((intensity[0]+intensity[1]+intensity[2])/3f);light+=.08f*(target-light);
            for(int i=0;i<3;i++)lightWorld[i]+=.08f*(-direction[i]-lightWorld[i]);
        }
        Matrix.multiplyMV(lightEye,0,view,0,lightWorld,0);
    }
    private void drawVirtual(Mesh mesh,int kind,boolean writeDepth){
        GLES20.glEnable(GLES20.GL_DEPTH_TEST);GLES20.glDepthMask(writeDepth);GLES20.glEnable(GLES20.GL_BLEND);GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA,GLES20.GL_ONE_MINUS_SRC_ALPHA);
        GLES20.glUseProgram(portalProgram);
        GLES20.glUniformMatrix4fv(uniform(portalProgram,"uModel"),1,false,model,0);GLES20.glUniformMatrix4fv(uniform(portalProgram,"uView"),1,false,view,0);GLES20.glUniformMatrix4fv(uniform(portalProgram,"uProjection"),1,false,projection,0);
        GLES20.glUniformMatrix3fv(uniform(portalProgram,"uDepthUV"),1,false,depthUV,0);GLES20.glUniform1i(uniform(portalProgram,"uHasDepth"),depthReady?1:0);
        GLES20.glUniform1f(uniform(portalProgram,"uTime"),(SystemClock.elapsedRealtime()-started)/1000f);GLES20.glUniform1f(uniform(portalProgram,"uLight"),light);GLES20.glUniform3fv(uniform(portalProgram,"uLightDirection"),1,lightEye,0);
        GLES20.glUniform2f(uniform(portalProgram,"uViewport"),width,height);GLES20.glUniform1i(uniform(portalProgram,"uKind"),kind);
        GLES20.glActiveTexture(GLES20.GL_TEXTURE1);GLES20.glBindTexture(GLES20.GL_TEXTURE_2D,depthTexture);GLES20.glUniform1i(uniform(portalProgram,"uDepth"),1);
        attribute(portalProgram,"aPosition",mesh.vertices,3,32,0);attribute(portalProgram,"aNormal",mesh.vertices,3,32,3);attribute(portalProgram,"aUV",mesh.vertices,2,32,6);
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,mesh.count);GLES20.glDepthMask(true);
    }
    private static int uniform(int program,String name){return GLES20.glGetUniformLocation(program,name);}
    private static void attribute(int program,String name,FloatBuffer data,int size,int stride,int offset){int loc=GLES20.glGetAttribLocation(program,name);if(loc<0)return;data.position(offset);GLES20.glVertexAttribPointer(loc,size,GLES20.GL_FLOAT,false,stride,data);GLES20.glEnableVertexAttribArray(loc);data.position(0);}
    private static void textureParameters(int target){GLES20.glTexParameteri(target,GLES20.GL_TEXTURE_MIN_FILTER,GLES20.GL_NEAREST);GLES20.glTexParameteri(target,GLES20.GL_TEXTURE_MAG_FILTER,GLES20.GL_NEAREST);GLES20.glTexParameteri(target,GLES20.GL_TEXTURE_WRAP_S,GLES20.GL_CLAMP_TO_EDGE);GLES20.glTexParameteri(target,GLES20.GL_TEXTURE_WRAP_T,GLES20.GL_CLAMP_TO_EDGE);}
    private int program(String name)throws Exception{int p=GLES20.glCreateProgram();int v=shader(GLES20.GL_VERTEX_SHADER,name+".vert"),f=shader(GLES20.GL_FRAGMENT_SHADER,name+".frag");GLES20.glAttachShader(p,v);GLES20.glAttachShader(p,f);GLES20.glLinkProgram(p);GLES20.glDeleteShader(v);GLES20.glDeleteShader(f);int[] ok=new int[1];GLES20.glGetProgramiv(p,GLES20.GL_LINK_STATUS,ok,0);if(ok[0]==0)throw new IllegalStateException(GLES20.glGetProgramInfoLog(p));return p;}
    private int shader(int type,String path)throws Exception{String source;try(java.io.InputStream in=activity.getAssets().open("hidden-ar/"+path)){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] chunk=new byte[4096];int length;while((length=in.read(chunk))!=-1)out.write(chunk,0,length);source=out.toString(StandardCharsets.UTF_8.name());}int s=GLES20.glCreateShader(type);GLES20.glShaderSource(s,source);GLES20.glCompileShader(s);int[] ok=new int[1];GLES20.glGetShaderiv(s,GLES20.GL_COMPILE_STATUS,ok,0);if(ok[0]==0)throw new IllegalStateException(GLES20.glGetShaderInfoLog(s));return s;}
    private static FloatBuffer buffer(float[] values){FloatBuffer b=ByteBuffer.allocateDirect(values.length*4).order(ByteOrder.nativeOrder()).asFloatBuffer();b.put(values).position(0);return b;}
    private static final class Mesh{final FloatBuffer vertices;final int count;Mesh(ArrayList<Float> list){float[] array=new float[list.size()];for(int i=0;i<array.length;i++)array[i]=list.get(i);vertices=buffer(array);count=array.length/8;}}
    private static void vertex(ArrayList<Float> list,float x,float y,float z,float nx,float ny,float nz,float u,float v){for(float value:new float[]{x,y,z,nx,ny,nz,u,v})list.add(value);}
    private static Mesh torus(){ArrayList<Float> list=new ArrayList<>();int rings=96,tubes=12;int[] corners={0,0,1,0,1,1,0,0,1,1,0,1};for(int i=0;i<rings;i++)for(int j=0;j<tubes;j++)for(int k=0;k<6;k++){float u=(i+corners[k*2])/(float)rings,v=(j+corners[k*2+1])/(float)tubes;double a=u*Math.PI*2,b=v*Math.PI*2;float ca=(float)Math.cos(a),sa=(float)Math.sin(a),cb=(float)Math.cos(b),sb=(float)Math.sin(b);vertex(list,(PortalPolicy.RADIUS+.06f*cb)*ca,1.15f+(1.1f+.06f*cb)*sa,.06f*sb,ca*cb,sa*cb,sb,u,v);}return new Mesh(list);}
    private static Mesh disc(){ArrayList<Float> list=new ArrayList<>();for(int i=0;i<96;i++){vertex(list,0,1.15f,0,0,0,1,0,0);for(int j=0;j<2;j++){double a=(i+j)*Math.PI*2/96;float x=(float)Math.cos(a),y=(float)Math.sin(a);vertex(list,PortalPolicy.RADIUS*x,1.15f+1.1f*y,0,0,0,1,x,y);}}return new Mesh(list);}
    private static Mesh pedestal(){ArrayList<Float> list=new ArrayList<>();int[] corners={0,0,1,0,1,1,0,0,1,1,0,1};for(int i=0;i<64;i++){for(int k=0;k<6;k++){float u=(i+corners[k*2])/64f,y=corners[k*2+1]*.06f;double a=u*Math.PI*2;float x=(float)Math.cos(a),z=(float)Math.sin(a);vertex(list,1.03f*x,y,.32f*z,x,0,z,u,y*12);}vertex(list,0,.06f,0,0,1,0,0,0);for(int j=0;j<2;j++){double a=(i+j)*Math.PI*2/64;float x=(float)Math.cos(a),z=(float)Math.sin(a);vertex(list,1.03f*x,.06f,.32f*z,0,1,0,(i+j)/64f,1);}}return new Mesh(list);}
    private static Mesh ground(float size){ArrayList<Float> list=new ArrayList<>();float[] corners={-1,-1,1,-1,1,1,-1,-1,1,1,-1,1};for(int i=0;i<6;i++)vertex(list,corners[i*2]*size,.008f,corners[i*2+1]*size,0,1,0,corners[i*2],corners[i*2+1]);return new Mesh(list);}
}
