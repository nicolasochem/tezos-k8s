#!/bin/sh

set -ex

tezos_network=$(echo $CHAIN_PARAMS | jq -r 'if (.network.genesis | not) then .network.chain_name else empty end')
if [ -n "$tezos_network" ]; then
  printf "Writing custom configuration for public node\n"
  mkdir -p /tmp/data

  # We use this command to extract the data we need from the binary
  # for the python script below.
  /usr/local/bin/tezos-node config init \
    --config-file /tmp/data/config.json \
    --data-dir /tmp/data \
    --network $tezos_network

  cat /tmp/data/config.json
  echo ""
fi

sudo mkdir -p /var/tezos/client
sudo chmod -R 777 /var/tezos/client
python3 /entrypoint.py $@

rm -rf /tmp/data/
