// npm i --save body-parser serve-static express

const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const express = require('express');
const SERVER_MAX_POST_SIZE = '1mb';

module.exports = (App)=>{

  console.ok(` #start http-server:`);

  const public_html = `${App.root}${App.params.express.public_html}`;
  const host = App.params.express.host;
  const port = App.params.express.port;

  const app = express();

  app.use( bodyParser.json({limit: SERVER_MAX_POST_SIZE, extended: false}) );
  app.use (function (error, req, res, next){
    if( error ){
      console.error(` #main: [0]: [broken-json] ${error.message}`);
      return res
        .status(417)
        .json({success: false, message: 'broken-json', data: {} });
    }
    next();
  });

  app.use(bodyParser.urlencoded({limit: SERVER_MAX_POST_SIZE, extended: true}));
  app.use (function (error, req, res, next){
    if( error ){
      console.error(` #main: [1]: [broken-url-data] ${error.message}`);
      return res
        .status(417)
        .json({success: false, message: 'broken-url-data', data: {} });
    }
    next();
  });

  // [STATIC]
  console.log(` #public_html: [${public_html}]:`);
  app.use( serveStatic( `${public_html}`, {}));

  app.use( async function(req, res, next){ 

    try{

      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', '*');
      // res.header('access-control-allow-methods', 'GET, PUT, POST, HEAD, DELETE, OPTIONS'); 
      res.header('access-control-allow-methods', 'GET,PUT,POST,HEAD,DELETE,OPTIONS');
      res.header('X-Powered-By', 'AFF');

      const method = (''+req.method).trim().toLowerCase();
      const path = (''+req.path);
      const origin = (req.headers['origin'] || 'n/a');
      const originDomain = origin ? origin.split('://')[1] : '';
      const protocol = origin ? origin.split('://')[0] : (req.headers['x-forwarded-proto'] || '');
      const secure = ( protocol === 'https' );
      const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || 'n/a');

      if( method === 'options' )
        // return res.status(200).json({success: true, message:'OK', data: {}});
        return App.json(res, 200, 'success', {});

      const isFile = console.isFile(`${App.public_html}/${ path.replace(/\.\./g,'') }`);

      const info_log = [
        (isFile ? console.P('file') : console.R(method) ),
        console[ secure ? 'G' : 'Y' ](protocol),
        console.B(ip),
        console.W( originDomain || host ),
      ];

      const req_path_info = '['+console.W(path)+' : '+console.W( req.query ? JSON.stringify(req.query):'' )+']';
      console.log( `[${info_log.join(', ')}] ${req_path_info}` );

      // console.json({ pagination: req.getPagination() });
      return next();

    }catch(e){
      console.warn(` #express:e: ${e.message}`);
      res.status(500).json({success: false, message:'server-error', data: {}});
      next('server-error');
    }

  });

  return app;

}


