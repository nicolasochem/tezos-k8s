mkdir -p /var/tezos/client
chmod -R 777 /var/tezos/client

if [ ! -z "${BAKER_PRIVATE_KEY}" ]; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK import secret key baker unencrypted:${BAKER_PRIVATE_KEY} -f
elif ! tezos-client -d /var/tezos/client --protocol PsCARTHAGazK show address baker; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK gen keys baker
fi
if [ ! -z "${GENESIS_PRIVATE_KEY}" ]; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK import secret key genesis unencrypted:${GENESIS_PRIVATE_KEY} -f
elif ! tezos-client -d /var/tezos/client --protocol PsCARTHAGazK show address genesis; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK gen keys genesis
fi
if [ ! -z "${BOOTSTRAP_ACCOUNT_1_PRIVATE_KEY}" ]; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK import secret key bootstrap_account_1 unencrypted:${BOOTSTRAP_ACCOUNT_1_PRIVATE_KEY} -f
elif ! tezos-client -d /var/tezos/client --protocol PsCARTHAGazK show address bootstrap_account_1; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK gen keys bootstrap_account_1
fi
if [ ! -z "${BOOTSTRAP_ACCOUNT_2_PRIVATE_KEY}" ]; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK import secret key bootstrap_account_2 unencrypted:${BOOTSTRAP_ACCOUNT_2_PRIVATE_KEY} -f
elif ! tezos-client -d /var/tezos/client --protocol PsCARTHAGazK show address bootstrap_account_2; then
    tezos-client -d /var/tezos/client --protocol PsCARTHAGazK gen keys bootstrap_account_2
fi
