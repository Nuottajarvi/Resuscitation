const bgFrag = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float beat;

const float PI = 3.1416;

void main(void) {
	vec4 texColor = texture2D(uSampler, vTextureCoord);

	vec4 col = vec4(0., 0., 0., 1.);
	//isBackground
	if(texColor.b > 0.99) {
		if(beat < PI / 50. * 5.) {
			col.r = sin(beat * 50.) * 0.5;
		}
	}

	gl_FragColor = col;
}`;

const playerFrag = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float beat;

void main(void) {
	vec4 texColor = texture2D(uSampler, vTextureCoord);
	vec4 col = vec4(0.);
	if(texColor.w > 0.1) {
		col = vec4(1. / (beat + 1.), 0., 0., texColor.w);
	}
	gl_FragColor = col;
}`;

const titleFrag = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float beat;

const float PI = 3.1416;

void main(void) {
	vec4 texColor = texture2D(uSampler, vTextureCoord);
	vec4 col = vec4(0.);
	if(texColor.w > 0.1) {
		col.r = 0.2;
		if(beat < PI / 50. * 5.) {
			col.r = sin(beat * 30.) * 0.4;
		}
	}
	gl_FragColor = col;
}`;

function getBgShader() {
	return bgFrag.split("\n").filter(a => Boolean(a));
}

function getPlayerShader() {
	return playerFrag.split("\n").filter(a => Boolean(a));	
}

function getTitleShader() {
	return titleFrag.split("\n").filter(a => Boolean(a));	
}
