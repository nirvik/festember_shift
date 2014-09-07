(function(){

	/* Todo
		AssetLoader
		GameOver Clause when you step over thorns
		Incorporate thorns
		Load the next level when dest reached
		Make the map boundary condition for the white world
	*/

	var canvas = document.getElementById("mycanvas"),
	ctx = canvas.getContext("2d");
	
	var width = canvas.width;
	var height = canvas.height;

	var player = {};
	var terrain = [];
	var quadtree ;
	var bloodParticles = []; //Release when the player dies 
	var finished = 0;
	var pourblood = false;
	var rotateToggle = 0;
	var map;
	var spawn = {'x':0,'y':0};
	var dest = {'x':0,'y':0};


	window.requestAnimFrame = function(){
	    return (
	        window.requestAnimationFrame       || 
	        window.webkitRequestAnimationFrame || 
	        window.mozRequestAnimationFrame    || 
	        window.oRequestAnimationFrame      || 
	        window.msRequestAnimationFrame     || 
	        function(/* function */ callback){
	            window.setTimeout(callback, 1000 / 60);
	        }
	    );
	}();

	
	var AssetLoader = function(){

		this.imgs = {
			'thorns' : './imgs/thorns.png',
			'level1' : './imgs/level1.png',
			'level2' : './imgs/level2.png'
		};

		this.total = Object.keys(this.imgs).length;
		var loaded = 0;

		this.load = function(dic,name){
			
			if(this[dic][name].status != "loading"){
				return;
			}
			else{
				this[dic][name].status = "loaded";
				loaded+=1;

				if(loaded == this.total){
					console.log("All resources have been loaded");
					startGame();
				}
			}
		};

		this.downloadAll = function(){

			var src;
			var _this = this;
			
			for(var img in this.imgs){
				src = _this.imgs[img];
				(function(_this,img){
					_this.imgs[img] = new Image();
					_this.imgs[img].status = "loading";
					_this.imgs[img].src = src;
					_this.imgs[img].name = img;
					_this.imgs[img].onload = function(){
							load.call(_this,"imgs",img);
					}
				})(_this,img);
			}
		};

		return {
			imgs : this.imgs,
			downloadAll : this.downloadAll,
			load : this.load,
			total : this.total
		}

	}();
	
	var KeyStatus = {};
	
	var KeyCode = {

		37 : "left",
		38 : "up",
		39 : "right",
		16 : "shift",
		32 : "space"
	};

	document.onkeyup = function(e){
		var key = e.keyCode;
		if(KeyCode[key]){
			KeyStatus[KeyCode[key]] = false;
		}
	}


	document.onkeydown = function(e){

		var key = e.keyCode;
		if(KeyCode[key]){
			KeyStatus[KeyCode[key]] = true;
		}
	}

	function Vector(x,y,dx,dy){
		this.x = x || 0;
		this.y = y || 0;
		this.dx = dx || 0;
		this.dy = dy || 0;
	}

	Vector.prototype.advance = function(){
		
		this.x = this.x + this.dx;
		this.y = this.y + this.dy;

	}

	var player = function(player){

		player.radius = 5;
		player.type = "circle";
		player.collidableWith = "floor";
		player.restitution = 0.5;
		
		player.velocity = 3.2;
		player.dx = 0;
		player.dy = 0;
		player.isJumping = false;
		player.gravity = 1;
		player.dt = 0.1;
		player.isColliding = false;
		player.mass = 1;
		player.normal = {'x':0,'y':0};
		// Portal values keeps toggling based on 		

		player.portal = 1;
		player.sign = 1;
		player.color = "black"

		Vector.call(player,0,0,player.dx,player.dy);

		player.update = function(){

			if(KeyStatus.space){
				pourblood = true;
			}

			if(KeyStatus.shift  && player.isColliding ){				
				player.portal = player.portal^1; //Invert the physics metrics 
				if(player.portal){
					player.sign = 1;
				}
				else{
					player.sign = -1; 
				}
				rotateToggle = rotateToggle^1;
				KeyStatus.shift = false;
				player.y = player.y - (player.radius)*player.sign;
			}

			if(KeyStatus.right){
				player.dx = player.velocity * player.sign;
			}

			if(KeyStatus.left){
				player.dx = -player.velocity * player.sign;
			}

			if(!KeyStatus.left && !KeyStatus.right){
				player.dx = 0;
			}

			if(KeyStatus.up && !player.isJumping){
				player.dy = -player.velocity * player.sign;
				player.isJumping = true;
				KeyStatus.up = false;
			}


			if(player.isColliding){
				//resolveCollision();
				resolveCollision();
			}
	
			else{				
				player.dy+=(player.gravity * player.sign * player.dt) ;
				if(Math.abs(player.dy)>=6){
					player.dy = 4*player.sign; // Dont let it go beyond 6 as it fucks up the collision
				}
			}
			
			// If it just collides against the floor then its cool
			if(player.isColliding && KeyStatus.up){
				player.dy = -player.velocity * player.sign;
				player.isJumping = false; 
				player.isColliding = false;
			}

			resolveCollision();
			this.advance();
		};

		player.reset = function(){

			player.x = spawn.x;
			player.y = spawn.y;
		};

		player.draw = function(){
			if(player.portal){
				ctx.fillStyle = "black";
				player.color = "black"; //black
				ctx.beginPath();
				ctx.arc(player.x,player.y,player.radius,0,2*Math.PI);
				ctx.closePath();
				ctx.fill();
			}
			else {
				ctx.fillStyle = "white";
				player.color = "white"; //white
				ctx.beginPath();
				ctx.arc(player.x,player.y+2*player.radius,player.radius,0,2*Math.PI);
				ctx.closePath();
				ctx.fill();
			}
		};
		return player;
	}(Object.create(Vector.prototype));

	function Floor(x,y,value){

		this.velocity = {};
		this.type = "floor";
		this.collidableWith = "player";
		this.x = x;
		this.y = y;
		this.width = 50;
		this.height = 50;
		this.color = (value==0xffffffff)?"white":(value==65535)?"blue":(value==16711935)?"green":(value==4278190335)?"red":"black";
		this.restitution = 0;
		this.mass = Infinity ;

		this.draw = function(){

			ctx.fillStyle = this.color;			
			ctx.fillRect(this.x,this.y,this.width,this.height);
		}
	}

	function createBlood(){

		this.x = player.x;
		this.y = player.y;
		
		this.vx = Math.random()*20 - 10;
		this.vy = Math.random()*20 - 10;

		this.color = "red";
		this.radius = 3;

		this.draw = function(){
			ctx.fillStyle = this.color;
			ctx.beginPath();
			if(player.portal){
				ctx.arc(this.x,this.y-2*player.radius,this.radius,Math.PI * 2,false);
			}
			else{
				ctx.arc(this.x,this.y+2*player.radius,this.radius,Math.PI * 2,false);
			}
			ctx.closePath();
			ctx.fill();
		}
	}

	function updateTerrain(){

		for(var i=0;i<terrain.length;i++){
			terrain[i].draw();
		}
	}

	function draw_blood(){
		for(var i=0;i<1;i++){
			bloodParticles.push(new createBlood());
		}
		
		for(var i=0;i<bloodParticles.length;i++){

			var b = bloodParticles[i];
			b.draw();
			b.x += b.vx*0.5;
			b.y += b.vy*0.5;
		}

	}
	
	function Vec_Sub(a, b) {
		return {'x': a.x - b.x, 'y': a.y - b.y};
	}

 	function dot(a,b,theta){
		return (a.x*b.x + a.y*b.y)*Math.cos(theta*Math.PI/180);
	}
	
	function resolveCollision(){
		
		var e = Math.min(player.restitution,0);
		var VelAlongNormal = 0 ;
		var theta = 180;
		var j;
		var impulse = {}
		if(player.normal.x!=0 ){
			VelAlongNormal = player.velocity * Math.cos(theta*Math.PI/180);
			var j = -(1+e)*VelAlongNormal;
			j /= (1/player.mass);
			impulse.x = j * player.normal.x;	
			//Lets now apply the impulse 
			player.dx += (impulse.x);		
		}

		if(player.normal.y!=0){ 
			
			if(player.normal.y == 1 || (player.normal.y==1 && player.sign<0) ){
				VelAlongNormal = (player.velocity-player.dy*player.sign) * Math.cos(theta*Math.PI/180) * player.sign;
			}
			else{
				VelAlongNormal = player.dy * Math.cos(theta*Math.PI/180);
			}

			j = -(1+e)*VelAlongNormal;
			j /= (1/player.mass);
			impulse.y = j * player.normal.y;
			//Lets now apply the impulse
			player.dy += (impulse.y);			
		}

		player.normal.x = 0;	
		player.normal.y = 0;

	}


	function GameOver(msg){

		
		ctx.font="30px Verdana";
		var gradient=ctx.createLinearGradient(0,0,canvas.width,0);
		gradient.addColorStop("0","magenta");
		gradient.addColorStop("0.5","blue");
		gradient.addColorStop("1.0","red");
		// Fill with gradient
		ctx.fillStyle=gradient;
		ctx.fillText(msg,canvas.width/2,canvas.height/2);
		
	}	

	function detectCollision(){

		var i,j;
		var tileWidth = 50;
		var tileHeight = 50;

		i = Math.floor(player.x/tileWidth);
		j = Math.floor(player.y/tileHeight);
	
		if(typeof(map)!="undefined"){
				
				var deathColor = 4278190335;
				var collideColor = (player.color == "black") ? 0xff : 0xffffffff;
				if(player.sign>0){
					
					//Map end Boundary checks 
					if(player.y+2*player.radius>=canvas.height){
						player.isColliding = true;
						player.normal.y = -1;
					}

					else if(player.y-player.radius<=0){
						player.isColliding = true;
						player.normal.y =1;
					}

					if(player.x+player.radius>=canvas.width){ 
						player.isCollidingWithWalls = true;
						player.normal.x = -1;
					}

					else if(player.x-player.radius<=0){
						player.isCollidingWithWalls = true;
						player.normal.x = 1;
					}
					// End of boundary checking 

					if((map.getAt(i, j + 1) == collideColor || map.getAt(i,j+1)==deathColor) && (j+1)*tileHeight-player.y<=player.radius ){
						player.isColliding = true;
						player.normal.y = -1;
						if(map.getAt(i,j+1)==deathColor){
							pourblood = true;
						}
					}

					else if((map.getAt(i, j-1) == collideColor || map.getAt(i,j-1)==deathColor) && player.y-(player.radius)/4 - ((j-1)*tileHeight+tileHeight) <= player.radius){
						player.isColliding = true;
						player.normal.y = 1;
						if(map.getAt(i,j-1)==deathColor){
							pourblood = true;
						}
					}

					if((map.getAt(i + 1, j) == collideColor || map.getAt(i+1,j)==deathColor) && (i+1)*tileWidth - player.x <= player.radius){ 
						player.isCollidingWithWalls = true;
						player.normal.x = -1;
						if(map.getAt(i+1,j)==deathColor){
							pourblood = true;
						}
					}

					else if((map.getAt(i-1 ,j) == collideColor || map.getAt(i-1,j)==deathColor) && player.x-player.radius/4- ((i-1)*tileWidth+tileWidth) <= player.radius ){
						player.isCollidingWithWalls = true;
						player.normal.x = 1;
						if(map.getAt(i-1,j)==deathColor){
							pourblood = true;
						}
					}
				}

				else{

					//Map boundary checks 
					if(player.y+2*player.radius<=0){
						player.isColliding = true;
						player.normal.y = 1*player.sign;
					}

					else if(player.y-player.radius>=canvas.height){
						player.isColliding = true;
						player.normal.y =-1*player.sign;
					}

					if(player.x+player.radius>=canvas.width){ 
						player.isCollidingWithWalls = true;
						player.normal.x = 1*player.sign;
					}

					else if(player.x-player.radius<=0){
						player.isCollidingWithWalls = true;
						player.normal.x = -1*player.sign;
					}
					// End of boundary checking 

					if((map.getAt(i, j) == collideColor || map.getAt(i,j)==deathColor) && ((j)*tileHeight+tileHeight)-player.y<=player.radius ){
						player.isColliding = true;
						player.normal.y = 1*player.sign;
						if(map.getAt(i,j)==deathColor){
							pourblood = true;
						}
					}

					else if((map.getAt(i, j+1) == collideColor || map.getAt(i,j+1)==deathColor) &&  ((j+1)*tileHeight)-player.y-player.radius<= player.radius){
						player.isColliding = true;
						player.normal.y = -1*player.sign;
						if(map.getAt(i,j+1)==deathColor){
							pourblood = true;
						}
					}
					if((map.getAt(i+1,j+1) == collideColor || map.getAt(i+1,j+1)==deathColor) && (i+1)*tileWidth - player.x <= player.radius){ 
						player.isCollidingWithWalls = true;
						player.normal.x = -1;
						if(map.getAt(i+1,j+1)==deathColor){
							pourblood = true;
						}
					}

					else if((map.getAt(i-1,j+1) == collideColor || map.getAt(i-1,j+1)==deathColor) && player.x-player.radius- (i)*tileWidth <= player.radius ){
						player.isCollidingWithWalls = true;
						player.normal.x = 1;
						if(map.getAt(i-1,j+1)==deathColor){
							pourblood = true;
						}
					}	
				}

		}

	}

	function animate(){
		if(!finished){
			requestAnimFrame(animate);
			ctx.clearRect(0,0,canvas.width,canvas.height);
			updateTerrain();
			player.update();
			player.draw();
			player.isColliding = false;
			player.isCollidingWithWalls = false;
			detectCollision();
			if(pourblood){
				draw_blood();
				GameOver("YOU ARE FUCKED ")	;
			}

			if(rotateToggle){
				$('.box').toggleClass('box-rotate');
				rotateToggle = false;
			}	

		}
		else{
			GameOver();
		}
	}

	function loadMap(map){

		var i,j;
		for(i=0;i<map.width;i++){
			for(j=0;j<map.height;j++){
				if(map.getAt(i,j)==16711935){
					spawn.x = i*50 + 50/2;
					spawn.y = j*50 + 50/2;
					player.reset();
				}
				terrain.push(new Floor(i*50,j*50,map.getAt(i,j)));
			}
		}
	}

	function startGame(){

		map = parseMap(AssetLoader.imgs['level2']);
		console.log(map);
		loadMap(map);

		animate();
	}

	function parseMap(image) {
		var tempCanvas = document.createElement('canvas'),
		ctx = tempCanvas.getContext('2d');
		var grid = new Uint32Array(image.width * image.height);
		grid.width = tempCanvas.width = image.width;
		grid.height = tempCanvas.height = image.height;
		
		grid.getAt = function(i, j) {
			return grid[i * grid.width + j];
		}

		grid.assign = function(i,k,value){
			grid[i*grid.width + j] = value;
		}

		ctx.drawImage(image, 0, 0);
		var i, j, k;
		for(i = 0; i < grid.width; i++) {
			for(j = 0; j < grid.height; j++) {
				var dat = ctx.getImageData(i, j, 1, 1); // x,y,width,height.its actually i,j
				val = 0;
				for(k = 0; k < 4; k++) {
					val = val << 8 | dat.data[k];
				}
				grid[i * grid.width + j] = val;
			}
		}
		return grid;
	}
	//startGame();
	AssetLoader.downloadAll();
})()