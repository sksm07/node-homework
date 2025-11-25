const http = require("http");

const htmlString = `
<!DOCTYPE html>
<html>
<body>
<h1>Clock</h1>
<button id="getTimeBtn">Get the Time</button>
<p id="time"></p>
<script>
document.getElementById('getTimeBtn').addEventListener('click', async () => {
    const res = await fetch('/time');
    const timeObj = await res.json();
    const timeP = document.getElementById('time');
    timeP.textContent = timeObj.time;
});
</script>
</body>
</html>
`;

const server = http.createServer((req, res) => {

  if (req.url === "/time") {
    res.writeHead(200, { "Content-Type": "application/json" });
    const timeData = { time: new Date().toString() };
    res.end(JSON.stringify(timeData));
  }

  else if (req.url === "/timePage") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlString);
  }
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Page not found");
  }
});

server.listen(8000, () => {
  console.log("Server is running at http://localhost:8000");
});