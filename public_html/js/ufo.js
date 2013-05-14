var Game = {

    // constants
	COW_SPAWN_DISTANCE: 150,
	UFO_X_POS: 100,
	UFO_BEAM_LEFT_POS: 91,
	UFO_BEAM_RIGHT_POS: 106,
	UFO_BEAM_MAX_HEIGHT: 339,
	UFO_BEAM_SPEED: 30,
	UFO_SUCK_SPEED: 150,
	UFO_MOVE_SPEED: 300,

    Z_INDEX: {
        UFO: 5,
        COW: 6,
        BEAM: 7,
        COW_SHADOW: 8,
        GRASS: 9,
        CLOUD: 13,
        STARS: 15
    },

    // preload stuff
	assets: [
		'/images/beam_1.png',
		'/images/cloud.png',
        '/images/stars.png',
		'/images/cow.png',
		'/images/cow_2.png',
		'/images/cow_grass.png',
        '/images/shadow_cow.png',
		'/images/grass_parallax.png',
		'/images/ufo.png'
	],

    debug: {
        fps: null
    },

	assetsLoaded: 0,

    // core game
    viewport: {
        width: 0,
        height: 0
    },
    $canvas: null,
    stage: null,
    scrollSpeed: 100, // px per sec

    actionKeys: {
        moveUp: false,
        moveDown: false,
        beam: false
    },

    stageQueue: [],

    // game elements
    clouds: [],
    stars: null,
	grass: null,
    ufo: null,
    cows: [],

    // animations
	spritesheets: {
		cow: {
			images: ['/images/cow_grass.png'],
			frames: {width:46, height:34, count: 4, regX: 23, regY: 34},
			animations: {
				munch: {
                    frames: [0,1,2,3],
                    frequency: 5
                }
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
		this.ufo.set({x: Game.UFO_X_POS, y: 200, z: Game.Z_INDEX.UFO, regX: 69, regY: 38});
        this.ufo.addToStage();

        this.ufo.beam = new GameObject();
        this.ufo.beam.height = 0;

		this.addCow(true);

		// start

		var game = this;
		createjs.Ticker.addEventListener("tick", function(event, target) {
			game.tick(event, target);
		});

		createjs.Ticker.setFPS(30);
	},

    buildBg: function() {

        var cloud = new GameObject();
        cloud.setDisplayObject(new createjs.Bitmap("/images/cloud.png"));

		var x = Math.round(Math.random() * this.viewport.width);

        cloud.set({x: x, y: 10, z: Game.Z_INDEX.CLOUD});
        cloud.addToStage();

		this.clouds.push(cloud);

        this.stars = new GameObject();
        this.stars.setDisplayObject(new createjs.Bitmap("/images/stars.png"));
        this.stars.set({x: 0, y: 0, z: Game.Z_INDEX.STARS});
        this.stars.addToStage();

		var img = new Image();
		img.src = '/images/grass_parallax.png';

		var matrix = new createjs.Matrix2D();
		matrix.translate(0, -3);

		var g = new createjs.Graphics().beginBitmapFill(img, 'repeat', matrix);
		g.drawRect(0,291, this.viewport.width + 116,14);

        this.grass = new GameObject();
        this.grass.setDisplayObject(new createjs.Shape(g));
        this.grass.set({x: 0, z: Game.Z_INDEX.GRASS});
        this.grass.addToStage();

        /*
        this.debug.fps = new createjs.Text(createjs.Ticker.getMeasuredFPS(), "20px Arial", "#ff7700");
        this.debug.fps.x = 50;
        this.debug.fps.y = 50;
        this.debug.fps.textBaseline = "alphabetic";
        this.stage.addChild(this.debug.fps);
        */
	},

    tick: function(event, target) {
        if (event.paused) {
            return;
        }

        //this.debug.fps.set({text: Math.round(createjs.Ticker.getMeasuredFPS())});

        var i;

        if (this.stageQueue.length > 0) {
            for (i = 0; i < this.stageQueue.length; i++) {
                this.stage.addChild(this.stageQueue[i]);
            }
            this.stageQueue = [];

            this.stage.children.sort(this.zIndexCompare);
        }

		// handle input

		if (this.actionKeys.moveUp) {
			this.moveUfo('up', event.delta);
		}
		else if (this.actionKeys.moveDown) {
			this.moveUfo('down', event.delta);
		}

		if (this.actionKeys.beam) {
			this.beam();
		}

        // move clouds
        for (i = 0; i < this.clouds.length; i++) {

			var cloud = this.clouds[i];

            var newX = this._getScrolledX(cloud, event.delta);

            if (newX <= -300) {
                newX = this.viewport.width + Math.round(Math.random() * 200);
            }

            cloud.set({x: newX});
        }

		// move grass
		newX = this._getScrolledX(this.grass, event.delta);

		if (newX <= -116) {
			newX = 0;
		}
		this.grass.set('x', newX);

		// ensure we have a steady supply of cows
		var lastCow = this.cows[this.cows.length-1];
		if (lastCow.x <= this.viewport.width - this.COW_SPAWN_DISTANCE) {
			this.addCow();
		}

		// move the cows
		for (i = 0; i < this.cows.length; i++) {
			cow = this.cows[i];

			if (cow.sucked) {
				var newY = cow.y - this._getMoveDistance(Game.UFO_SUCK_SPEED, event.delta);
                var suckDistance = cow.startY - newY;
                var scale = 1 - (suckDistance / 200);

                cow.set({y: newY});

                if (cow.getChildren().length === 1) {
                    if (scale <= 0.1) {
                        cow.removeChildAt(0);
                    }
                    else {
                        cow.getChildren()[0].set({scaleX: scale, scaleY: scale}); // shrink the shadow
                    }
                }

                if (!cow.muncher && !cow.startled && suckDistance > 10) {
                    // swap out cow for startled
                    cow.updateDisplayObject(new createjs.Bitmap("/images/cow_2.png"));
                    cow.set({regX: 21, regY: 32, startled: true});
                }

                // if cow reaches UFO, abduction complete
				if (cow.y <= this.ufo.y + 10) {
					this.removeCow(cow);
				}
			}
			else {
				newX = this._getScrolledX(cow, event.delta);

				if (newX <= -50) {
                    this.removeCow(cow);
					continue;
				}

				cow.set({x: newX});
                cow.getChildren()[0].set({x: newX}); // move the shadow
			}
		}

		// if the beam is on - check if any cows can be sucked up
		if (this.actionKeys.beam && this.ufo.beam.height > 100) {
            for(i = 0; i < this.cows.length; i++) {
                var cow = this.cows[i];

                if (!cow.sucked && cow.x <= Game.UFO_BEAM_RIGHT_POS && cow.x >= Game.UFO_BEAM_LEFT_POS) {
                    cow.sucked = true;
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
            cow.setDisplayObject(new createjs.BitmapAnimation(spritesheet));
			cow.getDisplayObject().gotoAndPlay('munch');
		}
		else {
			cow.setDisplayObject(new createjs.Bitmap("/images/cow.png"));
            cow.set({regX: 21, regY: 34});
		}

		var y = 340 + Math.round(Math.random() * 100);
		var x = this.viewport.width;

		if (!immediate) {
			x += Math.round(Math.random() * 200);
		}

		cow.set({x: x, y: y, z: Game.Z_INDEX.COW, sucked: false, startled: false, muncher: muncher, startY: y});

        // shadow

        var shadow = new GameObject();
        shadow.setDisplayObject(new createjs.Bitmap("/images/shadow_cow.png"));
        shadow.set({x: cow.x, y: cow.y, z: Game.Z_INDEX.COW_SHADOW, regX: 25, regY: 10});
        cow.addChild(shadow);

		this.cows.push(cow);
		cow.addToStage();
	},

	removeCow: function(cow) {
		var index = this.cows.indexOf(cow);

		this.cows.splice(index, 1);
        cow.removeFromStage();
	},

	_getScrolledX: function(obj, delta) {
		var x = this._getMoveDistance(delta, this.scrollSpeed) - (0.1 * obj.z);

		if (x <= 0) {
			x = 0.1;
		}

		return obj.x - x;
	},

    _getMoveDistance: function(delta, pixelsPerSecond) {
      return delta / 1000 * pixelsPerSecond
    },

	moveUfo: function(dir, delta) {
		var y = this._getMoveDistance(Game.UFO_MOVE_SPEED, delta);

		if (dir === 'up') {
			y = y * -1;
		}

		y = this.ufo.y + y;

        // ensure UFO stops at bounds
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
            this.ufo.beam.set({z: Game.Z_INDEX.BEAM, height: 1});
            this.ufo.beam.addToStage();
		}
        else if (this.ufo.beam.height < (Game.UFO_BEAM_MAX_HEIGHT - Game.UFO_BEAM_SPEED)) {
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
	this._do = {};
    this._children = [];
    this._doProps = ['x', 'y', 'z', 'regX', 'regY', 'scaleX', 'scaleY'];
}

GameObject.prototype = (function () {

    function set(p, v) {
        if (typeof p === 'object') {
            for (var prop in p) {
                this.set(prop, p[prop]);
            }
        }
        else {
            this[p] = v;

            if (this._doProps.indexOf(p) !== -1) {
                this._do[p] = v;
            }
        }
    }

    function setDisplayObject (d) {
        this._do = d;
    }

    function getDisplayObject() {
        return this._do;
    }

    function getChildren() {
        return this._children;
    }

    function addChild(c) {
        this._children.push(c);
    }

    function removeChildAt(i) {
        this._children[i].removeFromStage();
        this._children.splice(i, 1);
    }

    function addToStage() {
        if (this.z === null) {
            this.z = 5;
        }

        Game.stageQueue.push(this._do);

        for (var i = 0; i < this.getChildren().length; i++) {
            Game.stageQueue.push(this.getChildren()[i]._do);
        }
    }

    function removeFromStage() {
        Game.stage.removeChild(this._do);

        for (var i = 0; i < this.getChildren().length; i++) {
            Game.stage.removeChild(this.getChildren()[i]._do);
        }
    }

    /**
     * Update the display object with another, inheriting the previous params
     * @param o The new displayObject
     */
    function updateDisplayObject(o) {
        Game.stage.removeChild(this._do);
        this._do = o;

        for (var p in this) {
            if (this._doProps.indexOf(p) !== -1) {
                this._do[p] = this[p];
            }
        }
        Game.stageQueue.push(this._do);
    }

    // public API
    return {
        set: set,
        setDisplayObject: setDisplayObject,
        getDisplayObject: getDisplayObject,
        getChildren: getChildren,
        addChild: addChild,
        removeChildAt: removeChildAt,
        addToStage: addToStage,
        removeFromStage: removeFromStage,
        updateDisplayObject: updateDisplayObject
    };

})();


$(document).ready(function() {
	Game.init();
});