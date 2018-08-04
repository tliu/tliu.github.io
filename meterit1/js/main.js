
const TEMPLATES = {
  lane: Hogan.compile(`<div class="lane-container">
                        <div class="truck-container">
                          <div class="truck" id="truck-{{number}}">
                          {{truck.fill}}%
                          </div>
                        </div>
                        <div class="chute-container">
                          <div class="chute" id="chute-{{number}}">
                          {{chute.fill}}%
                          </div>
                        </div>
                        <div id="lane-{{number}}" class="lane">
                          {{{zones}}}
                        </div>
                        <div class="number">{{number}}</div>
                       </div>`),
  zone: Hogan.compile(`<div class="zone-container">
                         <div id="zone-{{lane}}-{{id}}" class="zone"></div>
                       </div>`)
}

let lanes = [];

window.onload = () => {
  let body = "";
  for (let i = CONFIG.LANE_END; i >= CONFIG.LANE_START; i--) {
    const lane = new Lane(i);
    lanes.push(lane);
    body += initLane(lane);
  }

  $("#main-container").html(body);

  lanes.forEach(lane => {
    renderLane(lane);
    lane.update();
  });
}

function initLane(lane) {
  let zones = "";
  lane.zones.forEach((zone, index) => {
    zones += TEMPLATES.zone.render(
      { 
        lane: lane.id, 
        id: index, 
      }
    );
  });
  return TEMPLATES.lane.render(
    {
      zones: zones,
      number: lane.id
    }
  );
}

function renderLane(lane) {
  lane.zones.forEach((zone, index) => {
    updateZone(lane.id, index, zone); 
  });

  updateTruck(lane.id, lane.truck);
  updateChute(lane.id, lane.chute);
}

function updateTruck(lane, truck) {
  if (truck.needsRender) {
    $(`#truck-${lane}`).html(`${truck.fillAmount}%`);
    $(`#truck-${lane}`).css("height", `${truck.fillAmount}%`);
  }
}

function updateChute(lane, chute) {
  if (chute.needsRender) {
    $(`#chute-${lane}`).html(`${chute.fillAmount}%`);
    $(`#chute-${lane}`).css("height", `${chute.fillAmount}%`);
  }
}

function updateZone(lane, id, zone) {
  if (zone.needsRender) {
    const zoneDiv = $(`#zone-${lane}-${id}`)
    zoneDiv.removeClass("jammed");
    zoneDiv.removeClass("moving");
    zoneDiv.removeClass("braking");
    zoneDiv.removeClass("full");
    if (zone.left && zone.right) {
      zoneDiv.addClass("braking");
    } else {
      zoneDiv.addClass("moving");
    }
                   
    if (zone.obstructed) {
      zoneDiv.addClass("full");
    }
    zone.needsRender = false;
  }
}
