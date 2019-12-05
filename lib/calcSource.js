/*

  TODO:
    - some municipality URLs used in the tariff data can't be found in the geo.admin data
    - some categories don't exist in all municipalities (canton population doesn't match population looping over tariff)

 */

const { readFile } = require('fs').promises
const { resolve } = require('path')
const { select } = require('barnard59-sparql')
const getStream = require('get-stream')
const namespace = require('@rdfjs/namespace')
const rdf = require('rdf-ext')
const { Readable } = require('readable-stream')

const ns = {
  elcomAttr: namespace('http://elcom.zazuko.com/attribute/'),
  geonames: namespace('http://www.geonames.org/ontology#'),
  xsd: namespace('http://www.w3.org/2001/XMLSchema#'),
  qb: namespace('http://purl.org/linked-data/cube#'),
  rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
}

const municipalitiesQueryFilename = resolve(__dirname, '../sparql/municipalities.rq')
const tariffQueryFilename = resolve(__dirname, '../sparql/tariff.rq')

async function fetchMunicipalities ({ endpoint = 'https://ld.geo.admin.ch/query' } = {}) {
  const query = (await readFile(municipalitiesQueryFilename)).toString()
  const raw = await getStream.array(await select({ endpoint, query }))
  const municipalities = new Map()

  for (const row of raw) {
    municipalities.set(row.municipality.value, {
      name: row.name.value,
      population: parseInt(row.population.value),
      canton: row.canton.value
    })
  }

  return municipalities
}

async function fetchTariff ({ endpoint, municipalities }) {
  const query = (await readFile(tariffQueryFilename)).toString()
  const raw = await getStream.array(await select({ endpoint, query }))

  return raw.map(row => {
    if (!municipalities.has(row.municipality.value)) {
      // console.log(`municipality not found: ${row.municipality.value}`)
    }

    const municipality = municipalities.get(row.municipality.value) || {
      name: '',
      population: 0,
      canton: ''
    }

    return {
      canton: municipality.canton,
      municipalityUrl: row.municipality.value,
      municipalityName: municipality.name,
      population: municipality.population,
      category: row.category.value,
      total: Math.round(parseFloat(row.total.value) * 100.0) / 100.0
    }
  }).sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category)
    const cantonCompare = a.canton.localeCompare(b.canton)
    const populationCompare = b.population - a.population

    return categoryCompare || cantonCompare || populationCompare
  })
}

async function calc ({ tariffEndpoint }) {
  const result = []
  const municipalities = await fetchMunicipalities()
  const tariff = await fetchTariff({ endpoint: tariffEndpoint, municipalities })

  let done = false
  let canton = null
  let population = 0
  let category = null
  let populationTotal = 0
  let populationMedian = 0

  for (const row of tariff) {
    if (row.category !== category || row.canton !== canton) {
      done = false
      canton = row.canton
      category = row.category
      population = 0
      populationTotal = [...municipalities.values()].reduce((populationTotal, municipality) => {
        if (municipality.canton !== canton) {
          return populationTotal
        }

        return populationTotal + municipality.population
      }, 0)

      populationMedian = Math.floor(populationTotal / 2 + 1)
    }

    population += row.population

    if (!done && population > populationMedian) {
      done = true

      result.push({
        canton,
        category,
        total: row.total
      })
    }
  }

  return result
}

class CalcStream extends Readable {
  constructor ({ graph, tariffEndpoint }) {
    super({
      objectMode: true,
      read: () => {}
    })

    this.graph = graph === 'default' ? rdf.defaultGraph() : rdf.namedNode(graph)
    this.tariffEndpoint = tariffEndpoint

    this.calc()
  }

  async calc () {
    const result = await calc({ tariffEndpoint: this.tariffEndpoint })

    result.forEach(row => {
      const cantonId = (row.canton.match(new RegExp('([0-9]*)\\:[0-9]{4}$')) || [])[1]
      const categoryId = (row.category.match(new RegExp('([^/]*)$')) || [])[1]
      const subject = rdf.namedNode(`http://elcom.zazuko.com/calc/observation/${cantonId}/${categoryId}`)

      this.push(rdf.quad(subject, ns.elcomAttr.canton, rdf.namedNode(row.canton), this.graph))
      this.push(rdf.quad(subject, ns.elcomAttr.category, rdf.namedNode(row.category), this.graph))
      this.push(rdf.quad(subject, ns.elcomAttr.totalMedian, rdf.literal(row.total, ns.xsd.double), this.graph))
      this.push(rdf.quad(subject, ns.rdf.type, ns.qb.Observation, this.graph))
      this.push(rdf.quad(subject, ns.qb.dataSet, rdf.namedNode('http://elcom.zazuko.com/dataset/canton/medianElectricityTariffs'), this.graph))
    })

    this.push(null)
  }

  static create (options) {
    return new CalcStream(options)
  }
}

module.exports = CalcStream.create
