const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log("Platform: ", os.platform());
console.log("CPU: ",os.cpus());
console.log("Total Memory: ", os.freemem());

// Path module
 
 console.log("Joined path: ", path.join('/assignment1','sample-files/sample.txt'))

// fs.promises API
  const {writeFile, readFile} = fs.promises
  async function writeAndRead(){
    try {
      await writeFile('demo.txt', 'Hello from fs.promises!', 'utf-8');
      const data = await readFile('demo.txt', 'utf-8')
      console.log('fs.promises read: ',data)
    } catch(err){
      console.log(err)
    }
  }
  writeAndRead();

// Streams for large files- log first 40 chars of each chunk
