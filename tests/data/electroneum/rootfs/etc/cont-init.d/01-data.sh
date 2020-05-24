#!/bin/sh

if [ ! -d /data ]; then
    mkdir /data
fi

if [ ! -d /data/node-1 ]; then
    mkdir /data/node-1
fi

if [ ! -d /data/node-2 ]; then
    mkdir /data/node-2
fi

if [ ! -d /data/wallet-1 ]; then
    mkdir /data/wallet-1
fi

if [ ! -d /data/wallet-2 ]; then
    mkdir /data/wallet-2
fi

if [ ! -f /data/node-1/wallet.bin ]; then
    echo "* creating wallet on node 1"
    /usr/bin/electroneum-wallet-cli --testnet --generate-new-wallet /data/wallet-1/wallet.bin  --restore-deterministic-wallet --electrum-seed="sequence atlas unveil summon pebbles tuesday beer rudely snake rockets different fuselage woven tagged bested dented vegan hover rapid fawns obvious muppet randomly seasons randomly" --password "" --log-file ~/data/node-1/wallet.log

    echo "* start mining on node 1"
    /usr/bin/electroneum-wallet-cli --testnet --wallet-file /data/wallet-1/wallet.bin --password "" --daemon-address 127.0.0.1:28081 --command start_mining
fi

if [ ! -f /data/node-2/wallet.bin ]; then
    echo "* creating wallet on node 2"
    /usr/bin/electroneum-wallet-cli --testnet --generate-new-wallet /data/wallet-2/wallet.bin  --restore-deterministic-wallet --electrum-seed="deftly large tirade gumball android leech sidekick opened iguana voice gels focus poaching itches network espionage much jailed vaults winter oatmeal eleven science siren winter" --password "" --log-file ~/data/node-2/wallet.log
fi
