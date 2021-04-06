const logger = require('mii-logger.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { ROWS, KEYS } = require('../const');

module.exports = DB = class DB{

  constructor( App ){
    this.App = App;
    this.dbs = {};
    this._allowWrite = false;
    this._allowRead = false;
    this._isDbClosed = false;
    this.preFabs = {};

    this._init();
  }

  allowWrite(){ return this._allowWrite };
  allowRead(){ return this._allowRead };

  _init(){

    this.preFabs = {
      exactMatch: this._getSqlPreFab('exact.match.sql'),
      findByAny: this._getSqlPreFab('find-by-any.sql'),
      insert: this._getSqlPreFab('insert.sql'),
      tableStruct: this._getSqlPreFab('table.struct.sql'),
    };

    this._handleOnExit();
    this._initAllDbs();
  }

  async readCsv(filePath){
    // console.json({readCsv: {filePath}});
    const data = console.readFileSync( filePath )
      .split('\n')
      .splice(1) // pop csv header
      .map((line)=> line.trim() )
      .filter((line)=>line )
      .map((line)=>line.split(';').map((coll)=>coll.trim()) );

    return data;

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

  async importCsv(filePath){

    const self = this;

    return new Promise(async(resolve)=>{

      try{

        console.TS('prepairCsv');

        console.info(` #DB:importCsv: reading file: ${filePath}`);

        filePath = path.resolve(this.App.projRoot, filePath );

        if( !console.isFile(filePath) )
          return resolve({success: false, message: `CSV: [${filePath}] could not be found`, data: {}});

        if( !self.allowWrite() )
          return resolve({success: false, message: 'allowWrite: false', data: {}});

        const data = await self.readCsv(filePath);
        if( !this.App.isArray(data) )
          return resolve({success: false, message: 'CSV data is not array', data: {}});

        const totalRows = data.length;
        console.ok(` #DB:importCsv: total lines read: ${totalRows} rows`);

        const qRes = await this.App.comfirmAction(`Import all [${totalRows}] rows from CSV ?`);
        if( !qRes.agree ){
          return this.App.exit();
        }

        const state = {
          success: 0,
          error: 0,
        };

        const transactions = {};
        const { insert } = this.preFabs;

        for( const rowIndex in data ){
          if( rowIndex%1000 === 0 )
            console.log(` prepair transaction: ${rowIndex} of ${totalRows} `);

          if( !self.allowWrite() ){
            console.warn(` #DB:importCsv: allowWrite == false, break`);
            return resolve({success: false, message: 'allowWrite: false', data: {}});
          }

          const row = this._cleanRow(data[ rowIndex ]);
          const dbName = this.getDbHashFromRow(row);
          const db = this.dbs[ dbName ];

          const isExistingRowRes = await this.isExistingRow(db, row);
          if( isExistingRowRes.success ){
            state.success++;
            continue;
          }

          if( !transactions.hasOwnProperty(dbName) )
            transactions[ dbName ] = [];

          transactions[ dbName ].push( row );
          state.success++;

          // const res = await this.insertDataRow( row );
          // state.success += (+res.success);
          // state.error += (+(!res.success));
          // if( !res.success ){
          //   console.json({ error: { res, row } });
          // }
        }

        const prepair_t = console.TE('prepairCsv') / 1000;

        console.log(` End:`);
        console.log(`   prepair total time: ${ ((+prepair_t) /60).toFixed(2) } minutes`);
        console.log(`   success: ${ console.G(state.success) }`);
        console.log(`   error: ${ console.R(state.error) } `);
        console.log('\n');

        await console.sleep(1000);

        state.success = 0;
        state.error = 0;

        console.line();
        console.ok(` #DB:importCsv: start import transactions:`);
        console.TS('transaction');

        for( const dbName of Object.keys(transactions).sort() ){
          console.log(`   db: ${dbName} => items: ${transactions[ dbName ].length}`);

          const db = this.dbs[ dbName ];

          const insertBulkRowsRes = await this.insertBulkRows( db, transactions[ dbName ] );

          if( !insertBulkRowsRes.success ){
            state.error++;
            console.json({ insertBulkRowsRes });
            continue;
          }

          state.success++;

          // console.log('ser:[+]');
          // db.serialize(function() {
          //   console.log('ser:[inner]');

          //   db.run('BEGIN');
          //   const stmt = db.prepare( insert );
          //   for (const row of transactions[ dbName ]) {
          //     // console.log('    stmt.run');
          //     // const run = stmt.run( row );
          //     // const run = stmt.run( row, (err,result)=>{
          //     const run = db.run( insert, row, (err,result)=>{
          //       console.log({run: { err, result }});
          //     });
          //     // console.log({run});
          //   }
          //   console.log('    stmt.finalize');
          //   const res = stmt.finalize();
          //   db.run('COMMIT');
          // });
          // console.log('ser:[-]');

          // for (const row of transactions[ dbName ]) {
          //   const insertRes = await this.insertDataRow(row);
          //   console.log(insertRes.message);
          // }

        }
        const transaction_t = console.TE('transaction') /1000;

        console.log(` End:`);
        console.log(`   transaction total time: ${ ((+transaction_t)/60).toFixed(2) } minutes`);
        console.log(`   success: ${ console.G(state.success) }`);
        console.log(`   error: ${ console.R(state.error) } `);

        console.log('\n');
        this.App.exit();

      }catch(e){
        console.error(` #DB:importCsv: ${e.message}`);
        this.App.exit();
      }

    });

  }

  _cleanRow(row){
    return row.map((coll)=>this._cleanInputValue(coll));
  }

  async isExistingRow( db, row ){

    return new Promise(async(resolve)=>{

      row = this._cleanRow(row);

      const { exactMatch } = this.preFabs;
      // const db = this.dbs[ dbName ];

      db.get( exactMatch, row, (err,res)=>{
        // console.json({exactMatch: {err,res}});
        if( err )
          return resolve({success: false, message: (err.message || err), data: {}});

        if( res )
          return resolve({success: true, message: 'Data already exist', data: {}});

        resolve({success: false, message: 'Data not found', data: {}});
      });

    });
  }

  async insertBulkRows( db, rows ){

    const self = this;

    return new Promise(async(resolve)=>{
      const { insert } = self.preFabs;

      db.serialize(async function() {

        db.run('BEGIN');

        for (const row of rows) {
          const runRes = await self._run(db, insert, row);
          if( !runRes.success )
            console.log(`   insertBulkRows: ${runRes.message}`);
        }

        // const res = stmt.finalize();
        db.run('COMMIT');
        resolve({success: true, message: 'OK', data: []});
      });

    });
  }

  async insertDataRow( row ){

    return new Promise(async(resolve)=>{

      row = this._cleanRow(row);

      const dbName = this.getDbHashFromRow(row);
      const db = this.dbs[ dbName ];

      const { insert, exactMatch } = this.preFabs;

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

          // get back result: (faster)
          resolve({success: true, message: 'inserted', data: {}});

          // get back result: (slower response)
          // db.get( exactMatch, row, (err,res)=>{
          //   if( err )
          //     return resolve({success: false, message: (err.message || err), data: {}});
          //   if( res )
          //     return resolve({success: true, message: 'inserted', data: res});
          // });

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

  async _run(db, sql, params){
    return new Promise( async(resolve, reject)=>{
      db.run(sql, params, (err, rows)=>{
        if( err )
          return resolve({success: false, message: err.message || err, data: null});
        return resolve({success: true, message: 'OK', data: rows});
      });
    });
  }


  // -------------------------------------------------------
  _closeAllDbs(){

    if( this._isDbClosed ) return true;
    this._isDbClosed = true;
    console.log(` #DB:_closeAllDbs() ...`);

    for( const dbName of Object.keys(this.dbs) ){
      try{
        const db = this.dbs[ dbName ];
        db.close();
      }catch(e){
        // already closed ...
      }
    }

    return true;
  }


  _handleOnExit(){

    const self = this;

    // so the program will not close instantly
    process.stdin.resume();

    function exitHandler(options, exitCode) {
      console.log(' #DB: closing ...');
      self._allowWrite = false;
      self._allowRead = false;
      self.App.exit();

      if (options.exit)
        process.exit();
    }

    // do something when app is closing
    process.on('exit', exitHandler.bind(this,{exit: false}));

    // catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(this, {exit:true}));

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(this, {exit:true}));
    process.on('SIGUSR2', exitHandler.bind(this, {exit:true}));

    // catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(this, {exit:true}));

  }

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

    const { tableStruct } = this.preFabs;

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
