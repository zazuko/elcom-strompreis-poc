const { createReadStream } = require('fs')
const path = require('path')

function openFromCsvw (csvwPath, sourceFileUrl) {
  return createReadStream(path.resolve(__dirname, '../source/'+sourceFileUrl)) //create stream of the path
}

module.exports = {
  openFromCsvw
}
