'usestrict';

var Game = {

    viewport: {
        width: 0,
        height: 0
    },
    $canvas: null,
    stage: null,

    bg: [],
    ufo: null,
    entities: [],

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

        // build BG
        this.buildBg();

        // create UFO

        // start

        var game = this;
        createjs.Ticker.addEventListener("tick", function(event, target) {
            game.tick(event, target, game);
        });


    },

    buildBg: function() {

        var cloud = new createjs.Bitmap("/images/cloud.png");
        cloud.set({x: 40, y: 10});

        this.bg.push(cloud);

        this.stage.addChild(cloud);
    },

    tick: function(event, target, game) {
        if (event.paused) {
            return;
        }

        // move clouds
        for (var i = 0; i < this.bg.length; i++) {
            var newX = this.bg[i].x - 5;

            if (newX == -10) {
                //this.bg[i].x.visible = false;
                game.bg[i].set({visible: false});
            }


            game.bg[i].set({x: newX});

            //console.log(game.bg[i].visible);
        }
        this.stage.update();
    }
};

var Cloud = function() {
    this.x = 0;
    this.y = 0;

    this.tick = function() {
        this.x += 5;
    }
};

$(document).ready(function() {
   Game.init();
});