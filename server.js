const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`jira-creatio-sync-service listening on port ${port}`);
});

module.exports = app;
