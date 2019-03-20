// Color hex codes
const colors = {
	WHITE: 0xffffff,
	BLACK: 0x000000,
	DARK_BROWN: 0x736B5C,
	STREET: 0x999999,
	BUILDING: 0xE8E8E8,
	GREEN: 0x81A377,
	TREE: 0x216E41,
	DARK_GREY: 0x888888,
	WATER: 0x4B95DE
};

// City attribute variables: the variables below control the properties of our generated city

// The number of blocks to include in our grid in dimensional format (i.e. the value of 10 will 
// create a grid with 10 by 10 blocks)
var gridSize = 15;

// City road widths. Roads seperate our city grid blocks.
var roadWidth = 20;

// The maximum 'density' value to use when generating trees for our park blocks
var maximumTreeDensity = 70;

// City block size
var blockSize = 150;

// City block margin
var blockMargin = 10;

// Minimum and maximum building height values 
var minBuildingHeight = 50;
var maxBuildingHeight = 250;

// Helper functions used to get our total city size
function getCityWidth() { return blockSize * gridSize; }
function getCityLength() { return blockSize * gridSize; }

// Maximum building height deviation allowed for buildings allocated within the same block
const maxBuildingHeightDeviation = 15;

// This is a percentage cut-off we use to serve as an indicator of whether we have a 'tall' 
// building or not. Generally, we use 2 canvas elements - one for tall buildings and the other
// which is reserved for smaller ones.
const tallPercentageCutoff = 40; 

// Initialize the smaller building canvas dimensions and generate the canvas for these buildings:

const smallBuildingCanvasWidth = 8;
const smallBuildingCanvasHeight = 16;

var smallBuildingCanvas = generateBuildingCanvas( smallBuildingCanvasWidth, smallBuildingCanvasHeight );

// Initialize the larger building canvas dimensions and generate the canvas for these buildings:

const largeBuildingCanvasWidth = 16;
const largeBuildingCanvasHeight = 32;

var largeBuildingCanvas = generateBuildingCanvas( largeBuildingCanvasWidth, largeBuildingCanvasHeight );

// Number of sub-divisions to apply to our short building blocks. As an example, a value of 2 will
// result in 2 block divisions and a total of 4 buildings assigned to each non-tall city block. 
const blockSubdivisions = 2;

// This is our maximum building 'slice' deviation - i.e. whenever we have more than 1 building allocated  
// in one building block, we allow the building width / depth deviation between the buildings to vary 
// by this amount:
const maxBuildingSliceDeviation = 20;

// These are our city base heights
const groundHeight = 30;
const curbHeight = 1;

// Tree properties
const minTreeHeight = 4;
const maxTreeHeight = 10;

// Maps used to hold boolean indicators which show whether our grid coordinates represent a 
// ground or building block.  
var groundMap;
var buildingMap;

// Threshold value used to assign ground blocks. Any normalized values within the [0, 1] range that are
// between [0, groundThreshold] get assigned to a ground block which can can either be a building block 
// or a park / parking block
const groundThreshold = 0.85;

// Threshold value used to assign park / parking blocks. Any normalized ground block values falling between the
// [0, parkThreshold] range are assigned to a park or parking block.
const parkThreshold = 0.20;

// Generate and return a hexidecimal string representation of the numeric input
// i.e. 0 will get converted to "#000000"
function getHexadecimalString( number ) {
  var hexString = Number( number ).toString(16);
  hexString = "#000000".substr(0, 7 - hexString.length) + hexString;
  return hexString;
}

