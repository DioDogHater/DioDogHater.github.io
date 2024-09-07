// Canvas and 2d Context
const canvas = document.getElementById("canvas");
var canvasPos = getPosition(canvas);
const ctx = canvas.getContext("2d");

//HTML DOM elements
const mapdata = document.getElementById("mapdata");
const loadmapdata = document.getElementById("loadmapdata");
const savemapdata = document.getElementById("savemapdata");
const savename = document.getElementById("savename");
const mapdatacopy = document.getElementById("mapdatacopy");
const savelist = document.getElementById("savelist");
const deletemapdata = document.getElementById("deletemapdata");
const loadsavemapdata = document.getElementById("loadsavemapdata");

// Get the canvas' position
function getPosition(el){
	var xPosition = 0;
	var yPosition = 0;
	while(el){
		xPosition += (el.offsetLeft - el.scrollLeft + el.clientLeft);
		yPosition += (el.offsetTop - el.scrollTop + el.clientTop);
		el = el.offsetParent;
	}
	return {x: xPosition, y: yPosition};
}
function getScrollbarWidth(){
	var div = document.createElement("div");
	div.style.overflowY = "scroll";
	div.style.width = "50px";
	div.style.height = "50px";
	document.body.append(div);
	var scrollbarW = div.offsetWidth - div.clientWidth;
	document.body.removeChild(div);
	return scrollbarW;
}

// Auto-Resize of the canvas
function resizeCanvas(){
	var smallest = Math.min(window.innerWidth,window.innerHeight);
	var scrollbarW = getScrollbarWidth();
	if(smallest == window.innerWidth){
		canvas.width = window.innerWidth-4-scrollbarW; canvas.height = (window.innerWidth-4-scrollbarW)/2;
	}else{
		var maxWidth = ((window.innerHeight)*2)-4-scrollbarW;
		if(maxWidth >= window.innerWidth){
			canvas.width = window.innerWidth-4-scrollbarW; canvas.height = (window.innerWidth-4-scrollbarW)/2;
		}else{
			canvas.width = maxWidth; canvas.height = window.innerHeight-4;
		}
	}
	canvasPos = getPosition(canvas);
}resizeCanvas();
window.addEventListener("resize",resizeCanvas);

// Base rendering functions
function fillRect(x,y,w,h,color="black"){
	ctx.fillStyle = color;
	ctx.fillRect((x*canvas.width)-(w*canvas.width/2),(y*canvas.height)-(h*canvas.height/2),w*canvas.width,h*canvas.height);
}function strokeRect(x,y,w,h,color="red"){
	ctx.strokeStyle = color;
	ctx.strokeRect((x*canvas.width)-(w*canvas.width/2),(y*canvas.height)-(h*canvas.height/2),w*canvas.width,h*canvas.height);
}function fillText(x,y,txt="",color="white",font="20px monospace"){
	ctx.fillStyle = color;
	ctx.font = font;
	ctx.fillText(txt,x,y);
	return ctx.measureText(txt);
}function drawImage(x,y,w,h,img){
	ctx.drawImage(img,(x*canvas.width)-(w*canvas.width/2),(y*canvas.height)-(h*canvas.height/2),w*canvas.width,h*canvas.height);
}

// Constants
const GRAVITY = 0.0005;
const SPEED = 0.00275;
const MAP = [];

