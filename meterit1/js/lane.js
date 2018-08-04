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

  init() {

  }

  update() {
    $.ajax(this.updateUrl, {
      dataType: "jsonp",
      type: "GET",
      success: data => {
        this.parseData(data);
      }
    })
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
  }

  summarize() {

  }
}

