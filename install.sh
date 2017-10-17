#!/bin/bash

# --Color constants
GREEN="\033[1;32m"
BLUE="\033[1;34m"
NC="\033[0m"

# --Main installer
set -e
echo -e "${BLUE}Fetching updates...${NC}"
sudo apt-get update && apt-get upgrade 
echo -e "${BLUE}Installing Node.js and NPM...${NC}"
sudo curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
echo -e "${BLUE}Installing NPM packages...${NC}"
sudo npm install

# --Finishing up
echo -e "\n${GREEN}Install is complete!${NC}\nEnter your ${GREEN}Blynk Auth Token${NC}. This will be in an email from Blynk."
read authToken

blynkAuthTemplate="module.exports = { getAuth: function() { return \"$authToken\"; } }"
echo "$blynkAuthTemplate" > blynk-auth.js

sudo chown pi -R $PWD

echo -e "${GREEN}Auth Token Saved!${NC} Would you like to start the program now? [y/n]"
read choice

[[ "$choice" == "y" || "$choice" == "Y" ]] && sudo node main.js || echo -e "\nStart the program by running ${GREEN}\"node main.js\"${NC} in this directory."

exit
