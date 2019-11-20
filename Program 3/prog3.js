var c = document.getElementById("glcanvas"); //get Canvas element
var gl = c.getContext('webgl', {preserveDrawingBuffer: true});
var clicks = []; //array of arrays of mouse click coordinates
var colors = []; //array tracking colors of corresponding mouse clicks
var indices = []; // setup indices for the triangles
var selected = []; //array to track selected tree;
var translated = []; //array to store translation values;
var rotated = []; //array to store rotation values
var scale = [];
for (var i = 0; i < 72; i += 3) {
    indices.push(i, i+1, i+2);
}

window.addEventListener("contextmenu", function(e) {
    e.preventDefault();
  }, false);

var wire = 0; // boolean vars to track toggle buttons
var temp = false;
var proj = false;

var S = 1.0; //scale factor
var prev = -1; // track previous selected index

// Vertex shader program
var VSHADER_SOURCE =
  'uniform bool u_Clicked;\n' + // Mouse is pressed   
  'uniform vec4 u_idColor;\n' +  
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform mat4 u_RotateZMatrix;\n' +
  'uniform mat4 u_RotateXMatrix;\n' +
  'uniform mat4 u_ScaleMatrix;\n' +
  'uniform vec4 u_TranslateMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'uniform float glossiness;\n' + //glossiness
  'uniform mat4 u_ViewMatrix;\n' +
  'varying vec3 vertPos;\n' + 
  'attribute vec4 a_Color;\n' + 
  'attribute vec4 a_Normal;\n' +        // Normal
  'uniform vec3 u_LightColor;\n' +     // Light color
//   'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
  'uniform vec3 u_LightPosition;\n' + //pt light position 
  'uniform vec3 Ks;\n' +  // Specular constant
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  ' gl_Position = u_ProjMatrix * u_ViewMatrix * ((a_Position *  u_RotateZMatrix * u_RotateXMatrix * u_ScaleMatrix  +  u_TranslateMatrix));\n' +
    // Calculate world coordinate of vertex
    '  vec4 vertexPosition = u_ViewMatrix * u_ProjMatrix * a_Position;\n' +
      // Calculate the light direction and make it 1.0 in length
    '  vec3 lightDirection = normalize(u_LightPosition - vec3(vertexPosition));\n' +
    // Make the length of the normal 1.0
    ' vec3 normal = normalize(a_Normal.xyz);\n' +
    // Dot product of the light direction and the orientation of a surface (the normal)
    '  float nDotL = max(dot(normal, lightDirection), 0.0);\n' +
    
  // Calculate the specular
  '  vec4 vertPos4 = u_ViewMatrix * a_Position;\n ' +
  '  vertPos = vec3(vertPos4) / vertPos4.w;\n ' + 
    ' float specular = 0.0; \n' + 
    ' if(nDotL > 0.0) { \n' + 
    ' vec3 R = reflect(-lightDirection, normal);\n ' +     // Reflected light vector
    ' vec3 V = normalize(-vertPos); \n' + // Vector to viewer
    // Compute the specular term
    ' float specAngle = max(dot(R, V), 0.0); \n' +
    ' specular = pow(specAngle, glossiness); \n ' +
    '} \n' + 
    '  vec3 a_specular = u_LightColor * Ks * specular ;\n' +
    // Calculate the color due to diffuse reflection
    '  vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  //  Add the surface colors due to diffuse reflection and ambient reflection
    'if (u_Clicked) {\n' + 
     'v_Color = u_idColor;\n' + 
    '} else {\n' + 
    '  v_Color = vec4(diffuse + a_specular, 1.0);\n' + 
    '}}\n'; +

  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec4 v_Color;\n' + 
  'void main() {\n' +
  '  gl_FragColor = v_Color; \n' +
  '}\n';

