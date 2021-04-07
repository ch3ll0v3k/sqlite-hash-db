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
      .map((line)=>this._cleanInputValue(line) )
      .filter((line)=>line )
      // .map((line)=>line.split(';').map((coll)=>coll.trim()) );

    return data;

  }

  async findAllByAnyValue( value, strict=false, limit=50 ){

    const self = this;

    return new Promise(async(resolve)=>{

      strict=false;

      value = self._cleanInputValue( value );
      const hash = self.getSubHash( value );

      // find potential DB
      const dbs = Object.keys(self.dbs)
        .filter((dbName)=>{
          return strict
            ? dbName.charAt(0) === hash || dbName.charAt(1) === hash
            : true; // <= search in all dbs
        });

      const findByAny = `
        select * from data 
          where item like '%${value}%'
          order by id desc 
          limit ${ limit }
        `;

      const params = []; // KEYS.map((key)=>value);
      let results = [];

      for( const dbName of dbs ){
        const db = self.dbs[ dbName ];
        // const res = await self._get(db, findByAny);
        const res = await self._all(db, findByAny);
        if( res.success && res.data.length ){

          // console.json({ [ dbName ]: res.data });

          // {
          //   "8f": [
          //     {
          //       "id": 2664,
          //       "item": "repair set pistonsleeve;kolbenschmidt;93315960;368854;deutz-fahr;02137206;0213 7206"
          //     },
          //     {
          //       "id": 2663,
          //       "item": "repair set pistonsleeve;kolbenschmidt;93315960;368854;deutz-fahr;02139501;0213 9501"
          //     },
          //   ]
          // }

          res.data = res.data.map((record)=>{
            return {
              dbName: `0x${dbName}`,
              ...self._dbRecordToNamedObject( record ),
            }
          });

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

        // this.dbs['ff'].run(`insert into data (id, item) values(NULL, 'abc')`, [], (err,res)=>{
        //   console.json({
        //     err, res
        //   })
        // });

        // console.json(data);
        // return;

        const totalRows = data.length;
        console.ok(` #DB:importCsv: total lines read: ${totalRows} rows`);

        // request to process
        // const qRes = await this.App.comfirmAction(`Import all [${totalRows}] rows from CSV ?`);
        // if( !qRes.agree ){
        //   return this.App.exit();
        // }

        const state = {
          success: 0,
          error: 0,
        };

        const transactions = {};
        // const { insert } = this.preFabs;
        // let s_time_t = console.TS('prepair-transaction');
        let time_t = Date.now() +1000;
        let rps = 0;

        for( const rowIndex in data ){

          rps++;
          const useTimer = (Date.now() -time_t) >= 0;

          if( useTimer ){
            console.log(` prepair transaction: ${rowIndex} of ${totalRows}: rp/s: ${rps} `);
            time_t = Date.now() +1000;
            rps = 0;
          }

          // const useTimer = rowIndex%1000 === 0;
          // if( useTimer ){
          //   const s_end_t = (console.TE('prepair-transaction') /1000).toFixed(3);
          //   console.log(` prepair transaction: ${rowIndex} of ${totalRows}: mSec: ${s_end_t} `);
          //   s_time_t = console.TS('prepair-transaction');
          // }

          if( !self.allowWrite() ){
            console.warn(` #DB:importCsv: allowWrite == false, break`);
            return resolve({success: false, message: 'allowWrite: false', data: {}});
          }

          const row = this._cleanRow(data[ rowIndex ]);
          const dbName = this.getDbHashFromRow(row);
          const db = this.dbs[ dbName ];

          const isExistingRowRes = await this.isExistingRow(db, row, useTimer);
          // console.json({
          //   isExistingRowRes: isExistingRowRes.success,
          //   dbName,
          //   row
          // });

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

          let s_time_t = console.TS('import-transaction');
          const db = this.dbs[ dbName ];
          // console.debug({dbName});
          const insertBulkRowsRes = await this.insertBulkRows( db, transactions[ dbName ] );

          if( !insertBulkRowsRes.success ){
            state.error++;
            console.json({ insertBulkRowsRes });
            continue;
          }

          const e_time_t = (console.TE('import-transaction') /1000).toFixed(3);
          console.log(`   db: ${dbName} => items: ${transactions[ dbName ].length} => e_time_t: ${e_time_t}`);

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
    // return row.map((coll)=>this._cleanInputValue(coll));
    return this._cleanInputValue(row);
  }

  async isExistingRow( db, row, time=false ){

    return new Promise(async(resolve)=>{

      // if( time ) console.TS('isExistingRow');

      row = this._cleanRow(row);

      const { exactMatch } = this.preFabs;
      // const db = this.dbs[ dbName ];

      // let sql = exactMatch;
      // row.map((item)=>{
      //   sql = sql.replace('?',`'${item}'`);
      // });

      // if( time ){
      //   console.log({sql});
      // }

      db.get( exactMatch, row, (err,res)=>{
      // db.get( sql, [], (err,res)=>{
        // if( time )
        //   console.json({exactMatch: {err,res}});

        // if( time ){
        //   const s_end_t = (console.TE('isExistingRow') /1000).toFixed(3);
        //   console.log(` isExistingRow mSec: ${s_end_t} `);
        // }

        if( err )
          return resolve({success: false, message: (err.message || err), data: {}});

        if( res ){
          // if( !(+res.id) ){
          //   console.log(`ID: ${res.id}`);
          //   process.exit();
          // }
          return resolve({success: true, message: 'Data already exist', data: {}});
        }

        resolve({success: false, message: 'Data not found', data: {}});
      });

    });
  }

  async insertBulkRows( db, rows ){

    const self = this;

    return new Promise(async(resolve)=>{
      const { insert } = self.preFabs;

      db.serialize(async function() {

        db.run('BEGIN',async(err, res)=>{
          for (const row of rows) {
            const runRes = await self._run(db, insert, row);
            if( !runRes.success ){
              // console.warn(`   insertBulkRows: ${runRes.message}`);
            }
          }

          // const res = stmt.finalize();
          db.run('COMMIT',async(err,res)=>{
            // console.log({COMMIT: {err, res}});
            resolve({success: true, message: 'OK', data: []});
          });
          
        });
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
        db.run('COMMIT');
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
    return console.hash.sha1( this._cleanInputValue(data) ).substr(0,num);
    // return console.hash.sha256( this._cleanInputValue(data) ).substr(0,num);
    // return console.hash.md5( this._cleanInputValue(data) ).substr(0,num);
  }

  getRowHash(row, join='-'){
    return row.map((coll)=>this.getSubHash(coll)).join(join);
  }

  getDbHashFromRow(row, join=''){
    row = row.split(';');
    const a = this.getSubHash( this._cleanInputValue(row[ ROWS.ART_CODE_PARTS ]), 1);
    const b = this.getSubHash( this._cleanInputValue(row[ ROWS.CODE_PARTS ]), 1);
    return `${a}${join}${b}`;
  }

  _getSqlPreFab(preFabName){
    preFabName = preFabName.replace('.sql','').trim();
    const preFab = console.readFileSync(`${this.App.root}/sql-pre-fabs/${preFabName}.sql`);
    return preFab;    
  }

  _dbRecordToNamedObject(record){

    const mObj = {};

    record.item
      .split(';')
      .map((value, i)=>{
        mObj[ KEYS[ i ] ] = (i === 0 || i === 1 || i === 4)
          ? value.toUpperCase()
          : value;
      });

    return {
      id: record.id,
      ...mObj,
    };

  }

  _cleanInputValue(value){
    return value
      .toString()
      .replace(/[^а-яА-Яa-zA-Z0-9\-\_\s;:]/g,'')
      .trim()
      .toLowerCase();
  }

}