// Collider for general purposes
class Collider{
	constructor(x,y,width,height){
		this.x = x; this.y = y; this.width = width; this.height = height;
		this.parent = undefined;
	}
	static Colliding(a,b){
		var distances = {x: Math.abs(a.x-b.x), y: Math.abs(a.y-b.y)};
		return (distances.x < (a.width/2)+(b.width/2) && distances.y < (a.height/2)+(b.height/2));
	}
	static Distances(a,b){
		if(a === undefined || b === undefined){return {x: 0, y: 0};}
		return {x: Math.abs(a.x-b.x)-((a.width/2)+(b.width/2)),
				y: Math.abs(a.y-b.y)-((a.height/2)+(b.height/2))};
	}
	static CheckCollisions(a){
		for(var i = 0; i < MAP.length; i++){
			if(MAP[i] instanceof Collider || Object.hasOwn(MAP[i],"collider")){
				if(Collider.Colliding((MAP[i] instanceof Collider) ? MAP[i]:MAP[i].collider,a)){
					return (MAP[i] instanceof Collider) ? MAP[i]:MAP[i].collider;
				}
			}
		}
		return false;
	}
	drawDebug(player){
		strokeRect(this.x-player.x+0.5,this.y-player.y+0.5,this.width,this.height,"white");
	}
}
// Basic building blocks
class Build{
	constructor(x,y,width,height,color="gray"){
		this.x = x; this.y = y; this.width = width; this.height = height;
		this.collider = new Collider(this.x,this.y,this.width,this.height);
		this.collider.parent = this;
		this.visible = true; this.color = color; this.img = undefined;
	}
	draw(player){
		if(this.visible){
			if(this.img === undefined){fillRect(this.x-player.x+0.5,this.y-player.y+0.5,this.width,this.height,this.color);}
			else{drawImage(this.x-player.x+0.5,this.y-player.y+0.5,this.width,this.height,this.img);}
		}
	}
}
// "Kill brick"
class Lava extends Build{
	constructor(x,y,width,height,color="red"){
		super(x,y,width,height,color);
	}touched(player){
		if(player.flying)return;
		Respawn();
	}
}
// Bouncy blocks (Boing boing whiiiiiiiiiiiiiiiuuuuuuuuuuuuuuuuuuu blocks)
class BouncePad extends Build {
	constructor(x,y,width,height,color="blue"){
		super(x,y,width,height,color);
	}touched(player){
		if(player.x+(player.width/2.001) <= this.x-(this.width/2) || player.x-(player.width/2.001) >= this.x+(this.width/2) || player.y >= this.y || player.flying){return;}
		player.velocity.y = -0.015;
		player.updateY();
	}
}
// Slippery ahh block
class Ice extends Build {
	constructor(x,y,width,height,color="lightblue"){
		super(x,y,width,height,color);
	}touched(player){
		if(player.x+(player.width/2.001) <= this.x-(this.width/2) || player.x-(player.width/2.001) >= this.x+(this.width/2) || player.y >= this.y || player.flying){return;}
		player.sliding = true;
	}
}
// Blud thinks he can move on me
class MovingPlatform extends Build {
	constructor(x,y,width,height,color="dimgrey"){
		super(x,y,width,height,color);
		this.startX = x; this.startY = y;
		this.velocity = SPEED/1.5; this.lastChange = new Date().getTime();
	}
	move(x,y){this.x += x; this.y += y; this.collider.x += x; this.collider.y += y;}
	moveTo(x,y){this.x = x; this.y = y; this.collider.x = x; this.collider.y = y;}
	checkCollisions(player){
		var colls = [];
		var sortedMAP = MAP;
		if(Collider.Colliding(this.collider,player.collider)){colls[colls.length] = player.collider;}
		for(var i = 0; i < sortedMAP.length; i++){
			if(sortedMAP[i] == this){continue;}
			if(sortedMAP[i] instanceof Collider || Object.hasOwn(sortedMAP[i],"collider")){
				if(Collider.Colliding((sortedMAP[i] instanceof Collider) ? sortedMAP[i]:sortedMAP[i].collider,this.collider)){
					colls[colls.length] = (sortedMAP[i] instanceof Collider) ? sortedMAP[i]:sortedMAP[i].collider;
				}
			}
		}
		return (colls.length > 0) ? colls:false;
	}
	getClosestDist(colls){
		var closest = Collider.Distances(colls[0],this.collider);
		for(i = 1; i < colls.length; i++){
			var dist = Collider.Distances(colls[i],this.collider);
			if(dist.x < closest.x){closest.x = dist.x;}
			if(dist.y < closest.y){closest.y = dist.y;}
		}
		return closest;
	}
	touched(player){
		if(player.x+(player.width/2.001) <= this.x-(this.width/2) || player.x-(player.width/2.001) >= this.x+(this.width/2) || player.y >= this.y || player.flying){return;}
		if(new Date().getTime()-this.lastChange < 200){player.offsetVel.x = 0;return;}
		player.offsetVel.x = this.velocity;
	}
	draw(player){
		// movement
		if(new Date().getTime()-this.lastChange >= 200){
			this.move(this.velocity,0);
			var colls = this.checkCollisions(player);
			if(colls != false){
				this.move(-this.velocity,0);
				var dist = this.getClosestDist(colls).x-0.0006;
				this.move((this.velocity > 0) ? dist:-dist,0);
				this.velocity = -this.velocity;
				this.lastChange = new Date().getTime();
			}else if(Math.abs(this.startX-this.x) > 1){
				this.velocity = -this.velocity;
				this.lastChange = new Date().getTime();
			}
		}
		//drawing the platform
		fillRect(this.x-player.x+0.5,this.y-player.y+0.5,this.width,this.height,this.color);
		strokeRect(this.x-player.x+0.5,this.y-player.y+0.5,this.width,this.height,"white");
	}
	drawDebug(player){
		strokeRect(this.startX-player.x+0.5,this.startY-player.y+0.5,this.width,this.height,"grey");
	}
}
// Checkpoints for losers
class Checkpoint extends Build{
	constructor(x,y,width,height,color="green"){
		super(x,y,width,height,color);
		this.spawnPos = {x:this.x, y:this.y-(this.height/2)-(player.height/2)-0.0006};
	}
	touched(player){
		if(player.x+(player.width/2.001) <= this.x-(this.width/2) || player.x-(player.width/2.001) >= this.x+(this.width/2) || player.y >= this.y || player.flying){return;}
		checkpoint = this.spawnPos;
	}
	drawDebug(player){
		strokeRect(this.spawnPos.x-player.x+0.5,this.spawnPos.y-player.y+0.5,player.width,player.height,"blue");
	}
	draw(player){
		if(this.visible){
			if(checkpoint == this.spawnPos){this.color = "limegreen";}else{this.color = "green";}
			if(this.img === undefined){fillRect(this.x-player.x+0.5,this.y-player.y+0.5,this.width,this.height,this.color);}
			else{drawImage(this.x-player.x+0.5,this.y-player.y+0.5,this.width,this.height,this.img);}
		}
	}
}
// Player class
class Player{
	constructor(x,y){
		this.x = x; this.y = y; this.width = 0.025; this.height = 0.1;
		this.collider = new Collider(this.x,this.y,this.width,this.height);
		this.collider.parent = this;
		this.velocity = {x: 0, y: 0}; this.grounded = false; this.ceiling = false;
		this.flying = false; this.sliding = false; this.slideSpeed = 0;
		this.offsetVel = {x:0,y:0};
	}
	draw(){
		fillRect(0.5,0.5,this.width,this.height,"white");
	}
	move(x,y){
		this.x += x;this.y += y;this.collider.x += x;this.collider.y += y;
	}
	moveTo(x,y){
		this.x = x; this.y = y; this.collider.x = x; this.collider.y = y;
	}
	checkCollisions(){
		var colls = [];
		var sortedMAP = MAP;
		for(var i = 0; i < sortedMAP.length; i++){
			if(sortedMAP[i] instanceof Collider || Object.hasOwn(sortedMAP[i],"collider")){
				if(Collider.Colliding((sortedMAP[i] instanceof Collider) ? sortedMAP[i]:sortedMAP[i].collider,this.collider)){
					colls[colls.length] = (sortedMAP[i] instanceof Collider) ? sortedMAP[i]:sortedMAP[i].collider;
				}
			}
		}
		return (colls.length > 0) ? colls:false;
	}
	getClosestDist(colls){
		var closest = Collider.Distances(colls[0],this.collider);
		for(i = 1; i < colls.length; i++){
			var dist = Collider.Distances(colls[i],this.collider);
			if(dist.x < closest.x){closest.x = dist.x;}
			if(dist.y < closest.y){closest.y = dist.y;}
		}
		return closest;
	}
	updateY(){
		this.ceiling = false;
		this.move(0,this.velocity.y+this.offsetVel.y);
		var verticalColl = this.checkCollisions();
		if(verticalColl != false){
			// Go back to before hitting the floor/roof
			this.move(0,-(this.velocity.y+this.offsetVel.y));
			// Move the distance between collider and player (to stand firmly on roof)
			var dist = this.getClosestDist(verticalColl).y-0.0006;
			this.move(0,(this.velocity.y+this.offsetVel.y > 0) ? dist:-dist);
			// Law of physics rrraaaaah
			if(this.velocity.y > 0 && !player.flying){this.grounded = true; this.sliding = false; this.velocity.y = 0;} // Stop the current vertical velocity (you stop when the floor/roof stops you)
			else if(this.velocity.y <= 0 && !player.flying){this.velocity.y = 0;}// Also sets the player to grounded if we are falling (player just landed)
			// Check if player touching any touch sensitive parts
			for(i = 0; i < verticalColl.length; i++){
				if(verticalColl[i].parent != undefined){if("touched" in verticalColl[i].parent){verticalColl[i].parent.touched(player);}}
			}
		}
	}
	updateX(){
		this.move((this.sliding ? this.slideSpeed:this.velocity.x+this.offsetVel.x),0);
		var horizontalColl = this.checkCollisions();
		if(horizontalColl != false){
			// Go back to before hitting the wall
			this.move(-(this.sliding ? this.slideSpeed:this.velocity.x+this.offsetVel.x),0);
			// Move the distance between collider and player (to hug the wall)
			var dist = this.getClosestDist(horizontalColl).x-0.0006;
			this.move(((this.sliding ? this.slideSpeed:this.velocity.x+this.offsetVel.x) > 0) ? dist:-dist,0);
			if(this.sliding){this.slideSpeed = 0;}
			// Check if player touching any touch sensitive parts
			for(i = 0; i < horizontalColl.length; i++){
				if(horizontalColl[i].parent != undefined){if("touched" in horizontalColl[i].parent){horizontalColl[i].parent.touched(player);}}
			}
		}
	}
	update(){
		// Slippery ahh walking
		if(!this.sliding || this.flying){this.slideSpeed = this.velocity.x;}
		else{
			if(this.velocity.x != 0 && Math.abs(this.slideSpeed) < SPEED*1.5){this.slideSpeed += this.velocity.x/16;}
			else if(this.slideSpeed != 0){
				var diff = Math.abs(this.slideSpeed);
				if(diff < SPEED/32){this.slideSpeed += (this.slideSpeed > 0) ? -diff:diff;}
				else{this.slideSpeed += (this.slideSpeed > 0) ? -SPEED/32:SPEED/32;}
			}
		}
		// Apply gravity
		if(!this.flying && !this.grounded){this.velocity.y += GRAVITY;}
		// Make the offset velocity 0 before we are sure that player is on moving platform
		this.offsetVel = {x:0,y:0};
		// Check if head bonk on ceiling
		this.move(0,-0.003);
		var ceiling = this.checkCollisions();
		if(ceiling != false){
			this.ceiling = true;
			for(i = 0; i < ceiling.length; i++){if(ceiling[i].parent != undefined){if("touched" in ceiling[i].parent){ceiling[i].parent.touched(player);}}}
		}else{this.ceiling = false;}
		this.move(0,0.003);
		// Check if still on ground
		if(this.grounded || this.offsetVel.y != 0){
			this.move(0,0.0008);
			var ground = this.checkCollisions();
			if(ground != false){
				// Set sliding to false (check later if sliding)
				this.sliding = false;
				this.grounded = true;
				for(i = 0; i < ground.length; i++){if(ground[i].parent != undefined){if("touched" in ground[i].parent){ground[i].parent.touched(player);}}}
			}else{this.grounded = false;}
			this.move(0,-0.0008);
		}
		// Vertical movement (only when player is not grounded)
		if(!this.grounded || this.flying || this.offsetVel.y != 0){
			this.updateY();
		}
		// Horizontal movement
		this.updateX();
	}
}

