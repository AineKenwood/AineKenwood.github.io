/**
 * Aine Kenwood
 * MD Simulation Implementation
 */ 
class Particle 
{
	constructor(velocity, position, acceleration, charge, mass)
	{
		this.velocity = velocity; 
		this.position = position; 
		this.acceleration = acceleration; 
		this.charge = charge; 
		this.mass = mass; 
	}
	//Getters
	get Velocity(){return this.velocity;}
	get Position(){return this.position;}
	get Acceleration(){return this.acceleration;}
	get Charge(){return this.charge;}
	get Mass(){return this.mass;}
	//Setters
	set Velocity(v){this.velocity = v;}
	set Position(p){this.velocity = p;}
	set Acceleration(a){this.acceleration = a;}
	set Charge(c){this.charge = c;}
	set Mass(m){this.mass = m;}
}

//Set up scene and render
const scene = new THREE.Scene()
const container = document.getElementById("container")

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/ (window.innerHeight-100), 0.1, 1000 )
const renderer = new THREE.WebGLRenderer({ antialias: true})

document.body.appendChild( renderer.domElement );
renderer.setSize(window.innerWidth, (window.innerHeight - 100) )
renderer.setClearColor("#DCFDFF")
camera.position.set(150,150,400);
camera.lookAt(scene.position);	

//add controls 
controls = new THREE.OrbitControls( camera, renderer.domElement );

//Create 3D Grid cube 20x20 
var gridXZ = new THREE.GridHelper(200, 10, 0xa83232,0xa83232);//red
gridXZ.position.set( 100,0,100 );
scene.add(gridXZ);
	
var gridXY = new THREE.GridHelper(200, 10, 0x3234a8,0x3234a8); //blue
gridXY.position.set( 100,100,0 );
gridXY.rotation.x = Math.PI/2;
scene.add(gridXY);

var gridYZ = new THREE.GridHelper(200, 10, 0x32a836, 0x32a836 ); //green
gridYZ.position.set( 0,100,100 );
gridYZ.rotation.z = Math.PI/2;
scene.add(gridYZ);

//add ambient lighting
var ambientLight = new THREE.AmbientLight ( 0xffffff, 0.5)
scene.add( ambientLight )

//add point light for shadows
var pointLight = new THREE.PointLight( 0xffffff, 1 );
pointLight.position.set( 400, 400, 400 );
scene.add( pointLight );

//listen for window resizing and adjust accordingly 
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth/ (window.innerHeight - 100)
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth,(window.innerHeight-100))
}

// ================== CONSTANTS ===================
var m = 5; 
var kb = 0.5; 
var time_step = 0.001;
var k = 8000;                                                              
var epsilon = 1; 
var sigma = 10;
var radius = 5;
var T = 100; 
var particleArray = [];
var sphereArray = [];
var particleIndex = -1;  //clicked particle index
// ================== CONSTANTS ===================

// add GUI
var options = {
	temperature: 100,
	positive: 10,
	negative: 10,
	neutral: 10,
	magnitude_of_positive_charges: 1,
	magnitude_of_negative_charges: 1,
	radius:5,
	show_forces: false,
	epsilon: 1,
	time_step: 0.001,
	preset: "None",
};

var gui = new dat.GUI({width: 450});
gui.domElement.id = 'gui';
var settingsFolder = gui.addFolder('System Settings')
settingsFolder.add(options,'temperature', 1, 1000).listen();
settingsFolder.add(options,'positive', 0, 30).listen().onChange(resetSim);
settingsFolder.add(options,'negative', 0, 30).listen().onChange(resetSim);
settingsFolder.add(options,'neutral', 0, 30).listen().onChange(resetSim);
settingsFolder.add(options,'show_forces').name("Show Forces").listen();
settingsFolder.add(options,'preset',
					['None','Temperature and Speed', 'Attractive and Repulsive Forces',
					'Net Force and Distance','Intermolecular Interactions and Particle Size'])
					.name('Preset').listen().onChange(setUpPreset)

var ParticleFolder = gui.addFolder('Particle Settings')
ParticleFolder.add(options,'magnitude_of_negative_charges', 1, 5).name("Negative Charge").listen().onChange(resetSim);
ParticleFolder.add(options,'magnitude_of_positive_charges', 1, 5).name("Positive Charge").listen().onChange(resetSim);
ParticleFolder.add(options,'radius', 3, 20).listen().onChange(updateSphereGeometry);

