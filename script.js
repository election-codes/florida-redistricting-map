const map = L.map("map");

let geoLayer;
let selectedLayer;

const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution:"© OpenStreetMap" }
);

osm.addTo(map);

function getColor(dem,rep){

  const m = dem - rep;

  if(m >= 30) return "#08306b";
  if(m >= 15) return "#2171b5";
  if(m >= 5) return "#6baed6";

  if(m > -5) return "#d9d9d9";

  if(m > -15) return "#fc9272";
  if(m > -30) return "#ef3b2c";

  return "#99000d";
}

function getRating(dem,rep){

  const margin = Math.abs(dem-rep);

  if(margin >= 20)
    return dem > rep ? "Safe D" : "Safe R";

  if(margin >= 10)
    return dem > rep ? "Likely D" : "Likely R";

  if(margin >= 5)
    return dem > rep ? "Lean D" : "Lean R";

  return "Tossup";
}

function showDistrict(feature){

  const dem =
    (feature.properties["Dem %"] || 0)*100;

  const rep =
    (feature.properties["Rep %"] || 0)*100;

  const votes =
    feature.properties.total_2024_sum || 0;

  const margin =
    dem > rep
    ? `D+${(dem-rep).toFixed(1)}`
    : `R+${(rep-dem).toFixed(1)}`;

  document.getElementById("districtPanel").innerHTML = `
    <h2>FL-${feature.properties.DISTRICT}</h2>

    <b>Democratic:</b>
    ${dem.toFixed(1)}%<br>

    <b>Republican:</b>
    ${rep.toFixed(1)}%<br><br>

    <b>Margin:</b> ${margin}<br>
    <b>Rating:</b> ${getRating(dem,rep)}<br>
    <b>Total Votes:</b>
    ${Math.round(votes).toLocaleString()}
  `;
}

fetch("fl_2024_by_2026_district.geojson")
.then(r=>r.json())
.then(data=>{

  const districts=[];

  geoLayer = L.geoJSON(data,{

    style:f=>{

      const dem =
        (f.properties["Dem %"]||0)*100;

      const rep =
        (f.properties["Rep %"]||0)*100;

      return{
        fillColor:getColor(dem,rep),
        color:"white",
        weight:1,
        fillOpacity:.80
      };
    },

    onEachFeature:(feature,layer)=>{

      const district =
        feature.properties.DISTRICT;

      const dem =
        (feature.properties["Dem %"]||0)*100;

      const rep =
        (feature.properties["Rep %"]||0)*100;

      districts.push({
        district,
        dem,
        rep
      });

      const center =
        layer.getBounds().getCenter();

      L.marker(center,{
        icon:L.divIcon({
          className:"district-label",
          html:String(district)
        }),
        interactive:false
      }).addTo(map);

      layer.on("mouseover",function(){

        if(layer!==selectedLayer){

          layer.setStyle({
            weight:3
          });

        }

      });

      layer.on("mouseout",function(){

        if(layer!==selectedLayer){

          geoLayer.resetStyle(layer);

        }

      });

      layer.on("click",function(){

        if(selectedLayer){

          geoLayer.resetStyle(
            selectedLayer
          );

        }

        selectedLayer = layer;

        layer.setStyle({
          weight:4,
          color:"#000"
        });

        showDistrict(feature);

        history.replaceState(
          {},
          "",
          "?district="+district
        );
      });

    }

  }).addTo(map);

  map.fitBounds(
    geoLayer.getBounds()
  );

  districts.sort(
    (a,b)=>(b.dem-b.rep)-(a.dem-a.rep)
  );

  const topD =
    districts.slice(0,5);

  const topR =
    [...districts]
      .reverse()
      .slice(0,5);

  document.getElementById("topDems")
    .innerHTML =
    "<b>Most Democratic</b><br><br>" +
    topD.map(
      d=>`FL-${d.district}`
    ).join("<br>");

  document.getElementById("topReps")
    .innerHTML =
    "<b>Most Republican</b><br><br>" +
    topR.map(
      d=>`FL-${d.district}`
    ).join("<br>");

  document.getElementById(
    "statewideStats"
  ).innerHTML = `
    <b>Statewide Summary</b><br><br>

    Districts:
    ${districts.length}
  `;

});

document
.getElementById("resetView")
.addEventListener("click",()=>{

  map.fitBounds(
    geoLayer.getBounds()
  );

});

document
.getElementById("search")
.addEventListener("input",e=>{

  const value =
    e.target.value
    .replace(/fl-|fl|district/gi,"")
    .trim();

  geoLayer.eachLayer(layer=>{

    if(
      String(
        layer.feature.properties.DISTRICT
      )===value
    ){

      map.fitBounds(
        layer.getBounds()
      );

      layer.fire("click");
    }

  });

});
