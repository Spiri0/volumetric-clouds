export const commonVS = `
	precision highp float; 
	precision highp int; 
 
	in vec3 position; 

	void main() { 
		gl_Position = vec4(position, 1.0); 
	}
`; 
		
	