//initialize webGL 
function main() {
    if (!gl){
        console.log("Failed to get context for WebGL");
    }
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return; 
    }
    //Get storage location of several variables;
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
    // Set the light color (white)
    gl.uniform3f(u_LightColor, 0.5, 0.5, 1.0);
    // Set the light direction (in the world coordinate)
    // var lightDirection = new Vector3([200,200,1000]);
    // lightDirection.normalize();     // Normalize
    // gl.uniform3fv(u_LightDirection, lightDirection.elements);

    var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    gl.uniform3f(u_LightPosition, Lx, Ly, Lz);
    // Set the matrix to be used for to set the camera view
    var viewMatrix = new Matrix4();
    viewMatrix.setLookAt(0,0,400,0,0,0,0,1,0);
    // Set the view matrix
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    var projMatrix = new Matrix4();
    projMatrix.setOrtho(-200.0, 200.0, -200.0, 200.0, -1000, 1000);
    // Pass the projection matrix to u_ProjMatrix
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
    var Ks = gl.getUniformLocation(gl.program, 'Ks');
    gl.uniform3f(Ks, 1.0, 1.0, 1.0);

    var clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
    gl.uniform1f(clicked, 0);
    draw();
};

//JQuery to listen to mousedown events
$(c).mousedown(function(event) { 
    switch (event.which) {
        case 1: //Left click for red tree
            var found = false;
            var x = event.clientX;
            var y = event.clientY;
            var rect = event.target.getBoundingClientRect();
            var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;
            // Read pixel at the clicked position
            var pixels = new Uint8Array(4); // Array for storing the pixel value
            var clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
            gl.uniform1f(clicked, 1); // pass true to clicked
            draw();
            gl.readPixels(x_in_canvas, y_in_canvas, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            var i = Math.round(pixels[0]/5);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.uniform1f(clicked, 0); //false to clicked;
            x = ((x - rect.left) - c.width/2)/(c.width/2);
            y = (c.height/2 - (y - rect.top))/(c.height/2);
            if (prev == -1){
                if(pixels[0] == 255 && pixels[1] == 255 && pixels[2] == 255){
                    clicks.push(x,y);
                    colors.push("red");
                    selected.push(0);
                    scale.push(1.0);
                    translated.push(0.0,0.0,0.0);
                    rotated.push(0,0);
                }
                else {
                    selected[i - 1] = 1;
                    prev = i - 1;
                    console.log("tree " + i + " selected");
                    break;
                }
            }
            else if (prev > -1){
                if (pixels[0] == 255 && pixels[1] == 255 && pixels[2] == 255){
                    selected[prev] = 0;
                    prev = -1;
                }
            }
            break;
            //middle mouse button : z translation
        case 2: 
            var found = false;
            for(var i = 0; i < selected.length; i++ ){
                if (selected[i] == 1){ 
                    found = true;
                }
            }
            if (found == true){
                console.log("q");
                mid = true;
            }
            break;
        case 3: //Right click for blue tree
            right = true;
            var found = false;
            for(var i = 0; i < selected.length; i++ ){
                if (selected[i] == 1){ 
                    found = true;
                }
            }
            if(found == false){ // add new blue tree
                var x = event.clientX
                var y = event.clientY
                var rect = event.target.getBoundingClientRect() ;
                x = ((x - rect.left) - c.width/2)/(c.width/2);
                y = (c.height/2 - (y - rect.top))/(c.height/2);
                clicks.push(x,y);
                colors.push("blue");
                selected.push(0);
                scale.push(1.0);
                translated.push(0.0,0.0,0.0);
                rotated.push(0,0);
                right = false;
            }
            break;
        default:
    }
    draw();
});

//listen for the translate distance 
var right = false;
var mid = false;
var firstx;
var firsty;
$(c).mousedown(function(event){
    firstx = event.clientX;
    firsty = event.clientY;
});
//listen to mouse ups, calculate distance
$(c).mouseup(function(event){
    var x,y;
    x = event.clientX - firstx;
    y = firsty - event.clientY;
    if(prev != -1){
        if (x == 0 && y  == 0){ // no translation
            isDown = false;
            right = false;
            mid = false;
            draw();
        }
        else {
            if (mid == true){
                translated[ prev * 3 + 2] += y / 2;
                console.log(translated);
                mid = false;
            }
            else if (right == true){
                //vertical is around X axis
                //horizontal is around Z axis
                rotated[prev * 2] += x / 5;
                rotated[prev * 2 + 1] +=  y / 5;
                right = false;
            }
            else {
                translated[ prev * 3] += x / 2;
                translated[ prev * 3 + 1] += y / 2;
            }
            draw();
        }
    }
}); 



//JQuery to listen to scroll events 
$(window).bind('mousewheel', function(event) {
    for (var i = 0; i < selected.length; i++){
        if(selected[i] == 1){
            if (event.originalEvent.wheelDelta >= 0) { //increase object
                if ( S  >=  2.0){
                    S = 2.0;
                }
                else{
                    S = S + 0.25;
                    scale[i] = S;
                    draw();
                }
            }
            else { //decrease the object
                if ( S  <=  0.5){
                    S = 0.5
                }
                else{
                    S = S - 0.25;
                    scale[i] = S;
                    draw();
                }
            }
        }
    }
});

//draws all the stuff
function draw() {
    drawSphere();//Draw light source, sphere with radius 5, initialized at x,y,z location)
    var r,g,b;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    //loop over colors array to print all trees
    for (var i = 0, j = 0; i < colors.length; i++, j+=2) {
        var r_id = (i+1)/51;
        var idColor = gl.getUniformLocation(gl.program, 'u_idColor'); 
        gl.uniform4f(idColor, r_id, 1.0, 0.0, 1.0);
        //Scaling factor
        var sc = scale[i];
        var scaleMatrix = new Float32Array([
            sc,   0.0,  0.0,  0.0,
            0.0,  sc,   0.0,  0.0,
            0.0,  0.0,  sc,  0.0,
            0.0,  0.0,  0.0,  1.0
        ]);
        var u_ScaleMatrix = gl.getUniformLocation(gl.program, 'u_ScaleMatrix');
        gl.uniformMatrix4fv(u_ScaleMatrix, false, scaleMatrix);

        //Rotations
          // Create a rotation matrix
        var angleZ = rotated[j];
        var angleX = rotated[j+1];
        var radianZ = Math.PI * angleZ / 180.0; // Convert to radians
        var radianX = Math.PI * angleX / 180.0;
        var cosA = Math.cos(radianX), sinA = Math.sin(radianX);
        var cosB = Math.cos(radianZ), sinB = Math.sin(radianZ);
        var rotateZMatrix = new Float32Array([ 
            cosB,  sinB,  0.0,  0.0,
            -sinB,  cosB,   0.0,  0.0,
            0.0,  0.0,  1.0,  0.0,
            0.0,  0.0,  0.0,  1.0
        ]);
        var u_RotateZMatrix = gl.getUniformLocation(gl.program, 'u_RotateZMatrix');
        gl.uniformMatrix4fv(u_RotateZMatrix, false, rotateZMatrix);

        var rotateXMatrix = new Float32Array([
            1.0,   0.0,  0.0,  0.0,
            0.0,  cosA,   sinA,  0.0,
            0.0,  -sinA,  cosA,  0.0,
            0.0,  0.0,  0.0,  1.0
        ]);
        var u_RotateXMatrix = gl.getUniformLocation(gl.program, 'u_RotateXMatrix');
        gl.uniformMatrix4fv(u_RotateXMatrix, false, rotateXMatrix);

        // Translation
        var u_Translation = gl.getUniformLocation(gl.program, 'u_TranslateMatrix');
        gl.uniform4f(u_Translation, clicks[j] * 200 + translated[i*3], clicks[j+1] * 200 + translated[(i*3)+1], translated[(i*3) + 2], 0.0);
        var newTree = [];
        if (colors[i] == "red") { // determine which tree to use treeR4
        //     for (var m = 0; m < treeR4.length; m+=3) {
        //         newTree.push(treeR4[m] + (200 * clicks[j]), treeR4[m+1] + (200 * clicks[j + 1]), treeR4[m+2]);
        //     }
            newTree = treeR4;
        }
        else { // else treeR6
        //     for (var m = 0; m < treeR6.length; m+=3) {
        //         newTree.push(treeR6[m] + (200 * clicks[j]), treeR6[m+1] + (200 * clicks[j + 1]), treeR6[m+2]);
        //     }
            newTree = treeR6;
        }
        for( var index = 0; index < newTree.length; index+=6){ // for each branch, draw cylinder 
            var t = cylinderVertices(newTree[index], newTree[index+1], newTree[index+2], newTree[index+3],newTree[index+4], newTree[index+5]);
            var n = initArrayBuffer(gl, 'a_Position', t, 3, gl.FLOAT); //init each cylinder position
            //Deal with colors
            var colorsArr = []; // Store colors for cylinder
            //deal with specular values
            var glossiness = gl.getUniformLocation(gl.program, 'glossiness');
            if( selected[i] == 1){
                gl.uniform1f(glossiness, 0.1);
            }
            else if ( colors[i] == "red"){
                gl.uniform1f(glossiness, 1.0);
            }
            else if( colors[i] == "blue"){
                gl.uniform1f(glossiness, 5.0);
            }

            for(var k = 0; k < t.length; k+=3) { //loop through each vertex to assign color
                if (colors[i] == "red" && selected[i] == 0) {
                    r = 1.0;
                    g = 0.0;
                    b = 0.0;
                }
                if (colors[i] == "blue" && selected[i] == 0) {
                    r = 0.0;
                    g = 0.0;
                    b = 1.0;
                }
                if ( selected[i] == 1) { //the green ones
                    r = 0.0;
                    g = 1.0;
                    b = 0.0;
                }
                colorsArr.push(r,g,b);
            }
            if (initArrayBuffer(gl, 'a_Color', colorsArr, 3, gl.FLOAT) < 0) return -1; 

            var normals = [];
            var norms = getNormals(t); //get normals
            //render mode options
            if( wire == 0 ){ //Default
                var indexBuffer = gl.createBuffer();//write indices
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);
                for (var k = 0; k < tempArr.length; k+=3 ){ //use same normal for each triangle's vertices
                    normals.push(tempArr[k]);
                    normals.push(tempArr[k + 1]);
                    normals.push(tempArr[k + 2]);
                    normals.push(tempArr[k]);
                    normals.push(tempArr[k + 1]);
                    normals.push(tempArr[k + 2]);
                    normals.push(tempArr[k]);
                    normals.push(tempArr[k + 1]);
                    normals.push(tempArr[k + 2]); 
                }
                tempArr = [];
                if (initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT) < 0) return -1;
                gl.drawElements(gl.TRIANGLE_STRIP, n, gl.UNSIGNED_BYTE, 0);
            }
            if( wire == 1 ){ //wireframe
                for (var k = 0; k < tempArr.length; k+=3 ){
                    normals.push(tempArr[k]); //same normals
                    normals.push(tempArr[k + 1]);
                    normals.push(tempArr[k + 2]);
                    normals.push(tempArr[k]);
                    normals.push(tempArr[k + 1]);
                    normals.push(tempArr[k + 2]);
                    normals.push(tempArr[k]);
                    normals.push(tempArr[k + 1]);
                    normals.push(tempArr[k + 2]); 
                }
                tempArr = [];
                if (initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT) < 0) return -1;
                gl.drawArrays(gl.LINE_STRIP, 0, n);
            }
           if (wire == 2) { // Smooth
                var indexBuffer = gl.createBuffer(); //write indices
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);
                normals = vertexNormals(tempArr); //use different normals for each triangle's vertices
                tempArr = [];
                if (initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT) < 0) return -1;
                gl.drawElements(gl.TRIANGLE_STRIP, n, gl.UNSIGNED_BYTE, 0);
            }
            //Displaying Normal Vectors option
            if (temp == true) {
                colorsArr = [];
                var n2 = initArrayBuffer(gl,'a_Position', norms, 3, gl.FLOAT);
                for (var k = 0; k < n2; k++) {
                    colorsArr.push(0.0,1.0,0.0);
                }
                if (initArrayBuffer(gl, 'a_Color', colorsArr, 3, gl.FLOAT) < 0) return -1;
                gl.drawArrays(gl.LINES, 0, n2);
            }
        }
        
    }

}
//handles the toggle camera button
function toggleCamera(){
    let mode = document.getElementById("mode").innerHTML;
    if (mode == "Eye Point: (0, 0, 1)"){
       document.getElementById("mode").innerHTML = "Eye Point: (0, -1, 0.75)";
        // Get the storage location of u_ViewMatrix
        var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
        // Set the matrix to be used for to set the camera view
        var viewMatrix = new Matrix4();
        viewMatrix.setLookAt(0, -400, 250, 0, 0, 0, 0, 1, 0);
        // Set the view matrix
        gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    }
    else {
       document.getElementById("mode").innerHTML = "Eye Point: (0, 0, 1)";
       // Get the storage location of u_ViewMatrix
       var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
       // Set the matrix to be used for to set the camera view
       var viewMatrix = new Matrix4();
       viewMatrix.setLookAt(0, 0, 400, 0, 0, 0, 0, 1, 0);
       // Set the view matrix
       gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    }
    draw();
};

