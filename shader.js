const frag = `

precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float time;
uniform float BPM;

const float PI = 3.1416;

void main(void) {
	vec4 texColor = texture2D(uSampler, vTextureCoord);

	vec4 col = vec4(0., 0., 0., 1.);
	//isBackground
	if(texColor.b > 0.99) {
		if(mod(time, BPM) < PI / 50. * 4.) {
			col.r = sin(time * 50.) * 0.3;
		}
	}

	gl_FragColor = col;
}

`


function getShader() {
	return frag.split("\n").filter(a => Boolean(a));
}