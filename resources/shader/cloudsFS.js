export const cloudsFS = `


	#define PI 3.141592653589793238
	#define FLT_MAX 3.402823466e+38

	precision highp float; 
	precision highp int;
	precision highp sampler2D;
	precision highp sampler3D;
		
	in vec2 vUv;	
	out vec4 outColor;	
	
	
	uniform sampler3D cloud;
	uniform sampler3D worley;
	uniform sampler2D weather;
	uniform sampler2D tDiffuse;
	uniform sampler2D tDepth;
	
	uniform vec3 cameraPos;
	uniform vec3 planetPos;
	uniform mat4 inverseProjection;
	uniform mat4 inverseView;
	uniform float planetRadius;
	uniform vec3 sunDir;
	uniform vec3 sunColor;
	uniform float near;
	uniform float far;
	

	// Cloud types height density gradients
	#define STRATUS_GRADIENT vec4(0.0, 0.1, 0.2, 0.3)
	#define STRATOCUMULUS_GRADIENT vec4(0.02, 0.2, 0.48, 0.625)
	#define CUMULUS_GRADIENT vec4(0.00, 0.1625, 0.88, 0.98)
	
	#define CLOUDS_AMBIENT_COLOR_TOP vec3(179., 179., 179.)*(1.5/255.)
	#define CLOUDS_AMBIENT_COLOR_BOTTOM vec3(65., 70., 80.)*(1.5/255.)
	#define NOISE_GRANULARITY float (0.5/255.0);
	
	#define CLOUDS_BOTTOM_HEIGHT 4000.0
	#define CLOUDS_TOP_HEIGHT 8000.0

	
	vec3 noiseKernel[6] = vec3[] 
	(
		vec3( 0.38051305,  0.92453449, -0.02111345),
		vec3(-0.50625799, -0.03590792, -0.86163418),
		vec3(-0.32509218, -0.94557439,  0.01428793),
		vec3( 0.09026238, -0.27376545,  0.95755165),
		vec3( 0.28128598,  0.42443639, -0.86065785),
		vec3(-0.16852403,  0.14748697,  0.97460106)
	);


//**********************************************************************************************************

	
	vec3 computeWorldPosition(){ 
	
		float z = texture(tDepth, vUv).x;
	
		vec4 posCLIP = vec4(vec3(vUv, z) * 2.0 - 1.0, 1.0); 		
		vec4 posVS = inverseProjection * posCLIP;
		posVS = vec4(posVS.xyz / posVS.w, 1.0);
		vec4 posWS = inverseView * posVS;	
		
		return posWS.xyz;
	}
	
	
	float dithering(vec2 coords) { 
		return fract(sin(dot(coords.xy, vec2(12.9898,78.233))) * 43758.5453); 
	}	




	vec2 hitBox(vec3 orig, vec3 dir) {
		vec3 box_min = vec3( -10000., CLOUDS_BOTTOM_HEIGHT, -10000. );
		vec3 box_max = vec3( 10000., CLOUDS_TOP_HEIGHT, 10000. );
		vec3 inv_dir = 1.0 / dir;
		vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
		vec3 tmax_tmp = ( box_max - orig ) * inv_dir;	
		vec3 tmin = min( tmin_tmp, tmax_tmp );
		vec3 tmax = max( tmin_tmp, tmax_tmp );
		
		float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
		float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
		
		return vec2( t0, t1 );
	}




	vec3 scaledPos(vec3 pos, float scale) {

		float frac = 1./scale;
		
		return vec3(
			frac - abs(mod(scale * pos.x, frac*2.)-frac), 
			frac - abs(mod(scale * pos.y, frac*2.)-frac),
			frac - abs(mod(scale * pos.z, frac*2.)-frac)
		);	
	}


	float saturate(float x) { 
		return max(0., min(1., x)); 
	}


	float HG( float sundotrd, float g) {
		float gg = g * g;
		return (1. - gg) / pow( 1. + gg - 2. * g * sundotrd, 1.5) * 1./(4.*PI);
	}

	float powder(float d){
		return (1. - exp(-2.*d));
	}


	float getHeightFraction(vec3 pos, float low, float height) { 	
		return (length(pos.y - 0.) - low) / (height - low); 
	}


	vec3 sampleWeather(vec3 pos) { 	
		vec3 weatherMap = texture(worley, vec3(pos.x, 0., pos.z)).rgb;
		return weatherMap;
	}


	float remap(float originalValue, float originalMin, float originalMax, float newMin, float newMax)
	{
		return newMin + (((originalValue - originalMin) / (originalMax - originalMin)) * (newMax - newMin));
	}



	float getDensityForCloud(float heightFraction, float cloudType){
	
		float stratusFactor = 1.0 - clamp(cloudType * 2.0, 0.0, 1.0);
		float stratoCumulusFactor = 1.0 - abs(cloudType - 0.5) * 2.0;
		float cumulusFactor = clamp(cloudType - 0.5, 0.0, 1.0) * 2.0;

		vec4 baseGradient = stratusFactor * STRATUS_GRADIENT + stratoCumulusFactor * STRATOCUMULUS_GRADIENT + cumulusFactor * CUMULUS_GRADIENT;

		return smoothstep(baseGradient.x, baseGradient.y, heightFraction) - smoothstep(baseGradient.z, baseGradient.w, heightFraction);
}



	float sampleDensity(vec3 pos){

		float heightFraction = getHeightFraction(pos, CLOUDS_BOTTOM_HEIGHT, CLOUDS_TOP_HEIGHT);
		if(heightFraction < 0. || heightFraction > 1.){
			return 0.;
		}
	
		vec3 newpos = pos *= 1.0/20000.;
		newpos += vec3(0.5);
	
		float density = 0.0;
		float threshold = 0.65;
		float densityMultiplier = 1.;

		vec3 wpos = scaledPos(newpos, 1.);	
		float weather = max(0.0, sampleWeather(wpos).g - threshold);
		float coverage_multiplier = 1.0;
	
		vec3 lowpos = scaledPos(newpos, 3.);	
		vec4 lowFreqNoise = textureLod(cloud, lowpos, 0.0);
		
		float lowFreqFBM = dot(lowFreqNoise.gba, vec3(0.625, 0.25, 0.125));
		float base_cloud = remap(lowFreqNoise.r, -(1.0 - lowFreqFBM), 1., 0.0 , 1.0);
		density = getDensityForCloud(heightFraction, 1.0);
		base_cloud *= (density/heightFraction);
	
		float cloudCoverage = weather * coverage_multiplier;
		float baseCloudWithCoverage = remap(base_cloud, cloudCoverage, 1.0, 0.0, 1.0); 
		baseCloudWithCoverage *= cloudCoverage;
	
		vec3 highpos = scaledPos(pos, 5.);
		vec3 highFreqNoise = textureLod(worley, highpos*heightFraction, 0.0).rgb;
		float highFreqFBM = dot(highFreqNoise, vec3(0.625, 0.25, 0.125));
		float highFreqNoiseModifier = mix(highFreqFBM, 1.0 - highFreqFBM, clamp(heightFraction * 10.0, 0.0, 1.0));	
		baseCloudWithCoverage = baseCloudWithCoverage - highFreqNoiseModifier * (1.0 - baseCloudWithCoverage);
		baseCloudWithCoverage = remap(baseCloudWithCoverage * 2.0, highFreqNoiseModifier * 0.2, 1.0, 0.0, 1.0);


		return clamp(baseCloudWithCoverage, 0.0, 1.0);
	
	}


	
		float raymarchToLight(vec3 startPos, float stepSize){

		vec3 pos = startPos;
		float coneStep = 1./6.; 	
		float coneRadius = 1.0;
		float sigma = 0.00035;
		float totalDensity = 0.0;	
		
		for(int i = 0; i < 6; i++) 	{
			pos = startPos + coneRadius * noiseKernel[i] * float(i);
			//float density = sampleDensity(pos, totalDensity > 0.25, float(i)/16.);
			float density = sampleDensity(pos);
			if(density > 0.0){ 
				totalDensity += density * stepSize;
			}
			startPos += stepSize * normalize(sunDir);
			coneRadius += coneStep;
		}

		float T = exp(-totalDensity * sigma);

		return T;
	}
	
	
	
	vec4 traceClouds(vec3 rayDir, vec3 startPos, vec3 endPos){
		
		vec3 path = endPos - startPos;
		float len = length(path);
		int nSteps = 128;  //as more as better but very computationally intensive		
		float stepSize = len/float(nSteps); 	
		vec4 col = vec4(0.);
		float lightDotEye = dot(normalize(sunDir), normalize(rayDir));

		float T = 1.0;
		float densityFactor = 0.1;
		float sigma = 0.02;


		vec2 resolution = vec2(1., 1.);
		vec2 coord = gl_FragCoord.xy / resolution;	
		startPos += rayDir * stepSize * (dithering(coord) * 2. - 1.);
		vec3 pos = startPos;


		for(int i = 0; i < nSteps; ++i){	//because the first step is done by dithering
	
			float heightFraction = getHeightFraction(pos, CLOUDS_BOTTOM_HEIGHT, CLOUDS_TOP_HEIGHT);
			float density = sampleDensity(pos);		
			
			if(density > 0.0){//I have to install a more intelligent ray separation here. I need a detection ray with less steps and a scatter ray for the clouds self. Here i just have a stupid constant ray
				
				float light_density = raymarchToLight(pos, stepSize);
				float scattering = mix(HG(lightDotEye, -0.08), HG(lightDotEye, 0.08), clamp(lightDotEye*0.5 + 0.5, 0.0, 1.0));
				scattering = max(scattering, 1.0);
				float powderTerm = powder(density);									

				vec3 ambientLight = mix( CLOUDS_AMBIENT_COLOR_BOTTOM, CLOUDS_AMBIENT_COLOR_TOP, heightFraction);
				
				vec3 S = mix( ambientLight, vec3(1.,1.,1.) * scattering, powderTerm * light_density) * density;		
				float dTrans = exp(-density * stepSize * sigma);
				vec3 Sint = (S - S * dTrans) * (1.0/density);
	
				col.rgb += T * Sint;
				T *= dTrans;	
				
			}
	
			if( T <= 0.01 ) break;		
			pos += rayDir * stepSize;
		}

		col.a = 1.0 - T;

		return col;

	}
	

	//**********************************************************************************************************
	
	void main() {

		float depth = texture(tDepth, vUv).x;
		vec3 diffuse = texture(tDiffuse, vUv).rgb;
		vec3 posWS = computeWorldPosition();
		vec3 cameraDirection = normalize(posWS - cameraPos);


		vec3 clouds = texture(cloud, vec3(vUv, .2)).rgb;
		vec3 worleys = texture(worley, vec3(vUv, .2)).rgb;
	

		vec4 trace = vec4(0.);
		vec2 bounds = hitBox( cameraPos, cameraDirection );
		
		bounds.x = max( bounds.x, 0.0 );
		if( bounds.y > 0. && bounds.y > bounds.x ){
		
			vec3 start = cameraPos + cameraDirection * bounds.x;
			vec3 stop = cameraPos + cameraDirection * bounds.y;
	
			float worldDistance = length(cameraPos - posWS); 	
			float startDistance = length(cameraPos - start); 	

			//Here is just one boundary condition as an example. Many more are possible
			if(startDistance < worldDistance){
				trace = traceClouds(cameraDirection, start, stop);
			}
		}
					

		vec4 cloudcolor = trace;




		outColor = vec4(diffuse, 1.) * (1.- cloudcolor.a) + vec4(cloudcolor.rgb, 1.);
		
		//outColor = vec4(posWS, 1.);	
		//outColor = vec4(clouds, 1.);
		//outColor = vec4(worleys, 1.);
	}`;
	
	
	
/*
The best are qubic volumes so that the ray does not vary too much in its length.
What is missing here is a more intelligent ray separation. As soon as I hit a density greater than 0, I have to take a step back and then advance in smaller steps. When the density is 0 again, i.e. I get out of the cloud, then you can go on in big steps again. That would improve the quality significantly.
*/