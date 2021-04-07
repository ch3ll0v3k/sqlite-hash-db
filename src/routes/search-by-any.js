
module.exports = (App)=>{

  const method = 'post';
  const path = '/search-by-any/';

  const MIN_CHAR_LIMIT = 2;

  App.express[ method ]( path, async(req,res)=>{

    try{

      const data = req.body;

      const strict = App.getBooleanFromValue(data.strict);
      const searchBy = (data.searchBy || '').trim();
      const limit = App.isPosNumber(+data.limit) ? (+data.limit) : 100;

      if( searchBy.length < MIN_CHAR_LIMIT )
        return res.json({success: false, message: `search-by: must be >= ${MIN_CHAR_LIMIT} characters`, data: []});

      const searchByRes = await App.DB.findAllByAnyValue( searchBy, strict, limit );
      // console.json(searchByRes.data);

      res.json( searchByRes );

    }catch(e){
      console.error(` error: [${req.part}]: ${e.error} `);
      res.json({success: false, message: e.message, data: []});
    }
  });

  return { path, method };

}