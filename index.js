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

  return;

  // Insert data from CSV => 
  const data = console.readFileSync('./slava-base.csv')
    .split('\n')
    .map((line)=> line.trim() )
    .filter((line)=>line )
    .map((line)=>line.split(';').map((coll)=>coll.trim()) );

  for( const row of data ){
    const res = await App.DB.insertDataRow( row );
    if( !res.success ){
      console.json({ error: { res, row } });
    }
  }

  // {
  //   "insertRes": {
  //     "success": true,
  //     "message": "inserted",
  //     "data": {
  //       "id": 1,
  //       "name_parts": "Radiator Hose",
  //       "art_brands": "MALO",
  //       "art_code_parts": "4273A",
  //       "ttc_art_id": "1",
  //       "brands": "FIAT",
  //       "code_parts": "4649378",
  //       "code_parts_advanced": "4649378"
  //     }
  //   }
  // }

});


return;

// new sqlite3.Database(filename, [mode], [callback])
const db = new sqlite3.Database(':memory:');

db.serialize(function() {
  db.run("CREATE TABLE lorem (info TEXT)");

  var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
  for (var i = 0; i < 10; i++) {
      stmt.run("Ipsum " + i);
  }
  stmt.finalize();

  db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
      console.log(row.id + ": " + row.info);
  });
});

db.close();



// Returns a new Database object and automatically opens the database. 
// There is no separate method to open the database.

// filename: Valid values are filenames, ":memory:" for an anonymous in-memory database and an empty string for an anonymous disk-based database. 
// Anonymous databases are not persisted and when closing the database handle, their contents are lost.

// mode (optional): One or more of sqlite3.OPEN_READONLY, sqlite3.OPEN_READWRITE and sqlite3.OPEN_CREATE. The default value is OPEN_READWRITE | OPEN_CREATE.
