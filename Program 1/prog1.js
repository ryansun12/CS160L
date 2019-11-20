var c = document.getElementById("glcanvas"); //get Canvas element
var gl = c.getContext('webgl');
var clicks = []; //array of arrays of mouse click coordinates
var colors = []; //array tracking colors of corresponding mouse clicks

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_ViewMatrix * a_Position;\n' +
//   '  gl_PointSize = 10.0;\n' + 
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +  
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
// '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
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
    // Get the storage location of a_Position
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }
    // Set the color for clearing <canvas> 
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // Get the storage location of u_ViewMatrix
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!u_ViewMatrix) { 
        console.log('Failed to get the storage locations of u_ViewMatrix');
        return;
    }
    // Set the matrix to be used for to set the camera view
    var viewMatrix = new Matrix4();
    viewMatrix.setLookAt(0, 0, 1, 0, 0, 0, 0, 1, 0);
    // Set the view matrix
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

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
        gl.clear(gl.COLOR_BUFFER_BIT);
        draw();
    });
};
function draw() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // Get the storage location of u_FragColor
    var u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
    //loop over colors array to print all trees
    for (var i = 0; i < colors.length; i++) {
        var r,g,b,t;
        if (colors[i] == "red") {
            r = 1.0;
            b = 0.0;
            g = 0.0;
            t = treeVertices([clicks[i * 2],clicks[i * 2 + 1], 0.0], "red", null, null, 1, 4, 0, Math.PI/4);
        }
        else
        {
            r = 0.0;
            g = 0.0;
            b = 1.0;
            t = treeVertices([clicks[i * 2],clicks[i * 2 + 1], 0.0], "blue", null, null, 1, 6, 0, Math.PI/4);
        }
        gl.uniform4f(u_FragColor,r,g,b,1.0);  
        var n = initVertexBuffers(gl, t);
        gl.drawArrays(gl.LINES, 0, n); // print tree
    }
}
//Recursively creates array of verticies of a tree given the root
function treeVertices( root, color, coords, newcoords, level, target, alpha, beta){
    if (level > target) { //base case, return coordinates for tree in an array
        return;
    }
    if (coords == null){ // initialize coords and angles    
        coords = [];
    }
    var length;
    if (color == "red") { //left length 50 scaled down every level by level * 200
        length = 50 / (level * 200) ;
        // length  = 0.2;
    }
    else { //right length 40
        length = 40 / (level * 200);
        // length = 0.2;
    } 
    var newroots = []; //store new roots to create trees on
    var x, y, z, x2, y2, z2, x3, y3, z3, x4, y4, z4;
    for (var i = 0; i < root.length; i+= 3){ //loop through each new root
        var newcoords = []; // track new vertices
        newcoords.push(root[i], root[i+1], root[i+2]); // push the root
        x = root[i] + length * Math.sin(0) * Math.cos(0);;
        y = root[i + 1] + length * Math.sin(0) * Math.sin(0);
        z = root[i + 2] + length * Math.cos(0);;
        newcoords.push(x,y,z); // first point after root 
        newcoords.push(x,y,z); // push twice for gl.LINES syntax
        x2 = x + length * Math.sin(beta) * Math.cos(alpha);
        y2 = y + length * Math.sin(beta) * Math.sin(alpha);
        z2 = z + length * Math.cos(beta); 
        newcoords.push(x2,y2,z2); // second point after root
        newroots.push(x2,y2,z2); // save endpoint
        newcoords.push(x,y,z);
        x3 = x + length * Math.sin(beta) * Math.cos(2 * Math.PI / 3 + alpha);
        y3 = y + length * Math.sin(beta) * Math.sin(2 * Math.PI / 3 + alpha);
        z3 = z + length * Math.cos(beta);  
        newcoords.push(x3,y3,z3);
        newroots.push(x3,y3,z3); // save endpoint
        newcoords.push(x,y,z);
        x4 = x + length * Math.sin(beta) * Math.cos(4 * Math.PI / 3 + alpha);
        y4 = y + length * Math.sin(beta) * Math.sin(4 * Math.PI / 3 + alpha);
        z4 = z + length * Math.cos(beta);
        newcoords.push(x4,y4,z4);
        newroots.push(x4,y4,z4); // save endpoint
        coords.push(...newcoords); // append new points to coordinates
    }
    //recursively call and add points to coords until level > target
    treeVertices(newroots, color, coords, newcoords, level + 1, target, alpha + (2 * Math.PI/3), beta + Math.PI/2);
    return coords;
}
//handles the toggle camera button
function changeCamera(){
    let mode = document.getElementById("mode").innerHTML;
    if (mode == "Eye Point: (0, 0, ∞)"){
       document.getElementById("mode").innerHTML = "Eye Point: (0, -∞, 75)";
        // Get the storage location of u_ViewMatrix
        var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
        if (!u_ViewMatrix) { 
                console.log('Failed to get the storage locations of u_ViewMatrix');
                return;
            }
        // Set the matrix to be used for to set the camera view
        var viewMatrix = new Matrix4();
        viewMatrix.setLookAt(0, -1, 0.75, 0, 0, 0, 0, 1, 0);
        // Set the view matrix
        gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    }
    else {
       document.getElementById("mode").innerHTML = "Eye Point: (0, 0, ∞)";
       // Get the storage location of u_ViewMatrix
       var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
       if (!u_ViewMatrix) { 
               console.log('Failed to get the storage locations of u_ViewMatrix');
               return;
           }
       // Set the matrix to be used for to set the camera view
       var viewMatrix = new Matrix4();
       viewMatrix.setLookAt(0, 0, 1, 0, 0, 0, 0, 1, 0);
       // Set the view matrix
       gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    }
    draw();
    console.log("Camera Changed");
};

//Initialize vertex buffer
function initVertexBuffers(gl, tree) {
    var vertices = new Float32Array(tree);
    var n = vertices.length / 3;
    // console.log("Vertices "  + vertices);
    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
    }
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return -1;
    }
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);
    return n;
  }