//Handles toggle normal button
function toggleNormal() {
    let x = document.getElementById("onoff");

    if (temp == false) {
        temp = true;
        draw();
        x.innerHTML = "Normal Vectors On";
    }
    else {

        temp = false;
        draw();
        x.innerHTML  = "Normal Vectors Off";
    }
}

//handles toggle render button
function toggleMode() {
    let x = document.getElementById("render");
    if ( wire == 0 ){
        wire = 1;
        x.innerHTML = "Wireframe"
        draw();
    }
    else if ( wire == 1){
        wire = 2;
        x.innerHTML = "Smooth"
        draw();
    }
    else if (wire == 2){
        wire = 0;
        x.innerHTML = "Flat"
        draw();
    }
}

//handles toggle render button
function toggleProjection() {
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    let x = document.getElementById("proj");
    if ( proj == false ){
        proj = true;
        x.innerHTML = "Perspective"
        var projMatrix = new Matrix4();
        projMatrix.setPerspective(60, c.width/c.height, 200, 4000)
        gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
        draw();
    }
    else {
        proj = false;
        x.innerHTML = "Orthographic"
        var projMatrix = new Matrix4();
        projMatrix.setOrtho(-200.0, 200.0, -200.0, 200.0, -1000.0, 1000.0);
        gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
        draw();
    }
}

