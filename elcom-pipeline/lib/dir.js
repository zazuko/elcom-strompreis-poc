const stream = require('readable-stream')
const fs = require('fs')

class FileIterator extends stream.Readable {
  constructor (dirName) {
    super({
      objectMode: true,
      read: () => {}
    })

    fs.readdir(dirName, (e, files) => {
      files.forEach(file => {
        this.push(file)
      })

      this.push(null)
    })
  }
}

function iterateFiles (dirName) {
  return new FileIterator(dirName)
}

module.exports = {
  iterateFiles
}
