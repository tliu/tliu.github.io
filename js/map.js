var db;
var map;
var loading = {
    total: 0,
    count: 0
};
var markers = {};
var climbs = {};
var allMarkers = [];
var geoToClimb = {};

document.addEventListener("DOMContentLoaded",() => {
    map = init();
    db = new PouchDB("mtnproj");
    addListeners();
    db.destroy().then(() => {
        db = new PouchDB("mtnproj");
        initDB().then(() => {
            updateMarkers();
        });
    });

});

const addListeners = () => {
    document.getElementById("search").addEventListener("input", updateMarkers);
    var grade = document.getElementById("grade");
    grade.addEventListener("mouseup", updateMarkers);
    grade.addEventListener("touchend", updateMarkers);
    grade.nextElementSibling.addEventListener('mouseup', updateMarkers);
    grade.nextElementSibling.addEventListener('touchend', updateMarkers);
    grade.addEventListener("input", updateGrade);
    grade.nextElementSibling.addEventListener('input', updateGrade);
    document.getElementById("close-boulders").addEventListener("click", hideBoulderList);
}

const updateGrade = () => {
    const grade = document.getElementById("grade");
    const low = Math.round((grade.valueLow / 100) * 15);
    const high = Math.round((grade.valueHigh / 100) * 15);
    document.getElementById("low").innerHTML = `V${low}`;
    document.getElementById("high").innerHTML = `V${high}`;
}

const indexDB = () => {
    return Promise.all([
        db.createIndex({index: {fields: ["calcGrade"]}}),
        db.createIndex({index: {fields: ["name"]}}),
        db.createIndex({index: {fields: ["name", "calcGrade"]}}),
    ]);
}

const updateMarkers = () => {
    const grade = document.getElementById("grade");
    const low = Math.round((grade.valueLow / 100) * 15);
    const high = Math.round((grade.valueHigh / 100) * 15);
    const val = document.getElementById("search").value;
    let sel = {
        calcGrade: {
            $gte: low,
            $lte: high
        }
    }
    if (val != "") {
        sel.name = {$regex: `.*${val}.*`}
    }
    db.find({
        selector: sel,
    }).then(res => {
        createMarkers(res);
    }).catch(err => {
        console.log(err);
    });
}

const updateBoulderCounter = len => {
    document.getElementById("results").innerHTML = `${len}`
}

const toggleMarkers = showIds => {
    Object.values(markers).forEach(marker => {
        marker.setOpacity(0);
    });
    showIds.forEach(id => { 
        markers[id].setOpacity(100);
    });
}

const init = () => {
    const map = L.map('map').setView([42.510583, -71.006972], 15);
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidGxpdSIsImEiOiJjand3aTRnNHowanB6M3ltejlpZG5hZTY5In0.8UEgMFo3dvgXq8avCl8o3A', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.satellite'
    }).addTo(map);

    L.control.locate({}).addTo(map);
    //map.locate({setView: true, maxZoom: 18, watch: true, enableHighAccuracy: true})
    return map
}


const initDB = () => {
    Object.entries(ROUTES).forEach(([grade, routes]) => {
        routes.map(route => {
            route._id = "" + route["id"];
            route.calcGrade = parseInt(grade);
        });
    });
    routes = Object.values(ROUTES).flat();
    loading.total = routes.length;
    return Promise.all(
        routes.map(route => {
            db.put(route).then(() => {
                loading.count += 1;
                updateLoading();
                return Promise.resolve();
            });
        })
    );
}

const updateLoading = () => {
    document.getElementById("load").innerHTML = `${loading.count} / ${loading.total}`;
}

const createMarkers = (res) => {
    allMarkers.forEach(marker => {
        marker.remove()
    });
    allMarkers = []
    geoToClimb = {}
    res.docs.forEach(doc => {
        key = `${doc.latitude},${doc.longitude}`
        if (key in geoToClimb) {
            geoToClimb[key].push(doc)
        } else {
            geoToClimb[key] = [doc]
        }
    });
    for (let [key, value] of Object.entries(geoToClimb)) {
        addMarker(key, value)
    }
    updateGrade();
    document.getElementById("loading").style.display = "none"
}

const addMarker = (key, docs) => {
    let html = "";
    let lat, lng;
    let total = 0;
    docs.forEach(doc => {
        html += `<a class="noclass" href=${doc.url} target=_blank><div class="boulder"><h3>${doc.name}</h3><h4>${doc.rating} | ${doc.stars} stars</h4></div></a>`
        lat = doc.latitude;
        lng = doc.longitude;
        total += doc.stars;
    });
    let avg = total / docs.length;
    const marker = L.marker([lat, lng], {
        icon: new L.ExtraMarkers.icon({
            shape: "penta",
            markerColor: starColor(avg),
            innerHTML: `<p class="marker">${docs.length}</p>`
        }),
    });
    docs.forEach(doc => {
        markers[`${doc.id}`] = marker
    });

    climbs[marker.getLatLng()] = html
    marker.on("click",  (e) => {
      document.getElementById("boulder-body").innerHTML = climbs[e.target.getLatLng()];
      showBoulderList();
    });
    allMarkers.push(marker);
    marker.addTo(map);
}

const showBoulderList = () => {
    document.getElementById("boulders").style.display = "block";
}

const hideBoulderList = () => {
    document.getElementById("boulders").style.display = "none";
}


var COLOR_MAP = ["red", "orange", "orange", "yellow", "green-light", "green-light"];
const starColor = stars => {
    return COLOR_MAP[Math.round(stars)];
}
