#extension GL_OES_EGL_image_external : require
precision mediump float;
uniform samplerExternalOES uCamera;
varying vec2 vUV;
void main(){gl_FragColor=texture2D(uCamera,vUV);}
