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

  getBoolFromValue(val){
    if( this.isPosNumber((+val)) ) return !!(+val);
    if( this.isString(val) )
      return val.trim().toLowerCase() === 'true';          
    return (!!val);
  }

  getBooleanFromValue(val){ return this.getBoolFromValue(val); }

  getNumber(val, { floor=false }={}){
    if( this.isUndefined(val) || this.isNull( +val ) || this.isNaN( +val ) )
      return 0;
    return floor ? Math.floor( +val ) : (+val);
  }

  getPosNumber(val, { floor=false, min=false, max=false }={}){
    if( this.isUndefined(val) || this.isNull( +val ) || this.isNaN( +val ) )
      return 0;
    const v = Math.abs(floor ? Math.floor( +val ) : (+val));

    return ( ! this.isBoolean(min) ) && v < min
      ? min
      : ( ! this.isBoolean(max) ) && v > max
        ? max
        : v;
  }

  isString( value ){ return typeof value === 'string'; }
  isArray( value ){ return Array.isArray(value); }
  isNumber( value ){ return typeof value === 'number' && !this.isNaN( value ) && (Math.abs(value) !== Infinity); }
  isObject( value ){ return typeof value === 'object' && !this.isNull(value) && !this.isArray(value); }
  isNull( value ){ return typeof value === 'object' && value === null; }
  isNaN( value ){ return typeof value === 'number' && isNaN(value); }
  isUndefined( value ){ return typeof value === 'undefined'; }
  isBool( value ){ return typeof value === 'boolean'; }
  isBoolean( value ){ return this.isBool(value); }

  isPosNumber( value ){ return this.isNumber(value) && value > 0; }
  isNegNumber( value ){ return this.isNumber(value) && value > 0; }
  isFunction( value ){ return typeof value === 'function'; }

}
