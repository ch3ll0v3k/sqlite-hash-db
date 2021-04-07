const ROWS = require('./rows');

const KEYS = Object.keys(ROWS)
  .sort((a, b)=>{
    return ROWS[ a ] < ROWS[ b ] ? -1 : 1; 
  })
  .map((key)=>key.toLowerCase());

module.exports = KEYS;
