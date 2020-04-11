var c = document.getElementById("glcanvas"); //get Canvas element
var gl = c.getContext('webgl');
var clicks = []; //array of arrays of mouse click coordinates
var colors = []; //array tracking colors of corresponding mouse clicks
var indices = []; // setup indices for the triangles
for (var i = 0; i < 72; i += 6) {
    indices.push(i, i+1, i+2, i+3, i+4, i+5);
}
var wire = false; // boolean vars to track toggle buttons
var temp = false;

//JQuery to listen to mousedown events
$(c).mousedown(function(event) { 
    switch (event.which) {
        case 1: //Left click for red tree
            console.log('Left Mouse Click');
            var x = event.clientX
            var y = event.clientY
            var rect = event.target.getBoundingClientRect() ;
            x = ((x - rect.left) - c.width/2)/(c.width/2);
            y = (c.height/2 - (y - rect.top))/(c.height/2);
            clicks.push(x,y);
            colors.push("red");
            break;
        case 3: //Right click for blue tree
            console.log('Right Mouse Click');
            var x = event.clientX
            var y = event.clientY
            var rect = event.target.getBoundingClientRect() ;
            x = ((x - rect.left) - c.width/2)/(c.width/2);
            y = (c.height/2 - (y - rect.top))/(c.height/2);
            clicks.push(x,y);
            colors.push("blue");
            break;
        default:
            console.log('Something else happened'); 
    }
    console.log('Mouse Coordinates: ' + clicks);
    draw();
});

// Vertex shader program
var VSHADER_SOURCE =
  'uniform mat4 u_ProjMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'attribute vec4 a_Color;\n' + 
  'attribute vec4 a_Normal;\n' +        // Normal
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position;\n' +
  // Make the length of the normal 1.0
  '  vec3 normal = normalize(a_Normal.xyz);\n' +
  // Dot product of the light direction and the orientation of a surface (the normal)
  '  float nDotL = max(dot(u_LightDirection, normal), 0.0);\n' +
  // Calculate the color due to diffuse reflection
  '  vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  '  v_Color = vec4(diffuse, a_Color.a);\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' + 
  'varying vec4 v_Color;\n' + 
  'void main() {\n' +
  '  gl_FragColor = v_Color + u_FragColor;\n' +
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
    if (!u_ViewMatrix) { 
        console.log('Failed to get the storage locations of u_ViewMatrix');
        return;
    }
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    if (!u_ProjMatrix) { 
        console.log('Failed to get the storage locations of u_ProjMatrix');
        return;
    }
    var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
    if (!u_LightColor || !u_LightDirection) { 
        console.log('Failed to get the storage location of Light variables');
        return;
      }

    // Set the light color (white)
    gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
    // Set the light direction (in the world coordinate)
    var lightDirection = new Vector3([1.0, 1.0, 1.0 ]);
    lightDirection.normalize();     // Normalize
    gl.uniform3fv(u_LightDirection, lightDirection.elements);
    // Set the matrix to be used for to set the camera view
    var viewMatrix = new Matrix4();
    viewMatrix.setLookAt(0, 0, 10, 0, 0, 0, 0, 5, 0);
    // Set the view matrix
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    var projMatrix = new Matrix4();
    projMatrix.setOrtho(-5.0, 5.0, -5.0, 5.0, 10.0, -10.0);
    // Pass the projection matrix to u_ProjMatrix
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

    //render a centered cylinder on program start
    clicks.push(0.0,0.0);
    colors.push("red");
    draw();
};