var AdvancedFolder = gui.addFolder('Advanced Settings')
AdvancedFolder.add(options,'time_step', 0.0005, 0.002).name("Time Step").listen();
AdvancedFolder.add(options,'epsilon', 1, 1000).listen();

//Add Raycasting 
var raycaster, mouse = {x: 0, y: 0 }
raycaster = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerdown',raycast,false);

function maxwellDis(T)//Not toatally functional, cannot sample properly bc javascript >:V 
{
	var maxDis = []
	//caluclating curve from v = 0 -> v = 50  
	for (let v = 0; v < 50; v++)
	{
		var firstTerm = Math.pow((m/(2*Math.PI*kb*T)),(1.5)); 
		var secondTerm = 4*Math.PI*(Math.pow(v,2));
		var thirdTerm = Math.exp((-m*(Math.pow(v,2))/(2*kb*T)));
		
		maxDis[v] = (firstTerm)*(secondTerm)*(thirdTerm);
	}
	//console.log(maxDis);
	
	var most_probable = 0; 
	var probV = 0;
	for ( let p = 0; p < maxDis.length; p ++)
	{
		if (maxDis[p] > most_probable)
		{
			most_probable = maxDis[p];
			probV = p;
		}
	}
	//console.log(probV)
	return probV; 
}

