class InputManager {

    constructor(game) {
        this.movement = [
            {key: game.input.keyboard.addKey(Phaser.KeyCode.W), dir: Vector.UP},
            {key: game.input.keyboard.addKey(Phaser.KeyCode.A), dir: Vector.LEFT},
            {key: game.input.keyboard.addKey(Phaser.KeyCode.D), dir: Vector.RIGHT}
        ];
    }

    getMovementDirection() {
        return this.movement.filter(val => val.key.isDown).reduce((acc, val) => acc.add(val.dir), new Vector(0,0));
    }
}