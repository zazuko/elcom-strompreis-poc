const unzipper = require('unzipper')
const stream = require('readable-stream')
const Pipeline = require('barnard59-core').pipeline

function unzip () {
  return unzipper.Parse()
}

function unzipOne (pattern) {
  return unzipper.ParseOne(pattern)
}

function extract (destinationDir) {
  return unzipper.Extract({ path: destinationDir })
}

class UnzipTransform extends stream.Transform {
  constructor (subPipeline, shouldProcess) {
    super({ objectMode: true })

    this.shouldProcess = shouldProcess
    this.subPipeline = subPipeline
  }

  _transform (entry, e, cb) {
    if (this.shouldProcess && this.shouldProcess(entry.path) === false) {
      console.log(`Skipping file ${entry.path}`)
      entry.autodrain()
      cb()
      return
    }

    const nextStream = Pipeline(this.subPipeline.node._context[0].dataset, {
      iri: this.subPipeline.node.term,
      basePath: this.subPipeline.basePath,
      context: this.subPipeline.context,
      variables: this.subPipeline.variables
    })
    nextStream.variables.set('csv', entry.path)

    nextStream._init().then(() => {
      console.log(`Start processing file ${entry.path}`)
      entry.pipe(nextStream.streams[0]).on('finish', cb)
    })
  }
}

function transform (subPipeline, shouldProcess) {
  return new UnzipTransform(subPipeline, shouldProcess)
}

module.exports = {
  extract,
  unzip,
  unzipOne,
  transform
}
