const logger = require('mii-logger.js');
const Application = require('./src/Application.js');
console.logTime(false);

const App = new Application({
  root: `${__dirname}/src`,
  express: {
    port: 10045,
    host: '127.0.0.1',
    public_html: '/public_html',
  },
});

App.on('ready', async()=>{

  console.ok(' #App.on:ready');

  const argv = process.argv.splice(2);
  if( !App.isArray(argv) || !argv.length ){
    console.error(` Usage: npm run import:csv <path-to-file.csv>`);
    App.exit();
  }

  const importCsvRes = await App.DB.importCsv(argv[0]);
  console.json(importCsvRes);

});
