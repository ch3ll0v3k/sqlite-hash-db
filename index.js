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

  // Search => 
  // console.json({
  //   '728RSFL': await App.DB.findAllByAnyValue('728RSFL'),
  //   '2281921402': await App.DB.findAllByAnyValue('2281921402'),
  //   '12317551254': await App.DB.findAllByAnyValue('12317551254'),
  //   // Alternator; DRI; 2291501202; 81; PEUGEOT; 1608064580; 1608064580
  //   '2291501202': await App.DB.findAllByAnyValue('2291501202'),
  //   '1608064580': await App.DB.findAllByAnyValue('1608064580'),
  // });

});
