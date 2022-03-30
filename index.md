<html>
	<head>
		<meta charset=utf-8>
		<meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
		<title>Simple Particle Motion</title>
		<style>
			body { margin: 0; }
			canvas { width: 100%; height: 100% }
		</style>
	</head>
	<body>
	<h1> Hello World! Welcome to my Introductory MD Simulation  </h1>
    <!-- CDN Link to Three.js -->
    	
		<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
		<script src="https://cdn.jsdelivr.net/npm/three@0.122.0/examples/js/controls/OrbitControls.min.js"></script>
	    <script src="https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.5/dat.gui.min.js"></script>
		<!--reference your JS file here. Mine looks like below-->
    	<script src="MD_WithGUI.js"></script>
    	
    <p>Experimental Presets </p>
    <ol>
    	<li>Keep all parameters constant but vary temperature</li>
      	<li>Keep all parameters constant but observe relationship between net force on a particle and it’s distance from other particles</li>
        <li>Keep all parameters constant but vary time step </li>
        <li>Keep all parameters constant but vary particle size </li>
    </ol>
	</body>
</html>