//Initialize array buffer
function initArrayBuffer (gl, attribute, data, num, type) {
    var vertices = new Float32Array(data);
    var n = data.length / 3;
    // Create a buffer object
    var buffer = gl.createBuffer();
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
      console.log('Failed to get the storage location of ' + attribute);
      return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);
  
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
    return n;
  }

  //handles the delete previous tree button
  function deletePrevTree(){
      colors.pop();
      clicks.pop();
      clicks.pop();
      scale.pop();
      translated.pop();
      translated.pop();
      translated.pop();
      rotated.pop();
      rotated.pop();
      draw();
  }

  //Draws cylinder for each branch, with values starting and ending at the line start/end points.
  function cylinderVertices(x,y,z,x1,y1,z1) {
    var line = [x1 - x, y1 - y, z1-z];
    var length = Math.sqrt(Math.pow(line[0], 2) + Math.pow(line[1], 2) + Math.pow(line[2], 2));
    var scale = length/10; // scale by length and some factor for aesthetics
    var x2, y2,z2,x3,y3,z3;
    var coords = [];
    for(var k =0, i = 0; i < 12; i++, k +=2){ // 72 verticies for the 24 triangles, generates 2 triangles each loop
        x2 = x1 + (scale/2)*.5 * Math.cos((i/12) * 2 * Math.PI);
        y2 = y1 + (scale/2)*.5 * Math.sin((i/12) * 2 * Math.PI);
        z2 = z1 + (scale/10)* 10;
        coords.push(x2,y2,z2); //pushes the first point of smaller upper circle CCW

        x3 = x + (scale)*1 * Math.cos((i/12) * 2 * Math.PI);
        y3 = y + (scale)*1 * Math.sin((i/12) * 2 * Math.PI);
        z3 = z + 0;
        coords.push(x3,y3,z3); //pushes the corresponding angle bottom circle CCW

        x4 = x + (scale)*1 * Math.cos(((i + 1)/12) * 2 * Math.PI); //next point
        y4 = y + (scale)*1 * Math.sin(((i + 1)/12) * 2 * Math.PI);
        z4 = z + 0;
        coords.push(x4,y4,z4);

        x5 = x1 + (scale/2)*.5 * Math.cos(((i + 1)/12) * 2 * Math.PI); //next point
        y5 = y1+ (scale/2)*.5 * Math.sin(((i + 1)/12) * 2 * Math.PI); //next point
        z5 = z1 + (scale/10)*10;

        coords.push(x5,y5,z5);
        coords.push(x2,y2,z2); //CCW 
        coords.push(x4,y4,z4);
    }
    if (wire == 1) { // last coord for wireframe,
        coords.push(x1 + (scale/2)*.5, y1, z1 + (scale/10)*10);
    }

    return coords;
}