function setUpParticles(numPositive,numNeg, numNeutral)
{
	var neg = 0; 
	var neutral = 0;
	var numParticles = numPositive + numNeg + numNeutral;
	var material; 
	
	for (let i = 0; i < numParticles; i++)
	{
		var Xpos = Math.random() * (170)+15;
	    var Ypos = Math.random() * (170)+15;
		var Zpos = Math.random() * (170)+15;
		var position = [Xpos, Ypos, Zpos];
		
		//add way for particles to not spawn on top of eachother 
		
		//generate random unit vector x,y,z
   	    var unitV = [((Math.random() * (1 + 1)) - 1),((Math.random() * (1 + 1)) - 1),((Math.random() * (1 + 1)) - 1)];
   	    var unitVMag = Math.sqrt(Math.pow(unitV[0],2)+Math.pow(unitV[1],2)+Math.pow(unitV[2],2));
   	    
   	     var unitX = unitV[0]/unitVMag;  
		 var unitY = unitV[1]/unitVMag;  
		 var unitZ = unitV[2]/unitVMag; 
		 //console.log(unitX,unitY,unitZ); 
   	    
		var pVelocity = maxwellDis(options.temperature);	
		var XVel = pVelocity * unitX ;
	    var YVel = pVelocity * unitY;
		var ZVel = pVelocity * unitZ;
		var velocity = [XVel,YVel,ZVel];
		
		
		if (neg < numNeg)
		{
		 	charge = -options.magnitude_of_negative_charges;
		 	material = new THREE.MeshStandardMaterial( { color: 0x34e8eb})
       		neg = neg + 1; 
		}
		else if(neutral < numNeutral)
		{
			charge = 0;
		 	material = new THREE.MeshStandardMaterial( { color: 0x8B8B8B})
       		neutral = neutral + 1; 
		}
   		else
   		{
			charge = options.magnitude_of_positive_charges;
			material = new THREE.MeshStandardMaterial( { color: 0xeb34a2 })
		}
   		
       	var mass = 2.5; 
    	var acc = [0,0,0];
		
		// create basic Sphere object 
		var geometry = new THREE.SphereGeometry( options.radius,  20,  20)
		var sphere = new THREE.Mesh ( geometry, material )
	    sphere.position.set(Xpos,Ypos,Zpos);
		sphereArray[i] = sphere; 
		scene.add( sphere )
		
		//create new particle
		let p = new Particle(velocity, position, acc, charge, mass);
		particleArray[i] = p; 
	}
}
//listen for click, return index of clicked sphere 
function raycast(event)
{
	//get mouse coordinates where clicked
	var rect = renderer.domElement.getBoundingClientRect();
	mouse.x = ( ( event.clientX - rect.left ) / ( rect.width - rect.left ) ) * 2 - 1;
	mouse.y = - ( ( event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;
    
    //set ray origin 
    raycaster.setFromCamera( mouse, camera );  
    
    //find intersecting objects
    var intersects = raycaster.intersectObjects( sphereArray );
    
     if (intersects.length > 0)
     {
		
		for (var s = 0; s< sphereArray.length; s++ )
		{
			var x = intersects[0].point.x - sphereArray[s].position.x ;
			var y = intersects[0].point.y - sphereArray[s].position.y ;
			var z = intersects[0].point.z - sphereArray[s].position.z ;
			var dis = Math.sqrt((Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2)));

			if(dis <= options.radius)
			{
				particleIndex = s;
				
				if(intersects[0].object.material.opacity == 0.5)//reset particle back to normal
         		{
					const newMaterial = intersects[0].object.material.clone();
	    			newMaterial.transparent = false;
	    			newMaterial.opacity = 1;
	    			intersects[0].object.material = newMaterial;
	    			particleIndex = -1;
				 }
				 else
				 {
					const newMaterial = intersects[0].object.material.clone();
    		 		newMaterial.transparent = true;
   	    	 		newMaterial.opacity = 0.5;
        	 		intersects[0].object.material = newMaterial;
				}
			}
		}
	}
}

function updateSphereGeometry()
{
	for(let s = 0; s < sphereArray.length; s++)
	{
		var newGeometry = new THREE.SphereGeometry(options.radius, 20, 20)
		sphereArray[s].geometry.dispose()
		sphereArray[s].geometry = newGeometry;
	}
}

function updateConstants()
{
	T = options.temperature * 50;
	show_forces = options.show_forces
	radius = options.radius;
	sigma = (options.radius * 2)/1.12; 
	time_step = options.time_step;
	epsilon = options.epsilon;
}

function resetSim()
{
	for(let s = 0; s < sphereArray.length; s++)
	{
		scene.remove(sphereArray[s])
	}
	sphereArray = [];
	particleArray = [];
	particleIndex = -1; 
	setUpParticles(options.positive,options.negative,options.neutral);
}

function showForces(Fnet,distance,current,other)
{
		
		//calculate unit vector for FNET 
		    
		var FnetMag = Math.sqrt(Math.pow(Fnet[0],2)+Math.pow(Fnet[1],2)+Math.pow(Fnet[2],2));
		
		var fUnitX = Fnet[0]/FnetMag;  
		var fUnitY = Fnet[1]/FnetMag;  
		var fUnitZ = Fnet[2]/FnetMag;  
		
		//calculate vector from particle of interest to other particle 
		var difX = particleArray[other].Position[0] - particleArray[current].Position[0] ;
		var difY = particleArray[other].Position[1] - particleArray[current].Position[1] ;
		var difZ = particleArray[other].Position[2] - particleArray[current].Position[2] ;
	
		//compare if net force unit vector points towards other particle by taking dot procuct 
		var dotProduct = (fUnitX * difX) + (fUnitY * difY) + (fUnitZ * difZ)
		
		//var randomColor = "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
		if(distance < 40 && (particleArray[current].charge != 0 && particleArray[other].charge != 0))//close enough and neither are neutral
		{
			if(dotProduct > 0) //Fnet unit vector pointing towards other particle
			{
				sphereArray[current].material.color.set(0x82ff80) ;
				sphereArray[other].material.color.set(0x82ff80) ;
			}
			else //Fnet unit vector pointing away from other particle
			{
				sphereArray[current].material.color.set(0xff8680) ;
				sphereArray[other].material.color.set(0xff8680) ;
			}
	
		}

}

function setUpPreset()
{
	var preset = options.preset; 
	
	switch(preset)
	{
		case "Temperature and Speed":
			options.positive = 20;
			options.negative = 20;
			options.neutral = 0;
			options.radius = 5;
			options.epsilon = 1; 
			options.magnitude_of_negative_charges = 4;
			options.magnitude_of_positive_charges = 4;
			options.show_forces = false;
			options.time_step = 0.001; 
			options.temperature = 250;
			resetSim();
			break;
		case "Attractive and Repulsive Forces":
			options.positive = 5;
			options.negative = 5;
			options.neutral = 0;
			options.radius = 10;
			options.epsilon = 1; 
			options.temperature = 100;
			options.magnitude_of_negative_charges = 2;
			options.magnitude_of_positive_charges = 2;
			options.time_step = 0.001; 
			options.show_forces = true; 
			resetSim();
			break;
		case "Net Force and Distance":
			options.positive = 1;
			options.negative = 1;
			options.neutral = 0;
			options.radius = 10;
			options.epsilon = 1; 
			options.temperature = 150;
			options.magnitude_of_negative_charges = 4;
			options.magnitude_of_positive_charges = 4;
			options.time_step = 0.002; 
			options.show_forces = false; 
			resetSim();
			break;
		case "Intermolecular Interactions and Particle Size":
			options.positive = 5;
			options.negative = 5;
			options.neutral = 0;
			options.radius = 5;
			options.epsilon = 1; 
			options.temperature = 100;
			options.magnitude_of_negative_charges = 3;
			options.magnitude_of_positive_charges = 3;
			options.time_step = 0.001; 
			options.show_forces = false; 
			resetSim();
			break;
		case "None":
			options.positive = 10;
			options.negative = 10;
			options.neutral = 10;
			options.radius = 5;
			options.epsilon = 1; 
			options.temperature = 100;
			options.magnitude_of_negative_charges = 1;
			options.magnitude_of_positive_charges = 1;
			options.time_step = 0.001; 
			options.show_forces = false; 
			resetSim();
			resetSim();
			break;
	}
}

setUpParticles(options.positive,options.negative,options.neutral);

var textPositionX; var textPositionX; var textPositionX;
/*var textVelocityX; var textVelocityY;  var textVelocityZ; 
var textAccelerationX; var textAccelerationY; var textAccelerationZ; 
var textFNetX; var textFNetY; var textFNetZ;*/
var magVelocity; var magFnet; var magAcc;
function animate()
{
	//var PE = 0; 
	//var KE = 0; 
	//var antiDC = 0 ;

	for(let t = 0; t < 5; t++)
	{
		updateConstants()
		
		//Calculate Velocity Scale
     	var ke = 0; 
     	for(let p = 0;  p < particleArray.length; p++)
     	{
			vMag = Math.sqrt(Math.pow(particleArray[p].Velocity[0],2) +
				   Math.pow(particleArray[p].Velocity[1],2)+
				   Math.pow(particleArray[p].Velocity[2],2));
			ke = ke + (((particleArray[p].Mass) * Math.pow(vMag,2))/2);
		
		}
		T_Current = ((ke* 2)/(particleArray.length* kb));
		scale = Math.sqrt(T/T_Current)
		
		//Verlet Integration Velocity and Position calculations
		for (let p = 0; p < particleArray.length; p++)
		{
		    //update velocity 1/2 half timestep
	  		particleArray[p].Velocity[0] =  scale*(particleArray[p].Velocity[0] + ( particleArray[p].Acceleration[0] * time_step * 0.5));
	  	    particleArray[p].Velocity[1] =  scale*(particleArray[p].Velocity[1] + ( particleArray[p].Acceleration[1] * time_step * 0.5));
	  	    particleArray[p].Velocity[2] =  scale*(particleArray[p].Velocity[2] + ( particleArray[p].Acceleration[2] * time_step * 0.5));
	  		
	  		//update positions 
	  		particleArray[p].Position[0] = particleArray[p].Position[0] + (particleArray[p].Velocity[0] * time_step);
	  		particleArray[p].Position[1] = particleArray[p].Position[1] + (particleArray[p].Velocity[1] * time_step);
	  		particleArray[p].Position[2] = particleArray[p].Position[2] + (particleArray[p].Velocity[2] * time_step);
	  		
	  		if (particleIndex != -1)
	  		{
				textPositionX = Math.trunc(particleArray[p].Position[0])
				textPositionY = Math.trunc(particleArray[p].Position[1])
				textPositionZ = Math.trunc(particleArray[p].Position[2])
			}
	  		//update sphere positions 
	  		sphereArray[p].position.set(particleArray[p].Position[0],particleArray[p].Position[1],particleArray[p].Position[2]);
		}
		
		//Calculate Velocity Scale Again, reset colors if shwoing forces
		var ke2= 0; 
		for(let p = 0;  p < particleArray.length; p++)
     	{
			vMag = Math.sqrt(Math.pow(particleArray[p].Velocity[0],2) +
				   Math.pow(particleArray[p].Velocity[1],2)+
				   Math.pow(particleArray[p].Velocity[2],2));
			ke2 = ke2 + (((particleArray[p].Mass) * Math.pow(vMag,2))/2);
			
			//set not currently clicked particles to normal opacity
			if (p != particleIndex)
			{
				sphereArray[p].material.opacity = 1;
			}
			
			if(Math.sign(particleArray[p].charge) == 1)//positive
			{
				sphereArray[p].material.color.set(0xeb34a2) ;
			}
			else if(Math.sign(particleArray[p].charge) == -1)
			{
				sphereArray[p].material.color.set(0x34e8eb) ; //negative
			}
			else
			{
				sphereArray[p].material.color.set(0x8B8B8B) ; //neutral
			}
			
		}
		T_AfterUpdate = ((ke2* 2)/(particleArray.length* kb));
		scale2 = Math.sqrt(T/T_AfterUpdate)
		
		//CALCULATE FNET & PE 
		for (let current = 0; current <	particleArray.length; current++)
		{
			Fnet= [0,0,0]
			var closest_particle = 0; 
			var smallest_distance = 250; 
			
			for(let other = 0; other < particleArray.length; other++)
			{
				/** 
				//calculate PE 
				if(current != (other + antiDC) && (other + antiDC)<particleArray.length)
				{
					var PdifX = particleArray[current].Position[0] - particleArray[other + antiDC].Position[0] ;
					var PdifY = particleArray[current].Position[1] - particleArray[other + antiDC].Position[1] ;
					var PdifZ = particleArray[current].Position[2] - particleArray[other + antiDC].Position[2] ;
					var Pdistance = Math.sqrt((Math.pow(PdifX,2)+Math.pow(PdifY,2)+Math.pow(PdifZ,2)));
					var PSigmaR = (sigma/Pdistance);
					PE = PE + (((k)*(particleArray[current].Charge)*(particleArray[other + antiDC].Charge))/Pdistance);
					PE = PE + (4*epsilon)*(Math.pow(PSigmaR,12)-Math.pow(PSigmaR,6));	
				}
				*/
				
				if(current == other) //skip if looking at the same particle
				{
					continue; 
				}
				
				//calculate distance from other particles
				var difX = particleArray[current].Position[0] - particleArray[other].Position[0] ;
				var difY = particleArray[current].Position[1] - particleArray[other].Position[1] ;
				var difZ = particleArray[current].Position[2] - particleArray[other].Position[2] ;
				var distance = Math.sqrt((Math.pow(difX,2)+Math.pow(difY,2)+Math.pow(difZ,2)));
				
				// calculate the forces first!!
				
				
		        var F1 = k *(((particleArray[current].Charge)*(particleArray[other].Charge))/Math.pow(distance,2));//coulomb
		        var sigmaR = (sigma/distance);
		        var epsilonR = ((24*epsilon)/distance);
		        var F2 = epsilonR*(2*(Math.pow(sigmaR,12) - Math.pow(sigmaR,6))); //lennard-jones
		        var F3 = F1 + F2; 
		        
		        
		    	if (show_forces == true)
    			{
					if (distance < smallest_distance) 
					{
						smallest_distance = distance; //find closest particle
						closest_particle = other; 
					}
				}

		    
		        //calculate unit vectors 
		        var r1 = [difX,difY,difZ];  
		    
		        var r1Mag = Math.sqrt(Math.pow(difX,2)+Math.pow(difY,2)+Math.pow(difZ,2));
		        
		        var r1UnitX = r1[0]/r1Mag;  
		        var r1UnitY = r1[1]/r1Mag;  
		        var r1UnitZ = r1[2]/r1Mag;  

		        
		        //caculate net forces
		        Fnet[0] = Fnet[0] + (F3*r1UnitX); 
		        Fnet[1] = Fnet[1] + (F3*r1UnitY); 
		        Fnet[2] = Fnet[2] + (F3*r1UnitZ); 
		        
			}
			
			if (show_forces == true) //show forces after finding closest particle
    		{
				showForces(Fnet,smallest_distance,current,closest_particle)
			}
			
			//antiDC = antiDC + 1; 
			
			//calculate acceleration
			var aX = Fnet[0]/(particleArray[current].Mass);
			var aY = Fnet[1]/(particleArray[current].Mass);
			var aZ = Fnet[2]/(particleArray[current].Mass);
			//update acceleration
			particleArray[current].Acceleration = [aX,aY,aZ];
			
		
			if (current == particleIndex)
	  		{
				//textFNetX = Math.trunc(Fnet[0]); 
				//textFNetY = Math.trunc(Fnet[1]); 
				//textFNetZ = Math.trunc(Fnet[2]); 
				magFnet = Math.trunc(Math.sqrt(Math.pow(Fnet[0],2) +
							  Math.pow(Fnet[1],2)+
				  			  Math.pow(Fnet[2],2)));
				//textAccelerationX = Math.trunc(particleArray[current].Acceleration[0]);
				//textAccelerationY = Math.trunc(particleArray[current].Acceleration[1]);
				//textAccelerationZ = Math.trunc(particleArray[current].Acceleration[2]);
				magAcc = Math.trunc(Math.sqrt(Math.pow(particleArray[current].Acceleration[0],2) +
							  Math.pow(particleArray[current].Acceleration[1],2)+
				  			  Math.pow(particleArray[current].Acceleration[2],2)));
			}
			//console.log(particleArray[current].Acceleration)
			
			//UPDATE full timestep velocity
			if (particleArray[current].Position[0] < (200 - (200 - radius) )) 
			{
	    		particleArray[current].Velocity[0] = -particleArray[current].Velocity[0];
	  		}
	  		if (particleArray[current].Position[0] > (200 - radius)) 
			{
	    		particleArray[current].Velocity[0]= -particleArray[current].Velocity[0];
	  		}
	  		if (particleArray[current].Position[1] < (200 - (200 - radius))) 
			{
	    		particleArray[current].Velocity[1] = -particleArray[current].Velocity[1];
	  		}
	  		if (particleArray[current].Position[1] > (200 - radius)) 
			{
	    		particleArray[current].Velocity[1] = -particleArray[current].Velocity[1];
	  		}
	  		if (particleArray[current].Position[2] < (200 - (200 - radius))) 
			{
	    		particleArray[current].Velocity[2] = -particleArray[current].Velocity[2];
	  		}
	  		if (particleArray[current].Position[2] > (200 - radius)) 
			{
	    		particleArray[current].Velocity[2] = -particleArray[current].Velocity[2];
	  		}
	  		
	  		//update velocity 
	  		particleArray[current].Velocity[0] =  scale2*(particleArray[current].Velocity[0] + ( particleArray[current].Acceleration[0] * time_step* 0.5));
	  	    particleArray[current].Velocity[1] =  scale2*(particleArray[current].Velocity[1] + ( particleArray[current].Acceleration[1] * time_step* 0.5));
	  	    particleArray[current].Velocity[2] =  scale2*(particleArray[current].Velocity[2] + ( particleArray[current].Acceleration[2] * time_step* 0.5));
	  	    
	  	    if (particleIndex != -1)
	  		{
				//textVelocityX = Math.trunc(particleArray[current].Velocity[0]);
				//textVelocityY = Math.trunc(particleArray[current].Velocity[1]);
				//textVelocityZ = Math.trunc(particleArray[current].Velocity[2]);
				magVelocity = Math.trunc(Math.sqrt(Math.pow(particleArray[current].Velocity[0],2) +
							  Math.pow(particleArray[current].Velocity[1],2)+
				  			  Math.pow(particleArray[current].Velocity[2],2)));
				  			  
			}
		}
		
		/** 
		var PEforTimestep = PE; 
		//caclulate KE
		for (let p = 0; p < particleArray.length; p ++)
		{
			var vMag = Math.sqrt(Math.pow(particleArray[p].Velocity[0],2)+Math.pow(particleArray[p].Velocity[1],2)+Math.pow(particleArray[p].Velocity[2],2));
			KE = KE + particleArray[p].Mass * Math.pow(vMag,2) * 0.5;
		}
		var totalE = KE + PEforTimestep; 
		*/
		//console.log(PEforTimestep, KE, totalE);
		
		if (particleIndex == -1)
		{
			const particleText = document.getElementById("particle");
			particleText.innerHTML = "None" ;
			const positionText = document.getElementById("position");
			positionText.innerHTML = "None";
			const velocityText = document.getElementById("velocity");
			velocityText.innerHTML = "None" ;
			const accText = document.getElementById("acceleration");
			accText.innerHTML = "None";
			const fText = document.getElementById("fNet");
			fText.innerHTML = "None";
		}
		else
		{
			const particleText = document.getElementById("particle");
			particleText.innerHTML = "Particle Selected: " + particleIndex ;
			const positionText = document.getElementById("position");
			positionText.innerHTML = "Position =  [" + textPositionX + ","+ textPositionY + "," + textPositionZ+ "]";
			const velocityText = document.getElementById("velocity");
			velocityText.innerHTML = "Velocity = [" +magVelocity+ "]" ;
			const accText = document.getElementById("acceleration");
			accText.innerHTML = "Acceleration = [" +magAcc+ "]";
			const fText = document.getElementById("fNet");
			fText.innerHTML = "Net Force =  [" +magFnet+ "]";
		}

	}	
    requestAnimationFrame( animate );  
    renderer.render(scene, camera);
}
animate()
