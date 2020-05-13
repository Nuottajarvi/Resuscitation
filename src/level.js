const w = 32;

function loadLevel(lvl, room, game, die) {
	const bmd = game.make.bitmapData();
	bmd.load('level' + lvl + '-' + room);

	const pixels = [];

	for(let y = 0; y < bmd.height; y++) {
		pixels[y] = [];
		for(let x = 0; x < bmd.width; x++) {
			pixels[y][x] = bmd.getPixel(x, y);
		}
	}

	let startPos;

	let tilemapStr = "";
	let healthPack;

	for(let y = 0; y < pixels.length; y++) {
		let row = [];
		for(let x = 0; x < pixels[y].length; x++) {
			const px = pixels[y][x];
			if (isBlack(px)) {
				row.push(0);
			} else if (isRed(px)) {
				row.push(createSpike(pixels, x, y));
			} else {
				row.push(1);
			}

			if (isGreen(px)) {
				startPos = {x: x*w, y: y*w-24};
			}

			if(isYellow(px)) {
				healthPack = {x: x*w, y:y*w};
			}
		}
		tilemapStr += row.join(",") + "\n";
	}

	game.cache.addTilemap('dynamicMap', null, tilemapStr, Phaser.Tilemap.CSV);

	const map = game.add.tilemap('dynamicMap', w, w);

	map.addTilesetImage('tileset');

	const layer = map.createLayer(0);
	layer.resizeWorld();

	map.setCollision(0);
	[2,3,4,5].forEach((i) =>
		map.setTileIndexCallback(i, die, this)
	);

	map.setTileIndexCallback(6, addbpm, this);

	return {walls: layer, startPos, healthPack};
}

function isBlack(px) {
	return px.r <= 50 && px.g <= 50 && px.b <= 50;
}

function isRed(px) {
	return px.r >= 200 && px.g <= 50 && px.b <= 50;
}

function isGreen(px) {
	return px.r <= 50 && px.g >= 200 && px.b <= 50;
}

function isYellow(px) {
	return px.r >= 200 && px.g >= 200 && px.b <= 50;
}

function createSpike(pixels, x, y) {
	let flag = "";

	//IF IN THE EDGE OF MAP
	if(y === pixels.length - 1) {
		return 2;
	}
	if(x === 0) {
		return 3;
	}
	if(x === pixels[0].length - 1) {
		return 4;
	}
	if(y === 0) {
		return 5;
	}

	const horizontal = "h";
	const vertical = "v";

	//CHECKS FOR LINES OF SPIKES
	if(isRed(pixels[y][x + 1]) || isRed(pixels[y][x - 1])) {
		flag = horizontal;
	}
	if(isRed(pixels[y + 1][x]) || isRed(pixels[y - 1][x])) {
		flag = vertical;
	}

	if(flag !== vertical && isBlack(pixels[y+1][x])) {
		return 2;
	}

	if(flag !== horizontal && isBlack(pixels[y][x-1])) {
		return 3;
	}

	if(flag !== horizontal && isBlack(pixels[y][x+1])) {
		return 4;
	}
	if(flag !== vertical && isBlack(pixels[y-1][x])) {
		return 5;
	}

	return 2;
}