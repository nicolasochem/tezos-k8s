#!/bin/sh

set -x
# wait for node to exist
until nslookup tezos-bootstrap-node-rpc; do echo waiting for tezos-bootstrap-node-rpc; sleep 2; done;
# wait for node to respond to rpc
until wget -O- http://tezos-bootstrap-node-rpc:8732/version; do sleep 2; done;

protocol_hash=$(echo $CHAIN_PARAMS | jq -r '.protocol_hash')
activation_account=$(echo $CHAIN_PARAMS | jq -r '.activation_account')
/usr/local/bin/tezos-client -A tezos-bootstrap-node-rpc -P 8732 -d /var/tezos/client -l --block genesis activate protocol "${protocol_hash}" with fitness -1 and key "${activation_account}" and parameters /etc/tezos/parameters.json
