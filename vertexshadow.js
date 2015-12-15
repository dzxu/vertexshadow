// David Xu, dxu9@lsu.edu
// Renders a textured chest that the user can tumble with sliders that
// the user can use to set the light position
// as well as one of two potential simple shadow implementations
var canvas;
var gl;
var program;

var chestModel;

var textureShader;
var diffuseShadowShader;
var totalShadowShader;

var activeEffect;

var lightPosition = [0.0, 3.0, 3.0, 1.0];
var x = 0.0;
var y = 3.0;
var z = 3.0;

var modelRotationX = 45;
var modelRotationY = -45;
var dragging = false;
var lastClientX;
var lastClientY;

//Shader constructor; create and set shader program, set uniform and attribute locations for shader object
function Shader(vertexShaderId, fragmentShaderId) {
	this.program = createProgram(gl,document.getElementById(vertexShaderId).text, document.getElementById(fragmentShaderId).text);
	gl.useProgram(this.program);

	this.projectionMatrixLocation = gl.getUniformLocation(this.program, "projectionMatrix");
	this.viewMatrixLocation = gl.getUniformLocation(this.program, "viewMatrix");
	this.modelMatrixLocation = gl.getUniformLocation(this.program, "modelMatrix");

	this.lightPositionLocation = gl.getUniformLocation(this.program, "lightPosition");
	
	this.vertexPositionLocation = gl.getAttribLocation(this.program, "vertexPosition");
	this.vertexNormalLocation = gl.getAttribLocation(this.program, "vertexNormal");
	this.vertexTexCoordLocation = gl.getAttribLocation(this.program, "vertexTexCoord");
}

//Shader setup; set uniforms for shader object
Shader.prototype.setup = function(projectionMatrix, viewMatrix, modelMatrix) {
	gl.useProgram(this.program);

	gl.uniformMatrix4fv(this.projectionMatrixLocation, false, projectionMatrix.elements);
	gl.uniformMatrix4fv(this.viewMatrixLocation, false, viewMatrix.elements);
	gl.uniformMatrix4fv(this.modelMatrixLocation, false, modelMatrix.elements);
}

//Model object constructor; bind buffers with flattened and typed model data, record triangle array length
function Model(data){
	var positionArray = new Float32Array(flatten(data.positions));
	var normalArray = new Float32Array(flatten(data.normals));
	var triangleArray = new Uint16Array(flatten(data.triangles));
	var texCoordArray = new Float32Array(flatten(data.texCoords))

	this.positionBuffer = gl.createBuffer();
	this.normalBuffer = gl.createBuffer();
	this.triangleBuffer = gl.createBuffer();
	this.texCoordBuffer = gl.createBuffer();
	
	gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, positionArray, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, normalArray, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleArray, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
	  	gl.bufferData(gl.ARRAY_BUFFER, texCoordArray, gl.STATIC_DRAW);

	this.triangleArrayLength = triangleArray.length;
}

