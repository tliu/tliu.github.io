class Lane {
  constructor(id) {
    this.id = id;
    this.updateUrl = generateUrl(id);
    this.zones = [];
    for (let i = 0; i < CONFIG.LANE_LENGTH; i++) {
      this.zones.push(new Zone());
    }
    this.chute = new Chute();
    this.truck = new Truck();
  }

  update() {
    console.log(this.updateUrl)
    $.ajax(this.updateUrl, {
      dataType: "jsonp",
      type: "GET",
      success: data => {
        this.parseData(data);
        renderLane(this);
      },
      error: res => {
      }
    })
    window.setTimeout(this.update.bind(this), 1000);
  }

  parseData(data) {
    const sections = data.payload.lane.sectionList;
    sections.forEach((section, index) => {
      const brakeSet = section.brakeSetList[0];
      this.zones[index].status = {
        left: brakeSet.leftBrake.activated,
        right: brakeSet.rightBrake.activated,
        obstructed: brakeSet.lightSensor.obstructed
      }
    });
    this.truck.fill = parseInt(data.payload.lane.truckFull);
    this.chute.fill = data.payload.chute.chuteLidarMeas;
  }

  summarize() {

  }
}

