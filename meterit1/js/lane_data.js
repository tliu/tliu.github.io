if (!Date.now) {
  Date.now = function() { return new Date().getTime(); }
}

class Zone {
  constructor() {
    this.left = false;
    this.right = false;
    this.obstructed = false;
    this.lastModified = 0;
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
    return this.left != status.left ||
           this.right != status.right ||
           this.obstructed != status.obstructed;
  }
}

class Chute {
  constructor() {
    this.fillAmount = 0;
    this.lastModified = 0;
  }

  set fill(percentage) {
    this.fillAmount = percentage;
    this.lastModified = Date.now();
  }
}

class Truck {
  constructor() {
    this.fillAmount = 0;
    this.lastModified = 0;
  }

  set fill(percentage) {
    this.fillAmount = percentage;
    this.lastModified = Date.now();
  }
}
