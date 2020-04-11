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
var proj = false;

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
    console.log("Mouse clicks: " + clicks);
    draw();
});

//takes care of the load file button
function fileReader(input){
    var reader = new FileReader();
    reader.readAsText(input.files[0]);
    reader.onload = function(e){
      var s = e.target.result;
      var temp = "";
      for (var i = 0; i < s.length; i++) {
        if (s.charAt(i) == ","){
        clicks.push(parseFloat(temp));
        temp = "";
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
            wire = true;
        }
        else if (s.charAt(i) == "p") {
            proj = true;
        }
        else if (s.charAt(i) == "c") {
            toggleCamera();
        }
        else {
            temp += s.charAt(i);
        }
      }
      draw();
    };
}
$(function(){
    $('#file').change(function(){
        fileReader(this);
    });
});

// Vertex shader program
var VSHADER_SOURCE =
//   'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'attribute vec4 a_Color;\n' + 
  'attribute vec4 a_Normal;\n' +        // Normal
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
//   '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
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
    viewMatrix.setLookAt(0, 0, 200, 0, 0, 0, 0, 1, 0);
    // Set the view matrix
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    var projMatrix = new Matrix4();
    projMatrix.setOrtho(-200.0, 200.0, -200.0, 200.0, -1000.0, 1000.0);
    // Pass the projection matrix to u_ProjMatrix
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements); 
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
//draws all the stuff
function draw() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // Get the storage location of u_FragColor
    var u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    //loop over colors array to print all trees
    for (var i = 0, j = 0; i < colors.length; i++, j+=2) {
        var r,g,b;
        var newTree = [];
        if (colors[i] == "red") { // determine which tree to use
            for (var m = 0; m < treeR4.length; m+=3) {
                newTree.push(treeR4[m] + (200 * clicks[j]), treeR4[m+1] + (200 * clicks[j + 1]), treeR4[m+2]);
            }
        }
        else {
            for (var m = 0; m < treeR6.length; m+=3) {
                newTree.push(treeR6[m] + (200 * clicks[j]), treeR6[m+1] + (200 * clicks[j + 1]), treeR6[m+2]);
            }
        }
        for( var index = 0; index < newTree.length; index+=6){ // for each branch, draw cylinder 
            var t = cylinderVertices(newTree[index], newTree[index+1], newTree[index+2], newTree[index+3],newTree[index+4], newTree[index+5]);
            var norms = getNormals(t); //get normals
            var normals = [];
            var colorsArr = [];
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
            tempArr = [];
            var n = initArrayBuffer(gl, 'a_Position', t, 3, gl.FLOAT);
            if (initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT) < 0) return -1;
            // Write the indices to the buffer object
            var indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);
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
            if( wire == false ){
                gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
                // gl.drawArrays(gl.LINES,0,n);
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
        viewMatrix.setLookAt(0, -200, 150, 0, 0, 0, 0, 1, 0);
        // Set the view matrix
        gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    }
    else {
       document.getElementById("mode").innerHTML = "Eye Point: (0, 0, 1)";
       // Get the storage location of u_ViewMatrix
       var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
       // Set the matrix to be used for to set the camera view
       var viewMatrix = new Matrix4();
       viewMatrix.setLookAt(0, 0, 200, 0, 0, 0, 0, 1, 0);
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

//handles toggle render button
function toggleProjection() {
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    if (!u_ProjMatrix) { 
        console.log('Failed to get the storage locations of u_ProjMatrix');
        return;
    }
    let x = document.getElementById("proj");
    if ( proj == false ){
        proj = true;
        x.innerHTML = "Orthographic"
        var projMatrix = new Matrix4();
        projMatrix.setPerspective(90, c.width/c.height, 1000, 1)
        gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
        draw();
    }
    else {
        proj = false;
        x.innerHTML = "Perspective"
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

  function save() {
    var str = "";
    for (var i = 0, j = 0; i < colors.length; i++, j += 2) {
        if (colors[i] == "red") {
            str += "r";
        }
        else {
            str += "b";
        }
        str += clicks[j] + "," + clicks[j+1] + ","
    }
    if (wire == true){
        str += "w"
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
    document.body.appendChild(a);
    a.innerHTML = "something random - nobody will see this, it doesn't matter what you put here";
    a.click();
  }

  //handles the delete previous tree button
  function deletePrevTree(){
      colors.pop();
      clicks.pop();
      clicks.pop();
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
    if (wire == true) { // last coord for wireframe,
        coords.push(x1 + (scale/2)*.5, y1, z1 + (scale/10)*10);
    }

    return coords;
}
