# Node.js Fundamentals

## What is Node.js?
 Node.js is a program that lets us to run Javascript on our computer or a server (outside the browser). It is built on V8 engine and is used for building backend and server-side applications.

## How does Node.js differ from running JavaScript in the browser?
The main difference is the ecosystem. 
In browser, we can interact with DOM, window objects, web platform APIs like cookies, local and session storage. Since the browser runs JS code in a sandbox, it doesn't have access to our file system, can't run system commands, can't modify browser settings or install software or open other browser tabs or windows.  

Node runs JS outside the browser, on a server and comes with rich eco system(wide range of modules and libraries) server-side capabilities like interacting with file and operating systems, and provides solution for various functionalities.

## What is the V8 engine, and how does Node use it?
 V8 is a JavaScript engine which parses and executes javscript code.
 Node uses V8 to provide JavaScript runtime on the server. Node uses the key feateres of V8 like JIT compilation, efficient garbage collection and inline caching for building faster, scalable web servers and network applications.

## What are some key use cases for Node.js?
 Node.js's ease of use and extensive ecosystem of libraries and frameworks, asynchronus nature makes it ideal for developing applications involves frequent I/O operations, APIs and microservices, real time applications and to develop SPAs and CLIs.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
In CJS, each file is treated as a module, and code can be exported from a module using module.exports and imported into another file using require().
CommonJS is mainly used in server-side JS apps with Node, as browsers don't support the use of CommonJS. Node used to only support CommonJS to implement modules, but nowadays it also supports ESmodules which is a more modern approach.

greet.js

// Export a single function
module.exports = function(name) {
  return `Hello, ${name}!`;
};


app.js

// Import and use the function
const greet = require('./greet');

**ES Modules (supported in modern Node.js):**

ES modules use the export keyword to make code available and the import keyword to use it in another file. 
Modern browsers and Node.js can natively use ES modules, often without requiring extra build tools. ES modules can be loaded asynchronously, which helps performance. 

// ES-module.js
export function greet(name) {
  console.log(`Hello, ${name}!`);
}

// main.js
import { greet } from './ES-module.js';

