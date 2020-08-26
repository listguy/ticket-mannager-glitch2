const express = require("express");
const path = "./data.json";
const app = express();
const fs = require("fs").promises;

function checkHttps(request, response, next) {
  // Check the protocol — if http, redirect to https.
  if (request.get("X-Forwarded-Proto").indexOf("https") != -1) {
    return next();
  } else {
    response.redirect("https://" + request.hostname + request.url);
  }
}

app.all("*", checkHttps);

app.use(express.json());

app.get("/api/tickets/labels", async (req, res) => {
  const data = await fs.readFile(path);
  try {
    const json = JSON.parse(data);

    const labels = [];
    Array.from(json).forEach((ticket) => {
      if (ticket.labels) {
        ticket.labels.forEach((l) => {
          if (!labels.includes(l)) {
            labels.push(l);
          }
        });
      }
    });

    res.send(labels);
  } catch (e) {
    res.send(e);
  }
});

app.post("/api/tickets", async (req, res) => {
  const data = await fs.readFile(path);
  const json = JSON.parse(data);

  try {
    const { body } = req;
    const newTicket = {
      id: `${Math.floor(Math.random() * 10 ** 10)}`,
      title: body.title,
      content: body.content,
      userEmail: body.email ? body.email : "Anonymous",
      creationTime: new Date().getTime(),
    };
    if (body.labels[0]) {
      Object.assign(newTicket, { labels: body.labels });
    }

    json.unshift(newTicket);

    await fs.writeFile(path, JSON.stringify(json));

    res.send({ sucseed: true, ticket: newTicket });
  } catch (e) {
    res.send({ sucseed: false });
  }
});

// #region don't touch this section
app.get("/api/tickets", async (req, res) => {
  const data = await fs.readFile(path);
  const filterParam = req.query.searchText;

  try {
    const json = JSON.parse(data);
    if (filterParam) {
      const filterRegx = new RegExp(`${filterParam}`, "i", "g");
      const filteredData = Array.from(json).filter((elem) =>
        filterRegx.test(elem.title)
      );
      res.send(filteredData);
    } else {
      res.send(json);
    }
  } catch (e) {
    res.send(e);
  }
});

app.post("/api/tickets/:ticketId/done", async (req, res) => {
  const { ticketId } = req.params;

  const data = await fs.readFile(path);
  const json = JSON.parse(data);

  const index = json.findIndex((e) => e.id === ticketId);
  json[index].done = true;

  await fs.writeFile(path, JSON.stringify(json));

  res.send({ updated: true });
});

app.post("/api/tickets/:ticketId/undone", async (req, res) => {
  const { ticketId } = req.params;

  const data = await fs.readFile(path);
  const json = JSON.parse(data);

  const index = json.findIndex((e) => e.id === ticketId);
  json[index].done = false;

  await fs.writeFile(path, JSON.stringify(json));

  res.send({ updated: true });
});
// #endregion
// DON'T touch the data.json either
let port;
console.log("❇️ NODE_ENV is", process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
  port = process.env.PORT || 3000;
  app.use(express.static(path.join(__dirname, "../build")));
  app.get("*", (request, response) => {
    response.sendFile(path.join(__dirname, "../build", "index.html"));
  });
} else {
  port = 3001;
  console.log("⚠️ Not seeing your changes as you develop?");
  console.log(
    "⚠️ Do you need to set 'start': 'npm run development' in package.json?"
  );
}

// Start the listener!
const listener = app.listen(port, () => {
  console.log("❇️ Express server is running on port", listener.address().port);
});
