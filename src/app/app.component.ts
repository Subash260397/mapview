import { Component, OnInit } from '@angular/core';
import { loadModules } from 'esri-loader';
import * as FileSaver from 'file-saver';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'mapview';
  buttonLabel: string = 'Get geojson File';
  view:any;
  isButtonVisible: boolean = false;
  selectedBoundary: any[] = [];
  fillSymbol:any;
  boundaries: any[] = [];
  graphicsLayer:any;
  graphic:any;
  groupLayer: any;
  geoJSONLayer:any;
  groupedBoundaries:any
  showCheckbox: boolean = false;
  groupButtonVisible:boolean = false;
  constructor(){}
  ngOnInit(): void {

    // Load the ArcGIS modules using loadModules function
    loadModules([
      'esri/Map',
      'esri/views/SceneView',
      'esri/Graphic',
      'esri/layers/GraphicsLayer',
      "esri/symbols/SimpleFillSymbol",
      "esri/Color",
      'esri/layers/GroupLayer',
    ]).then(([Map, SceneView,Graphic,GraphicsLayer, SimpleFillSymbol, Color,GroupLayer]) => {
      // Create a new map
      const map = new Map({
        basemap: 'streets',
      
      });

      // Create a new scene view
      this.view = new SceneView({
        container: 'mapView',
        map: map,
        // center: [-122.4194, 37.7749], // Specify the initial center of the map
        // zoom: 12 // Specify the initial zoom level
      });

      this.view.on('click',(event:any)=>{
         this.view.hitTest(event).then((response:any)=>{
          const graphic = response.results[0].graphic;

        if (graphic ) {
          
          this.showCheckbox = true;         
         
        }


      
         })
      })

      this.graphic = new Graphic();
      this.groupLayer = new GroupLayer();
      this.fillSymbol = new SimpleFillSymbol({
        color: new Color({
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256),
          a: 1  // Alpha value (opacity)
        }) // Red color with 50% transparency
      });

      this.graphicsLayer = new GraphicsLayer();  
      this.view.map.add(this.graphicsLayer);


    });
  }


  getGeoJson(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
      const geoJson = JSON.parse(e.target.result);
     
        loadModules(['esri/layers/GeoJSONLayer',"esri/Color",]).then(([GeoJSONLayer,Color]) => {
         
          this.geoJSONLayer = new GeoJSONLayer({
            title: 'GeoJSON Layer',
            url: URL.createObjectURL(file),
            renderer: {
              type: 'unique-value',
              field: 'group',
              uniqueValueInfos: [
                // Define unique value information for each group
                {
                  value: 1, 
                  symbol: {
                    type: 'simple-fill',
                    color: 'red' // Set the desired color for group 1
                  }
                },
                {
                  value: 2, 
                  symbol: {
                    type: 'simple-fill',
                    color: 'blue' // Set the desired color for group 2
                  }
                },
              
              ],
              defaultSymbol: {
                type: 'simple-fill',
                color: 'aqua' 
              },
             
            },
            
          });
    
         
          this.isButtonVisible = true;  

          const uniqueIdField = 'id';
          const group = "group";
          geoJson.features.forEach((feature: any, index: number) => {
            feature.properties[uniqueIdField] = index + 1;
            feature.properties[group] = index + 1;
          }); 

         

          this.boundaries = geoJson.features;
          this.view.map.add(this.geoJSONLayer);
          console.log(this.boundaries)
        });
       
      };
      reader.readAsText(file);
    }
  }


  editGrouping(){
    this.showCheckbox = true;  
    this.groupButtonVisible = true;
  }

  getBoundaryCoordinates(layer:any ) 
  {
   
    if (layer && layer.type == 'Feature') {
      layer.visible = !layer.visible;   
      const geometry = layer.geometry;
      if (geometry.type == 'Polygon') {
        const coordinates = geometry.coordinates[0];
        const polygon = {
          type: "polygon",
          rings: [coordinates]
        };


        this.graphic = 
        {
            geometry: polygon,
            symbol: {
              type: 'simple-fill',
              color: [255, 0, 0, 0.5],
              outline: {
                color: [255, 0, 0, 1],
                width: 2
              }
            },
            attributes:
            {
              id : layer.properties.id
            }      
        }
     
      }
      
    if (layer.visible == true) 
      {   
        this.graphicsLayer.add(this.graphic);   
        this.selectedBoundary.push(layer)  
      }
    else
    {
      const graphic = this.graphicsLayer.graphics.find((g: any) => g.attributes.id === layer.properties.id);
        this.graphicsLayer.remove(graphic);
        this.selectedBoundary.pop()
    }
     
    }
  }


  generateRandomColor() {
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
  }


  onButtonGroup(){
    const randomColor = this.generateRandomColor();
    this.groupedBoundaries = this.groupBoundariesByCondition();
  
    loadModules(['esri/geometry/geometryEngine']).then(([geometryEngine]) => {
      this.groupedBoundaries.forEach((group: any) => {

        // const modifiedData = group.features.map((feature:any) => feature.toJSON());
        let geometries = group.features.map((feature: any) => feature.geometry);

        // let groupboundary = group.feature.map((feature: any)=> feature)  
     
        for(const geo of geometries)
        {
          if (geo.type == 'Polygon') {
            const coordinates = geo.coordinates[0];
            const polygon = {
              type: "polygon",
              rings: [coordinates]
            };

            
            this.graphic = {
              geometry: polygon,
              symbol:{
                type: 'simple-fill',
                color: [255, 0, 0, 0.5],
                outline: {
                color: randomColor,
                width: 5
              },
              
            },
           
            };

            this.graphicsLayer.add(this.graphic);
            this.showCheckbox = false;
            this.groupButtonVisible = false;
          }

        }

        
        const geojson = {
          type: 'FeatureCollection',
          features: group.features // Replace 'groupedData' with the actual grouped data array
        };
        const blob = new Blob([JSON.stringify(geojson)], { type: 'application/json' });
        saveAs(blob, 'grouped_data.geojson');
       
      }); 

    this.selectedBoundary = []
    });

  }

  groupBoundariesByCondition(): any[] {
    const groupedBoundaries: any[] = [];
    const groupedValues: Set<string> = new Set();

    this.selectedBoundary.forEach((boundary: any) => {
      const groupKey = boundary.properties.groupAttribute; // Replace 'groupAttribute' with the actual attribute name
      if (groupedValues.has(groupKey)) 
      {
        const existingGroup = groupedBoundaries.find((group: any) => group.key === groupKey);
        existingGroup.features.push(boundary);
      } 
      else 
      {
        groupedValues.add(groupKey);
        groupedBoundaries.push({
          features: [boundary],
        });
      }
    });

   
    return groupedBoundaries;

  }
  

}




