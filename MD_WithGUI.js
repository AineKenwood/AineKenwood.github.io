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
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
const renderer = new THREE.WebGLRenderer({ antialias: true})

renderer.setSize( window.innerWidth, window.innerHeight )
document.body.appendChild( renderer.domElement )
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
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

// ================== CONSTANTS ===================
var m = 1; 
var kb = 0.5; 
var time_step = 0.001;
var k = 8000;                                                              
var epsilon = 1; 
var sigma = 10;
var radius = 5;
var T = 100; 
var particleArray = [];
var sphereArray = [];
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
	show_forces: false
};

var gui = new dat.GUI({width:450});
var settingsFolder = gui.addFolder('System Settings')
settingsFolder.add(options,'temperature', 1, 500);
settingsFolder.add(options,'positive', 0, 30).onChange(resetSim);
settingsFolder.add(options,'negative', 0, 30).onChange(resetSim);
settingsFolder.add(options,'neutral', 0, 30).onChange(resetSim);
settingsFolder.add(options,'show_forces');
settingsFolder.open();

var ParticleFolder = gui.addFolder('Particle Settings')
ParticleFolder.add(options,'magnitude_of_negative_charges', 1, 5).onChange(resetSim);
ParticleFolder.add(options,'magnitude_of_positive_charges', 1, 5).onChange(resetSim);
ParticleFolder.add(options,'radius', 3, 20).onChange(updateSphereGeometry);
ParticleFolder.open();

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
   		
       	var mass = 1; 
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
	sigma = options.radius * 2; 
}

function resetSim()
{
	for(let s = 0; s < sphereArray.length; s++)
	{
		scene.remove(sphereArray[s])
	}
	sphereArray = [];
	particleArray = [];
	setUpParticles(options.positive,options.negative,options.neutral);
}

function showForces(distance,F1,F2, current, other)
{
		//var randomColor = "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
		var Fmag = Math.abs(F1)/Math.abs(F2);
		if(distance<40 && (particleArray[current].charge != 0 && particleArray[other].charge != 0))//close enough and neither are neutral
		{
			if (Fmag > 50000) //strong attractive forces 
			{
				sphereArray[current].material.color.set(0x15ea00) ;
				sphereArray[other].material.color.set(0x15ea00) ;
			}
			else if (Fmag < 50000 && Fmag > 5000)
			{
			    sphereArray[current].material.color.set(0x40bf00) ;
				sphereArray[other].material.color.set(0x40bf00) ;
			}
			else if(Fmag < 5000 && Fmag > 500)
			{
				sphereArray[current].material.color.set(0x6a9500) ;
				sphereArray[other].material.color.set(0x6a9500) ;
			}
			else if (Fmag < 500 && Fmag >10)
			{
				sphereArray[current].material.color.set(0x956a00) ;
				sphereArray[other].material.color.set(0x956a00);
			}
			else if (Fmag < 10 && Fmag > 5)
			{
				sphereArray[current].material.color.set(0xbf4000) ;
				sphereArray[other].material.color.set(0xbf4000);
			}
			else
			{
				sphereArray[current].material.color.set(0xea1500) ;
			    sphereArray[other].material.color.set(0xea1500);
			}
		}
}


setUpParticles(options.positive,options.negative,options.neutral);

function animate()
{
	
	//var PE = 0; 
	//var KE = 0; 
	//var antiDC = 0 ;
	for(let t = 0; t < 10; t++)
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
			
			if (show_forces == true)
			{
				if(particleArray[p].charge == 0)//if neutral, stay grey
				{
					sphereArray[p].material.color.set(0x8B8B8B) ;
				}
				else if(sphereArray[p].material.color != 0x00ff00)
				{
					sphereArray[p].material.color.set(0x00ff00) ;
				}
			}
			else
			{
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
		}
		T_AfterUpdate = ((ke2* 2)/(particleArray.length* kb));
		scale2 = Math.sqrt(T/T_AfterUpdate)
		
		//CALCULATE FNET & PE 
		for (let current = 0; current <	particleArray.length; current++)
		{
			Fnet= [0,0,0]
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
					showForces(distance,F1,F2,current,other)
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
			
			//antiDC = antiDC + 1; 
			
			//calculate acceleration
			var aX = Fnet[0]/(particleArray[current].Mass);
			var aY = Fnet[1]/(particleArray[current].Mass);
			var aZ = Fnet[2]/(particleArray[current].Mass);
			//update acceleration
			particleArray[current].Acceleration = [aX,aY,aZ];
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
	}	
    requestAnimationFrame( animate );  
    renderer.render(scene, camera);
}
animate()
