## Notes
- This project is a RPi3 replacement for the basement PLC gas-switching system with added features. 
- Uses [Blynk](http://www.blynk.cc/) for monitoring and control and JavaScript (via [Node.Js](https://nodejs.org/en/)) as the language of choice.
- The Pi's timezone must be manually set for task scheduling to work as expected. Follow [these](https://victorhurdugaci.com/raspberry-pi-sync-date-and-time) instructions for getting it set up.

## Installation
- Clone this repo with SSH or HTTPS, then change directory into the `bin` folder
- Run this command
  - `chmod +x install.sh && ./install.sh`
- Start the program with PM2
  - `pm2 start program.js --name NameToGiveProcess`

## JavaScript Library References
- [blynk-library-js](https://github.com/vshymanskyy/blynk-library-js) - Wrapper for Blynk
- [onoff](https://github.com/fivdi/onoff) - Wrapper for GPIO control
- [node-schedule](https://github.com/node-schedule/node-schedule) - CRON-like event scheduling
- [csv-write-stream](https://github.com/maxogden/csv-write-stream) - Easy CSV creation
