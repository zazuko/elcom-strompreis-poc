#!/bin/sh
curl -H "Accept: application/n-triples" -o target/municipalities.nt --data-urlencode query@sparql/extra_municipality2currentname.rq http://data.admin.ch/query
curl -H "Accept: application/n-triples" -o target/cantons.nt --data-urlencode query@sparql/extra_cantonname.rq http://data.admin.ch/query
#curl -H "Accept: application/n-triples" -o target/tiergruppen-broader.nt --data-urlencode query@sparql/extra_tiergruppe.rq http://data.admin.ch/query
