import * as THREE from "../lib/three/build/three.module.js";
import { commonVS } from "../resources/shader/common.js";
import { basecloudFS } from "../resources/shader/basecloud.js";
import { worleyFS } from "../resources/shader/worley.js";
import { weatherFS } from "../resources/shader/weather.js";




export const cloud_model = (() => {

	class CloudModel {
		constructor(params) {
			this._Init(params);
    }


		_Init(params) {
			this.params_ = params;
				
			let loader = new THREE.TextureLoader();
					
			this.cloud = this.Cloud(params);
			this.worley = this.Worley(params);
			this.weather = loader.load("resources/img/clouds_2.jpg");
		}


		Update(timeElapsed) {

		}


		Cloud(params){

		this.textureCamera = new THREE.Camera();
		const SIDE = 128;

		this.computeMaterial = new THREE.RawShaderMaterial({ 
			glslVersion: THREE.GLSL3,
			vertexShader: commonVS, 
			fragmentShader: basecloudFS, 
			uniforms: { 
				uZCoord: { value: 0 },
				size: { value: 0 },
			}, 
			depthTest: false, 
		}); 
		this.computeMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.computeMaterial);  

		this.target3d = new THREE.WebGL3DRenderTarget(SIDE, SIDE, SIDE); 
		this.target3d.depthBuffer = false;

		this.target3d.texture.format = THREE.RGBAFormat;
		this.target3d.texture.minFilter = THREE.LinearFilter;
		this.target3d.texture.magFilter = THREE.LinearFilter;
		this.target3d.texture.mapping = THREE.UVMapping;
		this.target3d.texture.type = THREE.UnsignedByteType;
		this.target3d.texture.needsUpdate = true;

		for ( let i = 0; i < SIDE; i++ ) { 
			this.computeMesh.material.uniforms.size.value = SIDE;
			this.computeMesh.material.uniforms.uZCoord.value = i; 
			params.renderer.setRenderTarget(this.target3d, i);   	
			params.renderer.render(this.computeMesh, this.textureCamera);
		} 	
		params.renderer.setRenderTarget(null);
				
			return this.target3d.texture;
			

		}//end Cloud		
		
		
		
		Worley(params){
		
			this.worleyCamera = new THREE.Camera();
			const SIDE = 64;
			
			this.computeWorley = new THREE.RawShaderMaterial({ 
			glslVersion: THREE.GLSL3,
			vertexShader: commonVS, 
			fragmentShader: worleyFS, 
			uniforms: { 
				uZCoord: { value: 0 },
				size: { value: 0 },
			}, 
			depthTest: false, 
		}); 
		this.worleyMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.computeWorley);  

		this.worley3d = new THREE.WebGL3DRenderTarget(SIDE, SIDE, SIDE); 
		this.worley3d.depthBuffer = false;

		this.worley3d.texture.format = THREE.RGBAFormat;
		this.worley3d.texture.minFilter = THREE.LinearFilter;
		this.worley3d.texture.magFilter = THREE.LinearFilter;
		this.worley3d.texture.mapping = THREE.UVMapping;
		this.worley3d.texture.type = THREE.UnsignedByteType;
		this.worley3d.texture.needsUpdate = true;

		for ( let i = 0; i < SIDE; i++ ) { 
			this.worleyMesh.material.uniforms.size.value = SIDE;
			this.worleyMesh.material.uniforms.uZCoord.value = i; 
			params.renderer.setRenderTarget(this.worley3d, i);   	
			params.renderer.render(this.worleyMesh, this.worleyCamera);
		} 	
		params.renderer.setRenderTarget(null);
		
		return this.worley3d.texture;
		}//end Worley
		
		
		Weather(params){
		
			const SIDE = 1024;
	
			this.computeWeather = new THREE.RawShaderMaterial({ 
				glslVersion: THREE.GLSL3,
				vertexShader: commonVS, 
				fragmentShader: weatherFS, 
				uniforms: { 
					size: { value: SIDE },
					seed: { value: new THREE.Vector3(1, 5, 3) },
				}, 
				depthTest: false, 
			}); 
			
			this.weatherMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.computeWeather);  

			this.target2d = new THREE.WebGLRenderTarget(SIDE, SIDE); 
			this.target2d.depthBuffer = false;

			this.target2d.texture.format = THREE.RGBAFormat;
			this.target2d.texture.minFilter = THREE.LinearFilter;
			this.target2d.texture.magFilter = THREE.LinearFilter;
			this.target2d.texture.mapping = THREE.UVMapping;
			this.target2d.texture.type = THREE.UnsignedByteType;
			this.target2d.texture.needsUpdate = true;

			params.renderer.setRenderTarget(this.target2d);   	
			params.renderer.render(this.weatherMesh, this.textureCamera); 	
			params.renderer.setRenderTarget(null);
	
			return this.target2d.texture;
	
		}//end Weather
		
  };


  return {
      CloudModel: CloudModel,
  };

})();