(function(){


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
		player.restitution = 0.4;
		
		player.velocity = 3;
		player.dx = 0;
		player.dy = 0;
		player.isJumping = false;
		player.gravity = 1;
		player.dt = 0.3;
		player.isColliding = false;
		player.mass = 1.4;
		// Portal values keeps toggling based on 		

		player.portal = 1;
		player.sign = 1;
		player.color = "black"

		Vector.call(player,0,0,player.dx,player.dy);

		var jumpCounter = 0;
		player.update = function(){

			if(KeyStatus.space){
				pourblood = true;
			}

			if(KeyStatus.shift){				
				player.portal = player.portal^1; //Invert the physics metrics 
				if(player.portal){
					player.sign = 1;
				}
				else{
					player.sign = -1; 
				}
				rotateToggle = rotateToggle^1;
				KeyStatus.shift = false;
			}

			if(KeyStatus.right){
				player.dx = player.velocity * player.sign;// * player.dt;
			}

			if(KeyStatus.left){
				player.velocity.x = 4;
				player.velocity.y = 0;
				player.dx = -player.velocity * player.sign;// * player.dt;
			}

			if(!KeyStatus.left && !KeyStatus.right){
				player.dx = 0;
			}


			if(KeyStatus.up && !player.isJumping){
				player.dy = -player.velocity * player.sign ;//* player.dt;
				player.isJumping = true;
				jumpCounter = 10;
				
			}

			if(player.isJumping && jumpCounter){
				player.dy = -player.velocity * player.sign ;
			}

			jumpCounter = Math.max(0,jumpCounter-1);


			if(player.isColliding){
				resolveCollision();
			}

			else{				
				player.dy+=(player.gravity * player.sign * player.dt) ;
			}
			
			// If it just collides against the floor then its cool
			if(player.isColliding && KeyStatus.up){
				player.dy = -player.velocity * player.sign; //* player.dt ;
				player.isJumping = false; 
				player.isColliding = false;
			}

			this.advance();
		};

		player.reset = function(){

			player.x = 130;
			player.y = 200;
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
				ctx.arc(player.x,player.y+5*player.radius,player.radius,0,2*Math.PI);
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
		this.color = (value==0xffffffff)?"black":(value==65535)?"green":"white";
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
				ctx.arc(this.x,this.y,this.radius,Math.PI * 2,false);
			}
			else{
				ctx.arc(this.x,this.y+2*player.radius,this.radius,Math.PI * 2,false);
			}
			ctx.closePath();
			ctx.fill();
		}
	}
	//createBlood.prototype = Object.create(Vector.prototype);

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
	
	function SimplifyNormalForce(){

		var velx = player.dx;
		var vely = player.dy;
		var norm = {};
		if(velx ==0 && vely<0){

			//normal force act up
			norm.x = 0;
			norm.y = -1;
		}

		else if(velx > 0 && vely == 0){
			//normal force act left
			norm.x = -1;
			norm.y = 0;
		}

		else if(velx<0 && vely==0){

			//normal force act right
			norm.x = 1;
			norm.y = 0;
		}

		else if(velx==0 && vely>0){

			//normal force act down
			norm.x =0;
			norm.y = 1;
		}
		return norm;
	}

	function resolveCollision(){
		
		var e = Math.min(player.restitution,0);

		var Vb = {'x':0,'y':0};
		var Va = {'x':player.dx ,'y':player.dy};

		var relativeVelocity = Vec_Sub(Vb,Va);
		var normalUnitVector = SimplifyNormalForce();
		var theta = 180;
		var VelAlongNormal = 0;

		if(!normalUnitVector.hasOwnProperty('x')){

			console.log("OH MY FREAKING GOD ! THIS IS HAPPENING ")
			normalUnitVector.x  = relativeVelocity.x/(Math.sqrt(Math.pow(relativeVelocity.x,2)+Math.pow(relativeVelocity.y,2)));
			normalUnitVector.y  = relativeVelocity.y/(Math.sqrt(Math.pow(relativeVelocity.x,2)+Math.pow(relativeVelocity.y,2)));
			theta = Math.atan(normalUnitVector.y/normalUnitVector.x)*180/Math.PI;
			VelAlongNormal = player.dx*Math.cos(theta*Math.PI/180)+player.dy*Math.cos(theta*Math.PI/180);//dot(relativeVelocity,normalUnitVector,theta);
		
		}

		else{
			VelAlongNormal = player.dx*Math.cos(theta*Math.PI/180)+player.dy*Math.cos(theta*Math.PI/180);
		}

		/* Since the object goes down the dy increases i.e dy>0
			Va > 0
			Vb - Va < 0
			(Vb-Va)cos(180) > 0
			It should collide 
			as we go down y increases  
		*/

		if(VelAlongNormal > 0){
			return ;
		}

		var j = -(1+e)*VelAlongNormal;
		j /= (1/player.mass);

		var impulse = {};
		impulse.x = j * normalUnitVector.x ;
		impulse.y = j * normalUnitVector.y ;
		//Lets now apply the impulse 
		player.dx -= (impulse.x);
		player.dy -= (impulse.y);
		
	}


	function GameOver(){
		ctx.font="30px Verdana";
		var gradient=ctx.createLinearGradient(0,0,canvas.width,0);
		gradient.addColorStop("0","magenta");
		gradient.addColorStop("0.5","blue");
		gradient.addColorStop("1.0","red");
		// Fill with gradient
		ctx.fillStyle=gradient;
		ctx.fillText("GameOver !",canvas.width/2,canvas.height/2);
	
	}

	function detectCollision(){

		var i,j;
		var tileWidth = 50;
		var tileHeight = 50;

		i = Math.floor(player.x/tileWidth);
		j = Math.floor(player.y/tileHeight);

		if(typeof(map)!="undefined"){
			var collideColor = (player.color == "black") ? 0xffffffff : 0xff;
					
					if(map.getAt(i, j + 1) == collideColor && (j+1)*tileHeight-player.y<=player.radius){
						player.isColliding = true;
					}

					else if(map.getAt(i, j-1) == collideColor && player.y-2*player.radius - ((j-1)*tileHeight+tileHeight) <= player.radius){
						player.isColliding = true;
						//player.isCollidingWithCeiling = true;
					}

					if(map.getAt(i + 1, j) == collideColor && (i+1)*tileWidth - player.x <= player.radius) {
						player.isCollidingWithWalls = true;
					}
					else if(map.getAt(i-1 ,j) == collideColor && player.x - ((i-1)*tileWidth+tileWidth) <= player.radius) {
						player.isCollidingWithWalls = true;
					}	

					if(player.isColliding){
						console.log(player.isColliding);
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
			detectCollision();
			if(pourblood){
				draw_blood();
				GameOver()	;
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
				terrain.push(new Floor(i*50,j*50,map.getAt(i,j))); //
			}
		}
	}

	function startGame(){

		var img = new Image();
		img.src = 'level1.png';
		img.onload = function() {
			map = parseMap(img);
			console.log(map);
			loadMap(map);

		}
		player.reset();
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

		ctx.drawImage(image, 0, 0);
		var i, j, k;
		for(i = 0; i < grid.width; i++) {
			for(j = 0; j < grid.height; j++) {
				var dat = ctx.getImageData(i, j, 1, 1); // x,y,width,height
				val = 0;
				for(k = 0; k < 4; k++) {
					val = val << 8 | dat.data[k];
				}
				grid[i * grid.width + j] = val;
			}
		}
		return grid;
	}
	startGame();

})()
