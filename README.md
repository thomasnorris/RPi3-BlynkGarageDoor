## Notes
- This project is a RPi3 replacement for the basement PLC gas-switching system with added features. 
- Uses [Blynk](http://www.blynk.cc/) for monitoring and control and JavaScript (via [Node.Js](https://nodejs.org/en/)) as the language of choice.
- The Pi's timezone must be manually set for task scheduling to work as expected. Follow [these](https://victorhurdugaci.com/raspberry-pi-sync-date-and-time) instructions for getting it set up.
- Clone with this command:
  - `sudo git clone https://github.com/thomasnorris/RPi3-BoilerControl.git && cd RPi3-BoilerControl/bin && chmod +x install.sh`
- Run the install script:
  - `./install.sh`
- Start the program with pm2
  - `pm2 start program.js --name BoilerControl`
- Other repositories must have a GitHub webhook set up to post on a push (default webhook action)
  - `http://public-address-of-pi-here:1240/payload`

## JavaScript Library References
- [blynk-library-js](https://github.com/vshymanskyy/blynk-library-js) - Wrapper for Blynk
- [onoff](https://github.com/fivdi/onoff) - Wrapper for GPIO control
- [node-schedule](https://github.com/node-schedule/node-schedule) - CRON-like event scheduling
- [csv-write-stream](https://github.com/maxogden/csv-write-stream) - Easy CSV creation
