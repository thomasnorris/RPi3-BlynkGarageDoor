## Notes
- This project is a RPi3 replacement for the basement PLC gas-switching system with added features.
- Uses [Blynk](http://www.blynk.cc/) for monitoring and control and JavaScript (via [Node.js](https://nodejs.org/en/)) as the language of choice.
- This project is configured to run on a Blynk server hosted on the same Pi. Instructions for this are [here](https://github.com/blynkkk/blynk-server#blynk-server). All of the default ports are used. __This must be set up first using [this](https://github.com/blynkkk/blynk-server/releases/download/v0.30.3/server-0.30.3-java8.jar) server .jar and Java 8.__
	- The admin portal is at `https://IP_OF_PI:9443/admin`
	- The port to use in the Blynk app is `9443`
	- An admin user will be created the first time the server is run
	- An auth token will be generated when connecting to the server from the app
- __As of `8/31/19`, [Raspbian Stretch](https://downloads.raspberrypi.org/raspbian/images/raspbian-2019-04-09/2019-04-08-raspbian-stretch.zip) must be used as newer distributions have compatibility issues.__

## Installation
- The Pi's timezone must be manually set for task scheduling to work as expected. Follow [these](https://victorhurdugaci.com/raspberry-pi-sync-date-and-time) instructions __up to step 6__ for getting it set up.
 	- Edit `/etc/rc.local` to include this to make sure that the time zone is applied on every startup (set for Eastern time)
		- `cp /usr/share/zoneinfo/US/Eastern /etc/localtime && /etc/init.d/ntp restart`
- Configure the `Node-Logger` submodule following the instructions [here](https://github.com/thomasnorris/Node-Logger#installation)
- Clone this repo and change directory into the `bin` folder
- Run this command
	- `sudo chmod +x install.sh && ./install.sh`
- Start the program with PM2
	- `pm2 start program.js --name BoilerControl`
- Optionally, add the following lines to `/etc/rc.local` for auto startup
	- `sudo java -jar "/PATH/TO/SERVER/FOLDER/server-VERSION.jar" -dataFolder "/PATH/TO/SERVER/FOLDER/" &`
	- `sudo pm2 start /PATH/TO/BoilerControl/bin/program.js --name BoilerControl`

## JavaScript References
- [PM2](https://github.com/Unitech/pm2) - Node.js process manager
- [blynk-library-js](https://github.com/vshymanskyy/blynk-library-js) - Wrapper for Blynk
- [onoff](https://github.com/fivdi/onoff) - Wrapper for GPIO control
- [node-schedule](https://github.com/node-schedule/node-schedule) - CRON-like event scheduling
- [csv-write-stream](https://github.com/maxogden/csv-write-stream) - Easy CSV creation