//get normals for each vertex, summing the norms for the same point
//norms holds tempArr which is 24 x,y,z norm coordinates
function vertexNormals(norms){
    var newnorms = [];
    var prev = [norms[norms.length - 3], norms[norms.length - 2], norms[norms.length - 1], norms[norms.length - 6], norms[norms.length - 5], norms[norms.length - 4]];
    for (var i = 0; i < norms.length; i+=6) {
        if ( i == 66){
            newnorms.push(norms[i] + norms[i+3] + prev[0], norms[i+1] + norms[i+4] + prev[1], norms[i+2] + norms[i+5] + prev[2]);
            newnorms.push(norms[i] + prev[0] + prev[3], norms[i+1] + prev[1] + prev[4], norms[i+2] + prev[2] + prev[5])
            newnorms.push(norms[i] + norms[i+3] + norms[0], norms[i+1] + norms[i+4] + norms[1], norms[i+2] + norms[i+5] + norms[2]);
            newnorms.push(norms[i] + norms[i+3] + norms[0], norms[i+1] + norms[i+4] + norms[1], norms[i+2] + norms[i+5] + norms[2]);
            newnorms.push(norms[i] + norms[i+3] + prev[0], norms[i+1] + norms[i+4] + prev[1], norms[i+2] + norms[i+5] + prev[2]);
            newnorms.push(norms[i] + norms[i+3] + norms[0], norms[i+1] + norms[i+4] + norms[1], norms[i+2] + norms[i+5] + norms[2]);
        }
        else {
            newnorms.push(norms[i] + norms[i+3] + prev[0], norms[i+1] + norms[i+4] + prev[1], norms[i+2] + norms[i+5] + prev[2]);
            newnorms.push(norms[i] + prev[0] + prev[3], norms[i+1] + prev[1] + prev[4], norms[i+2] + prev[2] + prev[5])
            newnorms.push(norms[i] + norms[i+3] + norms[i+6], norms[i+1] + norms[i+4] + norms[i+7], norms[i+2] + norms[i+5] + norms[i+8]);
            newnorms.push(norms[i] + norms[i+3] + norms[i+6], norms[i+1] + norms[i+4] + norms[i+7], norms[i+2] + norms[i+5] + norms[i+8]);
            newnorms.push(norms[i] + norms[i+3] + prev[0], norms[i+1] + norms[i+4] + prev[1], norms[i+2] + norms[i+5] + prev[2]);
            newnorms.push(norms[i] + norms[i+3] + norms[i+6], norms[i+1] + norms[i+4] + norms[i+7], norms[i+2] + norms[i+5] + norms[i+8]);
        }
        prev = [norms[i], norms[i + 1], norms[i + 2], norms[i + 3], norms[i + 4], norms[i + 5]];
    }
    return newnorms;
}
var tempArr = [];
//get normals from the triangles vector, also push different normal values for different render modes
function getNormals(coords) {
    var norms = [];
    for (var i = 0; i < coords.length; i+= 9) {
        var x = coords[i];
        var y = coords[i+1];
        var z = coords[i+2];
        var x2 = coords[i+3];
        var y2 = coords[i+4];
        var z2 = coords[i+5];
        var x3 = coords[i+6];
        var y3 = coords[i+7];
        var z3 = coords[i+8];
        var len1 = [x3 - x2, y3 - y2, z3 - z2]; // vector 1
        var len2 = [x - x2, y - y2, z - z2]; // vector 2 
        var cross1 = (len1[1] * len2[2]) - (len1[2] * len2[1]); // x of cross product
        var cross2 = -((len1[0] * len2[2]) - (len1[2] * len2[0])); // y of cross product
        var cross3 = (len1[0] * len2[1]) - (len1[1] * len2[0]);// z of cross product
        var sqrtsqrs = Math.sqrt((cross1 * cross1) + (cross2 * cross2) + (cross3 * cross3)); // normalizing constant
        norms.push(x2,y2,z2);
        tempArr.push(cross1/sqrtsqrs,cross2/sqrtsqrs,cross3/sqrtsqrs); //normal + offset
        norms.push(x2 + cross1/sqrtsqrs, y2 + cross2/sqrtsqrs, z2 + cross3/sqrtsqrs);//unit normal + offset for display purposes
    }
    return norms;
}