// Variables
const player = new Player(0.5,0.5);
var jumping = false;
var lastJump = new Date().getTime()-100;
MAP[0] = new Build(0.5,0.75,0.5,0.05,"gray");
var BUILDING = false;
var DESTRUCTION = false;
var grid = false;
var grid_size = 0.0125;
var brush = 1;
var checkpoint = {x:0.5,y:0.5};

const brushes = ["Block","Lava","Bounce Pad","Ice","Invisible Barrier","Moving Platform","Checkpoint"];

// Gameplay functions
function Respawn(){
	player.moveTo(checkpoint.x,checkpoint.y);
	player.velocity = {x:0,y:0};
}

// Controls
window.addEventListener("keydown",(e)=>{
	if(e.code == "KeyD"){player.velocity.x = SPEED * (player.flying ? 2:1);}
	if(e.code == "KeyA"){player.velocity.x = -SPEED * (player.flying ? 2:1);}
	if(e.code == "Space"){jumping = true;e.preventDefault();}
	if(e.code == "KeyB"){
		BUILDING = !BUILDING;
		DESTRUCTION = false;
	}if(e.code == "KeyV"){
		BUILDING = false;
		DESTRUCTION = !DESTRUCTION;
	}if(e.code == "KeyR"){Respawn();}
	if((e.code == "KeyW") && player.flying){player.velocity.y = -SPEED*4;}
	if((e.code == "KeyS") && player.flying){player.velocity.y = SPEED*4;}
	if(e.code == "KeyZ"){player.flying = !player.flying;player.velocity.y = 0;}
	if(DESTRUCTION && e.ctrlKey && e.key == "-"){
		MAP.length = 1;
		MAP[0] = new Build(0.5,0.75,0.5,0.05,"gray");
		e.preventDefault();
		Respawn();
	}if(BUILDING){
		if(e.shiftKey){grid = !grid;}
		if(e.key == "1"){brush = 1;}
		if(e.key == "2"){brush = 2;}
		if(e.key == "3"){brush = 3;}
		if(e.key == "4"){brush = 4;}
		if(e.key == "5"){brush = 5;}
		if(e.key == "6"){brush = 6;}
		if(e.key == "7"){brush = 7;}
		if(e.key == "8"){brush = 8;}
		if(e.code == "KeyQ"){checkpoint = {x:0.5,y:0.5}}
	}
});
window.addEventListener("keyup",(e)=>{
	if(e.code == "KeyD" && player.velocity.x >= SPEED){player.velocity.x = 0;}
	if(e.code == "KeyA" && player.velocity.x <= -SPEED){player.velocity.x = 0;}
	if(e.code == "Space"){jumping = false;}
	if(e.code == "KeyW" && player.flying){player.velocity.y = 0;}
	if(e.code == "KeyS" && player.flying){player.velocity.y = 0;}
});

