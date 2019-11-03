const { finished, Readable } = require('readable-stream')
const { promisify } = require('util')

class Sequence extends Readable {
  constructor (pipelines, parent) {
    super({ objectMode: true })

    this.pipelines = pipelines
    this.parent = parent
  }

  _read () {
    this.runPipelines().catch(err => this.emit('error', err))
  }

  async runPipelines () {
    for (const pipeline of this.pipelines) {
      pipeline.resume()

      await promisify(finished)(pipeline)
    }

    this.push(null)
  }

  static create (...pipelines) {
    return new Sequence(pipelines, this.pipeline)
  }
}

module.exports = Sequence.create
