'usestrict';

var Game = {

	COW_SPAWN_DISTANCE: 150,

    viewport: {
        width: 0,
        height: 0
    },
    $canvas: null,
    stage: null,

    clouds: [],
	grass: {
		shape: null,
		matrix: null,
		img: null,
		x: 0,
		z: 10
	},
    ufo: null,
    cows: [],

	scrollSpeed: 5, // px per tick
	ufoMoveSpeed: 5,

	actionKeys: {
		moveUp: false,
		moveDown: false,
		beam: false
	},

	spritesheets: {
		cow: {
			images: ['/images/cow_grass.png'],
			frames: {width:46, height:34},
			animations: {
				munch: [0,3, 'munch', 5]
			}
		}
	},

    init: function() {

        this.viewport.width = $(document).width();
        this.viewport.height = 438; //$(document).height();

        this.$canvas = $('#game');
        this.$canvas.attr({
            width: this.viewport.width,
            height: this.viewport.height
        });

        this.stage = new createjs.Stage(this.$canvas[0]);

        // preload assets

		// bind input
		$(document).on('keydown', function(e) {
			if (e.which === 40) {
				game.actionKeys.moveDown = true;
			}
			else if (e.which === 38) {
				game.actionKeys.moveUp = true;
			}
		});

		$(document).on('keyup', function(e) {
			if (e.which === 40) {
				game.actionKeys.moveDown = false;
			}
			else if (e.which === 38) {
				game.actionKeys.moveUp = false;
			}
		});

		$('button').on('click', function(e) {
			e.preventDefault();

			createjs.Ticker.setPaused(!createjs.Ticker.getPaused());
		});

        // build BG
        this.buildBg();

        // create UFO
		this.ufo = new createjs.Bitmap("/images/ufo.png");
		this.ufo.set({x: 30, y: 200});
		this.stage.addChild(this.ufo);

		this._addCow(true);

        // start

        var game = this;
        createjs.Ticker.addEventListener("tick", function(event, target) {
            game.tick(event, target, game);
        });

		createjs.Ticker.setFPS(30);
    },

    buildBg: function() {

		var cloud = new createjs.Bitmap("/images/cloud.png");

		var x = Math.round(Math.random() * this.viewport.width);

		cloud.set({x: x, y: 10, z: 10});

		this.clouds.push(cloud);
		this.stage.addChild(cloud);


		this.grass.img = new Image();
		this.grass.img.src = '/images/grass_parallax.png';

		this.grass.matrix = new createjs.Matrix2D();
		this.grass.matrix.translate(0, -3);

		var g = new createjs.Graphics().beginBitmapFill(this.grass.img, 'repeat-x', this.grass.matrix);
		g.drawRect(0,291, this.viewport.width,14);
		this.grass.shape = new createjs.Shape(g);
		this.stage.addChild(this.grass.shape);
	},

    tick: function(event, target, game) {
        if (event.paused) {
            return;
        }

		// handle input

		if (this.actionKeys.moveUp) {
			this.moveUfo('up');
		}
		else if (this.actionKeys.moveDown) {
			this.moveUfo('down');
		}

		if (this.actionKeys.beam) {
			this.beam();
		}

        // move clouds
        for (var i = 0; i < this.clouds.length; i++) {

			var elem = this.clouds[i];

            var newX = this._getScrolledX(elem);

            if (newX <= -300) {
                newX = this.viewport.width + Math.round(Math.random() * 200);
            }

            elem.set({x: newX});
        }

		// move grass
		newX = this._getScrolledX(this.grass);
		this.grass.x = newX;

		//console.log(newX);
		this.grass.matrix.translate(newX, -3);

		this.grass.shape.graphics.clear().beginBitmapFill(this.grass.img, 'repeat-x', this.grass.matrix).drawRect(0,291, this.viewport.width,14);

		//this.stage.addChild(this.grass.shape);


		// ensure we have a steady supply of cows
		var lastCow = this.cows[this.cows.length-1];
		if (lastCow.x <= this.viewport.width - this.COW_SPAWN_DISTANCE) {
			this._addCow();
		}

		for (var i = 0; i < this.cows.length; i++) {
			elem = this.cows[i];

			newX = this._getScrolledX(elem);

			if (newX <= -100) {
				this.cows.splice(i, 1);
				continue;
			}

			elem.set({x: newX});
		}

		this.stage.update();
    },

	_addCow: function(immediate) {
		var muncher = (Math.random() >= 0.6);

		var cow;

		if (muncher) {
            var spritesheet = new createjs.SpriteSheet(this.spritesheets.cow);
			cow = new createjs.BitmapAnimation(spritesheet);
			cow.gotoAndPlay('munch');
		}
		else {
			cow = new createjs.Bitmap("/images/cow.png");
		}

		var y = 300 + Math.round(Math.random() * 100);
		var x = this.viewport.width;

		if (!immediate) {
			x += Math.round(Math.random() * 200);
		}

		cow.set({x: x, y: y, z: 3});

		this.cows.push(cow);
		this.stage.addChild(cow);
	},

	_getScrolledX: function(obj) {
		var x = this.scrollSpeed - (0.3 * obj.z);

		if (x <= 0) {
			x = 0.1;
		}

		return obj.x - x;
	},

	moveUfo: function(dir) {
		var y = this.ufoMoveSpeed;

		if (dir === 'up') {
			y = y * -1;
		}

		y = this.ufo.y + y;

		if (y <= 0) {
			y = 0;
		}
		else if (y >= 400) {
			y = 400;
		}

		this.ufo.set({y: y});
	}
};


$(document).ready(function() {
   Game.init();
});