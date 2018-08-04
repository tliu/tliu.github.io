if (!Date.now) {
  Date.now = function() { return new Date().getTime(); }
}

class Zone {
  constructor() {
    this.left = true;
    this.right = true;
    this.obstructed = false;
    this.needsRender = true;
    this.lastModified = Date.now();
  }

  set status(status) {
    if (this.hasChange(status)) {
      this.left = status.left;
      this.right = status.right;
      this.obstructed = status.obstructed;
      this.lastModified = Date.now();
    }
  }

  hasChange(status) {
    return this.needsRender = 
      this.left != status.left ||
      this.right != status.right ||
      this.obstructed != status.obstructed;
  }
}

class Chute {
  constructor() {
    this.fillAmount = 0;
    this.needsRender = true;
    this.lastModified = 0;
  }

  set fill(raw) {
    const fillAmount = Math.round(Math.max(0, Math.min(100, 100 * (1 - ((raw - 30) / 270)))));
    if (this.needsRender = this.fillAmount != fillAmount) {
      this.fillAmount = fillAmount;
      this.lastModified = Date.now();
    }
  }
}

class Truck {
  constructor() {
    this.fillAmount = 0;
    this.needsRender = true;
    this.lastModified = 0;
  }

  set fill(percentage) {
    if (this.needsRender = this.fillAmount != percentage) {
      this.fillAmount = percentage;
      this.lastModified = Date.now();
    }
  }
}