// Map building
var mouseStart = {x:0,y:0}; var mouseEnd = {x:0,y:0};
var mousePos = {x:0,y:0};
canvas.addEventListener("mousedown",(ev)=>{
	var e = {clientX: ev.clientX-canvasPos.x, clientY: ev.clientY-canvasPos.y, button: ev.button};
	if(BUILDING && e.button === 0){
		mouseStart = {x:(e.clientX/canvas.width)+player.x-0.5,y:(e.clientY/canvas.height)+player.y-0.5};
		if(grid){mouseStart.x = Math.floor(mouseStart.x/grid_size)*grid_size;mouseStart.y = Math.floor(mouseStart.y/grid_size)*grid_size;}
	}if(DESTRUCTION && e.button === 0){
		var x = (mousePos.x/canvas.width)+player.x-0.5; var y = (mousePos.y/canvas.height)+player.y-0.5;
		var coll = Collider.CheckCollisions(new Collider(x,y,0.005,0.005));
		if(coll != false && coll != undefined && coll instanceof Collider){
			if(coll.parent != undefined){MAP.splice(MAP.indexOf(coll.parent),1);}else{MAP.splice(MAP.indexOf(coll),1);}
		}
	}
});
canvas.addEventListener("mousemove",(ev)=>{
	var e = {clientX: ev.clientX-canvasPos.x, clientY: ev.clientY-canvasPos.y};
	mousePos = {x:e.clientX,y:e.clientY};
});