var tempArr = [];
//get normals from the triangles vector
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
        tempArr.push(cross1,cross2,cross3); //normal + offset
        norms.push(x2 + cross1/sqrtsqrs, y2 + cross2/sqrtsqrs, z2 + cross3/sqrtsqrs);//unit normal + offset
        
    }
    return norms;
}
function cylinderVertices(x,y,z,x1,y1,z1) {
    var x2, y2, z2, x3,y3,z3;
    var coords = [];
    for(var k =0, i = 0; i < 12; i++, k +=2){ // 72 verticies for the 24 triangles, generates 2 triangles each loop
        x2 = (x1 * 5) + .5 * Math.cos((i/12) * 2 * Math.PI);
        y2 = (y1 * 5) + .5 * Math.sin((i/12) * 2 * Math.PI);
        z2 = z1 + 10;
        coords.push(x2,y2,z2); //pushes the first point of smaller upper circle CCW

        x3 = (x * 5) + 1 * Math.cos((i/12) * 2 * Math.PI);
        y3 = (y * 5) + 1 * Math.sin((i/12) * 2 * Math.PI);
        z3 = z + 0;
        coords.push(x3,y3,z3); //pushes the corresponding angle bottom circle CCW

        x4 = (x * 5) + 1 * Math.cos(((i + 1)/12) * 2 * Math.PI); //next point
        y4 = (y * 5) + 1 * Math.sin(((i + 1)/12) * 2 * Math.PI);
        z4 = z + 0;
        coords.push(x4,y4,z4);

        x5 = (x1 * 5) + .5 * Math.cos(((i + 1)/12) * 2 * Math.PI); //next point
        y5 = (y1 * 5) + .5 * Math.sin(((i + 1)/12) * 2 * Math.PI); //next point
        z5 = z1 + 10;

        coords.push(x5,y5,z5);
        coords.push(x2,y2,z2); //CCW 
        coords.push(x4,y4,z4);
    }
    if (wire == true) { // last coord for wireframe,
        coords.push((x * 5) + .5, (y * 5), 10);
    }
    return coords;
}
//draws all the stuff
function draw() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // Get the storage location of u_FragColor
    var u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
    //Draw a 0,0 cylinder on startup
    gl.clear(gl.COLOR_BUFFER_BIT);

    //loop over colors array to print all trees
    for (var i = 0, j = 0; i < colors.length; i++, j+=2) {
        var r,g,b;
        var t = cylinderVertices(0,0,0,0,0,0.5);
        var colorsArr = [];
  
        for(var k = 0; k < t.length; k+=3) {
            if (colors[i] == "red") {
                r = 1.0;
                b = 0.0;
                g = 0.0;
            }
            else {
                r = 0.0;
                b = 1.0;
                g = 0.0;
            }
            colorsArr.push(r,g,b);
        }
        // Write the vertex property to buffers (coordinates, colors and normals)
        if (initArrayBuffer(gl, 'a_Color', colorsArr, 3, gl.FLOAT) < 0) return -1;
        var n = initArrayBuffer(gl, 'a_Position', t, 3, gl.FLOAT);
        var norms = getNormals(t); 
        var normals = [];
        for (var k = 0; k < tempArr.length; k+=3 ){
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

        if (initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT) < 0) return -1;
        // Write the indices to the buffer object
        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

        //Draw Cylinder
        if( wire == false ){
            gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
        }
        else {
            gl.drawArrays(gl.LINE_STRIP, 0, n);
        }

        //Draw Normal Vectors 
        if (temp == true) {
            colorsArr = [];
            var n2 = initArrayBuffer(gl,'a_Position', norms, 3, gl.FLOAT);
            for (var k = 0; k < n2; k++) {
                colorsArr.push(0.0,1.0,0.0);
            }
            if (initArrayBuffer(gl, 'a_Color', colorsArr, 3, gl.FLOAT) < 0) return -1;
            // gl.uniform4f(u_FragColor,0.0,1.0,0.0,1.0);  
            gl.drawArrays(gl.LINES, 0, n2);
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
        viewMatrix.setLookAt(0, -3, 7.5, 0, 0, 0, 0, 5, 0);
        // Set the view matrix
        gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    }
    else {
       document.getElementById("mode").innerHTML = "Eye Point: (0, 0, 1)";
       // Get the storage location of u_ViewMatrix
       var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
       // Set the matrix to be used for to set the camera view
       var viewMatrix = new Matrix4();
       viewMatrix.setLookAt(0, 0, 10, 0, 0, 0, 0, 1, 0);
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
    if ( wire == false ){
        wire = true;
        x.innerHTML = "Wireframe"
        draw();
    }
    else {
        wire = false;
        x.innerHTML = "Flat"
        draw();
    }
}

//Initialize array buffer
function initArrayBuffer (gl, attribute, data, num, type) {
    var vertices = new Float32Array(data);
    var n = data.length / 3;
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
      console.log('Failed to create the buffer object');
      return false;
    }
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