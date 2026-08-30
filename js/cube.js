  (function(){
    var cv=document.getElementById('orbGL'); if(!cv) return;
    var gl=null; try{ gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true})
      || cv.getContext('experimental-webgl',{alpha:true,premultipliedAlpha:false}); }catch(e){}
    if(!gl) return; // CSS fallback orb stays visible
    var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs=`
  precision highp float;
  uniform vec2 u_res; uniform float u_time; uniform sampler2D u_atlas; uniform float u_light;
  mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
  float sdBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r; }

  const float CELL=0.34, GAP=0.045, RAD=0.062, LIM=1.5;   // 4x4x4 grid; rounder bevels = smoother normals

  // a stack of individual rounded cubies with gaps between them (premium beveled blocks)
  float map(vec3 p){
    float t=u_time*0.20;
    vec3 q=p; q.yz*=rot(-0.52+sin(t*0.5)*0.14); q.xz*=rot(t+0.72); // 360° turntable yaw + gentle pitch sway (never an awkward angle)
    q *= 1.50;                                               // shrink the cube in view (~67%) for breathing room
    vec3 cid = clamp(floor(q/CELL) + 0.5, -LIM, LIM);      // half-integer centers = every cubie identical size
    vec3 lp = q - cid*CELL;
    float shell = sdBox(q, vec3(LIM*CELL + CELL*0.5), 0.05);  // bound the march (no overshoot)
    float cubie = sdBox(lp, vec3(CELL*0.5 - GAP), RAD);
    return max(cubie, shell) * 0.7 / 1.50;
  }
  vec3 nrm(vec3 p){vec2 e=vec2(0.0052,0.);                 // wider sample = smoother normals (less speckle)
    return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}

  // Brand-lime scene (the reference's technique, our palette): near-black cool ambient below,
  // bright LIME key up top. The glossy cubies pick this up as a lime->deep-green->black gradient.
  vec3 env(vec3 rd){
    float y=rd.y;
    vec3 lo = vec3(0.032,0.045,0.028);                    // dark green floor
    vec3 mid= vec3(0.062,0.095,0.048);                    // dark green (sides)
    vec3 hi = vec3(0.100,0.145,0.072);                    // dark studio top — same hue, only slightly lifted
    // light theme: a brighter, more vibrant lime cube so it reads well on the white hero
    lo  = mix(lo,  vec3(0.16,0.22,0.10), u_light);
    mid = mix(mid, vec3(0.34,0.46,0.18), u_light);
    hi  = mix(hi,  vec3(0.60,0.80,0.30), u_light);
    vec3 c = mix(lo, mid, smoothstep(-0.6,0.12,y));
    c = mix(c, hi, smoothstep(0.12,0.95,y));
    c += vec3(0.46,0.70,0.29)*pow(max(y,0.0),2.8)*0.09;   // faint key wash from above (soft, not harsh)
    return c;
  }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }

  void main(){
    vec3 acc=vec3(0.); float cov=0.;
    for(int sx=0;sx<2;sx++){for(int sy=0;sy<2;sy++){
      vec2 o=vec2(float(sx),float(sy))*0.5-0.25;
      vec2 uv=(gl_FragCoord.xy+o-0.5*u_res)/u_res.y;
      vec3 ro=vec3(0.,0.,5.3); vec3 rd=normalize(vec3(uv,-3.0));  // longer lens = less foreshortening, squares read even
      float tr=0.,d; bool hit=false;
      for(int i=0;i<170;i++){vec3 pp=ro+rd*tr;d=map(pp);if(d<0.0004){hit=true;break;}tr+=d;if(tr>7.0)break;}
      if(hit){
        vec3 p=ro+rd*tr; vec3 n=nrm(p); vec3 v=-rd; vec3 r=reflect(rd,n);
        float ndv=max(dot(n,v),0.0);
        float fres=pow(1.0-ndv,3.5);
        // glossy resin: the ENVIRONMENT REFLECTION carries the color (top faces reflect the bright
        // lime key, side faces reflect the darker ambient) — the reference's blend, no glowing edges
        vec3 keyDir=normalize(vec3(-0.30,0.92,0.35));
        float diff=max(dot(n,keyDir),0.0);
        vec3 refl=env(r);
        vec3 base=mix(vec3(0.022,0.028,0.016), vec3(0.11,0.14,0.07), u_light); // lighter resin in light theme
        vec3 col=base;
        col += refl * 0.55;                                // soft reflection shapes the bevels (studio look)
        col += vec3(0.46,0.70,0.29)*diff*0.08;             // gentle directional key — subtle form
        col += vec3(0.40,0.60,0.26)*fres*0.09;             // rim light — separates the cube from the dark bg
        col += vec3(0.85,0.95,0.70)*pow(max(dot(r,keyDir),0.0),64.0)*0.07; // small specular glint
        // gentle vertical grade: dark overall, but even (no crush to black at tumbled angles)
        float vfall=smoothstep(-0.7,0.55,p.y);
        col *= ((0.24 + 0.34*u_light) + (0.60 - 0.12*u_light)*vfall);  // higher floor in light so it's not a dark blob
        // --- faint file/device watermark stamped on each cubie face (tracks the cube's rotation) ---
        float t2=u_time*0.20;
        vec3 qb=p; qb.yz*=rot(-0.52+sin(t2*0.5)*0.14); qb.xz*=rot(t2+0.72); qb*=1.50; // hit point in cube-object space (same motion)
        vec3 cb=clamp(floor(qb/CELL)+0.5,-LIM,LIM); vec3 lb=qb-cb*CELL; // this cubie + local pos on it
        vec3 nb=n; nb.yz*=rot(-0.52+sin(t2*0.5)*0.14); nb.xz*=rot(t2+0.72); // normal in object space (face axis)
        vec3 an=abs(nb); vec2 fuv; vec2 kk;
        if(an.y>=an.x && an.y>=an.z){ fuv=lb.xz; kk=vec2(cb.x,cb.z); }
        else if(an.x>=an.z){ fuv=lb.zy; kk=vec2(cb.z,cb.y); }
        else { fuv=lb.xy; kk=vec2(cb.x,cb.y); }
        float flatw=smoothstep(0.80,0.96,max(an.x,max(an.y,an.z)));    // flat face only, not the bevels
        fuv=fuv/(CELL*0.5-GAP)*0.5+0.5;                                // fill the flat cubie face 0..1
        float idx=floor(fract(sin(dot(kk,vec2(12.9898,78.233)))*43758.5453)*8.0); // stable icon per cubie
        vec2 auv=(vec2(mod(idx,4.0),floor(idx/4.0))+clamp(fuv,0.0,1.0))/vec2(4.0,2.0);
        float ic=texture2D(u_atlas,vec2(auv.x,1.0-auv.y)).a;
        float inb=step(0.02,fuv.x)*step(fuv.x,0.98)*step(0.02,fuv.y)*step(fuv.y,0.98);
        float mark=ic*flatw*inb;
        float lu=dot(col,vec3(0.30,0.59,0.11));                        // face brightness
        col*=(1.0-mark*(0.22+1.3*lu));                                 // engrave harder on bright faces so top icons stay visible
        acc+=col; cov+=1.0;
      }
    }}
    float a=cov*0.25;
    vec3 outc=(cov>0.0)?acc/cov:vec3(0.);
    outc=mix(vec3(dot(outc,vec3(0.299,0.587,0.114))),outc,1.16);  // saturation — dark, not an over-green shade
    outc=aces(outc); outc=pow(outc,vec3(0.4545));
    gl_FragColor=vec4(outc*a, a);
  }`;
    function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
      return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;}
    var v=sh(gl.VERTEX_SHADER,vs),f=sh(gl.FRAGMENT_SHADER,fs); if(!v||!f) return;
    var pr=gl.createProgram();gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var uRes=gl.getUniformLocation(pr,'u_res'),uTime=gl.getUniformLocation(pr,'u_time');
    var uLight=gl.getUniformLocation(pr,'u_light');
    // brighten the cube in light theme; follows the toggle + live OS changes
    var effLight=function(){var t=document.documentElement.getAttribute('data-theme');
      if(t==='light')return 1; if(t==='dark')return 0;
      return window.matchMedia('(prefers-color-scheme: dark)').matches?0:1;};
    var lightVal=effLight();
    var setLight=function(){lightVal=effLight();};
    window.addEventListener('themechange',setLight);
    try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',setLight);}catch(e){}
    // build an 8-icon atlas (file + device glyphs) and bind it — sampled per cubie face in the shader
    (function(){
      var C=document.createElement('canvas'); C.width=512; C.height=256; var x=C.getContext('2d');
      x.strokeStyle='#fff'; x.lineJoin='round'; x.lineCap='round';
      function P(d){return new Path2D(d);}
      var icons=[
        function(){x.stroke(P('M6 2 H14 L18 6 V22 H6 Z')); x.stroke(P('M14 2 V6 H18'));},                 // document
        function(){x.strokeRect(3,4,18,14); x.beginPath();x.arc(8.5,9.5,1.6,0,6.29);x.stroke(); x.stroke(P('M21 15 L15 9 L6 18'));}, // image
        function(){x.strokeRect(4,5,16,14); x.stroke(P('M10 9 L16 12 L10 15 Z'));},                        // video
        function(){x.stroke(P('M9 18 V5 L19 3 V13')); x.beginPath();x.arc(6,18,2.8,0,6.29);x.stroke(); x.beginPath();x.arc(16,16,2.8,0,6.29);x.stroke();}, // music
        function(){x.stroke(P('M3 6 H9 L11 8 H21 V19 H3 Z'));},                                            // folder
        function(){x.strokeRect(8,2,8,20); x.stroke(P('M11 18 H13'));},                                    // phone
        function(){x.strokeRect(5,5,14,10); x.stroke(P('M3 17 H21'));},                                    // laptop
        function(){x.strokeRect(3,4,18,12); x.stroke(P('M9 20 H15')); x.stroke(P('M12 16 V20'));}          // monitor
      ];
      for(var i=0;i<icons.length;i++){ var cx=(i%4)*128, cy=Math.floor(i/4)*128, pad=36, s=(128-pad*2)/24;
        x.save(); x.translate(cx+pad, cy+pad); x.scale(s,s); x.lineWidth=1.7; icons[i](); x.restore(); }
      var tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,C);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(gl.getUniformLocation(pr,'u_atlas'),0);
    })();
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0);
    function size(){var dpr=Math.min(window.devicePixelRatio||1,2);var w=cv.clientWidth||1,h=cv.clientHeight||1;
      var W=Math.round(w*dpr),H=Math.round(h*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}gl.viewport(0,0,cv.width,cv.height);}
    cv.classList.add('on');
    var fb=document.querySelector('.orb'); if(fb) fb.style.opacity='0';
    var start=null,raf=null,visible=true;
    function frame(ts){if(start===null)start=ts;var tm=reduce?0.7:(ts-start)/1000;
      size();gl.uniform2f(uRes,cv.width,cv.height);gl.uniform1f(uTime,tm);gl.uniform1f(uLight,lightVal);
      gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
      raf=(!reduce&&visible)?requestAnimationFrame(frame):null;}
    raf=requestAnimationFrame(frame);
    if(!reduce){ try{ new IntersectionObserver(function(es){visible=es[0].isIntersecting;
      if(visible&&raf===null){raf=requestAnimationFrame(frame);}
      else if(!visible&&raf){cancelAnimationFrame(raf);raf=null;} },{threshold:0}).observe(cv);}catch(e){} }
  })();
