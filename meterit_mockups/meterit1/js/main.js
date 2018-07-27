
const TEMPLATES = {
  lane: Hogan.compile(`<div class="lane-container">
                        <div class="truck-container">
                          <div class="truck" id="truck-{{number}}">
                          40%
                          </div>
                        </div>
                        <div class="chute-container">
                          <div class="chute" id="chute-{{number}}">
                            40%
                          </div>
                        </div>
                        <div id="lane-{{number}}" class="lane">
                          {{{zones}}}
                        </div>
                        <div class="number">{{number}}</div>
                       </div>`),
  zone: Hogan.compile(`<div class="zone-container">
                         <div id="zone-{{lane}}-{{id}}" class="zone {{status}}"></div>
                       </div>`)
}

let lanes = [];

window.onload = () => {
  let body = "";
  for (let i = 0; i < 16; i++) {
    let zones = "";
    const status = Math.random() > .33 ? "moving" : "braking";
    for (let j = 0; j < 24; j++) {
      zones += TEMPLATES.zone.render({ lane: i + 602, id: j, status: status});
    }
    body += TEMPLATES.lane.render({ zones: zones,
                                    number: i + 602,
                                  });
    lanes.push({
      status: status,
      id: i + 602,
      boxes: [0, 0, 0, 0, 0,
              0, 0, 0, 0, 0,
              0, 0, 0, 0, 0,
              0, 0, 0, 0, 0,
              0, 0, 0, 0]
    });
  }

  $("#main-container").html(body);
  randomizeTrucksAndChutes();
  generateStaticBoxes();
}

function clearJams() {
  lanes.forEach(lane => {
    for (let i = 0; i < lane.boxes.length; i++) {
      if (lane.boxes[i] == 2) {
        lane.boxes[i] = 0;
      }
    }
  });
}

function generateStaticBoxes() {
  window.setInterval(clearJams, 15000);
  lanes.forEach(lane => {
    if (lane.status == "braking") {
      for(let i = 0; i < 24; i++) {
        if (Math.random() < .25) {
          $(`#zone-${lane.id}-${i}`).addClass("full");
        }
      }
    } else {
      startBoxes(lane);
    }
  });
}

function startBoxes(lane) {
  updateLane(lane);
}

function updateLane(lane) {
  lane.boxes = updateBoxes(lane.boxes);
  if (Math.random() < 0.03) {
    if (!hasJam(lane)) {
      const index = Math.floor(Math.random() * 23);
      lane.boxes[index] = 2;
    }
  }
  if (lane.boxes[23] == 0) {
    if (Math.random() < 0.25) {
      lane.boxes[23] = 1;
    }
  }
  renderLane(lane);

  window.setTimeout(() => { updateLane(lane); }, 1000);
}

function updateBoxes(boxes) {
  let end = [];
  let curr = [];
  let jam = false;
  boxes.forEach(box => {
    if (box == 2) {
      curr.shift();
      curr.push(0);
      end.push(curr);
      curr = [];
      jam = true;
      end.push([box]);
    }

    if (jam) {
      if (box == 1) {
        curr.push(box);
      } else if (box == 0) {
        end.push(curr);
        curr = []
        curr.push(box);
        jam = false;
      }
    } else {
      curr.push(box);
    }
  });
  if (!jam) {
    curr.shift();
    curr.push(0);
  }
  end.push(curr);
  return [].concat.apply([], end);
}

function hasJam(lane) {
  for (let i = 0; i < lane.boxes.length; i++) {
    if (lane.boxes[i] == 2) return true;
  }
  return false;
}

function renderLane(lane) {
  for(let i = 0; i < 24; i++) {
    const zone = $(`#zone-${lane.id}-${i}`);
    zone.removeClass("full");
    zone.removeClass("jammed");
    if (lane.boxes[i] == 1) {
      zone.addClass("full");
    }
    if (lane.boxes[i] == 2) {
      zone.addClass("jammed");
    }
  }
}
function randomizeTrucksAndChutes() {
  for (let i = 0; i < 16; i++) {
    const truck = randomPercentage();
    $(`#truck-${i + 602}`).css("height", `${truck}%`);
    $(`#truck-${i + 602}`).html(`${truck}%`)
    const chute = randomPercentage();
    $(`#chute-${i + 602}`).css("height", `${chute}%`);
    $(`#chute-${i + 602}`).html(`${chute}%`)
  }
}

function randomPercentage() {
  return Math.round(Math.random() * 100);
}

function generateStartingLane() {

}