function build(){
	if(grid){mouseEnd.x = Math.floor(mouseEnd.x/grid_size)*grid_size;mouseEnd.y = Math.floor(mouseEnd.y/grid_size)*grid_size;}
	var x = Math.round((mouseEnd.x+mouseStart.x)/2*10000)/10000; var y = Math.round((mouseEnd.y+mouseStart.y)/2*10000)/10000;
	var width = Math.round(Math.abs(mouseEnd.x-mouseStart.x)*10000)/10000; var height = Math.round(Math.abs(mouseEnd.y-mouseStart.y)*10000)/10000;
	if(width > grid_size/2 && height > grid_size/2){
		if(brush == 1){MAP[MAP.length] = new Build(x,y,width,height);}
		if(brush == 2){MAP[MAP.length] = new Lava(x,y,width,height);}
		if(brush == 3){MAP[MAP.length] = new BouncePad(x,y,width,height);}
		if(brush == 4){MAP[MAP.length] = new Ice(x,y,width,height);}
		if(brush == 5){MAP[MAP.length] = new Collider(x,y,width,height);}
		if(brush == 6){MAP[MAP.length] = new MovingPlatform(x,y,width,height);}
		if(brush == 7){MAP[MAP.length] = new Checkpoint(x,y,width,height);}
	}
}

