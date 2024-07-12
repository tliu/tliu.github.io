
const characters = {}

const calcFastest = moves => {
    return Math.min(...moves.map(m => m.active + m.recovery))
}

Object.entries(all_moves).forEach(([character, moves]) => {
    movesWithDriveRush = [...moves]
    moves.forEach(move => {
        if (move.isNormal) {
            movesWithDriveRush.push(
                {
                    "active": move.active,
                    "block": move.block,
                    "chainable": move.chainable,
                    "hit": move.hit,
                    "input": "DR " + move.input,
                    "isNormal": false,
                    "name": "Drive Rush Uragan",
                    "recovery": move.recovery,
                    "startup": move.startup,
                    "total": move.total + 11,
                    "driverush": true
                }
            ) 
        }
    })
    characters[character] = new Character(character, movesWithDriveRush, calcFastest(moves))
})

$(document).ready(() => {
    const character = localStorage.getItem("character")
    if (character) {
        $("#dropdown-button").text(character)
    }
    const dropdownList = $("#character-dropdown")
    Object.keys(characters).forEach(c => {
        const a = document.createElement("a")
        const li = document.createElement("li")
        a.innerHTML = c
        a.className = "dropdown-item"
        a.href = "#"
        li.appendChild(a)
        dropdownList.append(li)
    })

    $(".dropdown-menu a").click(ev => {
        const c = $(ev.target).text()
        $("#dropdown-button").text(c)
        localStorage.setItem("character", c)
        gogogo()
    })

    $("#between").hide()

    $("#radio-exact").click(() => {
        $("#exact").show()
        $("#radioexact").prop("checked", true)
        $("#between").hide()
    })

    $("#radio-between").click(() => {
        $("#radiobetween").prop("checked", true)
        $("#exact").hide()
        $("#between").show()
    })

    $("#kd").change(gogogo)
    $("#res").change(gogogo)
    $("#res-min").change(gogogo)
    $("#res-max").change(gogogo)
    gogogo()
})

const gogogo = () => {
    const kd = Number($("#kd").val())
    const target = getTarget()
    const character = $("#dropdown-button").text()
    const frameKills = calculateFrameKill(kd, target, characters[character])
    $("#frame-meter").empty()

    const m = new Map()
    frameKills.forEach(f => m.set(f[0], f[1]))
    const keys = Array.from(m.keys()).sort().reverse()
    keys.forEach(k => {
        m.get(k).forEach(fk => {
            const div = document.createElement("div")
            div.innerHTML = generateFrameMeter(fk, k)
            $("#frame-meter").append(div)
        })
    })
    if (keys.length == 0) {
        $("#frame-meter").text("No frame kills found :(")
    }
}


const getTarget = () => {
    if ($("#radioexact").prop("checked")) {
        const tg = Number($("#res").val())
        return [tg, tg]
    } else if ($("#radiobetween").prop("checked")) {
        const resMin = Number($("#res-min").val())
        const resMax = Number($("#res-max").val())
        return [resMin, resMax]
    }
}

// target: [low, high]
const calculateFrameKill = (kd, target, character) => {
    const toKill = kd - target[0];
    const dp = new Map();
    character.moves.forEach(move => {
        addSeqToDp(dp, [move], move.total);
    });

    let frameCounts = Array.from(dp.keys())
    let depth = 0;
    while (!shouldStop(frameCounts, toKill, character.fastest)) {
        frameCounts = iterate(dp, character, ++depth)
    }
    const keys = Array.from(dp.keys().filter(k => k >= kd - target[1] && k <= kd - target[0]))
    return Array.from(dp).filter(([k, _]) => keys.includes(k)).map(([k, v]) => [kd - k, v])
}

const shouldStop = (frameCounts, target, fastest) => {
    return frameCounts.every(val => 
        target - val <= fastest || val >= target
    )
}

const iterate = (dp, character, depth) => {
    const oldMap  = new Map(dp)
    const frameCounts = new Set()
    for (let [k, v] of oldMap.entries()) {
        character.moves.forEach(move => {
            v.forEach(seq => {
                if (seq.length == depth) {
                    const newSeq = [...seq, move]
                    let newFrameCount = k + move.total
                    if(newSeq[newSeq.length - 1].chainable && newSeq[newSeq.length - 2].chainable) {
                        newFrameCount = k + move.active + move.recovery
                    }  else {
                        frameCounts.add(newFrameCount)
                        addSeqToDp(dp, newSeq, newFrameCount)
                    }
                }
            })
        });
    }

    return Array.from(frameCounts);
}

const addSeqToDp = (dp, seq, total) => {
    if (dp.has(total)) {
        dp.get(total).push(seq);
    } else {
        dp.set(total, [seq]);
    }
}

const generateFrameMeter = (seq, adv) => {
    let firstLine = ""
    let secondLine = "<b>"
    let totalFrames = 0
    seq.forEach(move => {
        if (move.input === "66") firstLine += "Dash"
        else firstLine += move.input
        firstLine += "&nbsp;".repeat(move.total - move.input.length)
        if (move.driverush) {
            secondLine += '<span class="purple">' + '|'.repeat(3) + '</span>'
            secondLine += '<span class="green">' + '|'.repeat(8) + '</span>'
        }
        secondLine += '<span class="green">' + '|'.repeat(move.startup - 1) + '</span>'
        secondLine += '<span class="red">' + '|'.repeat(move.active) + '</span>'
        secondLine += '<span class="blue">' + '|'.repeat(move.recovery) + '</span>'
        totalFrames += move.startup + move.active + move.recovery - 1
    })
    secondLine += "&nbsp;".repeat(adv) + "+" + adv 
    return firstLine + "<br>" + secondLine + "</b>"
}