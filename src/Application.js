const DB = require('./DB');
const express = require('./express');

module.exports = Application = class Application{
  constructor( params ){
    this.root = params.root || __dirname;
    this.params = params || {};

    this.DB = null;
    this.express = null;

    this._onSubs = {};
    this._init();

  }

  async _init(){

    this.DB = new DB(this);
    this.express = express(this);

    // const res = await this.DB.findAllByAnyValue('9060048');
    // console.log({
    //   ang: this.DB._cleanInputValue('skfjzlke2345678§\'("&é§"è\'__sdf345_@#@¼#¼#'),
    //   rus: this.DB._cleanInputValue('ыудалоцдаЫАВПЫВА++==адцулацду'),
    // });

    this._attachRoutes();
    await this._startServer();

    await console.sleep(1000);
    this.emit('ready');

  }

  on(event, callback){
    if( typeof callback !== 'function' ) return false;
    if( !this._onSubs.hasOwnProperty(event) )
      this._onSubs[ event ] = [];
    this._onSubs[ event ].push(callback);

  }

  emit(event, data={}){
    if( !Array.isArray(this._onSubs[ event ]) ) return;

    for( const callback of this._onSubs[ event ] ){
      try{
        callback(data);
      }catch(e){

      }
    }
  }

  _attachRoutes(){
    const routes = console.listDir(`${this.root}/routes`);
    for( const route of routes ){
      const jsModule = require(`${this.root}/routes/${routes}`);
      const res = jsModule(this);
      console.info(`  #add: [${res.method}] => [${res.path}]`);
    }
  }

  async _startServer(){

    const host = this.params.express.host;
    const port = this.params.express.port;

    // Catch all requests
    this.express.use('*', async(req, res, next) => { 
      res.status(404).json({ success: false, message: 'route not found', data: {} });
    });

    console.log(` #server started: [http://${host}:${port}]`);
    this.express.listen(port, host);

  }

}
