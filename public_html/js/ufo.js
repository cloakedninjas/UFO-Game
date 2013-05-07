var Game = {

    // constants
	COW_SPAWN_DISTANCE: 150,
	UFO_X_POS: 100,
	UFO_BEAM_LEFT_POS: 0,
	UFO_BEAM_RIGHT_POS: 0,
	UFO_BEAM_MAX_HEIGHT: 339,
	UFO_BEAM_SPEED: 20,
	UFO_SUCK_SPEED: 5,
	UFO_MOVE_SPEED: 10,

    // preload stuff
	assets: [
		'/images/beam_1.png',
		'/images/cloud.png',
		'/images/cow.png',
		'/images/cow_2.png',
		'/images/cow_grass.png',
		'/images/grass_parallax.png',
		'/images/ufo.png'
	],

	assetsLoaded: 0,

    // core game
    viewport: {
        width: 0,
        height: 0
    },
    $canvas: null,
    stage: null,
    scrollSpeed: 5, // px per tick
    zIndexDirty: false,
    actionKeys: {
        moveUp: false,
        moveDown: false,
        beam: false
    },

    // game elements
    clouds: [],
	grass: null,
    ufo: null,
    cows: [],

    // animations
	spritesheets: {
		cow: {
			images: ['/images/cow_grass.png'],
			frames: {width:46, height:34, regX: 23, regY:34},
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
        this.viewport.width = 800; //$(document).width();
        this.viewport.height = 438; //$(document).height();

        this.$canvas = $('#game');
        this.$canvas.attr({
            width: this.viewport.width,
            height: this.viewport.height
        });

        this.stage = new createjs.Stage(this.$canvas[0]);

		var i;
		var game = this;
        // preload assets
		for (i = 0; i < this.assets.length; i++) {
			img = new Image();
			img.src = this.assets[i];
			img.onload = function() {
				game.preloadComplete();
			}
		}

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
    },

	preloadComplete: function() {
		this.assetsLoaded++;

		if (this.assetsLoaded == this.assets.length) {
			this.buildGame();
		}
	},

	buildGame: function() {
		// build BG
		this.buildBg();

		// create UFO
        this.ufo = new GameObject();
        this.ufo.setDisplayObject(new createjs.Bitmap("/images/ufo.png"));
		this.ufo.set({x: Game.UFO_X_POS, y: 200, z: 0, regX: 69, regY: 38});
        this.ufo.addToStage();

        this.ufo.beam = new GameObject();
        this.ufo.beam.height = 0;

		Game.UFO_BEAM_LEFT_POS = Game.UFO_X_POS - 32;
		Game.UFO_BEAM_RIGHT_POS = Game.UFO_X_POS + 34;

		this.addCow(true);

		// start

		var game = this;
		createjs.Ticker.addEventListener("tick", function(event, target) {
			game.tick(event, target);
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

    tick: function(event, target) {
        if (event.paused) {
            return;
        }

        var i;

        if (this.zIndexDirty) {
            this.stage.children.sort(this.zIndexCompare);
            this.zIndexDirty = false;
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
        for (i = 0; i < this.clouds.length; i++) {

			var elem = this.clouds[i];

            var newX = this._getScrolledX(elem);

            if (newX <= -300) {
                newX = this.viewport.width + Math.round(Math.random() * 200);
            }

            //elem.set({x: newX});
			elem.x = newX;
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
			this.addCow();
		}

		// move the cows
		for (i = 0; i < this.cows.length; i++) {
			cow = this.cows[i];

			if (cow.sucked) {
				var newY = cow.y - Game.UFO_SUCK_SPEED;
				cow.set({y: newY});

                if (!cow.startled && cow.y <= 300) {
                    // swap out cow for startled

                    var newCow = new GameObject();
                    newCow.setDisplayObject(new createjs.Bitmap("/images/cow_2.png"));

                    newCow.set({x: cow.x, y: cow.y, z: cow.z, regX: 23, regY: 34, startled: true});

                    this.cows.splice(i, 1, newCow);

                    cow.removeFromStage();
                    newCow.addToStage();
                    /*
                    var img = new Image();
                    img.src = '/images/cow_2.png';
                    cow.set({startled: true, image: img});
                    */
                }

				if (cow.y <= this.ufo.y + 30) {
					this.removeCow(cow);
				}
			}
			else {
				newX = this._getScrolledX(cow);

				if (newX <= -100) {
					this.cows.splice(i, 1);
					continue;
				}

				cow.set({x: newX});
			}
		}

		// if the beam is on - check if any cows can be sucked up
		if (this.actionKeys.beam) {
			if (this.ufo.beam.height > 100) {
				for(i = 0; i < this.cows.length; i++) {
					var cow = this.cows[i];

					if (!cow.sucked && cow.x <= Game.UFO_X_POS) {
                        cow.sucked = true;
					}
				}
			}
		}

		this.stage.update();
    },

	addCow: function(immediate) {
		var cow = new GameObject();

		var muncher = (Math.random() >= 0.6);

		if (muncher) {
            var spritesheet = new createjs.SpriteSheet(this.spritesheets.cow);
			cow.do = new createjs.BitmapAnimation(spritesheet);
			cow.do.gotoAndPlay('munch');
		}
		else {
			cow.do = new createjs.Bitmap("/images/cow.png");
		}

		var y = 300 + Math.round(Math.random() * 100);
		var x = this.viewport.width;

		if (!immediate) {
			x += Math.round(Math.random() * 200);
		}

		cow.set({x: x, y: y, z: 3, regX: 23, regY: 34, sucked: false, startled: false});

		this.cows.push(cow);
		cow.addToStage();
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

		y = this.ufo.y + y;

		if (y <= 0) {
			y = 0;
		}
		else if (y >= 400) {
			y = 400;
		}

		this.ufo.set({y: y});

	},

	beam: function() {

		if (this.ufo.beam.height === 0) {
            this.ufo.beam.setDisplayObject(new createjs.Bitmap("/images/beam_1.png"));
			//this.ufo.beam.sprite = new createjs.Bitmap("/images/beam_1.png");
            this.ufo.beam.set({'z': 1, height: 1});
            this.ufo.beam.addToStage();
			//this.stage.addChild(this.ufo.beam.sprite);


		} else if (this.ufo.beam.height < (Game.UFO_BEAM_MAX_HEIGHT - Game.UFO_BEAM_SPEED)) {
			this.ufo.beam.height += Game.UFO_BEAM_SPEED;
		}
		else {
			this.ufo.beam.height = Game.UFO_BEAM_MAX_HEIGHT;
		}

        this.ufo.beam.getDisplayObject().sourceRect = new createjs.Rectangle(0,0,58,this.ufo.beam.height);
		this.ufo.beam.set({x: this.ufo.x - 28, y: this.ufo.y + 30});
	},

	beamOff: function() {
        this.ufo.beam.removeFromStage();
		this.ufo.beam.height = 0;
	},

    zIndexCompare: function compare(a,b) {
        if (a.z < b.z)
            return 1;
        if (a.z > b.z)
            return -1;
        return 0;
    }
};

function GameObject () {
	this.do = null;
}

GameObject.prototype.set = function(p, v) {

	if (typeof p === 'object') {
		for (prop in p) {
			this.set(prop, p[prop]);
		}
	}
	else {
		this[p] = v;

		if (p === 'x' || p === 'y' || p === 'z' || p === 'regX' || p === 'regY') {
			this.do[p] = v;
		}
	}
};

GameObject.prototype.setDisplayObject = function(d) {
    this.do = d;
};

GameObject.prototype.getDisplayObject = function() {
    return this.do;
};

GameObject.prototype.addToStage = function() {
    if (this.z === null) {
        this.z = 5;
    }

    Game.zIndexDirty = true;
	Game.stage.addChild(this.do);
};

GameObject.prototype.removeFromStage = function() {
    Game.zIndexDirty = true;
	Game.stage.removeChild(this.do);
};

$(document).ready(function() {
	Game.init();
});