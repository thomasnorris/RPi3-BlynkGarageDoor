## Notes
- This project is a RPi3 replacement for the basement PLC gas-switching system with added features. 
- Uses [Blynk](http://www.blynk.cc/) for monitoring and control and JavaScript (via [Node.js](https://nodejs.org/en/)) as the language of choice.
- This project is configured to run on a Blynk server hosted on the same Pi. Instructions for this are [here](https://github.com/blynkkk/blynk-server#blynk-server). All of the default ports are used. This must be set up first.
	- The admin portal is at `https://IP_OF_PI:9443/admin`
	- The port to use in the Blynk app is 9443
	- An admin user will be created the first time the server is run
	- An auth token will be generated when connecting to the server from the app

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
