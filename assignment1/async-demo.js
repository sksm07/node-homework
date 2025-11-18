const fs = require('fs');
const fsPromise = require('fs/promises');
const path = require('path');
const sampleTxt = path.join(__dirname, "sample-files", "sample.txt")
const filePath1 = path.join(__dirname, "sample-files", "sample1.txt")
const filePath2 = path.join(__dirname, "sample-files", "sample2.txt")


// Write a sample file for demonstration
if (!fs.existsSync(path.dirname(sampleTxt))) {
  fs.mkdirSync(path.dirname(sampleTxt), { recursive: true });
}
fs.writeFileSync(sampleTxt, "Hello, async world!");

// 1. Callback style

 fs.readFile(sampleTxt, "utf-8", (err, data)=> {
    if(err){
      console.log(err);
    } else{console.log("Callback read: ", data)}
  })


  // Callback hell example (test and leave it in comments):

   /*fs.readFile(sampleTxt, "utf-8", (err, data)=> {
      if(err){
        console.log(err);
      } else{console.log("Callback read: ", data)}

      fs.readFile(filePath1, "utf-8", (err, data1)=> {
        if(err){
          console.log(err);
        } else{console.log("Callback read1: ", data1)}

        fs.readFile(filePath2, "utf-8", (err, data2)=> {
          if(err){
            console.log(err);
          } else{console.log("Callback read2: ", data2)}
        })
      })
    })*/


  // 2. Promise style
   
   fsPromise.readFile(sampleTxt, "utf-8")
      .then((data) => {
        console.log("Promise read: ",data)
      })
      .catch((err) => {
        console.log("Error reading file from promise:", err)
      })

      // 3. Async/Await style

      const readFileAsync = async () => {
        try{
          const asyncData = await fsPromise.readFile(sampleTxt, "utf-8")
          console.log("Async/Await read: ",asyncData)
        } catch(err){
          console.log("Async/Await read error:", err)
        }
      }
      readFileAsync();