// Generate a building canvas with the given width and height and return it
function generateBuildingCanvas( width, height ) {

	// Build a small canvas we're going to use to create our window elements
	var smallCanvas  = document.createElement( 'canvas' );

	smallCanvas.width = width;
	smallCanvas.height = height;

	// Get a two-dimensional rendering context for our canvas
  var context = smallCanvas.getContext( '2d' );

	// Set the fill style to the same color as our building material 
	context.fillStyle = getHexadecimalString( colors.BUILDING );
	
	// Draw a filled rectangle whose starting point is (0, 0) and whose size is specified by 
	// the width and height variables.
	context.fillRect( 0, 0, width, height );

	// Set the building window dimensions
	const windowWidth = 2;
	const windowHeight = 1;
	
  // Draw the building windows 
  for( var y = 4; y < height - 2; y += 3 ) {
		for( var x = 0; x < width; x += 3 ) {

			// Here, we add slight color variations to vary the look of each window
			var colorValue   = Math.floor( Math.random() * 64 );
			context.fillStyle = 'rgb(' + [ colorValue, colorValue, colorValue ].join( ',' )  + ')';

			// Draw the window / rectangle at the given (x, y) position using our defined window dimensions
			context.fillRect( x, y, windowWidth, windowHeight );

		}
	}

	// Create a large canvas and copy the small one onto it. We do this to increase our original canvas
	// resolution:
	
	var largeCanvas = document.createElement( 'canvas' );
	
  largeCanvas.width    = 256;
	largeCanvas.height   = 512;
	
  var context = largeCanvas.getContext( '2d' );
	
	// Disable the smoothing in order to avoid blurring our original one
  context.imageSmoothingEnabled = false;
  context.webkitImageSmoothingEnabled = false;
	context.mozImageSmoothingEnabled = false;
	
  // Copy the smaller canvas onto the larger one
	context.drawImage( smallCanvas, 0, 0, largeCanvas.width, largeCanvas.height );
	
	return largeCanvas;
	
}

