import * as THREE from "../lib/three/build/three.module.js";
import { OrbitControls } from '../lib/three/examples/jsm/controls/OrbitControls.js';
import { RenderPass } from '../lib/three/examples/jsm/postprocessing/RenderPass.js'; 
import { ShaderPass } from '../lib/three/examples/jsm/postprocessing/ShaderPass.js';
import {FXAAShader} from '../lib/three/examples/jsm/shaders/FXAAShader.js'; 
import { EffectComposer } from '../lib/three/examples/jsm/postprocessing/EffectComposer.js'; 
import WebGL from '../lib/three/examples/jsm/WebGL.js';

import {cloud_model} from './cloud-model.js';

import { cloudsVS } from "../resources/shader/cloudsVS.js";
import { cloudsFS } from "../resources/shader/cloudsFS.js";


function main() {
	new Main();
}

class Main {
	constructor() {
		this.init();
		this.animate();	
	}
	
		
	init() {

		if (!WebGL.isWebGL2Available()) {
			return false;
		}
	
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('webgl2');
		
		this.renderer = new THREE.WebGLRenderer({ 
			canvas: canvas,
			context: context,
			antialias: true 
		});
		
		this.renderer.setPixelRatio( window.devicePixelRatio ); 
		this.renderer.shadowMap.enabled = true; 
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		
		this.container = document.getElementById('container');
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
		this.container.appendChild( this.renderer.domElement );

		const fov = 50;
		const near = 0.1;
		const far = 1000000;
		this.aspect = this.container.clientWidth / this.container.clientHeight; 
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0x5cccfc );
		
		this.camera = new THREE.PerspectiveCamera( fov, this.aspect, near, far );
		this.camera.position.set(10000, 15000, 10000);
	
		this.controls = new OrbitControls( this.camera, this.renderer.domElement );
		this.controls.enableZoom = true;
		this.controls.enabled = true;
		this.controls.target.set(0, 0, 0);
		this.controls.update();

		this.composer = new EffectComposer(this.renderer);
		const renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(renderPass);
		//-------------------------------------------------------------------------------------------------
	
		let params = {
			renderer: this.renderer,
		}
		
		const geometry = new THREE.SphereGeometry( 1000, 32, 16 ); 
		const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } ); 
		const sphere = new THREE.Mesh( geometry, material ); 
		this.scene.add( sphere );
			
		this.resolution_ = new THREE.Vector2(); 
		this.renderer.getDrawingBufferSize(this.resolution_);

		this.target_ = new THREE.WebGLRenderTarget(this.resolution_.x, this.resolution_.y);		
		this.target_.stencilBuffer = false;
		this.target_.depthBuffer = true;
		this.target_.depthTexture = new THREE.DepthTexture();
		this.target_.depthTexture.format = THREE.DepthFormat;
		this.target_.depthTexture.type = THREE.FloatType;		
		this.target_.depthTexture.minFilter = THREE.NearestFilter;
		this.target_.depthTexture.magFilter = THREE.NearestFilter;
	
	
		const cloudmodel = new cloud_model.CloudModel(params);

		let uniform = {			
			tDiffuse: { value: null },
			tDepth: { value: null },
			sunDir: { value: null },
			sunColor: { value: null },
			cameraForward: { value: null },
			inverseProjection: { value: null },
			inverseView: { value: null },
			cameraPos: { value: null },
			planetPos: { value: null },
			near: { value: near },
			far: { value: far },
			cloud: { value: cloudmodel.cloud},   
			worley: { value: cloudmodel.worley},   
			weather: { value: cloudmodel.weather},
		}

		this.clouds = new THREE.RawShaderMaterial({
			glslVersion: THREE.GLSL3,
			uniforms: uniform,
			vertexShader: cloudsVS,
			fragmentShader: cloudsFS,
		});			
		

		this.composer.addPass(new ShaderPass(this.clouds));


		window.addEventListener('resize', () => {this.OnResize_();}, false);
		this.OnResize_();
	
	}//end init	
	
	
	update() {
		
		this.clouds.uniforms.tDepth.value = this.target_.depthTexture;
		this.clouds.uniforms.planetPos.value = new THREE.Vector3(0, 0, 0);		
		this.clouds.uniforms.inverseProjection.value = this.camera.projectionMatrixInverse;
		this.clouds.uniforms.inverseView.value = this.camera.matrixWorld;
		this.clouds.uniforms.cameraPos.value = this.camera.position;
		this.clouds.uniforms.sunDir.value = new THREE.Vector3(1, 1, 1);
		this.clouds.uniforms.sunColor.value = new THREE.Vector3(1, 1, 1);	
		this.clouds.uniformsNeedUpdate = true;
	}
	
	
	animate() {
		
		requestAnimationFrame( this.animate.bind(this) );  
		this.render();
	}//end animate
	
	
	render() {
		
		this.renderer.setRenderTarget(this.target_);
		this.renderer.render(this.scene, this.camera);
		this.renderer.setRenderTarget( null );
		
		this.update();		
		this.renderer.render(this.scene, this.camera);
		this.composer.render();		
	}//end render
	
	
	OnResize_() {

		const width = this.container.clientWidth;
		const height = this.container.clientHeight;
		
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);	
	}
	
}//end class


//export {main}
main();
