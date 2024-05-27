export const weatherFS = `
	precision highp float; 
	precision highp int; 

	uniform float size;
	layout(location = 0) out highp vec4 outColor;


	uniform vec3 seed;

	// =====================================================================================
	// COMMON
	float random2D( vec2 st ) 
	{
		return fract( sin(dot( st.xy, vec2(12.9898,78.233 ) + seed.xy ) ) * 43758.5453123);
	}

// =====================================================================================
// PERLIN NOISE SPECIFIC

	#define perlinAmplitude 0.5
	#define perlinFrequency 0.8
	#define perlinScale 100.0
	#define perlinOctaves 4

	float noiseInterpolation( vec2 i_coord, float i_size)
	{
		vec2 grid = i_coord * i_size;
    
		vec2 randomInput = floor( grid );
		vec2 weights = fract( grid );
    
    
		float p0 = random2D( randomInput );
		float p1 = random2D( randomInput + vec2( 1.0, 0.0  ) );
		float p2 = random2D( randomInput + vec2( 0.0, 1.0 ) );
		float p3 = random2D( randomInput + vec2( 1.0, 1.0 ) );
    
		weights = smoothstep( vec2( 0.0, 0.0 ), vec2( 1.0, 1.0 ), weights ); 
    
		return p0 + ( p1 - p0 ) * ( weights.x ) + ( p2 - p0 ) * ( weights.y ) * ( 1.0 - weights.x ) + ( p3 - p1 ) * ( weights.y * weights.x );    
	}

	float perlinNoise(vec2 uv, float sc, float f, float a, int o)
	{
		float noiseValue = 0.0;
    
		float localAplitude  = a;
		float localFrecuency = f;

		for( int index = 0; index < o; index++ )
		{
     	       
			noiseValue += noiseInterpolation( uv, sc * localFrecuency ) * localAplitude;
    
    		localAplitude   *= 0.25;
    		localFrecuency  *= 3.0;
		}    
		return noiseValue * noiseValue;
	}

// =====================================================================================

	void main() { 
	
		vec2 pixel = vec2(gl_FragCoord.x / size, gl_FragCoord.y / size);
		vec2 uv = vec2(float(pixel.x + 2.0), float(pixel.y));
	
		vec2 suv = vec2(uv.x + 5.5, uv.y + 5.5);

		float cloudType = clamp(perlinNoise(suv, perlinScale*3.0, 0.3, 0.7,10), 0.0, 1.0);

		float coverage = perlinNoise(uv, perlinScale*0.95, perlinFrequency, perlinAmplitude, 4);
		vec4 weather = vec4( clamp(coverage, 0., 1.), cloudType, 0., 1.);

		outColor = weather;
		
	}
`; 