//takes care of the load file button
function fileReader(input){
    var reader = new FileReader();
    reader.readAsText(input.files[0]);
    reader.onload = function(e){
      var s = e.target.result;
      var temp = "";
      var count = 0;
      for (var i = 0; i < s.length; i++) {
        if (s.charAt(i) == ","){
            if( count == 0 || count == 1){
                clicks.push(parseFloat(temp));
                temp = "";
                count++;
            }
            else if ( count == 2){
                scale.push(parseFloat(temp));
                selected.push(0);
                temp = "";
                count++;
            }
            else if ( count == 3 || count == 4){
                rotated.push(parseFloat(temp));
                temp = "";
                count++;
            }
            else if ( count == 5 || count == 6 || count == 7){
                translated.push(parseFloat(temp));
                temp = "";
                if (count == 7) {
                    count = 0;
                }
                else{
                    count++;
                }
            }
        }
        else if (s.charAt(i) == "r") {
        colors.push("red")
        }
        else if (s.charAt(i) == "b") {
        colors.push("blue")
        }
        else if (s.charAt(i) == "n") {
            temp = true;
        }
        else if (s.charAt(i) == "w") {
            toggleMode();
        }
        else if (s.charAt(i) == "s") {
            toggleMode();
            toggleMode();
        }
        else if (s.charAt(i) == "p") {
            toggleProjection();
        }
        else if (s.charAt(i) == "c") {
            toggleCamera();
        }
        else {
            temp += s.charAt(i);
        }
      }
    };
}
$(function(){
    $('#file').change(function(){
        fileReader(this);
        setTimeout(function(){ draw(); }, 1000);
    });
});

