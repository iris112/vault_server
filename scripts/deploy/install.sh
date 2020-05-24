#!/usr/bin/env bash

sudo yum update
sudo yum install git
sudo yum install gcc-c++
# git clone git@github.com:doomhz/cc-vault.git
# install NVM for node+npm https://github.com/creationix/nvm
npm i
# setup pollTransactions.service
sudo systemctl restart pollTransactions
# setup messageBus.service
sudo systemctl restart messageBus
