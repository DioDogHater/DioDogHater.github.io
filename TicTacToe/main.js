canvas = document.getElementById("canvas");
ctx = canvas.getContext("2d");

let state = 0;
let toes = [[0,0,0],[0,0,0],[0,0,0]];
let wins = [
	[[0,0],[0,1],[0,2]],
	[[2,0],[2,1],[2,2]],
	[[0,0],[1,0],[2,0]],
	[[0,2],[1,2],[2,2]],
	[[0,0],[1,1],[2,2]],
	[[2,0],[1,1],[0,2]],
	[[0,1],[1,1],[2,1]],
	[[1,0],[1,1],[1,2]]
];

function resizeCanvas(){
	var smallest = Math.min(window.innerWidth,window.innerHeight)-8;
	console.log(smallest);
	canvas.width = smallest; canvas.height = smallest;
}resizeCanvas();
window.addEventListener("resize",resizeCanvas);

const grid_size = 100/3;

function fillRect(x,y,w,h,color="black"){
	ctx.fillStyle = color;
	ctx.fillRect((x/100)*canvas.width,(y/100)*canvas.height,(w/100)*canvas.width,(h/100)*canvas.height);
}

function clearScreen(){
	ctx.clearRect(0,0,window.width,window.height);
}

function drawBackground(){
	fillRect(33,0,0.25,100,"white");
	fillRect(66,0,0.25,100,"white");
	fillRect(0,33,100,0.25,"white");
	fillRect(0,66,100,0.25,"white");
}

function drawO(x,y){
	ctx.strokeStyle = "blue";
	ctx.lineWidth = canvas.width/100;
	var offset = 33/2-0.25;
	ctx.beginPath();
	ctx.ellipse(((x*grid_size)+offset)/100*canvas.width,((y*grid_size)+offset)/100*canvas.height,(16/100)*canvas.width,(16/100)*canvas.height,0,0,360);
	ctx.stroke();
}

function drawX(x,y){
	ctx.strokeStyle = "red";
	ctx.lineWidth = canvas.width/80;
	ctx.beginPath();
	var ox = x*grid_size+0.25; var oy = y*grid_size+0.25;
	ctx.moveTo(ox/100*canvas.width,oy/100*canvas.height);
	ctx.lineTo((ox+32.25)/100*canvas.width,(oy+32.25)/100*canvas.height);
	ctx.moveTo((ox+32.25)/100*canvas.width,oy/100*canvas.height);
	ctx.lineTo(ox/100*canvas.width,(oy+32.25)/100*canvas.height);
	ctx.stroke();
}

function drawToes(){
	for(y = 0; y < 3; y++){
		for(x = 0; x < 3; x++){
			if(toes[y][x] == 1){
				drawX(x,y);
			}else if(toes[y][x] == -1){
				drawO(x,y);
			}
		}
	}
}

window.addEventListener("mousedown",(e)=>{
	var msPos = {x:e.clientX-(window.innerWidth-canvas.width)/2,y:e.clientY};
	if(msPos.x < 0 || msPos.x > canvas.width || msPos.y < 0 || msPos.y > canvas.height)return;
	var gridPos = {x:Math.floor(msPos.x/(grid_size/100*canvas.width)),y:Math.floor(msPos.y/(grid_size/100*canvas.height))};
	if(toes[gridPos.y][gridPos.x] == 0){
		toes[gridPos.y][gridPos.x] = 1;
	}
});

window.addEventListener("touchstart",(e)=>{
	var msPos = {x:e.clientX-(window.innerWidth-canvas.width)/2,y:e.clientY};
	if(msPos.x < 0 || msPos.x > canvas.width || msPos.y < 0 || msPos.y > canvas.height)return;
	var gridPos = {x:Math.floor(msPos.x/(grid_size/100*canvas.width)),y:Math.floor(msPos.y/(grid_size/100*canvas.height))};
	if(toes[gridPos.y][gridPos.x] == 0){
		toes[gridPos.y][gridPos.x] = 1;
	}
});

function mainLoop(){
	clearScreen();
	fillRect(0,0,100,100);
	
	drawToes();
	
	drawBackground();
}

window.setInterval(mainLoop,1000/30);