//Model draw; bind buffers and enable vertex attributes to draw triangle objects
//disable vertex attributes after drawing
Model.prototype.draw = function(shader) {

	if (shader.vertexPositionLocation != -1){
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);	
		gl.vertexAttribPointer(shader.vertexPositionLocation, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shader.vertexPositionLocation);
	}
	
	if (shader.vertexNormalLocation != -1){
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.vertexAttribPointer(shader.vertexNormalLocation, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shader.vertexNormalLocation);
	}

	if  (shader.vertexTexCoordLocation != -1){

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.vertexAttribPointer(shader.vertexTexCoordLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(shader.vertexTexCoordLocation);
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
	gl.drawElements(gl.TRIANGLES, this.triangleArrayLength, gl.UNSIGNED_SHORT, 0);

	if (shader.vertexPositionLocation != -1){
		gl.disableVertexAttribArray(shader.vertexPositionLocation);
	}

	if (shader.vertexNormalLocation != -1){
		gl.disableVertexAttribArray(shader.vertexNormalLocation);
	}

	if (shader.vertexTexCoordLocation != -1){
		gl.disableVertexAttribArray(shader.vertexTexCoordLocation);
	}
}

//Initialize texture object with image; configure filtering
function loadTexture(image, texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.generateMipmap(gl.TEXTURE_2D) 
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	requestAnimationFrame(draw);
}

//Initialize canvas as webgl context, models, shaders; set up texture mapping
function init() {
	var canvas = document.getElementById("webgl");
	gl = getWebGLContext(canvas, false);

	canvas.onmousedown = onmousedown;
	canvas.onmouseup = onmouseup;
	canvas.onmousemove = onmousemove;

	chestModel = new Model(chest);
	textureShader = new Shader('textureVertexShader', 'textureFragmentShader');
	gl.uniform4fv(textureShader.lightPositionLocation, lightPosition);
	diffuseShadowShader = new Shader('diffuseShadowVertexShader', 'diffuseShadowFragmentShader');
	gl.uniform4fv(diffuseShadowShader.lightPositionLocation, lightPosition);
	totalShadowShader = new Shader('totalShadowVertexShader', 'totalShadowFragmentShader');
	gl.uniform4fv(totalShadowShader.lightPositionLocation, lightPosition);

	gl.enable(gl.DEPTH_TEST);

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	var modelTexture = gl.createTexture();
	var modelImage = new Image();
	modelImage.onload = function() {
		loadTexture(modelImage, modelTexture);
	}
	modelImage.crossOrigin = "Anonymous";
	modelImage.src = "http://i.imgur.com/7thU1gD.jpg"


	requestAnimationFrame(draw);
}

//Mouse user interaction; drag in canvas to rotate view
function onmousedown(event){
	dragging = true;
	lastClientX = event.clientX;
	lastClientY = event.clientY;
}

function ontouchstart(event){
	dragging = true;
	lastClientX = event.clientX;
	lastClientY = event.clientY;
}

function onmouseup(event){
	dragging = false;
}

function ontouchend(event){
	dragging = false;
}

function onmousemove(event){
	if(dragging){

		dX = event.clientX - lastClientX;
		dY = event.clientY - lastClientY;
		modelRotationY = modelRotationY+dX;
		modelRotationX = modelRotationX+dY;
		if (modelRotationX>90.0){
			modelRotationX = 90.0;
		}
		if (modelRotationX<-90.0){
			modelRotationX=-90.0;
		}
		requestAnimationFrame(draw);
		lastClientX=event.clientX;
		lastClientY=event.clientY;
	}
}

function ontouchmove(event) {
	if(dragging){

		dX = event.clientX - lastClientX;
		dY = event.clientY - lastClientY;
		modelRotationY = modelRotationY+dX;
		modelRotationX = modelRotationX+dY;
		if (modelRotationX>90.0){
			modelRotationX = 90.0;
		}
		if (modelRotationX<-90.0){
			modelRotationX=-90.0;
		}
		requestAnimationFrame(draw);
		lastClientX=event.clientX;
		lastClientY=event.clientY;
	}
}
//Clear canvas, perform model-view-projection transformations, setup shaders, update lightPosition uniform,
//call model draw with selected shaders
function draw(){
	var projectionMatrix = new Matrix4();
	projectionMatrix.perspective(45, 1, 1, 10);
	var viewMatrix = new Matrix4();
	viewMatrix.translate(0, 0, -5);
	var modelMatrix;
	
	gl.clear(gl.normal_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);


	modelMatrix = new Matrix4();
	modelMatrix.translate(0, 1, 0);
	viewMatrix.rotate(modelRotationX, 1, 0, 0);
	viewMatrix.rotate(modelRotationY, 0, 1, 0);

	textureShader.setup(projectionMatrix, viewMatrix, modelMatrix);
	gl.uniform4fv(textureShader.lightPositionLocation, lightPosition);
	chestModel.draw(textureShader);

	if (activeEffect==1) {
		diffuseShadowShader.setup(projectionMatrix, viewMatrix, modelMatrix);
		gl.uniform4fv(diffuseShadowShader.lightPositionLocation, lightPosition);
		chestModel.draw(diffuseShadowShader);
	}

	else {
		totalShadowShader.setup(projectionMatrix, viewMatrix, modelMatrix);
		gl.uniform4fv(totalShadowShader.lightPositionLocation, lightPosition);
		chestModel.draw(totalShadowShader);
	}
}

//Convert matrix to flat array
function flatten(a) {
	return a.reduce(function (b, v) { b.push.apply(b, v); return b }, [])
}

//Radio button group interaction: set active shader; redraw
function radio0() {
	activeEffect = 0;
	requestAnimationFrame(draw);
}

function radio1() {
	activeEffect = 1;
	requestAnimationFrame(draw);
}

//Slider interactions: set light position coord equal to slider value, which is displayed; redraw
function sliderX() {
	x = parseFloat(document.getElementById("xInput").value);
	document.getElementById("xOutput").innerHTML = x;
	lightPosition[0] = x;
	requestAnimationFrame(draw);
}

function sliderY() {
	y = parseFloat(document.getElementById("yInput").value);
	document.getElementById("yOutput").innerHTML = y;
	lightPosition[1] = y;
	requestAnimationFrame(draw);
}

function sliderZ() {
	z = parseFloat(document.getElementById("zInput").value);
	document.getElementById("zOutput").innerHTML = z;
	lightPosition[2] = z;
	requestAnimationFrame(draw);
}
