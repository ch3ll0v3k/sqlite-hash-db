const logger = require('mii-logger.js');
const sqlite3 = require('sqlite3').verbose();
const { ROWS, KEYS } = require('../const');

module.exports = DB = class DB{

  constructor( App ){
    this.App = App;
    this.dbs = {};
    this._init();
  }

  _init(){
    this._initAllDbs();
  }

  async findAllByAnyValue( value, strict=false ){

    console.json({
      findAllByAnyValue: { value, strict }
    });

    return new Promise(async(resolve)=>{

      value = this._cleanInputValue( value );
      const hash = this.getSubHash( value );

      // find potential DB
      const dbs = Object.keys(this.dbs)
        .filter((dbName)=>{
          return strict
            ? dbName.charAt(0) === hash || dbName.charAt(1) === hash
            : true; // <= search in all dbs
        });

      // const findByAny = this._getSqlPreFab('find-by-any.sql');
      const findByAny = `select * from data where ${ KEYS.map((key)=>`${key} like '%${value}%'`).join(' or ') }`;
      const params = []; // KEYS.map((key)=>value);
      let results = [];

      for( const dbName of dbs ){
        const db = this.dbs[ dbName ];
        // const res = await this._get(db, findByAny);
        const res = await this._all(db, findByAny);
        if( res.success && res.data.length ){

          res.data = res.data.map((record)=>{
            record.dbName = `0x${dbName}`;
            return record;
          });;

          results = [ ...results, ...res.data ];
        }
      } 

      resolve({success: true, message: 'OK', data: results });

    });

  }

  // async insertDataRow(
  //   {name_parts, art_brands, art_code_parts, ttc_art_id, brands, code_parts, code_parts_advanced}={}
  // ){  }

  async insertDataRow( row ){

    return new Promise(async(resolve)=>{

      row = row.map((coll)=>this._cleanInputValue(coll));

      const dbName = this.getDbHashFromRow(row);
      const db = this.dbs[ dbName ];
      const exactMatch = this._getSqlPreFab('exact.match.sql');
      const insert = this._getSqlPreFab('insert.sql');

      db.get( exactMatch, row, (err,res)=>{
        // console.json({exactMatch: {err,res}});
        if( err )
          return resolve({success: false, message: (err.message || err), data: {}});

        if( res )
          return resolve({success: true, message: 'Data already exist', data: {}});

        db.run( insert, row, (err,res)=>{
          // console.json({insert: {err,res}});

          if( err )
            return resolve({success: false, message: (err.message || err), data: {}});

          db.get( exactMatch, row, (err,res)=>{
            if( err )
              return resolve({success: false, message: (err.message || err), data: {}});
            if( res )
              return resolve({success: true, message: 'inserted', data: res});
          });

        });

      });

    });

  }

  // prepareOnDb( db, sql, params ){
  //   db.prepare(sql, params, (err, res)=>{
  //     console.json({ err, res });
  //   })
  // }

  // -------------------------------------------------------
  // query

  async _queryAll(db, sql, params){
    return new Promise( async(resolve, reject)=>{
      db.all(sql, params, (err, rows)=>{
        if( err )
          return resolve({success: false, message: err.message || err, data: null});
        return resolve({success: true, message: 'OK', data: rows});
      });
    });
  }

  async _exec(db, sql){
    return new Promise( async(resolve, reject)=>{
      db.exec(sql, (err, rows)=>{
        if( err )
          return resolve({success: false, message: err.message || err, data: null});
        return resolve({success: true, message: 'OK', data: rows});
      });
    });
  }

  async _get(db, sql, params){
    return new Promise( async(resolve, reject)=>{
      db.get(sql, /*params,*/ (err, rows)=>{
        if( err )
          return resolve({success: false, message: err.message || err, data: null});
        return resolve({success: true, message: 'OK', data: rows});
      });
    });
  }

  async _all(db, sql, params){
    return new Promise( async(resolve, reject)=>{
      db.all(sql, /*params,*/ (err, rows)=>{
        if( err )
          return resolve({success: false, message: err.message || err, data: null});
        return resolve({success: true, message: 'OK', data: rows});
      });
    });
  }


  // -------------------------------------------------------
  // inner
  _initAllDbs(){
    // 16**2 == 256 dbs
    for( let a=0; a<16; a++ ){
      for( let b=0; b<16; b++ ){
        const dbName = a.toString(16)+b.toString(16);
        const res = this._initDb( dbName );
        // console.log(` init: db #${dbName} => ${res}`);
      }
    }
  }

  _initDb( dbName ){

    const tableStruct = this._getSqlPreFab('table.struct.sql');

    const db = new sqlite3.Database(`${this.App.root}/dbs/${dbName}.sqlite3`);

    // db.serialize(function() {
    db.run( tableStruct );
    // });

    // db.close();
    this.dbs[ dbName ] = db;
    return true;
  }

  getSubHash(data,num=1){
    return console.hash.sha256( this._cleanInputValue(data) ).substr(0,num);
  }

  getRowHash(row, join='-'){
    return row.map((coll)=>this.getSubHash(coll)).join(join);
  }

  getDbHashFromRow(row, join=''){
    const a = this.getSubHash( this._cleanInputValue(row[ ROWS.ART_CODE_PARTS ]), 1);
    const b = this.getSubHash( this._cleanInputValue(row[ ROWS.CODE_PARTS ]), 1);
    return `${a}${join}${b}`;
  }

  _getSqlPreFab(preFabName){
    preFabName = preFabName.replace('.sql','').trim();
    const preFab = console.readFileSync(`${this.App.root}/sql-pre-fabs/${preFabName}.sql`);
    return preFab;    
  }

  _cleanInputValue(value){
    return value.toString().replace(/[^а-яА-Яa-zA-Z0-9\-\_\s]/g,'').trim();
  }

}
