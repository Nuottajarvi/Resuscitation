const CANVASWIDTH = 800;
const CANVASHEIGHT = 640;
const DEBUG = false;

const speed = 300;
const jump = -555;

const difficulties = [0.9, 0.8, 1.0];

const game = new Phaser.Game(CANVASWIDTH, CANVASHEIGHT, Phaser.AUTO, 'gameCanvas', {preload, create, update}, false, false);

let BPM = 30;
let beat = 61; //over 60

let playing = false;
let paused = false;
let pausetexts;
let menuElems;
let cutscene;
let idleanim;
let player;
let walls;
let bpmMeter;
let facing = 'left';
let jumpTimer = 0;
let cursors;
let jumpButton;
let pauseButton;
let shader;
let titleShader;
let timer;
let healthPack;
let progressbar;
let bgShader;

const audioNames = [
    "heartbeat",
    "intro",
    "introloop",
    "song",
    "ending",
    "footsteps",
    "jump",
    "pickup"
];
const audio = {};
let heartbeatAudioOn = false;
let introPlayer;

let level = 1;
let room = 1;
let startPos;

function preload() {
    game.load.spritesheet('player', 'assets/player.png', 32, 48);
    game.load.spritesheet('cutscene', 'assets/cutscene.png', 64, 64);
    game.load.spritesheet('endscene', 'assets/endscene.png', 64, 64);
    game.load.image('tileset', 'assets/tileset.png');
    for(let lvl = 1; lvl <= 3; lvl++) {
       game.load.image('levelheart' + lvl, `assets/levelheart${lvl}.png`);
    }
    game.load.image('progressbar', 'assets/progressbar.png');
    game.load.image('healthpack', 'assets/heart.png');
    for(let lvl = 1; lvl <= 3; lvl++) {
        for(let room = 1; room <= 8; room++) {
            game.load.image(`level${lvl}-${room}`, `assets/levels/${lvl}/${room}.png`);
        }
    }
    
    audioNames.forEach((audioName) => {
        game.load.audio(audioName, `assets/audio/${audioName}.wav`);
    });

    document.fonts.load('10pt "november"');
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
        audio["footsteps"].fadeOut(5);
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

function addbpm() {
    BPM += 20;
    BPM = Math.min(BPM, 60);
    healthPack.destroy();
}

function gameOver() {
    audio["footsteps"].fadeOut(5);//stop();
    if(!waitingDie) {
        waitingDie = true;
        //player.body.enable = false;
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
    walls.destroy();
    const lvldata = loadLevel(level, room, game, die);
    walls = lvldata.walls;
    refreshShaders();
    startPos = lvldata.startPos;
    const hpackPos = lvldata.healthPack;

    if(healthPack)
        healthPack.destroy();

    if(hpackPos) {
        healthPack = game.add.sprite(hpackPos.x, hpackPos.y, 'healthpack');
        game.physics.arcade.enable([healthPack]);
        healthPack.body.allowGravity = false;
        healthPack.body.onCollide = new Phaser.Signal();
        healthPack.body.onCollide.add(function() {
            if(room === 8) {
                healthPack.destroy();
                endGame();
            } else {
                audio["pickup"].play();
                addbpm();
            }
        }, this);
    }

    player.x = startPos.x;
    player.y = startPos.y;
    player.bringToTop();
    bpmMeter.bringToTop();
    progressbar.bringToTop();
    setProgressbar(room - 1);
}

function clamp(x, a, b) {
    return Math.min(b, Math.max(x, a));
}

function smoothStep(edge0, edge1, x) {
    t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t)
};

function setProgressbar(val) {
    const oldscale = progressbar.scale.x;
    const newscale = CANVASWIDTH / 10 * val / 8;

    let i = 0;
    const lerper = setInterval(() => {
        progressbar.scale.x = oldscale + (newscale - oldscale) * smoothStep(0, 1, i / 30);
        if (i === 30) {
            clearInterval(lerper);
        }
        i++;
    }, 16);
}

function endGame() {
    BPM = 30;
    walls.destroy();
    player.visible = false;
    bpmMeter.visible = false;
    setProgressbar(0);
    setTimeout(() => {
        playing = false;
        heartbeatAudioOn = false;
        player.destroy();
        bpmMeter.destroy();
        endscene = game.add.sprite(230, 140, 'endscene');
        endscene.scale.x = 5;
        endscene.scale.y = 5;

        const full = endscene.animations.add('full', null, 5, false);
        audio["ending"].play();

        full.onComplete.add(() => {

            heartbeatAudioOn = true;
            
            const title = game.add.text(CANVASWIDTH / 2 - 100, CANVASHEIGHT / 2, "Thanks for playing", {font: "24px november", fill: "red"});
            const title2 = game.add.text(CANVASWIDTH / 2 - 148, CANVASHEIGHT / 2 + 64, "Game by Peetu Nuottajarvi", {font: "24px november", fill: "#990000"});
            const levelheart = game.add.sprite(CANVASWIDTH / 2 - 152, CANVASHEIGHT / 2 - 150, 'levelheart3');
            levelheart.scale.setTo(2, 2);
            levelheart.filters = [bgShader];
            levelheart.bringToTop();

            player.destroy();
            walls.destroy();
            bpmMeter.destroy();
            endscene.destroy();

            setTimeout(() => {
                audio["intro"].onStop.removeAll();
                audio["introloop"].onStop.removeAll();
                audio["intro"].play();
                audio["intro"].onStop.add(() => {
                    audio["introloop"].play();
                    audio["introloop"].onStop.add(() => {
                        audio["song"].play();
                    });
                })
            }, 4000);

        });

        endscene.animations.play('full');
    }, 800);
}

function initAudio() {
    audioNames.forEach((audioName) => {
        audio[audioName] = game.add.audio(audioName);
    });
}

function playIntro() {
    audio["intro"].play();
    audio["intro"].onStop.add(() => {
        audio["introloop"].play();
        audio["introloop"].onStop.add(() => {
            audio["introloop"].play();
        });
        setTimeout(() => {
            audio["introloop"].fadeOut(5000);
        }, 12000)
    })
}

let clickedOnce = false;

function create() {
    const text0 = game.add.text(130, 300, "This game consists of lots of blinking colors.\n Not recommended for people with Epilepsy.", {font: "24px november", fill: "#990000"});
    const text1 = game.add.text(230, 420, "Click the screen to continue", {font: "24px november", fill: "#990000"});

    const onDown = () => {
        if(!clickedOnce) {
            text0.destroy();
            text1.destroy();
            startScreen();
            game.input.onDown.removeAll();
            clickedOnce = true;
        }
    };
    game.input.onDown.add(onDown, this);

    titleShader = new Phaser.Filter(game, null, getTitleShader());
    titleShader.uniforms.beat = {type: '1f', value: 0};

    timer = new Phaser.Time(game);
}

function startScreen() {
    initAudio();
    playIntro();

    const pause = () => {
        if(playing) {
            paused = !paused;
            if(paused) {
                player.animations.stop();
                pausetexts = [
                    game.add.text(CANVASWIDTH / 2 - 38, 300, "PAUSED", {font: "24px november", fill: "#990000"}),
                    game.add.text(CANVASWIDTH / 2 - 140, 360, "press ENTER to continue", {font: "24px november", fill: "#990000"})
                ];
            } else {
                pausetexts.forEach(pt => pt.destroy());
            }
            game.physics.arcade.isPaused = paused;
        }
    };

    pauseButton = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
    pauseButton.onDown.add(pause);

    const pauseButtonAlt = game.input.keyboard.addKey(Phaser.Keyboard.P);
    pauseButtonAlt.onDown.add(pause);
    if(DEBUG) {
        play();
        return;
    }
    const title = game.add.text(CANVASWIDTH / 2 - 100, 32, "Rescuscitation", {font: "24px november", fill: "red"});
    title.filters = [titleShader];

    const controls = game.add.text(170, 480, "    Headphones heavily recommended\n\nMove with ARROW KEYS, jump with SPACE", {font: "24px november", fill: "#990000"})

    const start0 = game.add.text(190, 570, "Start and pause by pressing ENTER", {font: "24px november", fill: "#990000"});

    const start1 = game.add.text(260, 600, "Press ENTER to begin", {font: "24px november", fill: "#990000"});

    cutscene = game.add.sprite(230, 140, 'cutscene');
    cutscene.scale.x = 5;
    cutscene.scale.y = 5;

    cutscene.animations.add('idle', [0, 1, 2, 3, 4], 5, false);
    const full = cutscene.animations.add('full', null, 5, false);

    full.onComplete.add(play);
    
    cutscene.animations.play('idle');
    idleanim = setInterval(() => {
        cutscene.animations.play('idle');
    }, 2500);

    menuElems = [cutscene, title, controls, start0, start1];
}

function refreshShaders() {

    if(walls.filters) {
        walls.filters[0].destroy();
        player.filters[0].destroy();
    }

    bgShader = new Phaser.Filter(game, null, getBgShader());
    bgShader.uniforms.beat = {type: '1f', value: 0};
    walls.filters = [bgShader];

    playerShader = new Phaser.Filter(game, null, getPlayerShader());
    playerShader.uniforms.beat = {type: '1f', value: 0};
    player.filters = [playerShader];
}

function play() {
    game.stage.disableVisibilityChange = true;
    BPM = 60;
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

    progressbar = game.add.sprite(0, CANVASHEIGHT - 10, 'progressbar');
    progressbar.scale.x = 0;

    bpmMeter = game.add.text(CANVASWIDTH / 2 - 32, 32, "BPM", {font: "24px november", fill: "red"})

    cursors = game.input.keyboard.createCursorKeys();
    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    refreshShaders();

    tilemapImg = game.make.bitmapData();
    tilemapImg.load('tileset');

    heartbeatAudioOn = true;
    playing = true;
}

let changingLevel = false;
let onPauseMenu = false;
let skipFrame = 0;
let noDoublePause = false;

function update() {
    if (paused) {
        game.physics.arcade.collide(player, walls);
        bgShader.uniforms.beat.value = 0;
        bgShader.update();
        return;
    }

    const menu = !playing;
    if (menu) {
        titleShader.uniforms.beat.value = beat;
        titleShader.update();
        doBeat();
        if (bgShader) {
            bgShader.uniforms.beat.value = beat;
            bgShader.update();
        }

        if(pauseButton && pauseButton.isDown && !noDoublePause) {
            noDoublePause = true;
            for(let i = 1; i < menuElems.length; i++) {
                menuElems[i].destroy();
            }

            function startAnim() {
                clearInterval(introPlayer);
                clearInterval(idleanim);
                cutscene.animations.play('full');
                audio["song"].play();

            }

            const audiosPlaying = ["intro", "introloop"]
                .filter(name => audio[name].isPlaying)
                .map(name => {
                    audio[name].onStop.removeAll();
                    audio[name].onStop.add(() => {
                        startAnim();
                    });
                    return name;
                });

            if(audiosPlaying.length === 0) {
                startAnim();
            } 
        }

    } else {
        game.physics.arcade.collide(player, walls);

        if(healthPack) {
            game.physics.arcade.collide(player, healthPack);
        }

        player.body.velocity.x = 0;

        if(!waitingDie) {
            if (cursors.left.isDown)
            {
                player.body.velocity.x = -speed;

                if (facing != 'left')
                {
                    player.animations.play('left');
                    facing = 'left';
                }

                if(player.body.onFloor() && !audio["footsteps"].isPlaying)
                    audio["footsteps"].loopFull(2);
            }
            else if (cursors.right.isDown)
            {
                player.body.velocity.x = speed;

                if (facing != 'right')
                {
                    player.animations.play('right');
                    facing = 'right';
                }

                if(player.body.onFloor() && !audio["footsteps"].isPlaying)
                    audio["footsteps"].loopFull(2);
            }
            else
            {
                if (facing != 'idle')
                {
                    audio["footsteps"].fadeOut(5);//top();
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
                audio["footsteps"].fadeOut(5);
                audio["jump"].volume = 2;
                audio["jump"].play();
                player.body.velocity.y = jump;
                jumpTimer = game.time.now + 100;
            }
        }

        if (player.x >= CANVASWIDTH - 32 && !changingLevel) {
            if(room === 8) {
                walls.destroy();
                setProgressbar(8);
                changingLevel = true;
                player.body.enable = false;
                player.x = 10000;

                levelheart = game.add.sprite(CANVASWIDTH / 2 - 152, CANVASHEIGHT / 2, 'levelheart' + level);
                leveltext = game.add.text(CANVASWIDTH / 2 - 34 , CANVASHEIGHT / 2 - 64, "Level " + (level + 1), {font: "24px november", fill: "red"})
                levelheart.scale.setTo(2, 2);
                levelheart.filters = [bgShader];

                const origBPM = BPM;
                const BPMincreaser = setInterval(() => {
                    BPM += (60 - origBPM) / 100;
                }, 40);

                setTimeout(() => {
                    clearInterval(BPMincreaser);
                    player.body.enable = true;
                    levelheart.destroy();
                    leveltext.destroy();
                    room = 1;
                    level += 1;
                    changingLevel = false;
                    loadNewLevel();
                    BPM = 60;
                }, 4000);

            } else {
                room += 1;
                loadNewLevel();
            }
        }

        if(!changingLevel)
            BPM -= timer.physicsElapsedMS * 0.001 * difficulties[level-1];

        doBeat();
        bpmMeter.text = Math.ceil(BPM) + " BPM";

        if(skipFrame == 0) {
            playerShader.uniforms.beat.value = beat;
            playerShader.update();
            bgShader.uniforms.beat.value = beat;
            bgShader.update();
        }

        skipFrame = (skipFrame + 1) % 2;
    }

    function doBeat() {
        beat += timer.physicsElapsedMS * 0.001;

        if(BPM <= -1) {
            gameOver();
            BPM = 0;
        }

        if(BPM > 0 && beat > 60 / Math.max(9, BPM)){
            beat = 0;
            if(heartbeatAudioOn)
               audio["heartbeat"].play();
        }
    }
}