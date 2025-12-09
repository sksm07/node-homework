const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dogsRouter = require('./routes/dogs');

const express = require('express');
const app = express();

// Your middleware here

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({limit: '1mb', extended: true}));

app.use((req, res, next) => {
  if (req.method === 'POST') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type must be application/json',
        requestId: req.requestId
      });
    }
  }
  next();
});

app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

app.use('/', dogsRouter); // Do not remove this line

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    requestId: req.requestId
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  const responseMessage = statusCode >= 500 ? "Internal Server Error" : err.message;

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${err.name} ${err.message}`);
  } else {
    console.error(`ERROR: Error ${err.message}`);
  }

  res.status(statusCode).json({
    error: responseMessage,
    requestId: req.requestId
  });
});




const server =	app.listen(3000, () => console.log("Server listening on port 3000"));
module.exports = server;