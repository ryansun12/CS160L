let left = []; // arrays and counters to hold left/right mouse click coordinates
let right = [];

var c = document.getElementById("glcanvas"); //get Canvas element
var context = c.getContext("2d");

$(c).mousedown(function(event) {  //JQuery to track left or right clicks and adds coordinates to arrays
    switch (event.which) {
        case 1: //Left click
            console.log('Left Mouse Click');
            //check whether a right click happened on same coordinate, if so, clear it
            for(var i = right.length; i > 0; i-=2){
                if (right[i-1] == event.clientY && right[i-2] == event.clientX) {
                    context.clearRect(right[i-2],right[i-1],10,10);
                }
            }
            left.push(event.clientX, event.clientY); //push to left array
            context.fillStyle = "#FF0000"; //Draw red circle with radius 10
            context.beginPath();
            context.arc(event.clientX, event.clientY, 10, 0, 2*Math.PI);
            context.fill(); 
            break;
        case 3: //Right click
            console.log('Right Mouse Click');
            //check whether a left click happened on same coordinate, if so, clear it
            for(var i = left.length; i > 0; i-=2){
                if (left[i-1] == event.clientY && left[i-2] == event.clientX) {
                    //there's no clearArc function, so just using this
                    context.clearRect(left[i-2] - 10 ,left[i-1] - 10,20,20);
                }
            }
            right.push(event.clientX, event.clientY);//push to right array
            context.fillStyle = "#0000FF"; //a Draw blue square with length 10
            context.beginPath();
            context.rect(event.clientX, event.clientY, 10, 10);
            context.fill();
            break;
        default:
            console.log('Something other mouse click happened'); 
    }
    console.log("Left Mouse Click Coordinates: " + left);
    console.log("Right Mouse Click Coordinates: " + right);
});
