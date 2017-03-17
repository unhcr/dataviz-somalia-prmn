
//Create the dc.js chart objects and link to div

var peopleReachND = dc.numberDisplay("#dc-people-reach");
var peopleTargetND = dc.numberDisplay("#dc-people-target");
var pinND= dc.numberDisplay("#dc-people-in-need");
var reachTargetND = dc.numberDisplay("#dc-reach-vs-target");

var demoChart = dc.rowChart("#dc-demo-chart");
var benefActChart = dc.rowChart("#dc-benef-activity-chart");
var yemChart = dc.geoChoroplethChart("#dc-choropleth-map");
var reachTargetChart = dc.barChart("#dc-reach-target-chart");

var dataTable = dc.dataTable("#dc-data-table");

// Load data from CSV file
d3.csv("data/pcdataset.csv", function (data){
  // Load data from JSON file
  d3.json("data/admin1.json", function (govtJson){
    
    // format our data
    data.forEach(function(d){
      d.id = +d.id;
      d.yyyy = +d.yyyy;
      d.mm = +d.mm;
      d.h_reach = +d.h_reach;
      d.h_reach_men = +d.h_reach_men;
      d.h_reach_women = +d.h_reach_women;
      d.h_reach_boys = +d.h_reach_boys;
      d.h_reach_girls = +d.h_reach_girls;
      d.h_reach_total = +d.h_reach_total;
      d.h_target_total = +d.h_target_total;
      d.pcode = +d.pcode;
      d.pin_total = +d.pin_total;
      d.pop_total = +d.pop_total;
      d.reach = +d.reach;
      d.reach_total = +d.reach_total;
      d.target_total = +d.target_total;
    });


    // run the data thru crossfilter
    var facts = crossfilter(data); 

    // create people dimension and group
    var peopleGroup = facts.groupAll().reduce(
      function(p,v){
        ++p.cnt;
        p.reach += v.reach;
        p.values.splice(0,0,{
          id:v.id, governorate:v.governorate, 
          reached: v.h_reach_total,
          targeted: v.h_target_total,
          pin: v.pin_total
        });
        return p;
      },
      function(p,v){
        --p.cnt;
        p.reach -= v.reach;               
        p.values.splice(_.findIndex(p.values,['id',v.id]),1);
        return p;
      },
      function(){
        return {cnt: 0, reach:0, values:[]};
      }
    );

    // get object with total people reached, targeted and 
    // pin for all governorates
    function peopleGovtTotal (d){  
      // group by governorate and maximum people
      var r =           
        _.uniqWith(
          (_.map(d.values, function(n){
            return {
              governorate:n.governorate, 
              reached:n.reached, 
              targeted:n.targeted, 
              pin:n.pin
            };
          })),
          _.isEqual
        );
      // sum of people for all governorates
      return {
        reached: d3.sum(r, function(m){ return m.reached; }),
        targeted: d3.sum(r, function(m){ return m.targeted; }),
        pin: d3.sum(r, function(m){ return m.pin; }),
      };
    }

    peopleReachND
      .group(peopleGroup)
      .valueAccessor(function(d){
        return peopleGovtTotal(d).reached;
      })
      .formatNumber(d3.format(","));
    
    peopleTargetND
      .group(peopleGroup)
      .valueAccessor(function(d){        
        return peopleGovtTotal(d).targeted;
      })
      .formatNumber(d3.format(","));

    pinND
      .group(peopleGroup)
      .valueAccessor(function(d){        
        return peopleGovtTotal(d).pin;
      })
      .formatNumber(d3.format(","));

    reachTargetND
      .group(peopleGroup)
      .valueAccessor(function(d){  
        var reach = peopleGovtTotal(d).reached;
        var target = peopleGovtTotal(d).targeted;

        return reach/target || 0;
      })
      .formatNumber(d3.format(".0%"));
 
    // create demographic dimension and group
    var demo = facts.dimension(function(d){
      return d.gender;
    });   
    var demoGroup = demo.group().reduce(
      function(p,v){
        ++p.cnt;
        p.reach += v.reach;
        p.h_reach += v.h_reach;
        return p;
      },      
      function(p,v){
        --p.cnt;
        p.reach -= v.reach;
        p.h_reach -= v.h_reach;
        return p;
      },
      function(p,v){
        return { cnt:0, reach:0, h_reach:0, reach_percent:0 };
      }
    );    
    // configure demo chart parameters
    demoChart.width(170)
      .height(207.98)
      .margins({top:5, right:10, bottom:20, left:10})
      .dimension(demo)
      .group(demoGroup)
      .valueAccessor(function(d){
        return (d.value.reach);
      })
      .colors(d3.scale.category20c())
      .label(function(d){
        return _.upperFirst(d.key);
      })
      .title(function(d){
        return "Total " + _.upperFirst(d.key) + 
                " Reached: " + d3.format(",")(d.value.reach);
      })
      .elasticX(true)
      .xAxis()
      .ticks(4)
      .tickFormat(function(v){ return v/1000 + 'K'; });
    
    // disble mouse click for demoChart
    demoChart.filter = function(){};

    // create beneficiary activity dimension and group
    var benefAct = facts.dimension(function(d){
      return d.indicator_group;
    });    

    var benefActGroup = benefAct.group().reduceSum(function(d){
      return d.reach;
    });

    // configure beneficiary activity chart parameters
    benefActChart.width(350)
      .height(207.98)
      .margins({top:5, right:10, bottom:20, left:10})
      .dimension(benefAct)
      .valueAccessor(function(d){ return d.value; })
      .group(benefActGroup)
      .colors(d3.scale.ordinal().range(colorbrewer.Set2[6]))
      .label(function(d){
        return d.key;
      })
      .title(function(d){
        return d3.format(",")(d.value);
      })
      .elasticX(true)
      .xAxis().ticks(4);

    // configure reached vs targeted dimension and group
    var reachTarget = facts.dimension(function(d){
      return d.indicator_group;
    });
    var reachTargetGroup = reachTarget.group()
    // .reduceSum(function(d){
    //   return d.reach;
    // });
    .reduce(
      function(p,v){ 
        ++p.cnt;
        p.reach += v.reach_total;
        p.target += v.target_total;
        return p;
      },
      function(p,v){  
        --p.cnt;
        p.reach -= v.reach_total;
        p.target -= v.target_total;
        return p;
      },
      function(p,v){  
        return { cnt:0, reach:0, target:0 };
      }      
    );

    // Configure bar chart parameters
    reachTargetChart.width(600).height(400)
      .margins({top:20, right:0, bottom:220, left:50})
      .dimension(reachTarget)
      .group(reachTargetGroup, "Reached")
      .valueAccessor(function(d){
        // console.log(d.value.reach / 4)
        return d.value.reach / 4;
      })
      .stack(reachTargetGroup, "Targeted", function(d){
        var diff = (d.value.target / 4) - (d.value.reach / 4);
        return diff < 0 ? 0 : diff ;
      })
      .title(function(d){
        return "Reached: " + d3.format(",")(d.value.reach / 4) + "\n" + 
                "Targeted: " + d3.format(",")(d.value.target / 4);
      })
      .barPadding(0.1)
      .outerPadding(0.05)
      .brushOn(false)
      .x(d3.scale.ordinal())
      .xUnits(dc.units.ordinal)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .yAxis().tickFormat();
    
    reachTargetChart.on('renderlet',function(chart){
      // rotate x-axis labels
      chart.selectAll('g.x text')
        .attr('transform', 'translate(-10,10) rotate(270)')
        .attr('style', 'text-anchor: end;');
    });

    // create map dimension and group
    var benefPerGovt = facts.dimension(function(d){ return d.governorate; }); 
    var benefPerGovtGroup = benefPerGovt.group().reduceSum(function(d){
      return d.reach;
    });
    
    // Convert zipped shapefiles to GeoJSON with mapshaper (mapshaper.org).
    // Use d3.geo.mercator projections and play around with the scale and 
    // translate method parameters to get the right fit for the map. 
    // The maximum value for colorDomain can be automatically calculated 
    // from the dataset.
    // colorAccessor returns a grey color for 0 or undefined data values. 
    // Remember to set the 'stroke' color for the admin1 borders to stand-out,
    // to increase thickness set 'stroke-width' to 2px or more. See 'style.css'.
    yemChart
      .width(640)
      .height(320)
      .transitionDuration(1000)
      .dimension(benefPerGovt)
      .group(benefPerGovtGroup)
      .projection(d3.geo.mercator()
        .scale(2400)
        .translate([-1700, 820])
      )
      .keyAccessor(function(d){ return d.key; })
      .valueAccessor(function(d){ return d.value; })
      // .colors(['#ccc'].concat(colorbrewer.Blues[9])) 
      .colors(["#CCC", '#E2F2FF','#C4E4FF','#9ED2FF','#81C5FF','#6BBAFF','#51AEFF','#36A2FF','#1E96FF','#0089FF','#0061B5'])
      .colorDomain([0, benefPerGovtGroup.top(1)[0].value / 2]) 
      .colorAccessor(function (d,i) { return d ? d:0; })         
      .overlayGeoJson(govtJson.features, "admin1Name",function(d){
        return d.properties.admin1Name;
      })
      .title(function(d){
        return "Governorate: " + d.key + "\nTotal People Reached: " + d.value;
      });


    // create partnership dimension
    var benefProfile = facts.dimension(function(d){
      return d.governorate;
    });  
    var benefProfileGroup = benefProfile.group().reduce(
      function(p,v){
        ++p.cnt;
        p.reach += v.reach_total;
        p.target += v.target_total;
        // if(p.max_reach < v.reach_total) { p.max_reach = v.reach_total; }
        // if(p.max_target < v.target_total) { p.max_target = v.target_total; }
        p.h_reach += v.h_reach_total;
        p.h_target += v.h_target_total;
        p.partner0.splice(0,0,{id: v.id, partner: v.partner0, type: v.partnertype0});
        p.partner1.splice(0,0,{id: v.id, partner: v.partner1, type: v.partnertype1});
        p.partner2.splice(0,0,{id: v.id, partner: v.partner2, type: v.partnertype2});
        p.partner3.splice(0,0,{id: v.id, partner: v.partner3, type: v.partnertype3});
        p.partner4.splice(0,0,{id: v.id, partner: v.partner4, type: v.partnertype4});
        p.partner5.splice(0,0,{id: v.id, partner: v.partner5, type: v.partnertype5});
        p.partner6.splice(0,0,{id: v.id, partner: v.partner6, type: v.partnertype6});
 
        return p;
      },
      function(p,v){
        --p.cnt;
        p.reach -= v.reach_total;
        p.target -= v.target_total;
        // if(p.max_reach > v.reach_total) { p.max_reach = v.reach_total; }
        // if(p.max_target > v.target_total) { p.max_target = v.target_total; }        
        p.h_reach -= v.h_reach_total;
        p.h_target -= v.h_target_total;
        p.partner0.splice(_.findIndex(p.partner0,['id',v.id]),1);
        p.partner1.splice(_.findIndex(p.partner1,['id',v.id]),1);
        p.partner2.splice(_.findIndex(p.partner2,['id',v.id]),1);
        p.partner3.splice(_.findIndex(p.partner3,['id',v.id]),1);
        p.partner4.splice(_.findIndex(p.partner4,['id',v.id]),1);
        p.partner5.splice(_.findIndex(p.partner5,['id',v.id]),1);
        p.partner6.splice(_.findIndex(p.partner6,['id',v.id]),1);
        
        return p;
      },
      function(p,v){
        return {
                cnt:0, 
                reach:0, 
                target:0,
                // max_reach:0,
                // max_target:0,                
                h_reach:0, 
                h_target:0, 
                partner0:[],
                partner1:[], 
                partner2:[],
                partner3:[], 
                partner4:[],  
                partner5:[], 
                partner6:[]
              };
      }
    );
    // convert group to fake dimension
    var benefProfileGroupDx =  {
        top: function(N){
          return benefProfileGroup.top(N);
        },
        bottom: function(N){
          return benefProfileGroup.top(Infinity).slice(-N).reverse();
        }
      };

    dataTable.width(420)
      .height(800)
      .dimension(benefProfileGroupDx)
      .group(function(d){ return "Partnerships"; })
      .columns([
        function(d) { return d.key; },  
        function(d) { return d3.format(",")(d.value.reach / 4); },
        function(d) { return d3.format(",")(d.value.target / 4); },
        function(d) { 
          var arr =  
                 _.compact(
                      _.uniq(
                        _.map(  
                          _.concat(
                            d.value.partner0,
                            d.value.partner1,
                            d.value.partner2,
                            d.value.partner3,
                            d.value.partner4,
                            d.value.partner5,
                            d.value.partner6
                          ),"partner"
                       )
                    )
                ).sort();

          return _.join(arr,", "); 
        }
      ])
      .sortBy(function(d){ return d.key; })
      .order(d3.ascending);

    // Render the charts
    dc.renderAll();

  });
});

