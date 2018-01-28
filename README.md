## Notes
- This project is a RPi3 replacement for the basement PLC gas-switching system with added features. 
- Uses [Blynk](http://www.blynk.cc/) for monitoring and control and JavaScript (via [Node.js](https://nodejs.org/en/)) as the language of choice.
- This project is configured to run on a Blynk server hosted on the same Pi. Instructions for this are [here](https://github.com/blynkkk/blynk-server#blynk-server). All of the default ports are used. This must be set up first.
	- The admin portal is at `https://IP_OF_PI:9443/admin`
	- The port to use in the Blynk app is 8443
	- An admin user will be created the first time the server is run
	- An auth token will be generated when connecting to the server from the app
- As of 1/28/18:
	- The Blynk Server should be downloaded from [here](https://github.com/blynkkk/blynk-server/releases/download/v0.28.5/server-0.28.5-java8.jar).
	- The Blynk app for Android should be downloaded from [here](https://dl.apk4fun.com/go.php?d=155&i=&p=221652&s=0&l=https%3A%2F%2Ff.apk4fun.com%2Fget.php%3Fp%3D221652%26i%3Dcc.blynk%26v%3D2.17.3%26token%3Dc64c449fa4d5ad37bc6939d8f2e32b0c1517455422) (any version above this one changes how the app connects to the server).

## Installation
- The Pi's timezone must be manually set for task scheduling to work as expected. Follow [these](https://victorhurdugaci.com/raspberry-pi-sync-date-and-time) instructions for getting it set up.
 	- Edit `/etc/rc.local` to include this to make sure that the time zone is applied on every startup (set for Eastern time)
		- `cp /usr/share/zoneinfo/US/Eastern /etc/localtime && /etc/init.d/ntp restart`
- Clone this repo and change directory into the `bin` folder
- Run this command
	- `sudo chmod +x install.sh && ./install.sh`
- Start the program with PM2
	- `pm2 start program.js --name NameToGiveProcess`

## JavaScript References
- [PM2](https://github.com/Unitech/pm2) - Node.js process manager
- [blynk-library-js](https://github.com/vshymanskyy/blynk-library-js) - Wrapper for Blynk
- [onoff](https://github.com/fivdi/onoff) - Wrapper for GPIO control
- [node-schedule](https://github.com/node-schedule/node-schedule) - CRON-like event scheduling
- [csv-write-stream](https://github.com/maxogden/csv-write-stream) - Easy CSV creation
