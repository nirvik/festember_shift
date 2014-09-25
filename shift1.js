(function(){
window.fbAsyncInit = function() {
    // init the FB JS SDK
    FB.init({
      appId      : '810528735676835',
      status     : true,
      xfbml      : true
    });

  };

  // Load the SDK asynchronously
  (function(d, s, id){
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {return;}
     js = d.createElement(s); js.id = id;
     js.src = "//connect.facebook.net/en_US/all.js";
     fjs.parentNode.insertBefore(js, fjs);
   }(document, 'script', 'facebook-jssdk'));

function FBShareOp(){
    var product_name   =    'SHIFT';
    var description    =    'Is the floor the roof? Is the roof the floor? Find the answers to all the above questions and more in this puzzle platformer!';
    var share_image    =    'http://festember.com/~games/shift/logo.png';
    var share_url      =    'http://festember.com/~games/shift';
    FB.ui({
        method: 'feed',
        name: product_name,
        link: share_url,
        picture: share_image,
        description: description

    }, function(response) {
        if(response && response.post_id){}
        else{}
    });

}

	/* Todo

		Load the next level when dest reached
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
	var level =0;
	var won = false;
	var rotateToggle = 0;
	var map;
	var req_id;
	var now = "level"+level;
	var spawn = {'x':0,'y':0};
	var dest = {'x':0,'y':0};
	var HashMap = {
		
		'brown': {'map_color':'yellow','obstacles':[],'toColor1':'black','toColor2':'black'},
		'pink' : {'map_color':'purple','obstacles':[],'toColor1':'white','toColor2':'white'},
		'maroon' : {'map_color':'lime','obstacles':[],'toColor1':'white','toColor2':'white'},
		'orange' : {'map_color':'gray','obstacles':[],'toColor1':'black','toColor2':'white'},
		'violet' : {'map_color':'indigo','obstacles':[],'toColor1':'white','toColor2':'black'},
		'gold'	: {'map_color':'silver','obstacles':[],'toColor1':'white','toColor2':'black'}
	};

	var messages = {
		
		'level0': {
					'msg':'Welcome to SHIFT,your not so oridinary puzzle platformer',
					'posx' : 5,
					'posy' : canvas.height/5,

					'msg2':'Use arrow keys to RUN Right & Left',
					'posx2' : 5,
					'posy2' : (canvas.height/4)+20
		}, 

		'level1' : {

				'msg' : 'Press	Space 	To Jump!',
				'posx' : 5,
				'posy' : canvas.height/5
		},

		'level2' :{

				'msg' : 'Grab the key to ',
				'posx' : 5,
				'posy' : canvas.height/4,
				
				'msg2'	: 'Unlock the secret passage',
				'posx2' : 5,
				'posy2' : (canvas.height/4)+20
		},

		'level3' :{
				'msg' : 'Sometimes The Only Thing Left To Try Is SHIFT',
				'posx' : 5,
				'posy' : canvas.height/5

		},
		
	};

	var HashColor = {
		/*
			Multiple UInt32 keys -> color 
		*/
		255:'black',
		4294967295: 'white',
		65535: 'blue',
		8388863: 'green',
		1677721855: 'red',	
		1695122687 : 'pink',
		4103782911 : 'purple',
		2046830335 : 'lime',
		1842345727 : 'maroon',
		2189099263 : 'gold',
		1614353407 : 'silver',
		2509608447 : 'gray',
		4066714367 : 'orange',
		11464703 : 'brown',
		4294902015 : 'yellow',
		
		1258310143 : 'violet',
		1141793535 : 'purple',
		3435973887	: 'silver',
		1179010815 : 'gray',
		4137056767 : 'indigo',
		4153679359 : 'gold',
		3959459071 : 'pink'
	};

	var obstacleColors = [
		3923788543,
		4103782911,
		1842345727,
		1695122687,
		2046830335,
		2189099263,
		4066714367,
		11464703,
		4294902015,
		1258310143,
		1141793535,	
		1179010815,
		4137056767,
		4153679359,
		3959459071,

		2509608447
	];

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
			'level0' : './imgs/intro.png',
			'level1' : './imgs/intro1.bmp',
			'level2' : './imgs/level0.png',
			'level3' : './imgs/intro4.png',
			'level4' : './imgs/level1.png',
			'level5' : './imgs/level2.png',
			'level6' : './imgs/level3.png',
			'level7' : './imgs/level4.png',
			'door'	 : './imgs/door.png',
			'key'	 : './imgs/key.png',
			'lock'	 : './imgs/Lock.png',
			'obstacle' : './imgs/obstacle.png'
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
					//console.log("All resources have been loaded");
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


	// Map Parser
	function parseMap(image) {
		var tempCanvas = document.createElement('canvas'),
		ctx = tempCanvas.getContext('2d');
		ctx.globalCompositeOperation = 'source-over';
		var grid = new Uint32Array(image.width * image.height);
		grid.width = tempCanvas.width = image.width;
		grid.height = tempCanvas.height = image.height;
		
		grid.getAt = function(i, j) {
			return grid[i * grid.width + j];
		}

		grid.assign = function(i,j,value){
			grid[i * grid.width + j] = value;
		}

		grid.clear = function(){
			var i, j, k;
			for(i = 0; i < grid.width; i++) {
				for(j = 0; j < grid.height; j++) {
					grid[i * grid.width + j] = 0;
				}
			}	
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
				if(!(val == 4294967295 || val == 255)){
				}
			}
		}
		return grid;
	}


	function loadMap(map){

		var i,j;
		for(i=0;i<map.width;i++){
			for(j=0;j<map.height;j++){
				(function(){
					if(map.getAt(i,j)==8388863){
						spawn.x = i*50 + 50/2;
						spawn.y = j*50 + 50/2;
						player.reset();
						map.assign(i,j,4294967295);
					}
					terrain.push(new Floor(i*50,j*50,map.getAt(i,j)));

					var temp_terrain = terrain[terrain.length-1];
					if(temp_terrain.color in HashMap){
						HashMap[temp_terrain.color].obstacles.push(temp_terrain);
					}
				})();
			}
		}


		for(var keys in HashMap){
			(function(){
				if(HashMap[keys].obstacles.length==1){		
					for(i=0;i<terrain.length;i++){
						
						if(terrain[i].color == HashMap[keys].map_color){ //get the color of the obstacle right
							HashMap[keys].obstacles.push(terrain[i]);
						}
					}
				}
			})();
		}	
	}
	// End of Map parser

	function clearHashMap(){
		for(var keys in HashMap){
			(function(){
				if(HashMap[keys].obstacles.length){
					HashMap[keys].obstacles = [];
				}
			})();
		}
		return ;
	}

	function clearTerrain(){
		terrain = [];
		return;
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
		player.color = "black";
		player.onObstacle = false;

		Vector.call(player,0,0,player.dx,player.dy);

		player.update = function(){

			if(player.onObstacle){
				KeyStatus.shift = false;
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

			if(KeyStatus.space && !player.isJumping){
				player.dy = -player.velocity * player.sign ;
				player.isJumping = true;
			}


			if(player.isColliding){
				resolveCollision();
			}
	
			else{				
				player.dy+=(player.gravity * player.sign * player.dt) ;
				if(Math.abs(player.dy)>=5){
					player.dy = 4*player.sign; // Dont let it go beyond 6 as it fucks up the collision
				}
			}
			
			// If it just collides against the floor then its cool
			if(player.isColliding && KeyStatus.space){
				player.dy = -player.velocity * player.sign;
				player.isJumping = true; 
				player.isColliding = false;
				KeyStatus.space = false;
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
		this.color = HashColor[value];
		this.restitution = 0;
		this.mass = Infinity ;

		this.draw = function(){

			if(this.color == "red"){
				ctx.drawImage(AssetLoader.imgs['thorns'],this.x,this.y,this.width,this.height);
			}
			else if(this.color == "blue"){
				ctx.drawImage(AssetLoader.imgs['door'],this.x,this.y,this.width,this.height);	
			}
			else if(this.color in HashMap){
				ctx.drawImage(AssetLoader.imgs['key'],this.x,this.y,this.width,this.height);		
			}
			else if(this.color == "silver" || this.color == "green"){
				ctx.drawImage(AssetLoader.imgs['obstacle'],this.x,this.y,this.width,this.height);			
			}
			else if(this.color == "purple" || this.color == "indigo" || this.color == "gray" || this.color == "yellow" || this.color=="lime"){
				ctx.drawImage(AssetLoader.imgs['lock'],this.x,this.y,this.width,this.height);				
			}
			else{
				ctx.fillStyle = this.color;			
				ctx.fillRect(this.x,this.y,this.width,this.height);
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
				VelAlongNormal = 2*(player.velocity-player.dy*player.sign) * Math.cos(theta*Math.PI/180) * player.sign;
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

	function keyGrabbed(key,i,j){
		
		if(!(key in HashMap)){
			return;
		}

		
		for(var obstacle in HashMap[key].obstacles){
			//changing the color of the obstacles also 
			var x = Math.floor(HashMap[key].obstacles[obstacle].x/50);
			var y = Math.floor(HashMap[key].obstacles[obstacle].y/50);

			//Changing the inherent property of the map 
			if(HashMap[key].obstacles[obstacle].color==key){
				if(HashMap[key].toColor1 == "black"){
					map[x*map.width + y] = 255;
				}
				else{
					map[x*map.width + y] = 4294967295;	
				} 
			}

			else{
				if(HashMap[key].toColor2 == "black"){
					map[x*map.width + y] = 255;
				}
				else{
					map[x*map.width + y] = 4294967295;	
				} 
			}

			//Changing the display of the map
			HashMap[key].obstacles[obstacle].color = (HashMap[key].obstacles[obstacle].color==key)?HashMap[key].toColor1:HashMap[key].toColor2;
		}
	}

	function isCollidableColor(list,i,j){
		/*if brown or purple or orange or violet or gold
			then return true
		else 
			return false
		*/
		if(list.indexOf(map.getAt(i,j))>0){
			return true;
		}
		else return false;
	}

	function detectCollision(){

		var i,j;
		var tileWidth = 50;
		var tileHeight = 50;

		i = Math.floor(player.x/tileWidth);
		j = Math.floor(player.y/tileHeight);
	
		if(typeof(map)!="undefined"){
				
				var deathColor =   1677721855;

				// HAVE TO MAKE THIS AN ARRAY OF POSSIBLE OBSTACLE COLORS 
				
				var collideColor = (player.color == "black") ? 0xff : 0xffffffff;


				if(map.getAt(i,j) == 65535 && player.dy==0 ){
					won = true;
					return ;
				}

				if(player.sign>0){
					//Map end Boundary checks 
					if(player.y+2*player.radius>=canvas.height){
						player.isColliding = true;
						player.normal.y = -1;
						player.onObstacle = true;
					}

					else if(player.y-player.radius<=0){
						player.isColliding = true;
						player.normal.y =1;
						player.onObstacle = true;
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

					if((map.getAt(i, j + 1) == collideColor || map.getAt(i,j+1)==deathColor || isCollidableColor(obstacleColors,i,j+1)) && (j+1)*tileHeight-player.y<=player.radius ){
						player.isColliding = true;
						player.normal.y = -1;
						if(map.getAt(i,j+1)==deathColor){
							pourblood = true;
						}

						if(isCollidableColor(obstacleColors,i,j+1)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i,j+1)]
							keyGrabbed(key,i,j+1);
						}
					}

					else if((map.getAt(i, j-1) == collideColor || map.getAt(i,j-1)==deathColor || isCollidableColor(obstacleColors,i,j-1)) && player.y-(player.radius)/4 - ((j-1)*tileHeight+tileHeight) <= player.radius){
						player.isColliding = true;
						player.normal.y = 1;
						if(map.getAt(i,j-1)==deathColor){
							pourblood = true;
						}

						if(isCollidableColor(obstacleColors,i,j-1)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i,j-1)]
							keyGrabbed(key,i,j-1);
						}
					}

					if((map.getAt(i + 1, j) == collideColor || map.getAt(i+1,j)==deathColor ||  isCollidableColor(obstacleColors,i+1,j)) && (i+1)*tileWidth - player.x <= player.radius){ 
						player.isCollidingWithWalls = true;
						player.normal.x = -1;

						if(isCollidableColor(obstacleColors,i+1,j)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i+1,j)]
							keyGrabbed(key,i+1,j);
						}
					}

					else if((map.getAt(i-1 ,j) == collideColor || map.getAt(i-1,j)==deathColor || isCollidableColor(obstacleColors,i-1,j)) && player.x-player.radius/4- ((i-1)*tileWidth+tileWidth) <= player.radius ){
						player.isCollidingWithWalls = true;
						player.normal.x = 1;


						if(isCollidableColor(obstacleColors,i-1,j)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i-1,j)]
							keyGrabbed(key,i-1,j);
						}
					}
				}

				else{

					//Map boundary checks 
					if(player.y+player.radius<=0){
						player.isColliding = true;
						player.normal.y = 1*player.sign;
						player.onObstacle = true;
					}

					else if(player.y-player.radius>=canvas.height){
						player.isColliding = true;
						player.normal.y =-1*player.sign;
						player.onObstacle = true;
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

					if((map.getAt(i, j) == collideColor || map.getAt(i,j)==deathColor ||isCollidableColor(obstacleColors,i,j)) && ((j)*tileHeight+tileHeight)-player.y<=player.radius ){
						player.isColliding = true;
						player.normal.y = 1*player.sign;
						if(map.getAt(i,j)==deathColor){
							pourblood = true;
						}

						if(isCollidableColor(obstacleColors,i,j)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i,j)]
							keyGrabbed(key,i,j);
							//HashMap[map.getAt(i,j+1) & 0xff].status = true;
						}
					}

					else if((map.getAt(i, j+1) == collideColor || map.getAt(i,j+1)==deathColor || isCollidableColor(obstacleColors,i,j+1)) &&  ((j+1)*tileHeight)-player.y-player.radius<= player.radius){
						player.isColliding = true;
						player.normal.y = -1*player.sign;
						if(map.getAt(i,j+1)==deathColor){
							pourblood = true;
						}

						if(isCollidableColor(obstacleColors,i,j+1)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i,j+1)]
							keyGrabbed(key,i,j+1);
						}
					}
					if((map.getAt(i+1,j+1) == collideColor || map.getAt(i+1,j+1)==deathColor ||isCollidableColor(obstacleColors,i+1,j+1)) && (i+1)*tileWidth - player.x <= player.radius){ 
						player.isCollidingWithWalls = true;
						player.normal.x = -1;


						if(isCollidableColor(obstacleColors,i+1,j+1)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i+1,j+1)]
							keyGrabbed(key,i+1,j+1);
						}
					}

					else if((map.getAt(i-1,j+1) == collideColor || map.getAt(i-1,j+1)==deathColor || isCollidableColor(obstacleColors,i-1,j+1)) && player.x-player.radius- (i)*tileWidth <= player.radius ){
						player.isCollidingWithWalls = true;
						player.normal.x = 1;

						if(isCollidableColor(obstacleColors,i-1,j+1)){
							player.onObstacle = true;
							var key = HashColor[map.getAt(i-1,j+1)]
							keyGrabbed(key,i-1,j+1);
						}
					}	
				}



		}

	}

	function animate(){
		if(!finished){
			req_id = requestAnimFrame(animate);
			ctx.clearRect(0,0,canvas.width,canvas.height);
			updateTerrain();
			player.update();
			player.draw();
			if(now in messages){
				ctx.font="15px Verdana";
				ctx.fillStyle="black";
				ctx.fillText(messages[now].msg,messages[now].posx,messages[now].posy);	
				if('msg2' in messages[now]){
					ctx.font="15px Verdana";
					ctx.fillStyle="black";
					ctx.fillText(messages[now].msg2,messages[now].posx2,messages[now].posy2);	
						
				}		
			}
			player.isColliding = false;
			player.isCollidingWithWalls = false;
			player.onObstacle = false;
			detectCollision();

			if(won){
				cancelAnimationFrame(req_id);
				level = level + 1;
				won = 0;
				clearTerrain();
				clearHashMap();
				map.clear();
				if(level<8){
					startGame();
				}

				else{
					ctx.clearRect(0,0,canvas.width,canvas.height);
					ctx.font="20px Verdana";
					ctx.fillStyle="black";
					ctx.fillText('Awesome work ! More levels Next Festember ;)',0,200);
					setTimeout(FBShareOp(),2000)
				}
			}
			if(pourblood){
				cancelAnimationFrame(req_id);
				pourblood = false;
				clearTerrain();
				clearHashMap();
				map.clear();
				GameOver("YOU JUST DECIDED TO LAND ON THE THORNS! Superb :* ");
				setTimeout(startGame, 2000);
			}

			if(rotateToggle){
				$('.box').toggleClass('box-rotate');
				rotateToggle = false;
			}

		}
	}



	function startGame(){

		now = "level" + level;
		map = parseMap(AssetLoader.imgs[now]);
		loadMap(map);
		
		animate();

	}

	function GameOver(msg){

		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.font="20px Verdana";
		var gradient=ctx.createLinearGradient(0,0,canvas.width,0);
		gradient.addColorStop("0","magenta");
		gradient.addColorStop("0.5","blue");
		gradient.addColorStop("1.0","red");
		ctx.fillStyle=gradient;
		ctx.fillText(msg,0,canvas.height/5);
		if(player.color == 'white'){
			$('.box').removeClass('box-rotate');
			rotateToggle = false;
			player.portal = player.portal^1;
			player.sign = 1;
			player.update();	
			console.log(player.portal)
		}		
	}	

	AssetLoader.downloadAll();
})()
