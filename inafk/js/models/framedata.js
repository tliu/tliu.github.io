class FrameData {
    constructor(startup, active, recovery, total, onHit, onBlock) {
        this.startup = startup;
        this.active = active;
        this.recovery = recovery;
        this.total = total;
        this.onHit = onHit;
        this.onBlock = onBlock;
    }
}