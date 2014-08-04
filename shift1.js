(function(){

	//TO DO : invert the canvas on shift button
	//		  Blood particle effect
	//		  Sexy map with destination and spikes 

	var canvas = document.getElementById("mycanvas"),
	ctx = canvas.getContext("2d");
	console.log("hey this is ctx " + ctx);

	var width = canvas.width;
	var height = canvas.height;

	var player = {};
	var terrain = [];
	var quadtree ;
	var bloodParticles = []; //Release when the player dies 
	var finished = 0;
	var pourblood = false;
	var rotateToggle = 0;

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
		this.dx = dx;
		this.dy = dy;
	}

	Vector.prototype.advance = function(){
		
		this.x = this.x + this.dx;
		this.y = this.y + this.dy;

	}
	
	var player = function(player){

		// Player is a circle
		player.radius = 5;
		player.type = "circle";
		player.collidableWith = "floor";

		player.dx = 0;
		player.dy = 0;
		player.isJumping = false;
		player.gravity = 1;

		player.isCollidingWithGround = false;
		player.isColliding = false;
		

		// Portal values keeps toggling based on 		
		player.portal = 1;
		player.sign = 1;

		Vector.call(player,0,0,player.dx,player.dy);

		var jumpCounter = 0;
		player.update = function(){

			//temporary Gameover Clause
			if(KeyStatus.space){

				console.log('space is pressed')
				pourblood = true;

			}

			if(KeyStatus.shift && player.isColliding){
				
				player.portal = player.portal^1; //Invert the physics metrics 
				
				if(player.portal){
					player.sign = 1;
				}
				else{
					player.sign = -1; 
				}
				console.log(player.portal);
				rotateToggle = rotateToggle^1;
				KeyStatus.shift = false;
			}

			if(KeyStatus.right){
				//console.log("right pressed");
				player.dx = 4*player.sign;
			}

			if(KeyStatus.left){
				player.dx = -4*player.sign;
			}

			if(!KeyStatus.left && !KeyStatus.right){
				player.dx = 0;
			}

			if(KeyStatus.up && !player.isJumping){
			//	console.log("jump dhanlaxmi");
				player.dy = -5 * player.sign;
				player.isJumping = true;
				jumpCounter = 20;
			}

			if(player.isJumping && jumpCounter){
				player.dy = -5 * player.sign;
			}

			jumpCounter = Math.max(0,jumpCounter-1);

			if(player.isColliding){
				player.dy = 0;
//				console.log("colliding at y position " + player.y)
			}
			else{
				player.dy+=(player.gravity*player.sign);
			}

			if(player.isColliding && KeyStatus.up){
				player.dy = -5*player.sign ;
				player.isJumping = false;
				player.isColliding = false;
			}

			this.advance();
		};

		player.reset = function(){

			player.x = 60;
			player.y = 120;
		};

		player.draw = function(){

			if(player.portal){
				ctx.fillStyle = "black";
				ctx.beginPath();
				ctx.arc(player.x,player.y,player.radius,0,2*Math.PI);
				ctx.closePath();
				ctx.fill();
			}
			else {
				ctx.fillStyle = "white";
				ctx.beginPath();
				ctx.arc(player.x,player.y+2*player.radius,player.radius,0,2*Math.PI);
				ctx.closePath();
				ctx.fill();
			}
			
		};
		return player;
	}(Object.create(Vector.prototype));

	function floor(x,y){

		this.type = "floor";
		this.collidableWith = "player";
		this.x = x;
		this.y = y;
		this.width = 400;
		this.height = 400;


		this.draw = function(){
			ctx.fillStyle = "black";
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

	function QuadTree(boundbox,lvl){

		this.boundbox = boundbox || {
				x:0,
				y:0,
				width:0,
				height:0
			};

		this.objects = [];
		this.maxLevel = 5;
		this.maxObjects = 10;

		this.level = lvl || 0;
		this.nodes = [];

		this.clear = function(){
			
			this.objects = [];
			for(var i = 0;i<this.nodes.length;i++){
				this.nodes.clear();
			}

			this.nodes = [];
		}

		this.getAllObjects = function(returnedObject){

			for(var i=0;i<this.nodes.length;i++){
				this.nodes[i].getAllObjects(returnedObject);
			}

			for(var i=0;i<this.objects.length;i++){
				returnedObject.push(this.objects[i]);
			}

			return returnedObject;
		}

		this.findNearByObjects = function(returnedObject,obj){

			var index = this.getIndex(obj);

			if(index != -1 && this.nodes.length){
				this.nodes[index].findNearByObjects(returnedObject,obj);
			}

			for(var i=0;i<this.objects.length;i++){
				returnedObject.push(this.objects[i]);
			}

			return returnedObject;
		}


		this.getIndex = function(obj){

			var index = -1;
			var left = 0;
			var right = 0;
			var top = 0;
			var bottom = 0;
			var verticalMidPoint = this.boundbox.x + this.boundbox.width/2;
			var horizontalMidPoint = this.boundbox.y + this.boundbox.height/2;

			if(obj.type == "circle"){
				left = (obj.x < verticalMidPoint && obj.x + obj.radius < verticalMidPoint);
			}
			else{	
				left = (obj.x < verticalMidPoint && obj.x + obj.width < verticalMidPoint);
			}

			right = (obj.x > verticalMidPoint); 


			if(left){

				if(obj.type == "circle"){
					top = (obj.y + obj.radius < horizontalMidPoint && obj.y < horizontalMidPoint);
				}

				else{
					top = (obj.y + obj.width < horizontalMidPoint && obj.y < horizontalMidPoint)
				}

				bottom = (obj.y > horizontalMidPoint);

				if(top){
					index = 1;
				}

				else if(bottom){
					index = 2;
				}
			}

			if(right){

				if(obj.type == "circle"){
					top = (obj.y + obj.radius < horizontalMidPoint && obj.y < horizontalMidPoint);
				}
				else{
					top = (obj.y + obj.width < horizontalMidPoint && obj.y < horizontalMidPoint)
				}

				bottom = (obj.y > horizontalMidPoint);

				if(top){
					index =  0;
				}

				else if(bottom){
					index =  3;
				}
			}


			return index;
		}


		this.split = function(){

			var subWidht = this.boundbox.width/2 || 0;
			var subHeight = this.boundbox.height/2 || 0;

			this.nodes[0] = new QuadTree({
				x : this.nodes[0].x + subWidht,
				y : this.nodes[0].y,
				width : subWidht,
				height : subHeight
			},level+1);


			this.nodes[1] = new QuadTree({
				x : this.nodes[1].x,
				y : this.nodes[1].y,
				width : subWidht,
				height : subHeight
			},level+1);

			this.nodes[2] = new QuadTree({
				x : this.nodes[2].x,
				y : this.nodes[2].y + subHeight,
				width : subWidht,
				height : subHeight
			},level+1);

			this.nodes[3] = new QuadTree({
				x : this.nodes[3].x + subWidht,
				y : this.nodes[3].y,
				width : subWidht,
				height : subHeight
			},level+1);

		}


		this.insert = function(obj){
			
			if(typeof(obj) == "undefined"){
				return ;
			}

			if(obj instanceof Array){
				for(var i=0;i<obj.length;i++){
					this.insert(obj[i]);
				}
			}

			if(this.nodes.length){

				var index = this.getIndex(obj);
				if(index != -1){
					this.nodes[index].insert(obj);
				}
			}

			this.objects.push(obj);

			if(this.objects.length > this.maxLevel && this.level < this.maxLevel){
				//to prevent infinite splitting 
				if(this.nodes[0] == null){
					this.split();
				}

				var i = 0;
				while(i<this.objects.length){

					var index = this.getIndex(this.objects[i]);
					if(index != -1){
						this.nodes[index].insert(this.objects.splice(i,1));
					}
					else{
						i++;
					}
				}
			}
		}
	}

	function detectCollision(){

		var objects = [];
		quadtree.getAllObjects(objects);
		
		for(var x=0;x<objects.length;x++){
			quadtree.findNearByObjects(obj=[],objects[x]);
			
			for(var y=0;y<obj.length;y++){
				if(objects[x].collidableWith == obj[y].type){
					if(objects[x].type == "circle"){

						// if circle is black
						if(objects[x].portal){
							if(objects[x].y + objects[x].radius >= obj[y].y){
									objects[x].isColliding = true;	
							} 
						}

						//if circle is white
						else{
							//Some really dirty manipulation 
							if(objects[x].y+1.5*objects[x].radius-objects[x].radius <= obj[y].y){
									objects[x].isColliding = true;	
							}	
						}
					}
				}
			}
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

	function animate(){

		if(!finished){
		
			requestAnimFrame(animate);
			ctx.clearRect(0,0,canvas.width,canvas.height);
			quadtree.clear();
			quadtree.insert(player);
			quadtree.insert(terrain);

			updateTerrain();
			player.update();
			player.draw();
			
			detectCollision();
			
			//pourblood when space is pressed 
			if(pourblood){
				draw_blood();
				GameOver()	;
			}
			
			if(rotateToggle){
				$('.box').toggleClass('box-rotate');
			//	setTimeout(function(){ $('.box').removeClass('box-rotate'); },1000);
				rotateToggle = false;
			}
			
		}
		else{
			GameOver();
		}

	}

	function startGame(){

		quadtree = new QuadTree({
			x:0,
			y:0,
			width : canvas.width,
			height : canvas.height
		});

		terrain.push(new floor(0,160));
		player.reset();
		animate();
	}

	function parseMap(img) {
		var tempCanvas = document.createElement('canvas'),
		ctx = tempCanvas.getContext('2d');
		var grid = new Uint32Array(img.width * img.height);
		grid.width = tempCanvas.width = img.width;
		grid.height = tempCanvas.height = img.height;
		grid.getAt = function(i, j) {
			return grid[i + j * grid.width];
		}
		ctx.drawImage(img, 0, 0);
		var i, j, k;
		for(i = 0; i < grid.width; i++) {
			for(j = 0; j < grid.height; j++) {
				var dat = ctx.getImageData(i, j, 1, 1),
				val = 0;
				for(k = 0; k < 4; k++) {
					val = val << 8 | dat[k];
				}
				grid[j * grid.width + i] = val;
			}
		}
		return grid;
	}
	startGame();

})()