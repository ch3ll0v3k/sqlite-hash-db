const sqlite3 = require('sqlite3').verbose();
const { ROWS } = require('../const');

module.exports = DB = class DB{

  constructor( App ){
    this.App = App;


    this._init();
  }

  _init(){


  }

  getSubHash(data,num=4){
    return console.hash.sha256(data).substr(0,num)
  }

  getRowHash(row, join='-'){
    return row.map((coll)=>getSubHash(coll)).join(join);
  }

  getDbHashFromRow(row){
    return getSubHash(row[ ROWS.ART_CODE_PARTS ], 1) +'-'+ getSubHash(row[ ROWS.CODE_PARTS ], 1);
  }

}



const dbs = {};

const initDb = ( App, dbName )=>{

  const db = new sqlite3.Database(`${App.root}/dbs/${dbName}.sqlite3`);

  db.serialize(function() {
    db.run(`
      CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_parts varchar(255) NOT NULL DEFAULT '',
        art_brands varchar(255) NOT NULL DEFAULT '',
        art_code_parts varchar(255) NOT NULL DEFAULT '',
        ttc_art_id varchar(255) NOT NULL DEFAULT '',
        brands varchar(255) NOT NULL DEFAULT '',
        code_parts varchar(255) NOT NULL DEFAULT '',
        code_parts_advanced varchar(255) NOT NULL DEFAULT ''
      )
    `);

    // var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
    // for (var i = 0; i < 10; i++) {
    //   stmt.run("Ipsum " + i);
    // }
    // stmt.finalize();

    // db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
    //   console.log(row.id + ": " + row.info);
    // });

  });

  // db.close();
  dbs[ dbName ] = db;
  return true;
}

const initAllDbs = ()=>{

  // 16**2 == 256 dbs
  for( let a=0; a<16; a++ ){
    for( let b=0; b<16; b++ ){
      const dbName = a.toString(16)+b.toString(16);
      console.log({ [ dbName ]: initDb(dbName) });
    }
  }

}


module.exports = {
  initAllDbs
  getSubHash,
  getRowHash,
  getDbHashFromRow,






};






