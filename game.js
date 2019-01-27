const CANVASWIDTH = 800;
const CANVASHEIGHT = 640;

const speed = 300;
const jump = -550;

const difficulties = [0.9, 0.8, 0.9];

const game = new Phaser.Game(CANVASWIDTH, CANVASHEIGHT, Phaser.AUTO, 'gameCanvas', {preload, create, update}, false, false);

let BPM = 60;
let beat = 0;

let player;
let walls;
let bpmMeter;
let facing = 'left';
let jumpTimer = 0;
let cursors;
let jumpButton;
let shader;
let timer;

let level = 1;
let room = 1;
let startPos;

function preload() {
    game.load.spritesheet('player', 'assets/player.png', 32, 48);
    game.load.image('tileset', 'assets/tileset.png');
    for(let lvl = 1; lvl <= 3; lvl++) {
        for(let room = 1; room <= 8; room++) {
            game.load.image(`level${lvl}-${room}`, `assets/levels/${lvl}/${room}.png`);
        }
    }
}

let waitingDie = false;
let tilemapImg;

function die(player, tile) {

    const index = tile.index;

    const corners = [
        {x: -1, y: 0},
        {x: -1, y: 48},
        {x: 33, y: 0},
        {x: 33, y: 48},
        //edges
        {x: 16, y: 0},
        {x: 16, y: 48},
        {x: -1, y: 24},
        {x: 33, y: 24}
    ];

    const x = player.x - tile.worldX;
    const y = player.y - tile.worldY;
    let collision = false;
    corners.forEach((corner, i) => {
        const xpix = Math.floor(x + corner.x - 1);
        const ypix = Math.floor(y + corner.y - 1);
        if(xpix >= 0 && xpix < 32 &&
            ypix >= 0 && ypix < 32) {
            const px = tilemapImg.getPixel(index * 32 + xpix, ypix);
            if(isBlack(px)) {
                collision = true;
            }
        }
    });

    if(!waitingDie && collision) {
        waitingDie = true;
        player.body.enable = false;
        player.animations.play('death');
        setTimeout(async () => {
            player.x = startPos.x;
            player.y = startPos.y;
            player.body.enable = true;
            player.body.velocity.x = 0;
            player.body.velocity.y = 0;
            facing = "idle";
            player.frame = 0;
            setTimeout(() => {
                waitingDie = false;
            }, 10);
        }, 500);
    }
}

function gameOver() {
    if(!waitingDie) {
        waitingDie = true;
        player.body.enable = false;
        player.animations.play('death');
        setTimeout(async () => {
            room = 0;
            loadNewLevel();
            player.x = startPos.x;
            player.y = startPos.y;
            player.body.enable = true;
            player.body.velocity.x = 0;
            player.body.velocity.y = 0;
            facing = "idle";
            player.frame = 0;
            BPM = 60;
            setTimeout(() => {
                waitingDie = false;
            }, 10);
        }, 4000);
    }
}

function loadNewLevel() {
    const lvldata = loadLevel(level, room, game, die);
    walls = lvldata.walls;
    walls.filters = [bgShader];
    startPos = lvldata.startPos;

    player.x = startPos.x;
    player.y = startPos.y;
    player.bringToTop();
    bpmMeter.bringToTop();
}

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);

    game.physics.arcade.gravity.y = 300;

    const lvldata = loadLevel(level, room, game, die);
    walls = lvldata.walls;
    startPos = lvldata.startPos;

    player = game.add.sprite(startPos.x, startPos.y, 'player');
    game.physics.enable(player, Phaser.Physics.ARCADE);

    player.body.collideWorldBounds = true;
    player.body.gravity.y = 1000;
    player.body.maxVelocity.y = -jump;
    player.body.setSize(32, 48, 0, 0);

    player.animations.add('left', [4, 5, 6, 7], 8, true);
    player.animations.add('right', [8, 9, 10, 11], 8, true);
    player.animations.add('death', [12,13,14], 8, false);

    bpmMeter = game.add.text(CANVASWIDTH / 2, 16, "60 BPM", {fill: "red"})

    cursors = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    bgShader = new Phaser.Filter(game, null, getBgShader());
    bgShader.uniforms.beat = {type: '1f', value: 0};
    walls.filters = [bgShader];

    playerShader = new Phaser.Filter(game, null, getPlayerShader());
    playerShader.uniforms.beat = {type: '1f', value: 0};
    player.filters = [playerShader];

    timer = new Phaser.Time(game);

    tilemapImg = game.make.bitmapData();
    tilemapImg.load('tileset');
}

function update() {
    game.physics.arcade.collide(player, walls);

    player.body.velocity.x = 0;

    if(player.body.enable) {
        if (cursors.left.isDown)
        {
            player.body.velocity.x = -speed;

            if (facing != 'left')
            {
                player.animations.play('left');
                facing = 'left';
            }
        }
        else if (cursors.right.isDown)
        {
            player.body.velocity.x = speed;

            if (facing != 'right')
            {
                player.animations.play('right');
                facing = 'right';
            }
        }
        else
        {
            if (facing != 'idle')
            {
                player.animations.stop();

                if (facing == 'left')
                {
                    player.frame = 1;
                }
                else
                {
                    player.frame = 0;
                }

                facing = 'idle';
            }
        }
        
        if (jumpButton.isDown && player.body.onFloor() && game.time.now > jumpTimer)
        {
            player.body.velocity.y = jump;
            jumpTimer = game.time.now + 100;
        }
    }

    if (player.x >= CANVASWIDTH - 32) {
        if(room == 8) {
            room = 1;
            level += 1;
            BPM = 60;
        } else {
            room += 1;
        }
        loadNewLevel();
    }

    BPM -= timer.physicsElapsedMS * 0.001 * difficulties[level];
    beat += timer.physicsElapsedMS * 0.001;

    if(BPM <= -1) {
        gameOver();
        BPM = 0;
    }

    bpmMeter.text = Math.ceil(BPM) + " BPM";
    if(BPM > 0 && beat > 60 / Math.max(9, BPM))
        beat = 0;

    playerShader.uniforms.beat.value = beat;
    playerShader.update();
    bgShader.uniforms.beat.value = beat;
    bgShader.update();
}