// Return a random integer between min (inclusive) and max (exclusive)
function getRandomIntBetween(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random building height deviation value and return it. We use this to vary the 
// building dimensions within the same block element.
function generateBuildingHeightDeviation() {
	return getRandomIntBetween(0, maxBuildingHeightDeviation);
}

// Generate the building scene and renderer
function generateScene() {
	
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer( { 
				// Set the canvas alpha transparency to true
				alpha: true 
				// Perform anti-aliasing (smooth jagged edges)
			, antialias: true
				// Assume that the colors do not have a pre-multiplied alpha 
			, premultipliedAlpha: false 
		}
	);

	// Tell the renderer that we want to use shadow maps in our scene
	renderer.shadowMapEnabled = true;

	// Set the shadow map type to one which filters shadow maps using the Percentage-Closer 
	// Soft Shadows (PCSS) algorithm.
	renderer.shadowMapType = THREE.PCFSoftShadowMap;

	renderer.setSize(window.innerWidth, window.innerHeight);

	// Add the renderer canvas (where the renderer draws its output) to the page.
	document.body.appendChild( renderer.domElement );

	// Initialize the frustum variables to use for the perspective camera  
	var fieldOfView = 60;
	var aspect = window.innerWidth / window.innerHeight;
	var nearPlane = 1;
	var farPlane = 4000;

	camera = new THREE.PerspectiveCamera( fieldOfView, aspect, nearPlane, farPlane);

	// Set the camera coordinates
	var x_position = 800;
	var y_position = 800;
	var z_position = 800;
	
	// Set the camera position in the world space.
	camera.position.set( x_position, y_position, z_position );

	// Rotate the camera to face the point / vector ( x, y, z ) in world space.
	camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

	// Use orbit controls, which allow the camera to orbit around a target.
	var controls = new THREE.OrbitControls( camera, renderer.domElement );

	// Enable damping (inertia), which can be used to give a sense of weight to the controls. 
	controls.enableDamping = true;
	// Set the damping factor / inertia
	controls.dampingFactor = 0.25;
	// Set the upper limit to how high we can orbit vertically to 90 degrees (PI radians / 2)
	controls.maxPolarAngle = Math.PI / 2;

	// We want the resize function to be called on each window resize event
	window.addEventListener('resize', resize, false);

}

function generateLighting() {

	// Variables used to create the hemisphere light  
	var skyColor = colors.WHITE;
	var groundColor = colors.WHITE;
	var colorIntensity  = 0.4;

	// Create a light source positioned directly above the scene, with color fading from the sky color to the ground color. 
	var hemisphereLight = new THREE.HemisphereLight( skyColor, groundColor, colorIntensity );

	// Create the directional lights which we use to simulate daylight:
	
	// Variables used to create the directional light 
	var shadowLightColor = colors.WHITE;
	var shadowLightIntensity = 0.25;

	var shadowLight = new THREE.DirectionalLight( shadowLightColor, shadowLightIntensity );

	// Initialize the variables used to create the shadow light
	var x_position = getCityWidth() / 2;
	var y_position = 800;
	var z_position = getCityLength() / 2;
	
	// Set the shadow camera position ( x, y, z ) in world space.
	shadowLight.position.set( x_position, y_position, z_position);

	// Variables used to create the back light 
	var backLightColor = colors.WHITE;
	var backLightIntensity = 0.1;

	var backLight = new THREE.DirectionalLight( backLightColor, backLightIntensity );

	// Set the back light position ( x, y, z ) in world space.
	backLight.position.set( -120, 180, 60 );
	
	scene.add(backLight, shadowLight, hemisphereLight);

}

// Return a normalized version of the input array which maps the array elements to a range between 0 and 1
function normalizeArray(array) {

	var minValue = Math.min.apply(Math, array);
	var maxValue = Math.max.apply(Math, array);

	// Apply the function below to each array element (to generate a normalized value between 0 and 1)
	return array.map( function( value ) {
		return ( (value - minValue) / (maxValue - minValue) );
	});

}

// Split a 1-D array into a 2-D array containing the specified number of columns in each sub-array.
function generate2DArray( array, numberOfColumns ) {

	var temp = array.slice(0);
	var results = [];
    
  while (temp.length) {
    results.push(temp.splice(0, numberOfColumns));
	}
	
	return results;

}

// Helper functions which can be used to transform our 1-D index -> 2-D coordinates
function getXCoordinateFromIndex( index ) {
	return parseInt(index / gridSize);
}

function getZCoordinateFromIndex( index ) {
	return index % gridSize;
}

// Fetch a value from our 2D perlin noise map and return it
function getNoiseValue( x, y, frequency ) {
	return Math.abs( noise.perlin2( x / frequency, y / frequency ) );
}

// Generate the ground / building maps we're going to use to assign blocks to the city
function generatePreceduralMaps() {

	noise.seed( Math.random() );

	// Noise frequency values we're using to generate our block distribution. The higher the value, the smoother the
	// distribution:

	// This is the general noise distribution used for the ground / water block assignments
	var generalNoiseFrequency = 15;

	// This is the ground noise distribution used for the building / park / parking block assignments
	var groundNoiseFrequency = 8;

	// Arrays to use in order to hold our generated noise values
	var generalNoiseDistribution = [];
	var groundNoiseDistribution = [];

	// Generate the ground / general noise arrays holding the perlin noise distribution 
	for (i = 0; i < gridSize; i++) {		
		for (j = 0; j < gridSize; j++) {	

			generalNoiseDistribution.push( getNoiseValue( i, j, generalNoiseFrequency ) );
			groundNoiseDistribution.push( getNoiseValue( i, j, groundNoiseFrequency ) );
			
		}
	}
	
	// Generate a normalized noise array which holds a range of values between [0, 1] 	
	var normalizedDistribution = normalizeArray(generalNoiseDistribution);

	// Map our noises to an binary array which serves as an indicator showing whether the array element is a 
	// ground block or a water block
	var groundDistributionMap = normalizedDistribution.map( function ( arrayValue ) { 
		return arrayValue <= groundThreshold ? true : false; 
	} )

	// Transform the 1-D ground mapping into a 2-D array with (x, z) coordinates 
	groundMap = generate2DArray( groundDistributionMap, gridSize);

	// Generate a normalized array for our ground distribution	
	var normalizedGroundDistribution = normalizeArray(groundNoiseDistribution);

	// Map our noises to an array holding binary values which indicate whether it's a building or a park block
	var buildingDistributionMap = normalizedGroundDistribution.map( function ( arrayValue, index ) { 
		return ( groundDistributionMap[index] && ( arrayValue > parkThreshold) ) ? true : false; 
	} )

	// Transform the 1-D building mapping into a 2-D array with (x, z) coordinates 
	buildingMap = generate2DArray( buildingDistributionMap, gridSize);

}

// Create a mesh we're going to use to model our water elements
function getWaterMesh (boxGeometryParameters, position) {

	// Check if the position was provided. If not, initialize it to (0, 0, 0)
	if (typeof position === "undefined") position = { x : 0, y : 0, z : 0 };

	// Use a mesh phong meterial, which can be used for shiny surfaces with specular highlights
	material = new THREE.MeshPhongMaterial( {
		  color:colors.WATER
		, transparent: true
		, opacity: 0.6 
	} );

	// Create a box geometry ( made for rectangular shapes ) with the appropriate dimensions
	geometry = new THREE.BoxGeometry(   
			boxGeometryParameters.width
		, boxGeometryParameters.height
		, boxGeometryParameters.depth 
	);

	// Generate and return the mesh

	mesh = new THREE.Mesh( geometry, material );

	mesh.position.set(position.x, position.y, position.z);

	mesh.receiveShadow = false;
	mesh.castShadow = false;

	return mesh; 

}

// Create a box mesh with the given geometry, material and color. The cast shadow parameter is a  
// boolean flag which controls whether we want our mesh to cast a shadow.
function getBoxMesh( boxGeometryParameters, position, color, castShadow ) {

	// Check if the shadow parameter was provided. If not, initialize it to true
	if (typeof castShadow === "undefined") castShadow = true;

	// Use lambert mesh material which is made for non-shiny surfaces / is generally great for performance
	material = new THREE.MeshLambertMaterial( { 
		color: color
	} );	

	// Create a box geometry ( made for rectangular shapes ) with the given width, height, and depth parameters
	geometry = new THREE.BoxGeometry(   
			boxGeometryParameters.width
		, boxGeometryParameters.height
		, boxGeometryParameters.depth 
	);

	// Generate the mesh and return it

	mesh = new THREE.Mesh( geometry, material );

	mesh.position.set( position.x, position.y, position.z );

	mesh.receiveShadow = true;
	mesh.castShadow = castShadow;

	return mesh;

}

// Take a list of meshes, merge their geometries into a single one and return it
function getMergedMesh ( meshList, material ) {
	
	// Check if the mesh material was provided, and if not, initialize it contain the same material as the 
	// first item in our list of meshes we want to merge
	if (typeof material === "undefined") material = meshList[0].material;
	
	// Create a geometry object to hold our combined geometries
	var geometry = new THREE.Geometry();

	// Merge all of the meshes into one geometry:
	for (var i = 0; i < meshList.length; i++) {
		meshList[i].updateMatrix();
		geometry.merge(meshList[i].geometry, meshList[i].matrix);
	}

	// Once we have our merged geometry, create a mesh from it 
	var mergedMesh = new THREE.Mesh(geometry, material);

	// We want our merged mesh to cast and receive shadows 
	mergedMesh.castShadow = true;
	mergedMesh.receiveShadow = true;
	
	return mergedMesh;

}

// Translate the grid x coordinate into a THREE.js scene x coordinate and return it
function getSceneXCoordinate( x ) {
	return ( ( x * blockSize ) + blockSize / 2 ) - ( getCityWidth() / 2 );
}

// Translate the grid z coordinate into a THREE.js scene z coordinate and return it
function getSceneZCoordinate( z ) {
	return ( ( z * blockSize ) + blockSize / 2 ) - ( getCityLength() / 2);
}

// Return true if the grid block located at (x, z) is a ground block; and false if 
// it's a water block
function isGroundBlock ( x, z ) {
	return groundMap[ x ][ z ];
}

// Return true if the grid block located at (x, z) is a building block; and false if 
// it's a block allocated for park / parking blocks.
function isBuildingBlock ( x, z ) {
	return buildingMap[ x ][ z ];
}

// Return the total amount of building blocks surrounding the block located at (x, z)
// on our grid. This is used to heuristically determine whether to build a park or 
// parking in our city. We want parking to be located closer to our buildings, so we 
// check to see the surrounding building count prior to deciding what to build.  
function getSurroundingBuildingNumber( x, z ) {

	buildingCount = 0;

	for ( i = Math.max(0, x - 1); i <= Math.min(x + 1, gridSize - 1); i++) {
		for ( j = Math.max(0, z - 1); j <= Math.min(z + 1, gridSize - 1); j++) {
			if (isBuildingBlock( i, j )) buildingCount = buildingCount + 1;
		}
	}

	return buildingCount

}

// Generate the scene / city terrain 
function generateCityTerrain() {

	var streetHeight = 2 * curbHeight;

	// Initialize the base mesh parameters and create the base mesh

	var baseColor = colors.DARK_BROWN;

	var baseGeometryParams = { 
		  width  : getCityWidth()
		, height : groundHeight
		, depth  : getCityLength() 
	}

	var basePosition = {
		  x : 0
		, y : -(groundHeight / 2) - streetHeight
		, z : 0
	}

	var baseMesh = getBoxMesh( baseGeometryParams, basePosition, baseColor );
	
	// Initialize the water mesh parameters and create the water mesh

	var waterGeometryParams = { 
			width  : getCityWidth() - 2
		, height : 0
		, depth  : getCityLength() - 2
	}

	var waterPosition = {
			x : 0
		, y : -streetHeight
		, z : 0
	}

	var water = getWaterMesh( waterGeometryParams, waterPosition );

	// Create the ground level / street level meshes and add them to a list

	var groundMeshList = [];
	var streetMeshList = [];

	for ( i = 0; i < groundMap.length; i++ ) {
		for ( j = 0; j < groundMap[0].length; j++ ) {

			if ( isGroundBlock(i, j) ) {

				var x = getSceneXCoordinate( i );
				var z = getSceneZCoordinate( j );

				groundMeshList.push(
					getBoxMesh ( 
							// Geometry parameters
						  { 
							    width  : blockSize
							  , height : 0
							  , depth  : blockSize 
						  }
						  // Positional parameters
						, { 
								  x : x
								, y : -streetHeight
								, z : z 
							} 
						, // Mesh color
						  colors.DARK_BROWN
					)
				);

				streetMeshList.push(
					getBoxMesh ( 					  
							// Geometry parameters
						  { 
							    width  : blockSize
							  , height : streetHeight
							  , depth  : blockSize 
						  }
						  // Positional parameters
						, { 
								  x : x
								, y : - streetHeight / 2 
								, z : z 
							}
						, // Mesh color
						  colors.STREET 
					)
				);

			}

		}	
	}

	// Merge the street / ground level meshes and add them to the scene
	
	if ( streetMeshList.length ) scene.add( getMergedMesh( streetMeshList ) ); 
	if ( groundMeshList.length ) scene.add( getMergedMesh( groundMeshList ) ); 

	// Finally, add in the base and water meshes to finish off the terrain
	scene.add( baseMesh, water );

}

// Generate the ground / city blocks composed of buildings / parks / parking and add them
// to the scene
function generateGroundBlocks() {

	// Go through each one of our grid blocks
	for ( var i = 0; i < gridSize; i++ ) {		
		for ( var j = 0; j < gridSize; j++ ) {	

			// Check if we have a ground block located on this grid (i, j) position
			if ( isGroundBlock(i, j) ) {

				// Translate our grid coordinates to the scene (x, z) coordinates

				var x = getSceneXCoordinate ( i );
				var z = getSceneZCoordinate ( j );
				
				// Calculate the total block curb width
				var curbWidth = blockSize - roadWidth;
				
				// Check if we have a building block allocated in on our grid (i, j) coordinates
				if ( isBuildingBlock(i, j) ) {

					// Generate the building curb mesh and add it to the scene

					var buildingCurbMesh = getBoxMesh ( 
							// Geometry parameters
						  { 
									width  : curbWidth
								, height : curbHeight
								, depth  : curbWidth 
							}
							// Positional parameters
						, { 
									x : x
								, y : curbHeight / 2
								, z : z 
							} 
						, // Mesh color
						  colors.DARK_GREY
					)

					scene.add( buildingCurbMesh );	

					// Generate a building / buildings with a random height parameter and add it / them to the scene:

					var buildingHeight = getRandomIntBetween( minBuildingHeight, maxBuildingHeight );

					var buildingWidth = curbWidth - ( blockMargin * 2 );
					
					buildingGeometryParameters = {
						  width  : buildingWidth
						, height : buildingHeight
						, depth  : buildingWidth
					}

					buildingPosition = {
						  x : x
						, z : z
					}

					generateBuildingBlock( buildingGeometryParameters, buildingPosition, blockSubdivisions, [] );

				} else {

					// Otherwise, we don't have a building block, so we use a heuristic approach to deciding whether to
					// use the block to either construct a park or parking. If the block is surrounded by less than 5 
					// buildings, we build a park. Otherwise, we build an empty 'parking' lot / block.

					numberOfSurroundingBuildings = getSurroundingBuildingNumber(i, j);

					// If the building block is surrounded by less than 5 buildings, we allocate it to a park: 
					if ( numberOfSurroundingBuildings < 5) {

						// Generate the green park mesh and add it to the scene:
						
						var parkMesh = getBoxMesh ( 
								// Geometry parameters
							  { 
										width  : curbWidth 
									, height : curbHeight
									, depth  : curbWidth 
								}
								// Positional parameters
							, { 
										x : x
									, y : curbHeight / 2
									, z : z 
								} 
							, // Mesh color
							  colors.GREEN
						)

						scene.add( parkMesh );

						// Generate the trees to add to our park mesh 

						generateTrees( x, z, buildingWidth ); 
						
					} else {

						// Otherwise, we assign the block to hold parking, which is essentially an empty curb we add
						// to our scene

						var parkingMesh = getBoxMesh ( 
								// Geometry parameters
							  { 
										width  : curbWidth
									, height : curbHeight
									, depth  : curbWidth 
								}
								// Positional parameters
							, { 
										x : x
									, y : curbHeight / 2
									, z : z 
								} 
							, // Mesh color
							  colors.DARK_GREY
						)

						scene.add( parkingMesh );

					}

				} 

			}
		}
	}
}

// Create a cylinder mesh and return it
function getCylinderMesh(color, cylinderGeometryParameters, position) {

	// We set default values to some of our cylinder geometry parameters if they're undefined

	if (cylinderGeometryParameters.radialSegments === "undefined") cylinderGeometryParameters.radialSegments = 4;
	if (cylinderGeometryParameters.heightSegments === "undefined") cylinderGeometryParameters.heightSegments = 1;

	// Use lambert mesh material which is made for non-shiny surfaces / great for performance
	material = new THREE.MeshLambertMaterial( { 
		color: color
	} );	

	// Create a box geometry ( made for rectangular shapes ) with the given width, height, and depth parameters
	geometry = new THREE.CylinderGeometry(   
			cylinderGeometryParameters.radiusTop 
		, cylinderGeometryParameters.radiusBottom 
		, cylinderGeometryParameters.height
		, cylinderGeometryParameters.radialSegments  
		, cylinderGeometryParameters.heightSegments     
	);

	// Generate the new mesh and return it
	
	mesh = new THREE.Mesh( geometry, material );

	mesh.position.set( position.x, position.y, position.z );

	mesh.rotation.y = Math.PI / 4;

	mesh.receiveShadow = true;
	mesh.castShadow = true;

	return mesh;

}

// Generate a tree on the scene (x, y) coordinate
var Tree = function ( x, z ) {

	// Array we use to hold the components which compose the tree
	this.components = [];

	// Generate a random height for our tree
	var treeHeight = getRandomIntBetween( minTreeHeight, maxTreeHeight );

	trunkMesh = getBoxMesh ( 	
			// Geometry parameters
		  { 
					width  : 2
				, height : treeHeight
				, depth  : 2 
			}
			// Positional parameters
		, { 
					x : x
				, y : (treeHeight / 2) + curbHeight
				, z : z 
			} 
		, // Mesh color
		  colors.DARK_BROWN
	)

	branchMesh = getCylinderMesh ( 
			// Mesh color
			colors.TREE
			// Geometry parameters
		, { 
					radiusTop  : 0
				, radiusBottom : 5
				, height  : maxTreeHeight * 1.5
			}
			// Positional parameters
		, { 
					x : x
				, y : treeHeight + curbHeight + 5
				, z : z 
			} 
	)

	// Rotate the tree in a random direction
	branchMesh.rotation.y = Math.random();

	// Add the branch / trunk to the tree components list
	this.components.push( branchMesh, trunkMesh );

	// Function which merges the tree branch and trunk components and returns them
	this.getMergedMesh = function() { return getMergedMesh( this.components ) }

};

// Generate trees centered within our scene (x, z) coordiante and laying within the given 
// park size parameter
function generateTrees( x, z, parkSize ) {
	
	var trees =  [];

	// Generate a random number from [0 -> maximum tree density] to allocate to this park block
	var numberOfTrees = getRandomIntBetween(0, maximumTreeDensity );

	// Generate the park tree elements
	for ( var i = 0; i < numberOfTrees; i++ ) {

		// Generate a random (x, z) coordinate for our tree and generate the tree

		var tree_x_coord = getRandomIntBetween( x - ( parkSize / 2 ) , x + ( parkSize / 2 ) );
		var tree_z_coord = getRandomIntBetween( z - ( parkSize / 2 ) , z + ( parkSize / 2) );

		// Generate a tree at the generated (x, z) coordiante and it to our array of trees 
		tree = new Tree(tree_x_coord, tree_z_coord);
		trees.push( tree.getMergedMesh() );

	}

	// Merge the generated tree meshes and add them to the scene
	if (trees.length) scene.add( getMergedMesh( trees ) );

}

// Create a mesh we're going to use for our buildings
function getBuildingMesh( boxGeometryParameters, position, color ) {

	// Use lambert mesh material which is made for non-shiny surfaces / is generally great for performance 
	var sideBuildingMaterial = new THREE.MeshLambertMaterial( {
			color : color
			// Check if our building qualifies as being tall, and if it does, use the large building canvas,
			// otherwise, we use the small one
		, map   : new THREE.Texture( isTall ( boxGeometryParameters.height ) 
																		? this.largeBuildingCanvas 
																		: this.smallBuildingCanvas )
	} );

	// We need to flag our side textures as needing an update, since we're using different canvas elements 
	// for this material
	sideBuildingMaterial.map.needsUpdate = true;

	// We use a regular non-textured lambert mesh for our top / bottom faces
	var topBottomMaterial = new THREE.MeshLambertMaterial( {
			color : color
	});

	// Set the materials we're going to use for each building side separately
	var materials = [
		sideBuildingMaterial,   	// Left side
		sideBuildingMaterial,   	// Right side
		topBottomMaterial,      	// Top side
		topBottomMaterial,      	// Bottom side
		sideBuildingMaterial,			// From side
		sideBuildingMaterial			// Back side
 ];

	// Create a box geometry ( made for rectangular shapes ) with the given width, height, and depth parameters
	geometry = new THREE.BoxGeometry(   
			boxGeometryParameters.width
		, boxGeometryParameters.height
		, boxGeometryParameters.depth 
	);

	// Create the building mesh and return it

	mesh = new THREE.Mesh( geometry, materials );

	mesh.position.set( position.x, position.y, position.z );

	mesh.receiveShadow = true;
	mesh.castShadow = true;

	return mesh;

}

// Create a new building element with the specified geometry / position parameters
var Building = function(geometryParameters, position) {
	
	// Array used to hold the building components
	this.components = [];

	// Generate a new mesh for out building and add it to our components array

	buildingMesh = getBuildingMesh (			
		  geometryParameters
		, position 
		, colors.BUILDING 
	)
	
	this.components.push( buildingMesh );

	// Function which merges the building components and returns them
	this.getMergedMesh = function() { return getMergedMesh( this.components ) }

}

// Returns true if the input height parameter qualifies a scructure or building as being 'tall' and 
// false otherwise. To generate this value, we generally use a 'tall percentage cutoff' thershold which
// uses our maximum building height in order to make the proper assignment.
function isTall ( height ) {
	return Math.round( ( height / maxBuildingHeight ) * 100 ) >= tallPercentageCutoff;
}

// Generate a building block which holds the input geometry / position parameters and sub-divide
// it by the 'numOfDivisions' assigned. The last buildings parameter is an array holding the 
// generated buildings created and assigned to this block.
function generateBuildingBlock( geometryParameters, position, numOfDivisions, buildings ) {

	// If the building is tall or if we have less than 1 sub-division to generate, create a building
	if ( isTall ( geometryParameters.height ) || numOfDivisions < 1 ) {

		// Generate a randomized maximum height deviation to use for our building
		var maxHeightDeviation = generateBuildingHeightDeviation();

		// Generate a random building height falling within our generated deviation
		var buildingHeight = getRandomIntBetween( geometryParameters.height - maxHeightDeviation
																						, geometryParameters.height + maxHeightDeviation );

		// Generate the geometry and position maps to use when constructing our building

		var buildingGeometryParameters = {
			  width  : geometryParameters.width
			, height : buildingHeight
			, depth  : geometryParameters.depth
		}

		var buildingPosition = {
			  x : position.x
			, y : ( buildingGeometryParameters.height / 2 ) + curbHeight 
			, z : position.z
		}

		// Generate a new building with the assigned position and geometry and add it to our 
		// array of buildings
		var building = new Building( buildingGeometryParameters, buildingPosition);
		buildings.push( building.getMergedMesh() );

		// Calculate the amount of buildings we've already generated
		var totalBuildingsBuilt = buildings.length;

		// Calculate the total number of buildings we're targeting to build (according to the amount of 
		// sub-divisions assigned to our block)
		var totalBuildingsToBuild = Math.pow( 2, blockSubdivisions );

		// If our block has no more buildings which need to be built, or if our building qualifies as
		// being a tall structure, we're done and we can merge the building mesh and add it to the scene
		if ( totalBuildingsBuilt >= totalBuildingsToBuild || isTall ( buildingGeometryParameters.height ) ) {
			scene.add( getMergedMesh( buildings ) );
		}

	} else {

		// Otherwise, we sub-divide our block into different components and generate a building whithin 
		// each sub component block

		// Generate a randomized block 'slice' deviation to use
		var sliceDeviation = Math.abs( getRandomIntBetween( 0, maxBuildingSliceDeviation ) );

		// If our geometry depth is larger than our width, we slice the depth dimension in 2 and generate
		// 2 sub-divisions / building elements spread across our depth dimension 
		if ( geometryParameters.width <= geometryParameters.depth ) {
		
			// Calculate the new depth geometry parameters we need to use to sub-divide this block
			var depth1 = Math.abs( ( geometryParameters.depth / 2 ) - sliceDeviation ) - ( blockMargin / 2 );
			var depth2 = Math.abs( -( geometryParameters.depth / 2 ) - sliceDeviation ) - ( blockMargin / 2 );

			// Calculate the new z coordinates we're going to use for our sub-division
			var z1 = position.z + ( sliceDeviation / 2 ) + ( geometryParameters.depth / 4 ) + ( blockMargin / 4 );
			var z2 = position.z + ( sliceDeviation / 2 ) - ( geometryParameters.depth / 4 ) - ( blockMargin / 4 );

			// Recursively generate the new sub-divided block elements and add them to the scene

			generateBuildingBlock (   
				  // Building geometry parameters
					{   width  : geometryParameters.width
						, height : geometryParameters.height
						, depth  : depth1 
					}
					// Building position
				,	{   x : position.x
						, z : z1
					}
				  // Decrement the total number of sub-divisions we need to perform
				, numOfDivisions - 1
				, buildings
			);

			generateBuildingBlock(  
				  // Building geometry parameters
				  { 
							width : geometryParameters.width
						, height : geometryParameters.height
						, depth : depth2 
				  }
				  // Building position
				, { 
							x : position.x
						, z : z2
					}
					// Decrement the total number of sub-divisions we need to perform
				, numOfDivisions - 1
				, buildings
			);

		} else {

			// Slice the width dimension in 2 and generate 2 sub-divisions / building elements spread across our 
			// width dimension 

			// Calculate the new width geometry parameters we need to use to sub-divide this block
			var width1 = Math.abs(  (geometryParameters.width / 2) - sliceDeviation ) - ( blockMargin / 2 );
			var width2 = Math.abs( -(geometryParameters.width / 2) - sliceDeviation ) - ( blockMargin / 2 );

			// Calculate the new x coordinates to use as part of our positional parameters
			var x1 = position.x + ( sliceDeviation / 2 ) + ( geometryParameters.width / 4 ) + ( blockMargin / 4 );
			var x2 = position.x + ( sliceDeviation / 2 ) - ( geometryParameters.width / 4 ) - ( blockMargin / 4 );

			// Recursively generate the new sub-divided block elements and add them to the scene

			generateBuildingBlock (   
					// Building geometry parameters
					{   width  : width1
						, height : geometryParameters.height
						, depth  : geometryParameters.depth
					}
					// Building position
				,	{   x : x1
						, z : position.z
					}
					// Decrement the total number of sub-divisions we need to perform
				, numOfDivisions - 1
				, buildings
			);

			generateBuildingBlock(  
					// Building geometry parameters
					{ 
							width  : width2
						, height : geometryParameters.height
						, depth  : geometryParameters.depth
					}
					// Building position
				, { 
							x : x2
						, z : position.z
					}
					// Decrement the total number of sub-divisions we need to perform
				, numOfDivisions - 1
				, buildings
			);

		}
	}
}

// Function called on window resize events.
function resize() {

	renderer.setSize( window.innerHeight, window.innerHeight );
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

// Update the global city option variables to contain the user input specified within our html page
function updateCityOptions() {

	this.gridSize = document.getElementById("grid_size").value;
	this.blockSize = document.getElementById("block_size").value;
	this.blockMargin = document.getElementById("block_margin").value;
	this.roadWidth = document.getElementById("road_width").value;
	this.maximumTreeDensity = document.getElementById("tree_density").value;

}

// Remove the existing canvas and re-initialize the scene
function reset() {

	var canvas = document.getElementsByTagName("CANVAS")[0];
	document.body.removeChild(canvas);

	init();

}

// Whenever the regenerate button is clicked, update our city option variables and 
// regenerate the scene
document.getElementById('regenerate').addEventListener('click', function() {

	updateCityOptions();
	reset();

}, false);

// This event handles our ability to toggle the visibility of the city options menu. 
document.getElementById( 'options' ).addEventListener( 'click' , function() {
   document.querySelector( '.options' ).classList.toggle( 'hidden' );
}, false);

// This is our main animation loop
var render = function() {

	requestAnimationFrame( render );
	renderer.render( scene, camera );	
	controls.update();

};

// Function which initializes all of our city / scene elements
function init() {

	generateScene();
	generateLighting();
	generatePreceduralMaps();
	generateCityTerrain();
	generateGroundBlocks();

}

// Initialize and render the scene
init();
render();