//Write to text file the current click points and options
function save() {
    var str = "";
    for (var i = 0, j = 0, k = 0 ; i < colors.length; i++, j += 2, k+=3) {
        if (colors[i] == "red") {
            str += "r";
        }
        else if (colors[i] == "blue") {
            str += "b";
        }
        str += clicks[j] + "," + clicks[j+1] + ","  + scale[i] + "," + rotated[j] + "," + rotated[j + 1] + 
        "," + translated[k]  + "," + translated[k+1] + "," + translated[k+2] + ",";
    }
    if (wire == 1){
        str += "w"
    }
    if (wire == 2){
        str += "s"
    }
    if (temp == true){
        str += "n"
    }
    if (proj == true){
        str += "p"
    }
    if (document.getElementById("mode").innerHTML != "Eye Point: (0, 0, 1)"){
        str+="c"
    }
    var htmlContent = [str];
    var bl = new Blob(htmlContent, {type: "text/html"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(bl);
    a.download = "trees.txt";
    a.hidden = true;
    document.body.appendChild(a); //save to text file
    a.innerHTML = "nobody will see this";
    a.click();
}

var Lx = 0, Ly = -100, Lz = 100;

function drawSphere() { // Create a sphere

    var SPHERE_DIV = 13;
  
    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;
  
    var positions = [];
    var indices2 = [];
  
    // Generate coordinates
    for (j = 0; j <= SPHERE_DIV; j++) {
      aj = j * Math.PI / SPHERE_DIV;
      sj = Math.sin(aj);
      cj = Math.cos(aj);
      for (i = 0; i <= SPHERE_DIV; i++) {
        ai = i * 2 * Math.PI / SPHERE_DIV;
        si = Math.sin(ai);
        ci = Math.cos(ai);
  
        positions.push(5 * si * sj);  // X
        positions.push(-100 + 5 * cj);       // Y
        positions.push(100 + 5 * ci * sj);  // Z
      }
    }
  
    // Generate indices
    for (j = 0; j < SPHERE_DIV; j++) {
      for (i = 0; i < SPHERE_DIV; i++) {
        p1 = j * (SPHERE_DIV+1) + i;
        p2 = p1 + (SPHERE_DIV+1);
  
        indices2.push(p1);
        indices2.push(p2);
        indices2.push(p1 + 1);
  
        indices2.push(p1 + 1);
        indices2.push(p2);
        indices2.push(p2 + 1);
      }
    }
    
  
    // Write the vertex property to buffers (coordinates and normals)
    // Same data can be used for vertex and normal
    // In order to make it intelligible, another buffer is prepared separately
    if (!initArrayBuffer(gl, 'a_Position', positions, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', positions, 3, gl.FLOAT))  return -1;

    var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    gl.uniform3f(u_LightPosition, Lx, Ly, Lz);

    var circColors = [];
    for (var i = 0; i < positions.length; i+=3){
        circColors.push(1.0,1.0,0.0); //yellow
    }
    if (!initArrayBuffer(gl, 'a_Color', circColors, 3, gl.FLOAT))  return -1;
    
    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
    // Write the indices to the buffer object
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices2), gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, indices2.length, gl.UNSIGNED_SHORT, 0);
  }
  