canvas.addEventListener("mouseup",(ev)=>{
	var e = {clientX: ev.clientX-canvasPos.x, clientY: ev.clientY-canvasPos.y, button: ev.button};
	if(BUILDING && e.button === 0){
		mouseEnd = {x:(e.clientX/canvas.width)+player.x-0.5,y:(e.clientY/canvas.height)+player.y-0.5};
		if(grid){mouseEnd.x = Math.floor(mouseEnd.x/grid_size)*grid_size;mouseEnd.y = Math.floor(mouseEnd.y/grid_size)*grid_size;}
		build();
		mouseStart = {x:0,y:0}; mouseEnd = {x:0,y:0};
	}
});

// SAVING/DATA MANAGEMENT functions
var saves = [];

function toJson(){
	var sMAP = [];
	for(i = 0; i < MAP.length; i++){
		if(MAP[i] instanceof Collider){
			sMAP[i] = [0,MAP[i].x*10000,MAP[i].y*10000,MAP[i].width*10000,MAP[i].height*10000];
		}else if(MAP[i] instanceof Lava){
			sMAP[i] = [2,MAP[i].x*10000,MAP[i].y*10000,MAP[i].width*10000,MAP[i].height*10000];
		}else if(MAP[i] instanceof BouncePad){
			sMAP[i] = [3,MAP[i].x*10000,MAP[i].y*10000,MAP[i].width*10000,MAP[i].height*10000];
		}else if(MAP[i] instanceof Ice){
			sMAP[i] = [4,MAP[i].x*10000,MAP[i].y*10000,MAP[i].width*10000,MAP[i].height*10000];
		}else if(MAP[i] instanceof Checkpoint){
			sMAP[i] = [6,MAP[i].x*10000,MAP[i].y*10000,MAP[i].width*10000,MAP[i].height*10000];
		}else if(MAP[i] instanceof MovingPlatform){
			sMAP[i] = [5,MAP[i].startX*10000,MAP[i].startY*10000,MAP[i].width*10000,MAP[i].height*10000];
		}else if(MAP[i] instanceof Build){
			sMAP[i] = [1,MAP[i].x*10000,MAP[i].y*10000,MAP[i].width*10000,MAP[i].height*10000];
		}
	}return JSON.stringify({data:sMAP});
}
function fromJson(text){
	try{
		var sMAP = JSON.parse(text)["data"];
		MAP.length = 0;
		for(i = 0; i < sMAP.length; i++){
			switch(sMAP[i][0]){
				case 0:
					MAP[i] = new Collider(sMAP[i][1]/10000,sMAP[i][2]/10000,sMAP[i][3]/10000,sMAP[i][4]/10000);
					break;
				case 1:
					MAP[i] = new Build(sMAP[i][1]/10000,sMAP[i][2]/10000,sMAP[i][3]/10000,sMAP[i][4]/10000);
					break;
				case 2:
					MAP[i] = new Lava(sMAP[i][1]/10000,sMAP[i][2]/10000,sMAP[i][3]/10000,sMAP[i][4]/10000);
					break;
				case 3:
					MAP[i] = new BouncePad(sMAP[i][1]/10000,sMAP[i][2]/10000,sMAP[i][3]/10000,sMAP[i][4]/10000);
					break;
				case 4:
					MAP[i] = new Ice(sMAP[i][1]/10000,sMAP[i][2]/10000,sMAP[i][3]/10000,sMAP[i][4]/10000);
					break;
				case 5:
					MAP[i] = new MovingPlatform(sMAP[i][1]/100000,sMAP[i][2]/10000,sMAP[i][3]/10000,sMAP[i][4]/10000);
					break;
				case 6:
					MAP[i] = new Checkpoint(sMAP[i][1]/10000,sMAP[i][2]/10000,sMAP[i][3]/10000,sMAP[i][4]/10000);
					break;
				default:
					console.log("unknown type tried loading");
			}
		}
		checkpoint = {x:0.5,y:0.5};
		Respawn();
	}catch(err){
		console.log(err);
	}
}
function createListElement(name){
	var li = document.createElement("li");
	li.innerText = name;
	li.id = "savelistelem"+name;
	li.addEventListener("click",()=>{savename.value = li.innerText;});
	return li;
}
function hasListElement(name){
	var li = document.getElementById("savelistelem"+name);
	if(li === undefined){return false;}
	return savelist.contains(li) ? li : false;
}
function addSave(name){
	saves[saves.length] = name;
	savelist.appendChild(createListElement(name));
}
function removeSave(name){
	if(saves.indexOf(name) != -1){saves.splice(saves.indexOf(name),1);}
	var li = hasListElement(name);
	if(li){savelist.removeChild(li);}
}
function loadSavesList(){
	var rawSaves = localStorage.getItem("saves");
	if(rawSaves == undefined){return;}
	try{
		savesData = JSON.parse(rawSaves);
		if(savesData != undefined){
			saves = savesData["saves"];
			for(i = 0; i < saves.length; i++){
				savelist.appendChild(createListElement(saves[i]));
			}
		}
	}catch(err){
		console.log(err);
	}
}
function saveSavesList(){
	var savesData = JSON.stringify({"saves":saves});
	localStorage.setItem("saves",savesData);
}

