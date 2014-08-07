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
				this.nodes[i].clear();
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
				x : this.boundbox.x + subWidht,
				y : this.boundbox.y,
				width : subWidht,
				height : subHeight
			},this.level+1);


			this.nodes[1] = new QuadTree({
				x : this.boundbox.x,
				y : this.boundbox.y,
				width : subWidht,
				height : subHeight
			},this.level+1);

			this.nodes[2] = new QuadTree({
				x : this.boundbox.x,
				y : this.boundbox.y + subHeight,
				width : subWidht,
				height : subHeight
			},this.level+1);

			this.nodes[3] = new QuadTree({
				x : this.boundbox.x + subWidht,
				y : this.boundbox.y,
				width : subWidht,
				height : subHeight
			},this.level+1);

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

						if(objects[x].x+objects[x].radius>canvas.width || objects[x].x-objects[x].radius<0 || 
							objects[x].y+objects[x].radius>canvas.height || objects[x].y-objects[x].radius<0){
							objects[x].isColliding = true;
						}
						// if circle is black
						if(objects[x].portal){
							if(obj[y].color=="black"){
								if(objects[x].x <= obj[y].x + obj[y].width  && objects[x].x + objects[x].radius  >= obj[y].x &&
		objects[x].y < obj[y].y + obj[y].height && objects[x].y + objects[x].radius > obj[y].y){
										objects[x].isColliding = true;
								}
							} 
						}

						//if circle is white
						else{
							if(obj[y].color=="white"){
								if(objects[x].x <= obj[y].x + obj[y].width  && objects[x].x + objects[x].radius  >= obj[y].x &&
		objects[x].y < obj[y].y + obj[y].height && objects[x].y + objects[x].radius > obj[y].y){
										objects[x].isColliding = true;
									}
							}
							
						}
					}
				}
			}
		}
	}
