/* Make cows a gameObject, they have data attributes and reference to their displayObject */

var Game = {

	COW_SPAWN_DISTANCE: 150,
	UFO_X_POS: 30,
	UFO_BEAM_LEFT_POS: 0,
	UFO_BEAM_RIGHT_POS: 0,
	UFO_BEAM_MAX_HEIGHT: 339,
	UFO_BEAM_SPEED: 20,
	UFO_SUCK_SPEED: 5,
	UFO_MOVE_SPEED: 10,

    viewport: {
        width: 0,
        height: 0
    },
    $canvas: null,
    stage: null,

    clouds: [],
	grass: null,
    ufo: {
		hull: null,
		beam: {
			height: 0,
			sprite: null
		}
	},
    cows: [],

	scrollSpeed: 5, // px per tick

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
		},
		beam: {
			images: ['/images/ufo_beam.png'],
			frames: {width:46, height:34},
			animations: {
				munch: [0,3, 'munch', 5]
			}
		}
	},

    init: function() {

		var game = this;

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
			else if (e.which === 32) {
				game.actionKeys.beam = true;
			}
		});

		$(document).on('keyup', function(e) {
			if (e.which === 40) {
				game.actionKeys.moveDown = false;
			}
			else if (e.which === 38) {
				game.actionKeys.moveUp = false;
			}
			else if (e.which === 32) {
				game.actionKeys.beam = false;
				game.beamOff();
			}
			else if (e.which === 80) {
				createjs.Ticker.setPaused(!createjs.Ticker.getPaused());
			}
		});

		$('button').on('click', function(e) {
			e.preventDefault();

			createjs.Ticker.setPaused(!createjs.Ticker.getPaused());
		});

        // build BG
        this.buildBg();

        // create UFO
		this.ufo.hull = new createjs.Bitmap("/images/ufo.png");
		this.ufo.hull.set({x: Game.UFO_X_POS, y: 200});
		this.stage.addChild(this.ufo.hull);

		Game.UFO_BEAM_LEFT_POS = Game.UFO_X_POS + 50;
		Game.UFO_BEAM_RIGHT_POS = Game.UFO_X_POS + 110;

		this._addCow(true);

        // start

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

		var img = new Image();
		img.src = '/images/grass_parallax.png';

		var matrix = new createjs.Matrix2D();
		matrix.translate(0, -3);

		var g = new createjs.Graphics().beginBitmapFill(img, 'repeat-x', matrix);
		g.drawRect(0,291, this.viewport.width + 116,14);
		this.grass = new createjs.Shape(g);
		this.grass.z = 3;
		this.stage.addChild(this.grass);
	},

    tick: function(event, target, game) {
        if (event.paused) {
            return;
        }

		var i;

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
        for (i = 0; i < this.clouds.length; i++) {

			var elem = this.clouds[i];

            var newX = this._getScrolledX(elem);

            if (newX <= -300) {
                newX = this.viewport.width + Math.round(Math.random() * 200);
            }

            elem.set({x: newX});
        }

		// move grass
		newX = this._getScrolledX(this.grass);

		if (newX <= -116) {
			newX = 0;
		}
		this.grass.x = newX;

		// ensure we have a steady supply of cows
		var lastCow = this.cows[this.cows.length-1];
		if (lastCow.x <= this.viewport.width - this.COW_SPAWN_DISTANCE) {
			this._addCow();
		}

		// move the cows
		for (i = 0; i < this.cows.length; i++) {
			elem = this.cows[i];

			if (elem.sucked) {
				var newY = elem.y - Game.UFO_SUCK_SPEED;
				elem.set({y: newY});

				if (elem.y <= this.ufo.hull.y + 30) {
					this.removeCow(elem);
				}
			}
			else {
				newX = this._getScrolledX(elem);

				if (newX <= -100) {
					this.cows.splice(i, 1);
					continue;
				}

				elem.set({x: newX});
			}
		}

		// if the beam is on - check if any cows can be sucked up
		if (this.actionKeys.beam) {
			if (this.ufo.beam.height > 100) {
				for(i = 0; i < this.cows.length; i++) {
					var cow = this.cows[i];

					if (!cow.sucked && cow.x <= Game.UFO_BEAM_RIGHT_POS && cow.x >= Game.UFO_BEAM_LEFT_POS) {
						var newCow = new createjs.Bitmap("/images/cow_2.png");

						newCow.set({x: cow.x, y: cow.y, z: cow.z});
						newCow.sucked = true;

						this.cows.splice(i, 1, newCow);

						this.stage.removeChild(cow);
						this.stage.addChild(newCow);
					}
				}
			}
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
		cow.sucked = false;

		this.cows.push(cow);
		this.stage.addChild(cow);
	},

	removeCow: function(cow) {
		var index = this.cows.indexOf(cow);

		this.cows.splice(index, 1);
		this.stage.removeChild(cow);
	},

	_getScrolledX: function(obj) {
		var x = this.scrollSpeed - (0.3 * obj.z);

		if (x <= 0) {
			x = 0.1;
		}

		return Math.round(obj.x - x);
	},

	moveUfo: function(dir) {
		var y = Game.UFO_MOVE_SPEED;

		if (dir === 'up') {
			y = y * -1;
		}

		y = this.ufo.hull.y + y;

		if (y <= 0) {
			y = 0;
		}
		else if (y >= 400) {
			y = 400;
		}

		this.ufo.hull.set({y: y});

	},

	beam: function() {

		if (this.ufo.beam.height === 0) {
			this.ufo.beam.sprite = new createjs.Bitmap("/images/beam_1.png");
			this.ufo.beam.sprite.sourceRect = new createjs.Rectangle(0,0,58,1);
			this.stage.addChild(this.ufo.beam.sprite);

			this.ufo.beam.height = 1;
		} else if (this.ufo.beam.height < (Game.UFO_BEAM_MAX_HEIGHT - Game.UFO_BEAM_SPEED)) {
			this.ufo.beam.height += Game.UFO_BEAM_SPEED;
			this.ufo.beam.sprite.sourceRect = new createjs.Rectangle(0,0,58,this.ufo.beam.height);
		}
		else {
			this.ufo.beam.height = Game.UFO_BEAM_MAX_HEIGHT;
			this.ufo.beam.sprite.sourceRect = new createjs.Rectangle(0,0,58,this.ufo.beam.height);
		}

		this.ufo.beam.sprite.set({x: this.ufo.hull.x + 41, y: this.ufo.hull.y + 77});
	},

	beamOff: function() {
		this.stage.removeChild(this.ufo.beam.sprite);
		this.ufo.beam.height = 0;
	}
};


$(document).ready(function() {
   Game.init();
});