// Save/Data events
window.addEventListener("beforeunload",(e)=>{
	// save current map -> autosave
	if(!hasListElement("AUTOSAVE")){addSave("AUTOSAVE");}
	localStorage.setItem("AUTOSAVE",toJson());
	// save the saves list
	saveSavesList();
})
mapdatacopy.addEventListener("click",(e)=>{
	navigator.clipboard.writeText(toJson());
	if(mapdatacopy.innerText == "COPY MAP DATA"){
		mapdatacopy.innerText = "Copied to clipboard!";
		setTimeout(()=>{mapdatacopy.innerText = "COPY MAP DATA";},750);
	}
});
loadmapdata.addEventListener("click",(e)=>{
	fromJson(mapdata.value);
});
savemapdata.addEventListener("click",(e)=>{
	if(savename.value == "" || savename.value == " "){return;}
	if(!hasListElement(savename.value)){addSave(savename.value);}
	localStorage.setItem(savename.value,toJson());
	console.log(savename.value+" saved!");
	if(savemapdata.innerText == "SAVE MAP"){
		savemapdata.innerText = "Saved!";
		setTimeout(()=>{savemapdata.innerText = "SAVE MAP";},750);
	}
});
deletemapdata.addEventListener("click",(e)=>{
	if(savename.value == "" || savename.value == " "){return;}
	removeSave(savename.value);
	if(localStorage.getItem(savename.value) != undefined){
		localStorage.removeItem(savename.value);
		if(deletemapdata.innerText = "DELETE"){
			deletemapdata.innerText = "Deleted!";
			setTimeout(()=>{deletemapdata.innerText = "DELETE";},750);
		}
		console.log("deleted save: "+savename.value+"!");
	}
});
loadsavemapdata.addEventListener("click",(e)=>{
	if(savename.value == "" || savename.value == " "){return;}
	var saveMap = localStorage.getItem(savename.value);
	if(saveMap != undefined && saveMap != null){
		fromJson(saveMap);
		if(loadsavemapdata.innerText = "LOAD SAVED MAP"){
			loadsavemapdata.innerText = "Loaded!";
			setTimeout(()=>{loadsavemapdata.innerText = "LOAD SAVED MAP";},750);
		}
	}
})
loadSavesList();

