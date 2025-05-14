const fs = require('fs')
const path = require('path')

// Read package.json
const packageBuffer = fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
const packageData = JSON.parse(packageBuffer.toString())

// Show app version.
console.log(packageData.version || '0.0.0')
