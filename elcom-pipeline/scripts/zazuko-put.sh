#!/bin/sh
curl -n \
     -X PUT \
     -H Content-Type:application/n-triples \
     -T target/everything.nt \
     -G http://data.zazuko.com/lindas \
     --data-urlencode graph=https://linked.opendata.swiss/graph/blv/animalpest