// Game loop
window.setInterval(()=>{
	// Clear the screen / Draw background
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.fillStyle = "#050505";
	ctx.fillRect(0,0,canvas.width,canvas.height);
	
	// Update the player and jump if possible
	if(player.grounded && jumping && !player.flying && !player.ceiling && new Date().getTime()-lastJump >= 200){
		lastJump = new Date().getTime();
		if(player.velocity.y > -0.0125){player.velocity.y = -0.0125;}else{player.velocity.y += -0.0025;}
		player.updateY();
	}player.update();
	
	// Draw scene
	for(i = 0; i < MAP.length; i++){
		if("draw" in MAP[i]){
			MAP[i].draw(player);
		}if((DESTRUCTION || BUILDING) && "drawDebug" in MAP[i]){
			MAP[i].drawDebug(player);
		}
	}
	
	// Show if in build mode
	if(BUILDING){
		fillRect(0.5-player.x+0.5,0.5-player.y+0.5,player.width,player.height,"#000220");
		fillText((0.5-player.x+0.5)*canvas.width-("SPAWN".length*9/2),(0.45-player.y+0.5)*canvas.height,"SPAWN",color="#666666",font="16px monospace");
		fillText(5,20,"BUILD MODE");
		fillText(5,40,(grid) ? "Grid: active":"Grid: disabled");
		if(player.flying){fillText(5,60,"FLYING!!");}
		fillText(canvas.width-(11*("M1 to build.".length)+10),canvas.height-40,"M1 to build.");
		fillText(canvas.width-(11*("Shift toggle grid.".length)+10),canvas.height-60,"Shift toggle grid.");
		fillText(canvas.width-(11*("Z to fly.".length)+10),canvas.height-80,"Z to fly.");
		fillText(canvas.width-(11*("Q reset checkpoints.".length)+10),canvas.height-100,"Q reset checkpoints.","grey");
		var y = 0; for(i = brushes.length-1; i >= 0; i--){
			fillText(5,canvas.height-(20*y)-10,(i+1)+" - "+brushes[i],color=((brush == i+1) ? "red":"white"))
			y++;
		}fillText(5,canvas.height-(20*y)-10,"-- BRUSHES --");
		if(mouseStart.x != 0 && mouseStart.y != 0 && mouseEnd.x == 0 && mouseEnd.y == 0){
			var mse = {x:(mousePos.x/canvas.width)+player.x-0.5,y:(mousePos.y/canvas.height)+player.y-0.5};
			if(grid){mse.x = Math.floor(mse.x/grid_size)*grid_size;mse.y = Math.floor(mse.y/grid_size)*grid_size;}
			var x = (mse.x+mouseStart.x)/2; var y = (mse.y+mouseStart.y)/2;
			var width = Math.abs(mse.x-mouseStart.x); var height = Math.abs(mse.y-mouseStart.y);
			strokeRect(x-player.x+0.5,y-player.y+0.5,width,height);
		}
	}
	// Show if in destroy mode
	if(DESTRUCTION){
		fillRect(0.5-player.x+0.5,0.5-player.y+0.5,player.width,player.height,"#000220");
		fillText((0.5-player.x+0.5)*canvas.width-("SPAWN".length*9/2),(0.45-player.y+0.5)*canvas.height,"SPAWN",color="#666666",font="16px monospace");
		fillText(5,20,"DESTRUCTION MODE",color="red");
		if(player.flying){fillText(5,40,"FLYING!!");}
		fillText(canvas.width-(11*("M1 to destroy.".length)+10),canvas.height-40,"M1 to destroy.");
		fillText(canvas.width-(11*("Z to fly.".length)+10),canvas.height-60,"Z to fly.");
			fillText(canvas.width-(11*("CTRL+Minus(-) to reset map.".length)+10),canvas.height-80,"CTRL+Minus(-) to reset map.",color="red");
		var x = (mousePos.x/canvas.width)+player.x-0.5; var y = (mousePos.y/canvas.height)+player.y-0.5;
		var coll = Collider.CheckCollisions(new Collider(x,y,0.005,0.005));
		if(coll != false && coll != undefined && coll instanceof Collider){
			strokeRect(coll.x-player.x+0.5,coll.y-player.y+0.5,coll.width,coll.height);
		}
	}
	
	// Controls
	fillText(canvas.width-(11*("A,D,SPACE to move.".length)+10),canvas.height-20,"A,D,SPACE to move.");
	fillText(canvas.width-(11*("R to respawn.".length)+10),20,"R to respawn.");
	if(!BUILDING && !DESTRUCTION){
		fillText(5,20,"PARKOUR MODE",color="gray");
		fillText(canvas.width-(11*("B: Build".length)+10),canvas.height-40,"B: Build");
		fillText(canvas.width-(11*("V: Destroy".length)+10),canvas.height-60,"V: Destroy");
		if(player.flying && !DESTRUCTION && !BUILDING){player.flying = false;player.velocity.y = 0;}
	}
	
	// draw the player
	player.draw();
},1000/60);
