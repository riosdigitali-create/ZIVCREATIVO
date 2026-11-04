// A single spherical surface at every altitude, without layered terrain photographs.
export const planets=[
  {name:'Mercurio',file:'mercury.jpg',color:[.59,.56,.51],air:[0,0,0],tilt:.01,rotation:2.75,bump:.23},
  {name:'Venus',file:'venus.jpg',color:[.76,.64,.44],air:[.78,.53,.25],tilt:.05,rotation:2.75,bump:.015},
  {name:'Tierra',file:'earth.jpg',color:[.16,.39,.65],air:[.18,.48,.92],tilt:.409,rotation:3.1,bump:.06},
  {name:'Marte',file:'mars.jpg',color:[.65,.34,.21],air:[.38,.20,.12],tilt:.44,rotation:2.3,bump:.18},
  {name:'Júpiter',file:'jupiter.jpg',color:[.68,.57,.44],air:[.39,.33,.25],tilt:.054,rotation:2.25,bump:.02}
];
const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
uniform vec2 resolution;
uniform vec4 bodyA,bodyB,settingsA,settingsB;
uniform vec3 atmosphereA,atmosphereB;
uniform sampler2D mapA,mapB,cloudMap,nightMap,launchMap;
uniform float skyOffset;
uniform float flight;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
vec3 stars(vec2 pixel){
 vec2 p=pixel+vec2(skyOffset*34.,skyOffset*3.);vec3 result=vec3(.004,.008,.016);
 for(int layer=0;layer<2;layer++){
  float size=layer==0?54.:119.;vec2 cell=floor(p/size),local=fract(p/size);
  float seed=hash(cell+float(layer)*73.);
  vec2 offset=vec2(hash(cell+17.),hash(cell+51.))*.8+.1;
  float d=length((local-offset)*size),r=layer==0?.43:.73;
  float light=exp(-d*d/(r*r))+exp(-d*d/6.)*.025;
  vec3 tint=mix(vec3(.68,.82,1.),vec3(1.,.88,.73),hash(cell+93.));
  result+=light*step(.70,seed)*(.20+pow(seed,12.)*.90)*tint;
 }return result;
}
vec2 surfaceUV(vec3 n,float angle,float tilt){
 float c=cos(tilt),s=sin(tilt);n=vec3(c*n.x+s*n.y,-s*n.x+c*n.y,n.z);
 return vec2(fract(atan(n.z,n.x)/(2.*PI)+.5+angle/(2.*PI)),.5-asin(clamp(n.y,-1.,1.))/PI);
}
vec4 sphere(vec2 pixel,vec4 body,vec4 settings,vec3 air,sampler2D surface){
 if(body.z<1.||body.w<.001)return vec4(0.);
 vec2 p=(pixel-body.xy)/body.z;float d=length(p),aa=1.15/body.z;
 if(d>1.085)return vec4(0.);
 vec3 sun=normalize(vec3(-.74,.38,.59));
 vec3 n=vec3(p.x,-p.y,sqrt(max(0.,1.-dot(p,p))));vec3 color=vec3(0.);float opacity=0.;
 if(d<1.+aa){
  n=normalize(n);vec2 uv=surfaceUV(n,settings.x,settings.y);vec3 tex=texture2D(surface,uv).rgb;
  float lum=dot(tex,vec3(.333));
  float dx=dot(texture2D(surface,uv+vec2(.00049,0.)).rgb,vec3(.333))-lum;
  float dy=dot(texture2D(surface,uv+vec2(0.,.00098)).rgb,vec3(.333))-lum;
  vec3 bumped=normalize(n+vec3(-dx,dy,0.)*settings.w*3.);
  float diffuse=dot(bumped,sun),day=max(diffuse,0.);
  color=pow(tex,vec3(2.2))*(vec3(.009,.014,.023)+vec3(1.,.97,.91)*pow(day,.9)*1.2);
  if(settings.z>1.5&&settings.z<2.5){
   float cloud=texture2D(cloudMap,uv+vec2(.002,0.)).r;
   float shadow=texture2D(cloudMap,uv+vec2(-.003,.001)).r;
   color*=1.-shadow*.18;
   color=mix(color,vec3(.86,.9,.95)*(.025+day*.92),smoothstep(.18,.88,cloud)*.9);
   float ocean=smoothstep(1.15,2.,(tex.b+.035)/(tex.r+.035));
   float spec=pow(max(dot(reflect(-sun,n),vec3(0.,0.,1.)),0.),54.);
   color+=vec3(.62,.77,.94)*spec*ocean*.35*(1.-cloud);
   color+=pow(texture2D(nightMap,uv).rgb,vec3(2.2))*(1.-smoothstep(-.22,.12,diffuse))*.48*(1.-cloud*.8);
  }
  float rim=pow(1.-max(n.z,0.),3.8),sunlit=smoothstep(-.24,.42,dot(n,sun));
  color+=air*rim*sunlit*.30;color=pow(max(color,vec3(0.)),vec3(1./2.2));
  opacity=1.-smoothstep(1.-aa,1.+aa,d);
 }else{
  vec3 edgeNormal=normalize(vec3(p.x,-p.y,.015));
  color=air;opacity=exp(-(d-1.)*145.)*smoothstep(-.25,.5,dot(edgeNormal,sun))*.21;
 }return vec4(color,opacity*body.w);
}
vec3 ascentClouds(vec3 space,vec2 pixel,float t){
 vec2 uv=pixel/resolution;
 float daylight=1.-smoothstep(.35,.77,t);
 vec3 sky=mix(vec3(.035,.15,.34),vec3(.43,.69,.91),pow(uv.y,.8));
 vec3 color=mix(space,sky,daylight);
 float envelope=smoothstep(.015,.13,t)*(1.-smoothstep(.40,.75,t));
 vec2 screen=(uv-.5)*vec2(resolution.x/resolution.y,1.);
 vec3 ray=normalize(vec3(screen,1.05));
 float travel=t*t*17.;
 float transmission=1.;vec3 cloudColor=vec3(0.);
 for(int i=0;i<9;i++){
  float z=.32+float(i)*.39;
  vec3 point=ray*z+vec3(0.,travel*.27,travel);
  vec2 field=point.xy*.38+vec2(point.z*.083,point.z*.127);
  float density=texture2D(launchMap,fract(field+vec2(.24,.39))).r;
  float detail=texture2D(launchMap,fract(field*2.47+vec2(.61,.23))).r;
  float raw=density*.72+detail*.28;
  density=smoothstep(.20,.77,raw)*envelope*.44;
  float light=texture2D(launchMap,fract(field+vec2(-.012,-.018)+vec2(.24,.39))).r;
  vec3 shade=mix(vec3(.25,.40,.59),vec3(.95,.98,1.),clamp(.68+(raw-light)*2.4+float(i)*.015,0.,1.));
  cloudColor+=transmission*density*shade;
  transmission*=1.-density;
 }
 color=color*transmission+cloudColor;
 // Forward scattering softens the cloud break without a white flash.
 float haze=exp(-pow((t-.51)/.13,2.))*.14;
 color=mix(color,vec3(.79,.89,1.),haze);
 return color;
}
void main(){
 vec2 pixel=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);vec3 color=stars(pixel);
 vec4 a=sphere(pixel,bodyA,settingsA,atmosphereA,mapA),b=sphere(pixel,bodyB,settingsB,atmosphereB,mapB);
 color=mix(color,a.rgb,a.a);color=mix(color,b.rgb,b.a);
 if(flight>=0.)color=ascentClouds(color,pixel,flight);
 vec2 vignette=(pixel/resolution-.5)*1.3;color*=1.-dot(vignette,vignette)*.17;
 gl_FragColor=vec4(color,1.);
}`;
const clamp=v=>Math.min(1,Math.max(0,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*t;

export class Horizons {
 constructor(canvas,{base='assets/horizons/',sources={},onChange=()=>{},order=[0,1,2,3,4],orbitalStart=false}={}){
  this.canvas=canvas;this.base=base;this.sources=sources;this.onChange=onChange;
  this.order=order;this.orbitalStart=orbitalStart;this.flight=null;
  this.ready=new Promise(resolve=>{this.resolveReady=resolve;});
  this.media=matchMedia('(prefers-reduced-motion: reduce)');this.paused=this.media.matches;
  this.target=0;this.current=0;this.frame=0;this.lastPlanet=-1;this.textures=new Map();
  this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!this.gl){canvas.parentElement.dataset.fallback='true';this.resolveReady(false);return;}
  try{this.initialize();}catch(error){canvas.parentElement.dataset.fallback='true';console.warn('Horizontes: fondo estático disponible.',error.message);this.failed=true;this.resolveReady(false);return;}
  this.onScroll=()=>{this.target=this.progress();if(!this.paused||this.media.matches)this.schedule();};
  this.onResize=()=>this.schedule();
  this.onVisibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;}else this.schedule();};
  this.onReduced=()=>this.setPaused(this.media.matches);
  this.onMotion=e=>this.setPaused(e.detail.paused);
  this.onContextLost=e=>{e.preventDefault();cancelAnimationFrame(this.frame);this.frame=0;canvas.parentElement.dataset.fallback='true';};
  this.onContextRestored=()=>{this.textures.clear();this.flightCloud=null;this.initialize();if(this.flight!==null)this.setFlight(this.flight);this.schedule();};
  addEventListener('scroll',this.onScroll,{passive:true});addEventListener('resize',this.onResize);
  addEventListener('ziv:motion',this.onMotion);document.addEventListener('visibilitychange',this.onVisibility);
  this.media.addEventListener('change',this.onReduced);
  canvas.addEventListener('webglcontextlost',this.onContextLost);canvas.addEventListener('webglcontextrestored',this.onContextRestored);
  this.target=this.progress();this.current=this.target;this.schedule();
 }
 progress(){return clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));}
 initialize(){
  const gl=this.gl;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  this.program=program;gl.useProgram(program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const p=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  this.uniforms={};for(const n of ['resolution','bodyA','bodyB','settingsA','settingsB','atmosphereA','atmosphereB','mapA','mapB','cloudMap','nightMap','launchMap','skyOffset','flight'])this.uniforms[n]=gl.getUniformLocation(program,n);
  this.cloud=this.texture('earth-clouds.jpg',[0,0,0]);this.night=this.texture('earth-night.jpg',[0,0,0]);
 }
 texture(file,color){
  if(this.textures.has(file))return this.textures.get(file);
  const gl=this.gl,texture=gl.createTexture();this.textures.set(file,texture);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array(color.map(v=>Math.round(v*255))));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const image=new Image();image.decoding='async';image.onload=()=>{
   if(this.destroyed||gl.isContextLost())return;
   gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
   const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
   const planetIndex=planets.findIndex(p=>p.file===file);
   if(planetIndex>=0){
    this.canvas.parentElement.dataset.ready='true';delete this.canvas.parentElement.dataset.fallback;
    if(planetIndex===this.order[0])this.resolveReady(true);
    if(planetIndex<4&&!navigator.connection?.saveData){const next=planets[planetIndex+1];setTimeout(()=>{if(!this.destroyed&&!gl.isContextLost())this.texture(next.file,next.color);},100);}
   }
   this.schedule();
  };image.onerror=()=>{if(file===planets[this.order[0]].file){this.canvas.parentElement.dataset.fallback='true';this.resolveReady(false);}};
  image.src=this.sources[file]||this.base+file;return texture;
 }
 setPaused(value){if(this.paused===value)return;this.paused=value;if(!value)this.target=this.progress();cancelAnimationFrame(this.frame);this.frame=0;this.schedule();}
 setFlight(value){this.flight=value===null?null:clamp(value);if(value!==null&&!this.flightCloud&&this.gl&&!this.failed)this.flightCloud=this.texture('../flight/cloud-density.webp',[.5,.5,.5]);this.schedule();}
 schedule(){if(this.gl&&!this.failed&&!this.frame&&!document.hidden&&!this.destroyed&&!this.gl.isContextLost())this.frame=requestAnimationFrame(t=>this.draw(t));}
 bodies(progress,w,h){
  const p=Math.min(4.999999,progress*5),sequenceIndex=Math.floor(p),index=this.order[sequenceIndex],t=p-sequenceIndex,mobile=w<700;
  const xNear=w*(mobile?.58:.64),xFar=w*(mobile?.57:.69);
  const firstOrbit=this.orbitalStart&&sequenceIndex===0;
  const close=h*(mobile?1.85:2.6),far=firstOrbit?Math.min(h*.43,w*.56):Math.min(h*.34,w*.43),ascent=firstOrbit?1:smooth(t/.73);
  const radius=Math.exp(mix(Math.log(close),Math.log(far),ascent)),top=h*(mobile?.57:.54);
  let a={index,x:mix(xNear,xFar,ascent),y:mix(top,h*.51-far,ascent)+radius,r:radius,rotation:planets[index].rotation+t*.22},b=null;
  if(sequenceIndex<4&&t>.82){
   const flight=smooth((t-.82)/.18);a.x=mix(xFar,-w*.26,flight);a.y=mix(h*.51,h*.39,flight);a.r=mix(far,far*.38,flight);
   const r=Math.exp(mix(Math.log(h*.045),Math.log(close),flight));
   const nextIndex=this.order[sequenceIndex+1];
   b={index:nextIndex,x:mix(w*1.15,xNear,flight),y:mix(h*.46,top,flight)+r,r,rotation:planets[nextIndex].rotation};
  }return {a,b,index,t};
 }
 flightBody(progress,w,h){
  const destination=this.bodies(0,w,h).a,q=smooth((progress-.31)/.69);
  const r=Math.exp(mix(Math.log(h*6),Math.log(destination.r),q));
  const top=mix(h*1.04,destination.y-destination.r,q);
  return {a:{index:2,x:mix(w*.51,destination.x,q),y:top+r,r,rotation:planets[2].rotation},b:null,index:2,t:progress};
 }
 draw(time){
  this.frame=0;if(this.destroyed||this.gl.isContextLost())return;
  const gl=this.gl,rect=this.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,rect.width<700?1.25:1.5,Math.sqrt((this.flight===null?1100000:650000)/(rect.width*rect.height)));
  const w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  gl.viewport(0,0,w,h);gl.useProgram(this.program);
  if(!this.paused){const dt=Math.min(50,this.lastTime?time-this.lastTime:16);this.current+=(this.target-this.current)*(1-Math.exp(-dt/95));}this.lastTime=time;
  if(!this.paused&&Math.abs(this.target-this.current)<.00002)this.current=this.target;
  const progress=this.paused&&this.media.matches?(Math.min(4,Math.floor(this.target*5))+.73)/5:this.current;
  const scene=this.flight===null?this.bodies(progress,rect.width,rect.height):this.flightBody(this.flight,rect.width,rect.height);
  this.bindBody(scene.a,'A',0,ratio);this.bindBody(scene.b,'B',1,ratio);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.cloud);gl.uniform1i(this.uniforms.cloudMap,2);
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.night);gl.uniform1i(this.uniforms.nightMap,3);
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.flightCloud||this.cloud);gl.uniform1i(this.uniforms.launchMap,4);
  gl.uniform2f(this.uniforms.resolution,w,h);gl.uniform1f(this.uniforms.skyOffset,this.flight===null?progress:this.flight*.1);gl.uniform1f(this.uniforms.flight,this.flight===null?-1:this.flight);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  if(this.lastPlanet!==scene.index){this.lastPlanet=scene.index;this.onChange({index:scene.index,planet:planets[scene.index]});}
  this.onFrame?.({...scene,progress});
  if(!this.paused&&Math.abs(this.target-this.current)>.00002)this.schedule();
 }
 bindBody(body,suffix,slot,ratio){
  const gl=this.gl,p=planets[body?.index||0];
  gl.uniform4f(this.uniforms['body'+suffix],body?body.x*ratio:0,body?body.y*ratio:0,body?body.r*ratio:0,body?1:0);
  gl.uniform4f(this.uniforms['settings'+suffix],body?.rotation||0,p.tilt,body?.index||0,p.bump);gl.uniform3fv(this.uniforms['atmosphere'+suffix],p.air);
  const texture=this.texture(p.file,p.color);gl.activeTexture(gl.TEXTURE0+slot);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.uniforms['map'+suffix],slot);
 }
 destroy(){
  this.destroyed=true;cancelAnimationFrame(this.frame);removeEventListener('scroll',this.onScroll);removeEventListener('resize',this.onResize);removeEventListener('ziv:motion',this.onMotion);
  document.removeEventListener('visibilitychange',this.onVisibility);this.media.removeEventListener('change',this.onReduced);
  this.canvas.removeEventListener('webglcontextlost',this.onContextLost);this.canvas.removeEventListener('webglcontextrestored',this.onContextRestored);
  for(const t of this.textures.values())this.gl.deleteTexture(t);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);
 }
}
