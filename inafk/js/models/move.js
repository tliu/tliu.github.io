class Move {
    constructor(name, input, startup, active, recovery, total, onHit, onBlock, chainable = false) {
        this.name = name;
        this.input = input;
        this.startup = startup;
        this.active = active;
        this.recovery = recovery;
        this.total = total;
        this.onHit = onHit;
        this.onBlock = onBlock;
        this.chainable = chainable;
    }
}