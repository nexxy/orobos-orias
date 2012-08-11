;(function() {

	const USAGE = '$0 --host <remote host> --port <remote port>'
		+ '--device <device path> --id <device ID>';

	var
		argv = require('optimist')
			.usage(USAGE)
			.demand(['host', 'port', 'device', 'id'])
			.argv
		, serialport = require('serialport')
		, reportBuffer = new Buffer(0)
		, buffertools = require('buffertools')
		, dnode = require('dnode')
		, net = require('net')
		, sensor 
		, server
		, iface
		, stream
		, lastStatus 
		, connected = {

			device : false
			, monitor : false
		}
		, vine = argv.host
	;

	var log = function() {

		var 
			d = (new Date()).toLocaleString()
			, args = Array.prototype.slice.call(arguments)
			, str = ""
			, len = args.length-1
		;

		str = args.shift();

		for(var i = 0; i < len; i++) {

			
		};

		console.log(

			["[", d, "] ", args.shift()].join('')
			, args.length ? args : ''
		);
	};

	/**
	* Connect to an arduino and its sensors!
	*/
	var sensorLink = function sensorLink() {

		var 
			link = function() {

				return new serialport.SerialPort(argv.device
					, { 
						baudrate : 115200
						, parser : serialport.parsers.raw 
					}
				);
			}
			, relink = function() {

				setTimeout(function() {

					sensor = link();
					sensor.on('open', function() {

						connected.device = true;
						log("Serial port opened.");
					});
					sensor.on('error', function(err) {

						if(connected.device) {

							connected.device = false;
							log("Serial error: %s", err);
							detection(2);
						}
						relink();
					});
					sensor.on('close', function() {

						log("Serial closed.");
						connected.device = false;
						detection(1);
						relink();
					});
					sensor.on('data', incomingData);
				} , 1000);
			}
		;

		relink();
		return sensor;
	}

	/**
	* Create client for sending sensor events to server
	*/
	var nodeLink = function nodeLink() {

		var stream = this;

		var createConnection = function createConnection() {

			var onRemote = function onRemote(remote) {

				remote.register(argv.id, function(err, id) {

					if(err) {

						log("Server error: %s", err);
						return;
					}

					log("Device registered.");
				});

				server = remote;
			};

			var onEnd = function onEnd() {

				log("iface stream ended...");

			};

			stream.client = dnode();
			stream.client.on('remote', onRemote);
			stream.client.on('end', onEnd);

			return stream.client;
		};

		return createConnection();
	};
	
	var netStream = function netStream(link) {

		var stream = this;
		var createConnection = function createConnection() {

			stream.client = net.connect(argv.port, argv.host, onConnect);
			stream.client.on('error', onError);
			stream.client.on('close', onClose);
			return stream.client;
		};

		var onError = function onError(err) {

			if(err.code == "ECONNREFUSED") {

				log("netStream connection refused...");

				setTimeout(function() {

					if(stream.client.destroyed) {

						retry();
					}

				}, 1000);
			}
		};

		var onConnect = function onConnect() {

			log("netStream connected.");
			pipe(stream.client, link);
		};

		var onClose = function onClose() {

			if(!stream.client.errorEmitted) {

				log("netStream closed.");
				retry();
			}
		};

		return createConnection();
	}

	var pipe = function pipes(s, i) {

		s
			.pipe(i)
			.pipe(s)
		;
	};

	var start = function start() {

		if((stream) && (stream.writable || stream.readable)) {

			stream.end();
		}

		iface = new nodeLink();
		stream = new netStream(iface);
	};

	var retry = function retry() {

		setTimeout(start, 1000);
	};

	/**
	* Parse a command packet
	*/
	var parseCommands = function parseCommandArray(str) {

		var dat = str.split('\r\n');

		for (var i = dat.length - 1; i >= 0; i--) {

			if(dat[i].length > 0) {

				command(dat[i]);
			}
		};
	};

	/**
	* Process a parsed command
	*/
	var command = function processCommand(cmd) {

		var 
			cmdArr = cmd.split('::')
			, ns = cmdArr[0].toUpperCase()
			, parm = cmdArr[1] || null
		;

		switch(ns) {

			case "STATUS" :

				if((parm) && (parm == 0)) {

					heartbeat();
				}
				else {

					detection();
				}
				break;
		}

	};

	/**
	* Presence has been detected (STATUS::1)
	*/
	var detection = function presenceDetected(stat) {

		if(server) {
			
			if(lastStatus == 0) {

				log("Sensor triggered.");
			}

			server.detection(argv.id, stat || 0, function(err, status) {

				if(err) {

					log(err);
					return;
				}

				status = status ? true : false;

			});
		}
		else {

			log("Sensor triggered. -- NOT CONNECTED TO MONITOR");
		}

		lastStatus = 1;
	};

	/**
	* Normal heartbeat (STATUS::0)
	*/
	var heartbeat = function sensorHeartbeat() {

		lastStatus = 0;
		if(argv.debug) { 

			log("Heartbeat.");
		}
		if(server) {

			server.heartbeat(argv.id, function(err, status) {

				if(err) {

					log(err);
					return;
				}
			});
		}	
	};

	/**
	* Parse data from an arduino
	*/
	var incomingData = function incomingDataFromArduino(buff) {

		if(!buff) { return; }

		var blen = buff.length;

		if(reportBuffer.length > 0) {

			buff = buffertools.concat(reportBuffer, buff);
			reportBuffer = new Buffer(0);
		}

		/**
		* Complete report packet (\r\n at the end)
		*/
		if ((buff[blen-1] == '0x0a') && (buff[blen-2] == '0x0d')) {

			parseCommands(buff.toString());
		}

		/**
		* Partial report packet
		*/
		else {

			reportBuffer = buffertools.concat(reportBuffer, buff);
		}
	};

	sensorLink();

	start();

})();